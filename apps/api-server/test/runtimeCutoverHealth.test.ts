import { mkdtempSync, rmSync } from 'fs'
import { readFileSync, writeFileSync } from 'fs'
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

describe('runtime cutover health', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    delete process.env.IDP_DDB_RUNTIME_DUAL_WRITE
    delete process.env.IDP_DDB_RUNTIME_READ_V2
    delete process.env.IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE
    delete process.env.IDP_IAM_RUNTIME_DDB_TABLE
    delete process.env.IDP_RUNTIME_DYNAMODB_TABLE
    delete process.env.AWS_REGION
    delete process.env.AWS_DEFAULT_REGION
    delete process.env.IDP_DYNAMODB_ENDPOINT
    delete process.env.AWS_DYNAMODB_ENDPOINT
    delete process.env.AWS_ENDPOINT
    delete process.env.IDP_LOCAL_SECRET_KEY
    delete process.env.IDP_SECRET_KEY
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('reports runtime cutover as unproven when cutover flags are disabled', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)

    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')

    const summary = LocalIamHealthRuntimeStore.getHealthSummary()
    const runtimeCutoverCheck = summary.checks.find((check) => check.id === 'runtime-cutover-readiness')

    expect(runtimeCutoverCheck).toBeDefined()
    expect(runtimeCutoverCheck?.status).toBe('WARN')
    expect(runtimeCutoverCheck?.summary).toContain('flags are disabled')
    expect(summary.advisories).toContain(runtimeCutoverCheck?.summary)
  })

  it('reports noop fallback risk when runtime cutover flags are enabled without a runtime table', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')

    const summary = LocalIamHealthRuntimeStore.getHealthSummary()
    const runtimeCutoverCheck = summary.checks.find((check) => check.id === 'runtime-cutover-readiness')

    expect(runtimeCutoverCheck).toBeDefined()
    expect(runtimeCutoverCheck?.status).toBe('FAIL')
    expect(runtimeCutoverCheck?.summary).toContain('noop fallback')
    expect(runtimeCutoverCheck?.summary).toContain('login_transactions=NOOP_FALLBACK')
    expect(runtimeCutoverCheck?.summary).toContain('issued_tokens=NOOP_FALLBACK')
    expect(summary.overall_status).toBe('FAILED')
  })

  it('fails health hardening when the secret store still uses development fallback key material', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)

    const summary = LocalIamHealthRuntimeStore.getHealthSummary()
    const evidenceHardeningCheck = summary.checks.find((check) => check.id === 'operations-evidence-hardening')

    expect(evidenceHardeningCheck).toBeDefined()
    expect(evidenceHardeningCheck?.status).toBe('FAIL')
    expect(evidenceHardeningCheck?.summary).toContain('Secret-store key source hardening')
    expect(evidenceHardeningCheck?.summary).toContain('DEVELOPMENT_FALLBACK')
    expect(summary.overall_status).toBe('FAILED')
  })

  it('passes health hardening when operational evidence is current and the secret store key is configured', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-runtime-health-hardening-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')

    const backup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, backup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)

    const summary = LocalIamHealthRuntimeStore.getHealthSummary()
    const evidenceHardeningCheck = summary.checks.find((check) => check.id === 'operations-evidence-hardening')

    expect(evidenceHardeningCheck).toBeDefined()
    expect(evidenceHardeningCheck?.status).toBe('PASS')
    expect(evidenceHardeningCheck?.summary).toContain('Operational evidence hardening is current')
  })

  it('warns health hardening when restore rehearsal does not match the latest backup lineage', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-runtime-health-restore-lineage-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')

    const firstBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID)
    await LocalIamOperationsRuntimeStore.restoreBackupAsync(IAM_SYSTEM_USER_ID, firstBackup.id, 'DRY_RUN')
    await LocalIamOperationsRuntimeStore.rotateSigningKeyAsync(IAM_SYSTEM_USER_ID, null)
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'newer backup after rehearsal',
    })

    const summary = LocalIamHealthRuntimeStore.getHealthSummary()
    const evidenceHardeningCheck = summary.checks.find((check) => check.id === 'operations-evidence-hardening')

    expect(evidenceHardeningCheck).toBeDefined()
    expect(evidenceHardeningCheck?.status).toBe('WARN')
    expect(evidenceHardeningCheck?.summary).toContain('Restore rehearsal lineage')
  })

  it('warns recovery hardening when the latest recovery drill targeted an older backup', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-runtime-health-recovery-current-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')
    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')

    const olderBackup = await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'older backup',
    })
    await LocalIamOperationsRuntimeStore.createBackupAsync(IAM_SYSTEM_USER_ID, {
      label: 'latest backup',
    })
    await LocalIamRecoveryRuntimeStore.runRecoveryDrillAsync(IAM_SYSTEM_USER_ID, {
      backup_id: olderBackup.id,
    })

    const summary = LocalIamHealthRuntimeStore.getHealthSummary()
    const recoveryHardeningCheck = summary.checks.find((check) => check.id === 'recovery-hardening')

    expect(recoveryHardeningCheck).toBeDefined()
    expect(recoveryHardeningCheck?.status).toBe('WARN')
    expect(recoveryHardeningCheck?.summary).toContain('did not target the latest backup artifact')
  })

  it('warns recovery hardening when the latest recovery drill is stale', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-health-'))
    applyFilesystemTestEnvironment(stateRoot)
    process.env.IDP_LOCAL_SECRET_KEY = 'test-runtime-health-recovery-freshness-key'

    const { IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamRecoveryRuntimeStore } = await import('../src/platform/iamRecoveryRuntime')
    const { LocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')
    const persistence = await import('../src/platform/persistence')

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
    const { LocalIamHealthRuntimeStore: ReloadedLocalIamHealthRuntimeStore } = await import('../src/platform/iamHealthRuntime')
    const summary = ReloadedLocalIamHealthRuntimeStore.getHealthSummary()
    const recoveryHardeningCheck = summary.checks.find((check) => check.id === 'recovery-hardening')

    expect(recoveryHardeningCheck).toBeDefined()
    expect(recoveryHardeningCheck?.status).toBe('WARN')
    expect(recoveryHardeningCheck?.summary).toContain('older than the fourteen-day recovery freshness window')
  })
})
