import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('transient state maintenance idempotency', () => {
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

  it('returns the original maintenance record when the same idempotency key is replayed', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-transient-maintenance-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const first = await LocalIamOperationsRuntimeStore.runTransientStateMaintenanceAsync(IAM_SYSTEM_USER_ID, {
      idempotency_key: 'transient-maintenance-idempotency-key',
    })
    const replay = await LocalIamOperationsRuntimeStore.runTransientStateMaintenanceAsync(IAM_SYSTEM_USER_ID, {
      idempotency_key: 'transient-maintenance-idempotency-key',
    })
    const status = LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns()

    expect(replay.id).toBe(first.id)
    expect(status.count).toBe(1)
    expect(status.runs[0]?.id).toBe(first.id)
  }, 10_000)
})
