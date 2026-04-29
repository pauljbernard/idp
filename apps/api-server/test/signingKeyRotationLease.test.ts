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

describe('signing key rotation lease', () => {
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

  it('rejects overlapping signing key rotations when an active lease already exists', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-key-rotation-lease-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    LocalIamOperationsRuntimeStore.listSigningKeyRotations()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_signing_key_rotation_run = {
          id: 'existing-key-rotation-run',
          started_at: new Date().toISOString(),
          lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
          realm_id: null,
        }
      },
    )

    await expect(
      LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null),
    ).rejects.toThrow('already in progress')

    const status = LocalIamOperationsRuntimeStore.listSigningKeyRotations()
    expect(status.active_run?.id).toBe('existing-key-rotation-run')
    expect(status.count).toBe(0)
  }, 10_000)

  it('clears an expired signing key rotation lease and records a fresh rotation', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-key-rotation-expired-lease-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    LocalIamOperationsRuntimeStore.listSigningKeyRotations()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        runtimeState.active_signing_key_rotation_run = {
          id: 'expired-key-rotation-run',
          started_at: new Date(Date.now() - 120_000).toISOString(),
          lease_expires_at: new Date(Date.now() - 60_000).toISOString(),
          started_by_user_id: IAM_SYSTEM_USER_ID,
          realm_id: null,
        }
      },
    )

    const record = await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)
    const status = LocalIamOperationsRuntimeStore.listSigningKeyRotations()

    expect(record.id).toContain('iam-key-rotation-')
    expect(status.active_run).toBeNull()
    expect(status.count).toBe(1)
    expect(status.rotations[0]?.id).toBe(record.id)
  }, 10_000)
})
