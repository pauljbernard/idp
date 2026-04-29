import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('restore dry-run durable artifact validation', () => {
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

  it('fails dry-run restore when the durable backup artifact has been corrupted', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-restore-dry-run-durable-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { writeDurableArtifact } = await import('../src/platform/persistence')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'dry-run durable validation backup',
      idempotency_key: 'restore-dry-run-durable-validation-backup',
    })

    writeDurableArtifact(backup.object_key, '{"corrupted":true}')

    await expect(
      LocalIamOperationsRuntimeStore.restoreBackupAsync(
        IAM_SYSTEM_USER_ID,
        backup.id,
        'DRY_RUN',
        {
          idempotency_key: 'restore-dry-run-durable-validation-restore',
        },
      ),
    ).rejects.toThrow(/Checksum mismatch|Failed to parse durable backup artifact|Missing durable backup artifact/)
  }, 15_000)
})
