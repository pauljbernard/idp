const path = require('path')
const { rootDir, startDistributedStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  confirmPasswordReset,
  getUserInfo,
  introspectToken,
  issueBrowserToken,
  loginWithConsent,
  logout,
  requestJson,
  requestPasswordReset,
  resolveAccountSession,
  resolveAuthConfig,
  verifyDistributedIntegrationEnv,
  writeReport,
} = require('./runtimeLocalstackHelpers')

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4102,
    tempRoot: path.join(rootDir, '.tmp', 'integration', 'runtime-cutover-localstack'),
    logFile: path.join(rootDir, '.tmp', 'integration', 'runtime-cutover-localstack', 'standalone-api.log'),
  })

  try {
    const health = await requestJson(`${api.baseUrl}/health`)
    assert(health.ok, 'Health check failed.', health.text)

    const authConfig = await resolveAuthConfig(api.baseUrl)
    const login = await loginWithConsent(
      api.baseUrl,
      authConfig.realm_id,
      authConfig.client_id,
      process.env.IDP_ADMIN_EMAIL || 'admin@idp.local',
      process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026',
    )

    const accountSessionResponse = await resolveAccountSession(api.baseUrl, authConfig.realm_id, login.session_id)
    const accountSession = accountSessionResponse.json
    const passwordReset = await requestPasswordReset(
      api.baseUrl,
      authConfig.realm_id,
      process.env.IDP_ADMIN_EMAIL || 'admin@idp.local',
    )
    const passwordResetConfirm = await confirmPasswordReset(
      api.baseUrl,
      authConfig.realm_id,
      passwordReset.ticket_id,
      passwordReset.code_preview,
      process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026',
    )

    const tokenSet = await issueBrowserToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, login.session_id)
    const introspection = await introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, tokenSet.access_token)
    const userinfo = await getUserInfo(api.baseUrl, authConfig.realm_id, tokenSet.access_token)
    const logoutResult = await logout(api.baseUrl, authConfig.realm_id, login.session_id)

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      rate_limit_backend: 'dynamodb',
      checks: {
        health_status: health.status,
        realm_id: authConfig.realm_id,
        client_id: authConfig.client_id,
        session_id: login.session_id,
        account_session_user_id: accountSession.user?.id ?? null,
        password_reset_ticket_id: passwordReset.ticket_id,
        password_reset_user_id: passwordResetConfirm.user_id,
        introspection_active: introspection.active,
        userinfo_subject: userinfo.sub,
        logout_revoked: logoutResult.revoked,
      },
    }

    assert(accountSession.user && typeof accountSession.user.id === 'string', 'Account session response did not include a resolved user.', accountSession)
    assert(passwordResetConfirm.user_id === accountSession.user.id, 'Password reset confirmed a different user than the active session.', {
      passwordResetConfirm,
      accountSession,
    })
    assert(introspection.active === true, 'Introspection did not return an active token.', introspection)
    assert(typeof userinfo.sub === 'string' && userinfo.sub.length > 0, 'Userinfo response did not include sub.', userinfo)
    assert(logoutResult.revoked === true, 'Logout did not revoke the account session.', logoutResult)

    const reportPath = writeReport('latest-runtime-cutover-localstack.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
