import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('bootstrap package idempotency', () => {
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

  it('returns the original bootstrap package when the same idempotency key is replayed', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-bootstrap-package-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamStandaloneBootstrapStore } = await import('../src/platform/iamStandaloneBootstrap')

    const first = await LocalIamStandaloneBootstrapStore.regenerateBootstrapPackageAsync(
      IAM_SYSTEM_USER_ID,
      { idempotency_key: 'bootstrap-package-idempotency-key' },
    )
    vi.resetModules()
    const { LocalIamStandaloneBootstrapStore: ReloadedIamStandaloneBootstrapStore } = await import('../src/platform/iamStandaloneBootstrap')
    const replay = await ReloadedIamStandaloneBootstrapStore.regenerateBootstrapPackageAsync(
      IAM_SYSTEM_USER_ID,
      { idempotency_key: 'bootstrap-package-idempotency-key' },
    )
    const bootstrapPackage = ReloadedIamStandaloneBootstrapStore.getBootstrapPackage()

    expect(replay.id).toBe(first.id)
    expect(bootstrapPackage.latest_package.id).toBe(first.id)
    expect(bootstrapPackage.latest_package.version_label).toBe(first.version_label)
    expect(bootstrapPackage.count).toBe(1)
  }, 20_000)
})
