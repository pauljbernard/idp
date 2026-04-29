const fs = require('fs')
const path = require('path')
const { startStandaloneApi, rootDir } = require('../support/standaloneApi')
const { loginWithConsent, resolveAuthConfig, requestJson, resolveAccountSession } = require('../integration/runtimeLocalstackHelpers')

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}` : ''
    throw new Error(`${message}${suffix}`)
  }
}

async function main() {
  const api = await startStandaloneApi({
    port: 4108,
    tempRoot: path.join(rootDir, '.tmp', 'security', 'authz'),
    logFile: path.join(rootDir, '.tmp', 'security', 'authz', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'

    const unauthenticatedClients = await fetch(`${api.baseUrl}/api/v1/iam/clients`)
    const unauthenticatedSession = await fetch(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/account/session`)
    const unauthenticatedRevokeOthers = await fetch(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/account/sessions/revoke-others`, {
      method: 'POST',
    })

    const login = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const validSession = await resolveAccountSession(api.baseUrl, authConfig.realm_id, login.session_id, 200)
    const crossRealmSession = await resolveAccountSession(api.baseUrl, 'realm-training-validation', login.session_id, 401)
    const foreignSessionRevoke = await requestJson(`${api.baseUrl}/api/v1/iam/realms/realm-training-validation/account/sessions/revoke-others`, {
      method: 'POST',
      headers: {
        'x-iam-session-id': login.session_id,
        'x-iam-realm-id': authConfig.realm_id,
      },
    })

    assert(unauthenticatedClients.status === 401, 'Expected protected IAM clients route to require authentication.')
    assert(unauthenticatedSession.status === 401, 'Expected IAM account session route to require authentication.')
    assert(unauthenticatedRevokeOthers.status === 401, 'Expected revoke-others route to require authentication.')
    assert(validSession.status === 200, 'Expected active session lookup to succeed.', validSession.text)
    assert(crossRealmSession.status === 401, 'Expected cross-realm session lookup to fail.', crossRealmSession.text)
    assert(foreignSessionRevoke.status === 400 || foreignSessionRevoke.status === 401, 'Expected cross-realm revoke-others attempt to fail.', foreignSessionRevoke.text)

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      checks: {
        realm_id: authConfig.realm_id,
        session_id: login.session_id,
        unauthenticated_clients_status: unauthenticatedClients.status,
        unauthenticated_account_session_status: unauthenticatedSession.status,
        unauthenticated_revoke_others_status: unauthenticatedRevokeOthers.status,
        valid_session_lookup_status: validSession.status,
        cross_realm_session_lookup_status: crossRealmSession.status,
        cross_realm_revoke_others_status: foreignSessionRevoke.status,
      },
    }

    const reportPath = path.join(rootDir, 'tests', 'security', 'latest-authz-report.json')
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
