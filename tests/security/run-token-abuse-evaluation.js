const fs = require('fs')
const path = require('path')
const { startDistributedStandaloneApi, rootDir } = require('../support/standaloneApi')
const {
  assert,
  confirmPasswordReset,
  getUserInfo,
  introspectToken,
  issueBrowserToken,
  loginWithConsent,
  logout,
  refreshTokenGrant,
  requestJson,
  requestPasswordReset,
  resolveAuthConfig,
  verifyDistributedIntegrationEnv,
} = require('../integration/runtimeLocalstackHelpers')

async function measure(name, run) {
  const started = Date.now()
  const value = await run()
  return {
    name,
    value,
    duration_ms: Date.now() - started,
  }
}

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4107,
    tempRoot: path.join(rootDir, '.tmp', 'security', 'token-abuse'),
    logFile: path.join(rootDir, '.tmp', 'security', 'token-abuse', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'

    const login = await measure('login_with_consent', () =>
      loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password),
    )
    const tokenSet = await measure('issue_browser_token', () =>
      issueBrowserToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, login.value.session_id),
    )
    const introspectionBeforeLogout = await measure('introspect_before_logout', () =>
      introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, tokenSet.value.access_token),
    )
    const userinfoBeforeLogout = await measure('userinfo_before_logout', () =>
      getUserInfo(api.baseUrl, authConfig.realm_id, tokenSet.value.access_token),
    )
    const refreshBeforeLogout = await measure('refresh_grant_before_logout', () =>
      refreshTokenGrant(api.baseUrl, authConfig.realm_id, authConfig.client_id, tokenSet.value.refresh_token),
    )
    const activeRefreshToken =
      typeof refreshBeforeLogout.value.json?.refresh_token === 'string' && refreshBeforeLogout.value.json.refresh_token.length > 0
        ? refreshBeforeLogout.value.json.refresh_token
        : tokenSet.value.refresh_token
    const logoutResult = await measure('logout', () =>
      logout(api.baseUrl, authConfig.realm_id, login.value.session_id),
    )
    const introspectionAfterLogout = await measure('introspect_after_logout', () =>
      introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, tokenSet.value.access_token),
    )
    const refreshAfterLogout = await measure('refresh_grant_after_logout', () =>
      refreshTokenGrant(api.baseUrl, authConfig.realm_id, authConfig.client_id, activeRefreshToken),
    )

    const replayedUserinfoStarted = Date.now()
    const replayedUserinfo = await fetch(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/protocol/openid-connect/userinfo`, {
      headers: {
        authorization: `Bearer ${tokenSet.value.access_token}`,
      },
    })
    const replayedUserinfoText = await replayedUserinfo.text()
    const replayedUserinfoDurationMs = Date.now() - replayedUserinfoStarted

    const passwordReset = await measure('password_reset_request', () =>
      requestPasswordReset(api.baseUrl, authConfig.realm_id, username),
    )
    const passwordResetConfirm = await measure('password_reset_confirm', () =>
      confirmPasswordReset(
        api.baseUrl,
        authConfig.realm_id,
        passwordReset.value.ticket_id,
        passwordReset.value.code_preview,
        password,
      ),
    )

    const replayedPasswordReset = await measure('password_reset_replay', () =>
      requestJson(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: passwordReset.value.ticket_id,
          code: passwordReset.value.code_preview,
          new_password: password,
        }),
      }),
    )

    const wrongCodePasswordReset = await measure('password_reset_wrong_code', () =>
      requestJson(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ticket_id: passwordReset.value.ticket_id,
          code: `${passwordReset.value.code_preview}-wrong`,
          new_password: password,
        }),
      }),
    )

    assert(introspectionBeforeLogout.value.active === true, 'Expected active token before logout.', introspectionBeforeLogout.value)
    assert(typeof userinfoBeforeLogout.value.sub === 'string' && userinfoBeforeLogout.value.sub.length > 0, 'Expected userinfo subject before logout.', userinfoBeforeLogout.value)
    assert(refreshBeforeLogout.value.ok === true, 'Expected refresh grant to work before logout.', refreshBeforeLogout.value.text)
    assert(typeof refreshBeforeLogout.value.json?.access_token === 'string' && refreshBeforeLogout.value.json.access_token.length > 0, 'Expected refresh grant to issue a new access token.', refreshBeforeLogout.value.json)
    assert(logoutResult.value.revoked === true, 'Expected logout to revoke the current session.', logoutResult.value)
    assert(introspectionAfterLogout.value.active === false, 'Expected inactive token after logout replay.', introspectionAfterLogout.value)
    assert(refreshAfterLogout.value.ok === false, 'Expected refresh token replay after logout to fail.', refreshAfterLogout.value.text)
    assert(refreshAfterLogout.value.status === 400 || refreshAfterLogout.value.status === 401, 'Expected refresh token replay after logout to return 400 or 401.', refreshAfterLogout.value.text)
    assert(replayedUserinfo.status === 401, 'Expected revoked bearer token to fail userinfo.', replayedUserinfoText)
    assert(typeof passwordResetConfirm.value.user_id === 'string' && passwordResetConfirm.value.user_id.length > 0, 'Expected password reset confirm to succeed once.', passwordResetConfirm.value)
    assert(replayedPasswordReset.value.status === 400, 'Expected password reset replay to fail.', replayedPasswordReset.value.text)
    assert(wrongCodePasswordReset.value.status === 400, 'Expected password reset wrong-code replay to fail.', wrongCodePasswordReset.value.text)

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      checks: {
        realm_id: authConfig.realm_id,
        session_id: login.value.session_id,
        token_active_before_logout: introspectionBeforeLogout.value.active,
        token_active_after_logout: introspectionAfterLogout.value.active,
        userinfo_subject_before_logout: userinfoBeforeLogout.value.sub,
        refresh_grant_before_logout_status: refreshBeforeLogout.value.status,
        refresh_grant_after_logout_status: refreshAfterLogout.value.status,
        logout_revoked: logoutResult.value.revoked,
        replayed_userinfo_status: replayedUserinfo.status,
        password_reset_ticket_id: passwordReset.value.ticket_id,
        password_reset_user_id: passwordResetConfirm.value.user_id,
        replayed_password_reset_status: replayedPasswordReset.value.status,
        wrong_code_password_reset_status: wrongCodePasswordReset.value.status,
      },
      diagnostics: {
        login_with_consent_ms: login.duration_ms,
        issue_browser_token_ms: tokenSet.duration_ms,
        introspect_before_logout_ms: introspectionBeforeLogout.duration_ms,
        userinfo_before_logout_ms: userinfoBeforeLogout.duration_ms,
        refresh_grant_before_logout_ms: refreshBeforeLogout.duration_ms,
        logout_ms: logoutResult.duration_ms,
        introspect_after_logout_ms: introspectionAfterLogout.duration_ms,
        refresh_grant_after_logout_ms: refreshAfterLogout.duration_ms,
        replayed_userinfo_ms: replayedUserinfoDurationMs,
        password_reset_request_ms: passwordReset.duration_ms,
        password_reset_confirm_ms: passwordResetConfirm.duration_ms,
        password_reset_replay_ms: replayedPasswordReset.duration_ms,
        password_reset_wrong_code_ms: wrongCodePasswordReset.duration_ms,
      },
    }

    const reportPath = path.join(rootDir, 'tests', 'security', 'latest-token-abuse-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
