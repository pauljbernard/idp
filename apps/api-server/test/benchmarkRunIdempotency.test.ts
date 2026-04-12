import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('benchmark run idempotency', () => {
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

  it('returns the original benchmark run when the same idempotency key is replayed for the same suite', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-benchmark-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    let { LocalIamBenchmarkRuntimeStore } = await import('../src/platform/iamBenchmarkRuntime')

    const firstRecord = await LocalIamBenchmarkRuntimeStore.runSuiteAsync(
      IAM_SYSTEM_USER_ID,
      'iam-benchmark-token-runtime',
      {
        idempotency_key: 'benchmark-run-idempotency-key',
      },
    )

    vi.resetModules()
    ;({ LocalIamBenchmarkRuntimeStore } = await import('../src/platform/iamBenchmarkRuntime'))

    const secondRecord = await LocalIamBenchmarkRuntimeStore.runSuiteAsync(
      IAM_SYSTEM_USER_ID,
      'iam-benchmark-token-runtime',
      {
        idempotency_key: 'benchmark-run-idempotency-key',
      },
    )

    expect(secondRecord.id).toBe(firstRecord.id)
    expect(secondRecord.suite_id).toBe(firstRecord.suite_id)
    expect(secondRecord.metrics).toEqual(firstRecord.metrics)
    expect(LocalIamBenchmarkRuntimeStore.getCatalog().runs).toHaveLength(1)
  }, 20000)
})
