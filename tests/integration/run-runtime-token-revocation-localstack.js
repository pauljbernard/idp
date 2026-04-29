const path = require('path')
const { startDistributedStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  getUserInfo,
  introspectToken,
  issueBrowserToken,
  loginWithConsent,
  logout,
  resolveAuthConfig,
  verifyDistributedIntegrationEnv,
  writeReport,
} = require('./runtimeLocalstackHelpers')

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4104,
    tempRoot: path.join(__dirname, '..', '..', '.tmp', 'integration', 'runtime-token-revocation-localstack'),
    logFile: path.join(__dirname, '..', '..', '.tmp', 'integration', 'runtime-token-revocation-localstack', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'

    const login = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const tokenSet = await issueBrowserToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, login.session_id)
    const introspectionBefore = await introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, tokenSet.access_token)
    const userinfoBefore = await getUserInfo(api.baseUrl, authConfig.realm_id, tokenSet.access_token)
    const logoutResult = await logout(api.baseUrl, authConfig.realm_id, login.session_id)
    const introspectionAfter = await introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, tokenSet.access_token)

    const userinfoAfter = await fetch(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/protocol/openid-connect/userinfo`, {
      headers: {
        authorization: `Bearer ${tokenSet.access_token}`,
      },
    })
    const userinfoAfterText = await userinfoAfter.text()

    assert(introspectionBefore.active === true, 'Pre-logout introspection should be active.', introspectionBefore)
    assert(typeof userinfoBefore.sub === 'string' && userinfoBefore.sub.length > 0, 'Pre-logout userinfo missing subject.', userinfoBefore)
    assert(logoutResult.revoked === true, 'Logout did not report session revocation.', logoutResult)
    assert(introspectionAfter.active === false, 'Post-logout introspection should be inactive.', introspectionAfter)
    assert(userinfoAfter.status === 401, 'Post-logout userinfo should be unauthorized.', userinfoAfterText)

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      checks: {
        realm_id: authConfig.realm_id,
        session_id: login.session_id,
        access_token_present: typeof tokenSet.access_token === 'string',
        introspection_active_before_logout: introspectionBefore.active,
        introspection_active_after_logout: introspectionAfter.active,
        userinfo_subject_before_logout: userinfoBefore.sub,
        userinfo_status_after_logout: userinfoAfter.status,
        logout_revoked: logoutResult.revoked,
      },
    }

    const reportPath = writeReport('latest-runtime-token-revocation-localstack.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
