import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('deployment runtime profiles', () => {
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

  it('defaults to the bounded single-region profile and does not expose deferred topology modes as supported', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-deployment-runtime-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamDeploymentRuntimeStore } = await import('../src/platform/iamDeploymentRuntime')
    const profile = LocalIamDeploymentRuntimeStore.getDeploymentProfile()

    expect(profile.active_profile.id).toBe('iam-standalone-aws-single-region-bounded')
    expect(profile.active_profile.topology_mode).toBe('AWS_SINGLE_REGION_HA')
    expect(profile.active_profile.readiness_status).toBe('NEEDS_REVIEW')
    expect(profile.supported_topology_modes).toEqual([
      'AWS_SINGLE_REGION_COST_OPTIMIZED',
      'AWS_SINGLE_REGION_HA',
    ])
    expect(profile.supported_topology_modes).not.toContain('AWS_MULTI_REGION_WARM_STANDBY')
  })

  it('rejects deferred deployment topology modes through the runtime store update surface', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-deployment-runtime-unsupported-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamDeploymentRuntimeStore } = await import('../src/platform/iamDeploymentRuntime')

    await expect(
      LocalIamDeploymentRuntimeStore.updateDeploymentProfileAsync('iam-user-idp-super-admin', {
        topology_mode: 'AWS_MULTI_REGION_WARM_STANDBY',
      }),
    ).rejects.toThrow('Unsupported deployment topology for the current support profile')
  })
})
