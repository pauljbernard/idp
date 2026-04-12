import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

function applyFilesystemTestEnvironment(stateRoot: string) {
  process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
  process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
  process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
}

function rewriteEnvelopeState<T>(filePath: string, mutate: (state: T) => void) {
  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    version: number
    saved_at: string
    state: T
  }
  mutate(envelope.state)
  envelope.saved_at = new Date().toISOString()
  writeFileSync(filePath, JSON.stringify(envelope), 'utf8')
}

describe('readiness operational evidence', () => {
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

  it('fails readiness hardening when secret storage still uses development fallback key material', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-readiness-operational-evidence-'))
    applyFilesystemTestEnvironment(stateRoot)

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)

    const review = await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID)
    const secretStoreCheck = review.checks.find((check) => check.id === 'secret-store-key-source')

    expect(secretStoreCheck).toBeDefined()
    expect(secretStoreCheck?.status).toBe('FAIL')
    expect(secretStoreCheck?.summary).toContain('development fallback key material')
    expect(review.decision).toBe('BLOCKED')
  }, 10_000)

  it('marks stale backup, restore, and rotation evidence as insufficient for readiness', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-readiness-stale-evidence-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-readiness-operational-evidence-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)

    const fortyFiveDaysAgo = new Date(Date.now() - (1000 * 60 * 60 * 24 * 45)).toISOString()

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-operations-runtime-state.json'),
      (runtimeState) => {
        if (runtimeState.backups[0]) {
          runtimeState.backups[0].created_at = fortyFiveDaysAgo
        }
        if (runtimeState.restores[0]) {
          runtimeState.restores[0].created_at = fortyFiveDaysAgo
        }
        if (runtimeState.key_rotations[0]) {
          runtimeState.key_rotations[0].created_at = fortyFiveDaysAgo
        }
      },
    )

    const review = await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID)
    const backupCheck = review.checks.find((check) => check.id === 'backup-artifact')
    const restoreCheck = review.checks.find((check) => check.id === 'restore-evidence')
    const rotationCheck = review.checks.find((check) => check.id === 'signing-key-rotation')
    const secretStoreCheck = review.checks.find((check) => check.id === 'secret-store-key-source')

    expect(secretStoreCheck?.status).toBe('PASS')
    expect(backupCheck?.status).toBe('WARN')
    expect(backupCheck?.summary).toContain('seven-day readiness freshness window')
    expect(restoreCheck?.status).toBe('WARN')
    expect(restoreCheck?.summary).toContain('fourteen-day rehearsal window')
    expect(rotationCheck?.status).toBe('WARN')
    expect(rotationCheck?.summary).toContain('thirty-day readiness window')
  }, 10_000)

  it('requires restore rehearsal to match the latest backup lineage', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-readiness-restore-lineage-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-readiness-restore-lineage-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')

    const firstBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, firstBackup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'newer backup after last rehearsal',
    })

    const review = await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID)
    const lineageCheck = review.checks.find((check) => check.id === 'restore-rehearsal-lineage')

    expect(lineageCheck).toBeDefined()
    expect(lineageCheck?.status).toBe('WARN')
    expect(lineageCheck?.summary).toContain('does not match current backup')
    expect(review.decision).toBe('BLOCKED')
  }, 10_000)

  it('requires recovery drill evidence to target the latest backup lineage', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-readiness-recovery-lineage-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-readiness-recovery-lineage-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')

    const olderBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'older backup',
    })
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, olderBackup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'latest backup',
    })
    await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID, {
      backup_id: olderBackup.id,
    })

    const review = await LocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID)
    const recoveryCheck = review.checks.find((check) => check.id === 'recovery-drill-lineage')

    expect(recoveryCheck).toBeDefined()
    expect(recoveryCheck?.status).toBe('WARN')
    expect(recoveryCheck?.summary).toContain('did not target the latest backup artifact')
    expect(review.decision).toBe('BLOCKED')
  }, 10_000)

  it('requires recovery drill evidence to be fresh enough for readiness', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-readiness-recovery-freshness-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-readiness-recovery-freshness-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')
    const persistence = await import('../src/platform/persistence')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)
    await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID)

    const twentyOneDaysAgo = new Date(Date.now() - (1000 * 60 * 60 * 24 * 21)).toISOString()
    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-recovery-runtime-state.json'),
      (runtimeState) => {
        if (runtimeState.drills[0]) {
          runtimeState.drills[0].executed_at = twentyOneDaysAgo
        }
      },
    )

    vi.resetModules()
    const { LocalIamOperationsRuntimeStore: ReloadedLocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const review = await ReloadedLocalIamOperationsRuntimeStore.recordReadinessReviewAsync(IAM_SYSTEM_USER_ID)
    const recoveryCheck = review.checks.find((check) => check.id === 'recovery-drill-lineage')

    expect(recoveryCheck).toBeDefined()
    expect(recoveryCheck?.status).toBe('WARN')
    expect(recoveryCheck?.summary).toContain('older than the fourteen-day recovery freshness window')
    expect(review.decision).toBe('BLOCKED')
  }, 10_000)
})
