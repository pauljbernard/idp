import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('formal review idempotency', () => {
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

  it('returns the original formal review when the same idempotency key is replayed', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-formal-review-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamReviewRuntimeStore } = await import('../src/platform/iamReviewRuntime')

    const first = await LocalIamReviewRuntimeStore.recordFormalReviewAsync(
      IAM_SYSTEM_USER_ID,
      ['first review'],
      { idempotency_key: 'formal-review-idempotency-key' },
    )
    vi.resetModules()
    const { LocalIamReviewRuntimeStore: ReloadedIamReviewRuntimeStore } = await import('../src/platform/iamReviewRuntime')
    const replay = await ReloadedIamReviewRuntimeStore.recordFormalReviewAsync(
      IAM_SYSTEM_USER_ID,
      ['replayed review'],
      { idempotency_key: 'formal-review-idempotency-key' },
    )
    const formalReview = ReloadedIamReviewRuntimeStore.getFormalReview()

    expect(replay.id).toBe(first.id)
    expect(formalReview.latest_review?.id).toBe(first.id)
    expect(formalReview.latest_review?.notes).toEqual(first.notes)
    expect(formalReview.count).toBe(1)
  }, 20_000)
})
