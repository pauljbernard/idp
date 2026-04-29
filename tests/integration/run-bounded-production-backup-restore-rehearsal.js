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

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4113,
    tempRoot: path.join(rootDir, '.tmp', 'integration', 'bounded-production-backup-restore-rehearsal'),
    logFile: path.join(rootDir, '.tmp', 'integration', 'bounded-production-backup-restore-rehearsal', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'
    const login = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const rehearsalId = randomUUID()
    const backupIdempotencyKey = `bounded-production-backup-${rehearsalId}`
    const restoreDryRunIdempotencyKey = `bounded-production-restore-dry-run-${rehearsalId}`
    const restoreExecuteIdempotencyKey = `bounded-production-restore-execute-${rehearsalId}`

    const backupsBefore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/backups`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(backupsBefore.ok, 'Failed to list backups before rehearsal.', backupsBefore.text)

    const createBackup = await requestJson(`${api.baseUrl}/api/v1/iam/operations/backups`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': backupIdempotencyKey,
      }),
      body: JSON.stringify({
        label: `bounded-production-rehearsal-${rehearsalId}`,
      }),
    })
    assert(createBackup.status === 201, 'Backup creation did not return 201.', createBackup.text)
    assert(typeof createBackup.json?.id === 'string', 'Backup creation did not return a backup id.', createBackup.json)

    const replayBackup = await requestJson(`${api.baseUrl}/api/v1/iam/operations/backups`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': backupIdempotencyKey,
      }),
      body: JSON.stringify({
        label: `bounded-production-rehearsal-replay-${rehearsalId}`,
      }),
    })
    assert(replayBackup.status === 201, 'Backup idempotent replay did not return 201.', replayBackup.text)
    assert(replayBackup.json?.id === createBackup.json.id, 'Backup idempotent replay returned a different backup id.', {
      first: createBackup.json,
      replay: replayBackup.json,
    })

    const backupsAfter = await requestJson(`${api.baseUrl}/api/v1/iam/operations/backups`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(backupsAfter.ok, 'Failed to list backups after rehearsal backup.', backupsAfter.text)
    assert(Array.isArray(backupsAfter.json?.backups), 'Backup list did not return backups.', backupsAfter.json)
    assert(
      backupsAfter.json.backups.some((backup) => backup.id === createBackup.json.id),
      'Created backup is missing from backup list.',
      backupsAfter.json,
    )
    assert(
      backupsAfter.json.count === backupsBefore.json.count + 1,
      'Backup rehearsal added an unexpected number of backup records.',
      {
        before: backupsBefore.json.count,
        after: backupsAfter.json.count,
      },
    )

    const restoresBefore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(restoresBefore.ok, 'Failed to list restores before rehearsal.', restoresBefore.text)

    const dryRunRestore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': restoreDryRunIdempotencyKey,
      }),
      body: JSON.stringify({
        backup_id: createBackup.json.id,
        mode: 'DRY_RUN',
      }),
    })
    assert(dryRunRestore.status === 201, 'Dry-run restore did not return 201.', dryRunRestore.text)
    assert(dryRunRestore.json?.status === 'VALIDATED', 'Dry-run restore did not return VALIDATED status.', dryRunRestore.json)

    const replayDryRunRestore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': restoreDryRunIdempotencyKey,
      }),
      body: JSON.stringify({
        backup_id: createBackup.json.id,
        mode: 'DRY_RUN',
      }),
    })
    assert(replayDryRunRestore.status === 201, 'Dry-run restore replay did not return 201.', replayDryRunRestore.text)
    assert(replayDryRunRestore.json?.id === dryRunRestore.json.id, 'Dry-run restore replay returned a different restore id.', {
      first: dryRunRestore.json,
      replay: replayDryRunRestore.json,
    })

    const executeRestore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': restoreExecuteIdempotencyKey,
      }),
      body: JSON.stringify({
        backup_id: createBackup.json.id,
        mode: 'EXECUTE',
      }),
    })
    assert(executeRestore.status === 201, 'Execute restore did not return 201.', executeRestore.text)
    assert(executeRestore.json?.status === 'APPLIED', 'Execute restore did not return APPLIED status.', executeRestore.json)

    const replayExecuteRestore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': restoreExecuteIdempotencyKey,
      }),
      body: JSON.stringify({
        backup_id: createBackup.json.id,
        mode: 'EXECUTE',
      }),
    })
    assert(replayExecuteRestore.status === 201, 'Execute restore replay did not return 201.', replayExecuteRestore.text)
    assert(replayExecuteRestore.json?.id === executeRestore.json.id, 'Execute restore replay returned a different restore id.', {
      first: executeRestore.json,
      replay: replayExecuteRestore.json,
    })

    const restoresAfter = await requestJson(`${api.baseUrl}/api/v1/iam/operations/restores`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(restoresAfter.ok, 'Failed to list restores after rehearsal.', restoresAfter.text)
    assert(Array.isArray(restoresAfter.json?.restores), 'Restore list did not return restores.', restoresAfter.json)
    assert(restoresAfter.json?.active_run === null, 'Restore rehearsal left an active restore run behind.', restoresAfter.json)
    assert(
      restoresAfter.json.restores.some((restore) => restore.id === dryRunRestore.json.id && restore.status === 'VALIDATED'),
      'Dry-run restore record is missing from restore list.',
      restoresAfter.json,
    )
    assert(
      restoresAfter.json.restores.some((restore) => restore.id === executeRestore.json.id && restore.status === 'APPLIED'),
      'Execute restore record is missing from restore list.',
      restoresAfter.json,
    )
    assert(
      restoresAfter.json.count === restoresBefore.json.count + 2,
      'Restore rehearsal added an unexpected number of restore records.',
      {
        before: restoresBefore.json.count,
        after: restoresAfter.json.count,
      },
    )

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
        backup_id: createBackup.json.id,
        backup_replay_same_id: replayBackup.json.id === createBackup.json.id,
        backup_count_before: backupsBefore.json.count,
        backup_count_after: backupsAfter.json.count,
        restore_dry_run_id: dryRunRestore.json.id,
        restore_dry_run_status: dryRunRestore.json.status,
        restore_dry_run_replay_same_id: replayDryRunRestore.json.id === dryRunRestore.json.id,
        restore_execute_id: executeRestore.json.id,
        restore_execute_status: executeRestore.json.status,
        restore_execute_replay_same_id: replayExecuteRestore.json.id === executeRestore.json.id,
        restore_count_before: restoresBefore.json.count,
        restore_count_after: restoresAfter.json.count,
        restore_active_run_cleared: restoresAfter.json.active_run === null,
      },
    }

    const reportPath = writeReport('latest-bounded-production-backup-restore-rehearsal.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
