const path = require('path')
const { startDistributedStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  introspectToken,
  issueBrowserToken,
  listAccountSessions,
  loginWithConsent,
  logout,
  rawSessionId,
  resolveAccountSession,
  resolveAuthConfig,
  revokeOtherAccountSessions,
  verifyDistributedIntegrationEnv,
  writeReport,
} = require('./runtimeLocalstackHelpers')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function contextSessionId(response) {
  return response?.json?.session?.session_id ?? null
}

async function waitFor(name, run, timeoutMs = 20_000, intervalMs = 1_000) {
  const startedAt = Date.now()
  let attempts = 0
  let lastError = null

  while (Date.now() - startedAt < timeoutMs) {
    attempts += 1
    try {
      const result = await run()
      return {
        result,
        attempts,
        converged_in_ms: Date.now() - startedAt,
      }
    } catch (error) {
      lastError = error
      await delay(intervalMs)
    }
  }

  throw new Error(`${name} did not converge within ${timeoutMs}ms: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

async function main() {
  verifyDistributedIntegrationEnv()

  const tempRoot = path.join(__dirname, '..', '..', '.tmp', 'integration', 'runtime-multi-instance-localstack')
  const apiA = await startDistributedStandaloneApi({
    port: 4105,
    tempRoot: path.join(tempRoot, 'instance-a'),
    logFile: path.join(tempRoot, 'instance-a', 'standalone-api.log'),
  })
  const apiB = await startDistributedStandaloneApi({
    port: 4106,
    tempRoot: path.join(tempRoot, 'instance-b'),
    logFile: path.join(tempRoot, 'instance-b', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(apiA.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'
    const diagnostics = {}

    const firstLogin = await loginWithConsent(apiA.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const firstRawSessionId = rawSessionId(firstLogin.session_id)
    diagnostics.first_session_visible_on_instance_b = await waitFor('instance-b first session visibility', async () => {
      const response = await resolveAccountSession(apiB.baseUrl, authConfig.realm_id, firstLogin.session_id, 200)
      assert(contextSessionId(response) === firstRawSessionId, 'Instance B resolved the wrong session for the first login.', {
        expected_raw_session_id: firstRawSessionId,
        actual_session_id: contextSessionId(response),
        session_token: firstLogin.session_id,
        response: response.json,
      })
      return response
    })

    const firstTokenSet = await issueBrowserToken(apiA.baseUrl, authConfig.realm_id, authConfig.client_id, firstLogin.session_id)
    diagnostics.first_token_active_on_instance_b = await waitFor('instance-b first token introspection', async () => {
      const introspection = await introspectToken(apiB.baseUrl, authConfig.realm_id, authConfig.client_id, firstTokenSet.access_token)
      assert(introspection.active === true, 'Instance B did not see the first token as active.', introspection)
      return introspection
    })

    const secondLogin = await loginWithConsent(apiB.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const secondRawSessionId = rawSessionId(secondLogin.session_id)
    diagnostics.second_session_visible_on_instance_a = await waitFor('instance-a second session visibility before revoke', async () => {
      const response = await resolveAccountSession(apiA.baseUrl, authConfig.realm_id, secondLogin.session_id, 200)
      assert(contextSessionId(response) === secondRawSessionId, 'Instance A did not see the second session before revoke.', {
        expected_raw_session_id: secondRawSessionId,
        actual_session_id: contextSessionId(response),
        session_token: secondLogin.session_id,
        response: response.json,
      })
      return response
    })

    const secondTokenSet = await issueBrowserToken(apiB.baseUrl, authConfig.realm_id, authConfig.client_id, secondLogin.session_id)
    diagnostics.second_token_active_on_instance_a = await waitFor('instance-a second token introspection before revoke', async () => {
      const introspection = await introspectToken(apiA.baseUrl, authConfig.realm_id, authConfig.client_id, secondTokenSet.access_token)
      assert(introspection.active === true, 'Instance A did not see the second token as active before revoke.', introspection)
      return introspection
    })

    const sessionsBefore = await listAccountSessions(apiB.baseUrl, authConfig.realm_id, secondLogin.session_id)
    assert(Array.isArray(sessionsBefore.sessions), 'Account sessions response did not include sessions.', sessionsBefore)
    assert(sessionsBefore.sessions.length >= 2, 'Expected at least two sessions before cross-instance revoke-others.', sessionsBefore)

    const revokeResponse = await revokeOtherAccountSessions(apiB.baseUrl, authConfig.realm_id, secondLogin.session_id)
    assert(revokeResponse.current_session_id === secondRawSessionId, 'Cross-instance revoke-others did not preserve the current session.', {
      expected_current_session_id: secondRawSessionId,
      actual_current_session_id: revokeResponse.current_session_id,
      revoke_response: revokeResponse,
    })
    assert(revokeResponse.revoked_count >= 1, 'Cross-instance revoke-others did not revoke any sessions.', revokeResponse)

    diagnostics.first_session_revoked_on_instance_a = await waitFor('instance-a first session revoked', async () => resolveAccountSession(apiA.baseUrl, authConfig.realm_id, firstLogin.session_id, 401))
    diagnostics.first_token_inactive_on_instance_a = await waitFor('instance-a first token revoked', async () => {
      const introspection = await introspectToken(apiA.baseUrl, authConfig.realm_id, authConfig.client_id, firstTokenSet.access_token)
      assert(introspection.active === false, 'Instance A still saw the revoked token as active.', introspection)
      return introspection
    })

    diagnostics.second_session_still_active_on_instance_a = await waitFor('instance-a second session still active after revoke-others', async () => {
      const response = await resolveAccountSession(apiA.baseUrl, authConfig.realm_id, secondLogin.session_id, 200)
      assert(contextSessionId(response) === secondRawSessionId, 'Instance A lost the current session after revoke-others.', {
        expected_raw_session_id: secondRawSessionId,
        actual_session_id: contextSessionId(response),
        session_token: secondLogin.session_id,
        response: response.json,
      })
      return response
    })
    diagnostics.second_token_still_active_on_instance_a = await waitFor('instance-a second token still active after revoke-others', async () => {
      const introspection = await introspectToken(apiA.baseUrl, authConfig.realm_id, authConfig.client_id, secondTokenSet.access_token)
      assert(introspection.active === true, 'Instance A did not keep the current token active after revoke-others.', introspection)
      return introspection
    })

    const logoutResult = await logout(apiA.baseUrl, authConfig.realm_id, secondLogin.session_id)
    assert(logoutResult.revoked === true, 'Cross-instance logout did not report session revocation.', logoutResult)

    diagnostics.second_session_revoked_on_instance_b = await waitFor('instance-b second session revoked after logout', async () => resolveAccountSession(apiB.baseUrl, authConfig.realm_id, secondLogin.session_id, 401))
    diagnostics.second_token_inactive_on_instance_b = await waitFor('instance-b second token inactive after logout', async () => {
      const introspection = await introspectToken(apiB.baseUrl, authConfig.realm_id, authConfig.client_id, secondTokenSet.access_token)
      assert(introspection.active === false, 'Instance B still saw the second token as active after logout.', introspection)
      return introspection
    })

    const report = {
      generated_at: new Date().toISOString(),
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      instances: {
        instance_a: apiA.baseUrl,
        instance_b: apiB.baseUrl,
      },
      checks: {
        realm_id: authConfig.realm_id,
        first_session_id: firstRawSessionId,
        second_session_id: secondRawSessionId,
        first_token_present: typeof firstTokenSet.access_token === 'string',
        second_token_present: typeof secondTokenSet.access_token === 'string',
        sessions_before_revoke_count: sessionsBefore.sessions.length,
        revoke_others_current_session_id: revokeResponse.current_session_id,
        revoke_others_revoked_count: revokeResponse.revoked_count,
        logout_revoked: logoutResult.revoked,
        cross_instance_first_session_visible: true,
        cross_instance_first_token_active_before_revoke: true,
        cross_instance_first_session_revoked: true,
        cross_instance_first_token_inactive_after_revoke: true,
        cross_instance_second_session_visible: true,
        cross_instance_second_token_active_before_revoke: true,
        cross_instance_second_session_still_active_after_revoke_others: true,
        cross_instance_second_token_still_active_after_revoke_others: true,
        cross_instance_second_session_revoked_after_logout: true,
        cross_instance_second_token_inactive_after_logout: true,
      },
      diagnostics: Object.fromEntries(
        Object.entries(diagnostics).map(([key, value]) => [
          key,
          {
            attempts: value.attempts,
            converged_in_ms: value.converged_in_ms,
          },
        ]),
      ),
    }

    const reportPath = writeReport('latest-runtime-multi-instance-localstack.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await Promise.all([apiA.stop(), apiB.stop()])
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
