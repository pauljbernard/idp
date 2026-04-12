import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

function rewriteEnvelopeState<T>(filePath: string, mutate: (state: T) => void) {
  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    version: number
    saved_at: string
    state: T
  }
  mutate(envelope.state)
  envelope.saved_at = new Date().toISOString()
  writeFileSync(filePath, JSON.stringify(envelope), 'utf8')
}

describe('restore execution lease', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('rejects overlapping execute restores when an active restore lease already exists', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-restore-lease-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    LocalIamOperationsRuntimeStore.listRestores()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_restore_run = {
          id: 'existing-restore-run',
          started_at: new Date().toISOString(),
          lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
          backup_id: backup.id,
          mode: 'EXECUTE',
        }
      },
    )

    await expect(
      LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'EXECUTE'),
    ).rejects.toThrow('already in progress')

    const status = LocalIamOperationsRuntimeStore.listRestores()
    expect(status.active_run?.id).toBe('existing-restore-run')
    expect(status.count).toBe(0)
  }, 10_000)

  it('clears an expired restore lease and records a fresh execute restore', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-restore-expired-lease-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    LocalIamOperationsRuntimeStore.listRestores()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_restore_run = {
          id: 'expired-restore-run',
          started_at: new Date(Date.now() - 120_000).toISOString(),
          lease_expires_at: new Date(Date.now() - 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
          backup_id: backup.id,
          mode: 'EXECUTE',
        }
      },
    )

    const record = await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'EXECUTE')
    const status = LocalIamOperationsRuntimeStore.listRestores()

    expect(record.id).toContain('iam-restore-')
    expect(record.mode).toBe('EXECUTE')
    expect(record.status).toBe('APPLIED')
    expect(status.active_run).toBeNull()
    expect(status.count).toBe(1)
    expect(status.restores[0]?.id).toBe(record.id)
  }, 10_000)

  it('blocks backup and resilience runs while an execute restore lease is active', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-restore-conflict-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    LocalIamOperationsRuntimeStore.listRestores()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_restore_run = {
          id: 'active-restore-run',
          started_at: new Date().toISOString(),
          lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
          backup_id: backup.id,
          mode: 'EXECUTE',
        }
      },
    )

    await expect(
      LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID),
    ).rejects.toThrow('already in progress')

    await expect(
      LocalIamOperationsRuntimeStore.runResilienceSuiteAsync(IAM_SYSTEM_USER_ID),
    ).rejects.toThrow('already in progress')
  }, 10_000)
})
