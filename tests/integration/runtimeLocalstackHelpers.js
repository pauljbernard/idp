const fs = require('fs')
const path = require('path')
const { createHash, randomBytes } = require('crypto')
const { execFileSync } = require('child_process')
const { rootDir } = require('../support/standaloneApi')

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details ? `\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}` : ''
    throw new Error(`${message}${suffix}`)
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let json = null

  if (text.trim()) {
    try {
      json = JSON.parse(text)
    } catch (error) {
      throw new Error(`Expected JSON from ${url}: ${error instanceof Error ? error.message : String(error)}\n${text}`)
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    text,
    json,
  }
}

function verifyRuntimeTableShape() {
  execFileSync('bash', ['deploy/iam-standalone/verify-runtime-cutover.sh'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  })
}

function verifyDistributedIntegrationEnv() {
  execFileSync('bash', ['deploy/iam-standalone/verify-distributed-test-env.sh'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  })
}

function base64UrlEncode(value) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function rawSessionId(sessionReference) {
  if (typeof sessionReference !== 'string') {
    return ''
  }
  const trimmed = sessionReference.trim()
  if (!trimmed) {
    return ''
  }
  const delimiterIndex = trimmed.indexOf('.')
  return delimiterIndex >= 0 ? trimmed.slice(0, delimiterIndex) : trimmed
}

async function resolveAuthConfig(baseUrl) {
  const response = await requestJson(`${baseUrl}/api/v1/auth/iam/config`)
  assert(response.ok, 'Failed to load IAM auth config.', response.text)
  assert(response.json && typeof response.json.realm_id === 'string', 'IAM auth config did not include realm_id.', response.json)
  assert(response.json && typeof response.json.client_id === 'string', 'IAM auth config did not include client_id.', response.json)
  return response.json
}

async function loginWithConsent(baseUrl, realmId, clientId, username, password) {
  const loginResponse = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
      client_id: clientId,
      scope: ['openid', 'profile', 'email', 'roles', 'groups'],
    }),
  })

  assert(loginResponse.ok, 'Browser login failed.', loginResponse.text)
  let payload = loginResponse.json

  if (payload?.next_step === 'CONSENT_REQUIRED') {
    const consentResponse = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/login/consent`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        login_transaction_id: payload.login_transaction_id,
        approve: true,
      }),
    })

    assert(consentResponse.ok, 'Consent completion failed.', consentResponse.text)
    payload = consentResponse.json
  }

  assert(typeof payload?.session_id === 'string' && payload.session_id.length > 0, 'Authenticated login did not yield a session_id.', payload)
  return payload
}

async function resolveAccountSession(baseUrl, realmId, sessionId, expectedStatus = 200) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/account/session`, {
    headers: {
      'x-iam-session-id': sessionId,
      'x-iam-realm-id': realmId,
    },
  })

  assert(response.status === expectedStatus, `Unexpected account session status ${response.status}.`, response.text)
  return response
}

async function listAccountSessions(baseUrl, realmId, sessionId) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/account/sessions`, {
    headers: {
      'x-iam-session-id': sessionId,
      'x-iam-realm-id': realmId,
    },
  })

  assert(response.ok, 'Failed to list account sessions.', response.text)
  return response.json
}

async function revokeOtherAccountSessions(baseUrl, realmId, sessionId) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/account/sessions/revoke-others`, {
    method: 'POST',
    headers: {
      'x-iam-session-id': sessionId,
      'x-iam-realm-id': realmId,
    },
  })

  assert(response.ok, 'Failed to revoke other account sessions.', response.text)
  return response.json
}

async function requestPasswordReset(baseUrl, realmId, usernameOrEmail) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/password-reset/request`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username_or_email: usernameOrEmail,
    }),
  })

  assert(response.status === 201, 'Password reset request did not return 201.', response.text)
  assert(typeof response.json?.ticket_id === 'string', 'Password reset response missing ticket_id.', response.json)
  assert(typeof response.json?.code_preview === 'string', 'Password reset response missing code preview.', response.json)
  return response.json
}

async function confirmPasswordReset(baseUrl, realmId, ticketId, code, newPassword) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/password-reset/confirm`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      ticket_id: ticketId,
      code,
      new_password: newPassword,
    }),
  })

  assert(response.ok, 'Password reset confirm failed.', response.text)
  return response.json
}

async function issueBrowserToken(baseUrl, realmId, clientId, sessionId) {
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const redirectUri = 'http://127.0.0.1:3004/login/callback'
  const authResponse = await fetch(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/protocol/openid-connect/auth?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid profile email roles groups')}&state=runtime-cutover-state&nonce=runtime-cutover-nonce&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256`, {
    redirect: 'manual',
  })

  const location = authResponse.headers.get('location') || ''
  const redirectUrl = new URL(location, baseUrl)
  const authorizationRequestId = redirectUrl.searchParams.get('authorization_request_id')

  assert(authResponse.status >= 300 && authResponse.status < 400, 'Authorization endpoint did not redirect.', {
    status: authResponse.status,
    location,
  })
  assert(authorizationRequestId, 'Authorization redirect did not include authorization_request_id.', location)

  const continueResponse = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/protocol/openid-connect/auth/continue`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-iam-session-id': sessionId,
    },
    body: JSON.stringify({
      authorization_request_id: authorizationRequestId,
    }),
  })

  assert(continueResponse.ok, 'Authorization continue failed.', continueResponse.text)
  const callbackUrl = new URL(continueResponse.json.redirect_url, baseUrl)
  const code = callbackUrl.searchParams.get('code')
  assert(code, 'Authorization continue response did not include an authorization code.', continueResponse.json)

  const tokenResponse = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  assert(tokenResponse.ok, 'Token exchange failed.', tokenResponse.text)
  assert(typeof tokenResponse.json?.access_token === 'string', 'Token response missing access_token.', tokenResponse.json)
  return tokenResponse.json
}

async function introspectToken(baseUrl, realmId, clientId, token) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/protocol/openid-connect/token/introspect`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      token,
      client_id: clientId,
    }),
  })

  assert(response.ok, 'Token introspection failed.', response.text)
  return response.json
}

async function refreshTokenGrant(baseUrl, realmId, clientId, refreshToken) {
  return requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  })
}

async function getUserInfo(baseUrl, realmId, accessToken) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/protocol/openid-connect/userinfo`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  assert(response.ok, 'Userinfo request failed.', response.text)
  return response.json
}

async function logout(baseUrl, realmId, sessionId) {
  const response = await requestJson(`${baseUrl}/api/v1/iam/realms/${encodeURIComponent(realmId)}/logout`, {
    method: 'POST',
    headers: {
      'x-iam-session-id': sessionId,
      'x-iam-realm-id': realmId,
    },
  })

  assert(response.ok, 'Logout failed.', response.text)
  return response.json
}

function writeReport(fileName, report) {
  const reportDir = path.join(rootDir, 'tests', 'integration')
  fs.mkdirSync(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, fileName)
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  return reportPath
}

module.exports = {
  assert,
  confirmPasswordReset,
  getUserInfo,
  introspectToken,
  issueBrowserToken,
  listAccountSessions,
  loginWithConsent,
  logout,
  rawSessionId,
  refreshTokenGrant,
  requestJson,
  requestPasswordReset,
  resolveAccountSession,
  resolveAuthConfig,
  verifyDistributedIntegrationEnv,
  revokeOtherAccountSessions,
  verifyRuntimeTableShape,
  writeReport,
}
