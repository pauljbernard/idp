const path = require('path')
const { randomUUID } = require('crypto')
const { rootDir, startDistributedStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  loginWithConsent,
  requestJson,
  resolveAuthConfig,
  verifyDistributedIntegrationEnv,
  writeReport,
} = require('./runtimeLocalstackHelpers')

function operationsHeaders(realmId, sessionId, extraHeaders = {}) {
  return {
    'content-type': 'application/json',
    'x-iam-session-id': sessionId,
    'x-iam-realm-id': realmId,
    ...extraHeaders,
  }
}

function findCheck(response, checkId) {
  return response?.checks?.find((check) => check.id === checkId) ?? null
}

async function corruptDurableArtifact(objectKey) {
  const [{ PutObjectCommand }, { createS3Client }] = await Promise.all([
    import('@aws-sdk/client-s3'),
    import('../../deploy/iam-standalone/aws-clone-client.mjs'),
  ])

  const client = createS3Client()
  await client.send(new PutObjectCommand({
    Bucket: process.env.IDP_PLATFORM_DURABLE_S3_BUCKET,
    Key: objectKey,
    Body: '{"corrupted":true,"reason":"runtime-dependency-failure-drill"}',
    ContentType: 'application/json',
  }))
}

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4115,
    tempRoot: path.join(rootDir, '.tmp', 'integration', 'bounded-production-runtime-dependency-failure-drill'),
    logFile: path.join(rootDir, '.tmp', 'integration', 'bounded-production-runtime-dependency-failure-drill', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'
    const login = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const rehearsalId = randomUUID()

    const baselineBackup = await requestJson(`${api.baseUrl}/api/v1/iam/operations/backups`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-baseline-backup-${rehearsalId}`,
      }),
      body: JSON.stringify({
        label: `failure-drill-baseline-${rehearsalId}`,
      }),
    })
    assert(baselineBackup.status === 201, 'Baseline backup creation failed.', baselineBackup.text)

    const baselineRestore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-baseline-restore-${rehearsalId}`,
      }),
      body: JSON.stringify({
        backup_id: baselineBackup.json.id,
        mode: 'DRY_RUN',
      }),
    })
    assert(baselineRestore.status === 201, 'Baseline dry-run restore failed.', baselineRestore.text)

    const baselineRotation = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys/rotate`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-baseline-rotation-${rehearsalId}`,
      }),
      body: JSON.stringify({
        realm_id: 'global',
      }),
    })
    assert(baselineRotation.status === 201, 'Baseline signing key rotation failed.', baselineRotation.text)

    const baselineRecovery = await requestJson(`${api.baseUrl}/api/v1/iam/operations/recovery/drills`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-baseline-recovery-${rehearsalId}`,
      }),
      body: JSON.stringify({
        backup_id: baselineBackup.json.id,
      }),
    })
    assert(baselineRecovery.status === 201, 'Baseline recovery drill failed.', baselineRecovery.text)

    const readinessBefore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/readiness-review`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(readinessBefore.ok, 'Failed to load readiness review before failure injection.', readinessBefore.text)

    const baselineRestoreLineage = findCheck(readinessBefore.json, 'restore-rehearsal-lineage')
    const baselineRecoveryLineage = findCheck(readinessBefore.json, 'recovery-drill-lineage')
    const baselineKeyRotation = findCheck(readinessBefore.json, 'signing-key-rotation')

    assert(baselineRestoreLineage?.status === 'PASS', 'Baseline readiness did not have passing restore lineage evidence.', readinessBefore.json)
    assert(baselineRecoveryLineage?.status === 'PASS', 'Baseline readiness did not have passing recovery lineage evidence.', readinessBefore.json)
    assert(baselineKeyRotation?.status === 'PASS', 'Baseline readiness did not have passing signing-key rotation evidence.', readinessBefore.json)

    const failedBackup = await requestJson(`${api.baseUrl}/api/v1/iam/operations/backups`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-injected-backup-${rehearsalId}`,
      }),
      body: JSON.stringify({
        label: `failure-drill-injected-${rehearsalId}`,
      }),
    })
    assert(failedBackup.status === 201, 'Injected backup creation failed.', failedBackup.text)
    assert(typeof failedBackup.json?.object_key === 'string', 'Injected backup did not expose object_key.', failedBackup.json)

    await corruptDurableArtifact(failedBackup.json.object_key)

    const failedRestore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-injected-restore-${rehearsalId}`,
      }),
      body: JSON.stringify({
        backup_id: failedBackup.json.id,
        mode: 'DRY_RUN',
      }),
    })
    assert(failedRestore.status === 500, 'Injected restore did not fail with 500 after durable artifact corruption.', failedRestore.text)

    const failedRecovery = await requestJson(`${api.baseUrl}/api/v1/iam/operations/recovery/drills`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-injected-recovery-${rehearsalId}`,
      }),
      body: JSON.stringify({
        backup_id: failedBackup.json.id,
      }),
    })
    assert(failedRecovery.status === 500, 'Injected recovery drill did not fail with 500 after durable artifact corruption.', failedRecovery.text)

    const readinessAfter = await requestJson(`${api.baseUrl}/api/v1/iam/operations/readiness-review`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(readinessAfter.ok, 'Failed to load readiness review after failure injection.', readinessAfter.text)
    const recordedReview = await requestJson(`${api.baseUrl}/api/v1/iam/operations/readiness-review`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': `failure-drill-readiness-record-${rehearsalId}`,
      }),
      body: JSON.stringify({
        notes: ['Injected durable artifact loss for latest backup lineage'],
      }),
    })
    assert(recordedReview.status === 201, 'Failed to record readiness review after injected dependency failure.', recordedReview.text)

    const afterRestoreLineage = findCheck(readinessAfter.json, 'restore-rehearsal-lineage')
    const afterRecoveryLineage = findCheck(readinessAfter.json, 'recovery-drill-lineage')

    assert(afterRestoreLineage?.status === 'WARN', 'Restore lineage did not degrade after injected durable artifact failure.', readinessAfter.json)
    assert(afterRecoveryLineage?.status === 'WARN', 'Recovery lineage did not degrade after injected durable artifact failure.', readinessAfter.json)
    assert(recordedReview.json?.decision === 'BLOCKED', 'Readiness review did not block after injected dependency failure.', recordedReview.json)

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      state_table: process.env.IDP_PLATFORM_STATE_DYNAMODB_TABLE,
      durable_bucket: process.env.IDP_PLATFORM_DURABLE_S3_BUCKET,
      checks: {
        all_steps_passed: true,
        overall_pass: true,
        realm_id: authConfig.realm_id,
        baseline_backup_id: baselineBackup.json.id,
        baseline_recovery_drill_id: baselineRecovery.json.id,
        injected_backup_id: failedBackup.json.id,
        injected_object_key_corrupted: true,
        failed_restore_status: failedRestore.status,
        failed_recovery_status: failedRecovery.status,
        readiness_restore_lineage_before: baselineRestoreLineage.status,
        readiness_restore_lineage_after: afterRestoreLineage.status,
        readiness_recovery_lineage_before: baselineRecoveryLineage.status,
        readiness_recovery_lineage_after: afterRecoveryLineage.status,
        recorded_readiness_decision_after_failure: recordedReview.json.decision,
      },
    }

    const reportPath = writeReport('latest-bounded-production-runtime-dependency-failure-drill.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
