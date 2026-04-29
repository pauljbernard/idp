import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('recovery drill latest-backup summary reevaluation', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    delete process.env.IDP_LOCAL_SECRET_KEY
    delete process.env.IDP_SECRET_KEY
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('degrades recovery summary when a newer backup supersedes the latest successful drill', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-recovery-summary-current-latest-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_LOCAL_SECRET_KEY = 'test-recovery-summary-current-latest-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')

    const originalBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'original drill backup',
    })
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, originalBackup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)
    await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID, {
      backup_id: originalBackup.id,
    })

    const baselineSummary = LocalIamRecoveryRuntimeStore.getSummary()
    expect(baselineSummary.latest_drill_targets_latest_backup).toBe(true)

    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'newer backup after successful drill',
    })

    const degradedSummary = LocalIamRecoveryRuntimeStore.getSummary()
    expect(degradedSummary.latest_drill_targets_latest_backup).toBe(false)
  }, 15_000)
})
