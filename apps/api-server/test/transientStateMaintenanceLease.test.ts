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

describe('transient state maintenance lease', () => {
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

  it('rejects overlapping transient maintenance runs when an active lease already exists', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-transient-maintenance-lease-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_transient_state_maintenance_run = {
          id: 'existing-maintenance-run',
          started_at: new Date().toISOString(),
          lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
        }
      },
    )

    await expect(
      LocalIamOperationsRuntimeStore.runTransientStateMaintenanceAsync(IAM_SYSTEM_USER_ID),
    ).rejects.toThrow('already in progress')

    const status = LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns()
    expect(status.active_run?.id).toBe('existing-maintenance-run')
    expect(status.count).toBe(0)
  }, 10_000)

  it('clears an expired lease and records a fresh maintenance run', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-transient-maintenance-expired-lease-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_transient_state_maintenance_run = {
          id: 'expired-maintenance-run',
          started_at: new Date(Date.now() - 120_000).toISOString(),
          lease_expires_at: new Date(Date.now() - 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
        }
      },
    )

    const run = await LocalIamOperationsRuntimeStore.runTransientStateMaintenanceAsync(IAM_SYSTEM_USER_ID)
    const status = LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns()

    expect(run.id).toContain('iam-transient-maintenance-')
    expect(status.active_run).toBeNull()
    expect(status.count).toBe(1)
    expect(status.runs[0]?.id).toBe(run.id)
  }, 10_000)
})
