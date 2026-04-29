import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('recovery drill idempotency', () => {
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

  it('reuses the original recovery drill and nested evidence for the same idempotency key', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-recovery-idempotency-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    let { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')
    let { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const firstRecord = await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID, {
      idempotency_key: 'recovery-drill-idempotency-key',
    })

    expect(LocalIamOperationsRuntimeStore.listBackups().count).toBe(1)
    expect(LocalIamOperationsRuntimeStore.listRestores().count).toBe(1)
    expect(LocalIamOperationsRuntimeStore.listResilienceRuns().count).toBe(1)

    vi.resetModules()

    ;({ LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime'))
    ;({ LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime'))

    const secondRecord = await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID, {
      idempotency_key: 'recovery-drill-idempotency-key',
    })

    expect(secondRecord.id).toBe(firstRecord.id)
    expect(secondRecord.backup_id).toBe(firstRecord.backup_id)
    expect(secondRecord.restore_record_id).toBe(firstRecord.restore_record_id)
    expect(secondRecord.resilience_run_id).toBe(firstRecord.resilience_run_id)
    expect(LocalIamOperationsRuntimeStore.listBackups().count).toBe(1)
    expect(LocalIamOperationsRuntimeStore.listRestores().count).toBe(1)
    expect(LocalIamOperationsRuntimeStore.listResilienceRuns().count).toBe(1)
  }, 20000)

  it('warns when a recovery drill targets an older backup instead of the latest backup lineage', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-recovery-lineage-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_LOCAL_SECRET_KEY = 'test-recovery-lineage-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const olderBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'older backup',
    })
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'latest backup',
    })

    const record = await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID, {
      backup_id: olderBackup.id,
    })

    expect(record.status).toBe('WARN')
    expect(record.backup_lineage_validated).toBe(true)
    expect(record.latest_backup_at_execution).toBe(false)
    expect(record.notes).toContain(
      'Recovery drill targeted an older backup artifact; rerun the drill against the latest backup to satisfy readiness evidence.',
    )
  }, 20000)
})
