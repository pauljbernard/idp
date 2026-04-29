import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('backup durable artifact persistence', () => {
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

  it('stores backup payloads as durable artifacts and keeps persisted state metadata bounded', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-backup-durable-artifact-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { readPersistedStateSnapshot, readDurableArtifact } = await import('../src/platform/persistence')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'durable backup persistence',
      idempotency_key: 'backup-durable-artifact',
    })

    const persistedState = readPersistedStateSnapshot<any>('iam-operations-runtime-state.json')
    expect(Array.isArray(persistedState?.backups)).toBe(true)
    expect(persistedState.backups[0]?.id).toBe(backup.id)
    expect(persistedState.backups[0]?.snapshot ?? null).toBeNull()

    const durableArtifact = readDurableArtifact(backup.object_key)
    expect(durableArtifact).not.toBeNull()
    const parsedSnapshot = JSON.parse(durableArtifact?.content ?? '{}')
    expect(parsedSnapshot.foundation).toBeTruthy()
    expect(parsedSnapshot.authentication).toBeTruthy()
    expect(parsedSnapshot.protocol).toBeTruthy()

    await expect(
      LocalIamOperationsRuntimeStore.restoreBackupAsync(
        IAM_SYSTEM_USER_ID,
        backup.id,
        'EXECUTE',
        {
          idempotency_key: 'restore-from-durable-backup-artifact',
        },
      ),
    ).resolves.toMatchObject({
      backup_id: backup.id,
      mode: 'EXECUTE',
      status: 'APPLIED',
    })
  }, 15_000)
})
