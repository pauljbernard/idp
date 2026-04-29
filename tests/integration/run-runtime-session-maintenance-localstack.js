const path = require('path')
const { startDistributedStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  listAccountSessions,
  loginWithConsent,
  rawSessionId,
  resolveAccountSession,
  resolveAuthConfig,
  revokeOtherAccountSessions,
  verifyDistributedIntegrationEnv,
  writeReport,
} = require('./runtimeLocalstackHelpers')

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4103,
    tempRoot: path.join(__dirname, '..', '..', '.tmp', 'integration', 'runtime-session-maintenance-localstack'),
    logFile: path.join(__dirname, '..', '..', '.tmp', 'integration', 'runtime-session-maintenance-localstack', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'

    const firstLogin = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const secondLogin = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const currentRawSessionId = rawSessionId(secondLogin.session_id)

    const sessionsBefore = await listAccountSessions(api.baseUrl, authConfig.realm_id, secondLogin.session_id)
    assert(Array.isArray(sessionsBefore.sessions), 'Account sessions response did not include sessions.', sessionsBefore)
    assert(sessionsBefore.sessions.length >= 2, 'Expected at least two sessions before revoke-others.', sessionsBefore)

    const revokeResponse = await revokeOtherAccountSessions(api.baseUrl, authConfig.realm_id, secondLogin.session_id)
    const firstSessionAfter = await resolveAccountSession(api.baseUrl, authConfig.realm_id, firstLogin.session_id, 401)
    const secondSessionAfter = await resolveAccountSession(api.baseUrl, authConfig.realm_id, secondLogin.session_id, 200)
    const sessionsAfter = await listAccountSessions(api.baseUrl, authConfig.realm_id, secondLogin.session_id)
    const activeSessionsAfter = sessionsAfter.sessions.filter((session) => session.status === 'ACTIVE')

    assert(
      revokeResponse.current_session_id === currentRawSessionId,
      'Revoke-others did not preserve the current session.',
      {
        expected_current_session_id: currentRawSessionId,
        actual_current_session_id: revokeResponse.current_session_id,
        revoke_response: revokeResponse,
      },
    )
    assert(
      revokeResponse.revoked_count >= 1,
      'Revoke-others did not report any revoked sessions.',
      revokeResponse,
    )
    assert(activeSessionsAfter.length === 1, 'Expected exactly one active session after revoke-others.', {
      sessions: sessionsAfter.sessions,
      active_sessions: activeSessionsAfter,
    })
    assert(activeSessionsAfter[0].session_id === currentRawSessionId, 'Remaining active session was not the current session.', {
      sessions: sessionsAfter.sessions,
      active_sessions: activeSessionsAfter,
    })

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      checks: {
        realm_id: authConfig.realm_id,
        current_session_id: currentRawSessionId,
        revoked_session_id: firstLogin.session_id,
        sessions_before_count: sessionsBefore.sessions.length,
        sessions_after_count: sessionsAfter.sessions.length,
        active_sessions_after_count: activeSessionsAfter.length,
        revoked_lookup_status: firstSessionAfter.status,
        current_lookup_status: secondSessionAfter.status,
      },
    }

    const reportPath = writeReport('latest-runtime-session-maintenance-localstack.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
