import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('restore idempotency', () => {
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

  it('returns the original restore record when the same idempotency key is replayed for the same backup and mode', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-restore-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    const first = await LocalIamOperationsRuntimeStore.restoreBackupAsync(
      IAM_SYSTEM_USER_ID,
      backup.id,
      'EXECUTE',
      {
        idempotency_key: 'restore-idempotency-key',
      },
    )
    const replay = await LocalIamOperationsRuntimeStore.restoreBackupAsync(
      IAM_SYSTEM_USER_ID,
      backup.id,
      'EXECUTE',
      {
        idempotency_key: 'restore-idempotency-key',
      },
    )
    const status = LocalIamOperationsRuntimeStore.listRestores()

    expect(replay.id).toBe(first.id)
    expect(status.count).toBe(1)
    expect(status.restores[0]?.id).toBe(first.id)
  }, 10_000)
})
