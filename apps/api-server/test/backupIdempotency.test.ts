import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('backup idempotency', () => {
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

  it('returns the original backup record when the same idempotency key is replayed', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-backup-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const first = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'idempotent backup',
      idempotency_key: 'backup-idempotency-key',
    })
    const replay = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'idempotent backup replay',
      idempotency_key: 'backup-idempotency-key',
    })
    const status = LocalIamOperationsRuntimeStore.listBackups()

    expect(replay.id).toBe(first.id)
    expect(status.count).toBe(1)
    expect(status.backups[0]?.id).toBe(first.id)
  }, 10_000)
})
