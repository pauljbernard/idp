import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('readiness review idempotency', () => {
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

  it('returns the original readiness review when the same idempotency key is replayed', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-readiness-review-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const first = await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID, {
      notes: ['first review'],
      idempotency_key: 'readiness-review-idempotency-key',
    })
    const replay = await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID, {
      notes: ['replayed review'],
      idempotency_key: 'readiness-review-idempotency-key',
    })
    const status = LocalIamOperationsRuntimeStore.getReadinessReview()

    expect(replay.id).toBe(first.id)
    expect(status.latest_review?.id).toBe(first.id)
    expect(status.latest_review?.notes).toEqual(['first review'])
  }, 10_000)
})
