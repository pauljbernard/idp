#!/usr/bin/env node

const { randomUUID } = require('crypto')
const { execFileSync } = require('child_process')

function fail(message, details) {
  console.error(message)
  if (details) {
    console.error(details)
  }
  process.exit(1)
}

function normalizeBaseUrl(value) {
  const normalized = (value || 'http://127.0.0.1:3000').trim().replace(/\/+$/, '')
  if (!normalized) {
    fail('IDP_BASE_URL must not be empty.')
  }
  return normalized
}

function requestJson(url, options = {}) {
  const curlArgs = ['-sS']

  if (options.method) {
    curlArgs.push('-X', options.method.toUpperCase())
  }

  const headers = options.headers || {}
  for (const [name, value] of Object.entries(headers)) {
    curlArgs.push('-H', `${name}: ${value}`)
  }

  if (options.body !== undefined) {
    curlArgs.push('--data-binary', options.body)
  }

  curlArgs.push(
    '-w',
    '\n__HTTP_STATUS__:%{http_code}',
    url,
  )

  let stdout
  try {
    stdout = execFileSync('/usr/bin/curl', curlArgs, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    })
  } catch (error) {
    fail(
      `HTTP request failed for ${url}.`,
      error instanceof Error ? error.message : String(error),
    )
  }

  const marker = '\n__HTTP_STATUS__:' 
  const markerIndex = stdout.lastIndexOf(marker)
  if (markerIndex === -1) {
    fail(`Unable to parse HTTP status from curl response for ${url}.`, stdout)
  }

  const text = stdout.slice(0, markerIndex)
  const statusText = stdout.slice(markerIndex + marker.length).trim()
  const status = Number.parseInt(statusText, 10)

  if (!Number.isInteger(status)) {
    fail(`Unable to parse numeric HTTP status for ${url}.`, statusText)
  }

  let json = null

  if (text.trim().length > 0) {
    try {
      json = JSON.parse(text)
    } catch (error) {
      fail(
        `Expected JSON response from ${url}, received invalid JSON.`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return {
    status,
    ok: status >= 200 && status < 300,
    json,
    text,
  }
}

function resolveAuthConfig(baseUrl) {
  const response = requestJson(`${baseUrl}/api/v1/auth/iam/config`)
  if (!response.ok || !response.json) {
    fail(
      `Failed to resolve IAM auth config from ${baseUrl}/api/v1/auth/iam/config. Set IDP_BASE_URL to the running target environment if you are not using the default local bootstrap at http://127.0.0.1:3000.`,
      response.text,
    )
  }

  if (typeof response.json.realm_id !== 'string' || typeof response.json.client_id !== 'string') {
    fail('IAM auth config is missing required realm_id or client_id fields.', JSON.stringify(response.json, null, 2))
  }

  return response.json
}

function resolveEffectiveAuthConfig(baseUrl, explicitRealmId, explicitClientId) {
  if (explicitRealmId && explicitClientId) {
    return {
      realm_id: explicitRealmId,
      client_id: explicitClientId,
      source: 'env',
    }
  }

  const discovered = resolveAuthConfig(baseUrl)
  return {
    realm_id: explicitRealmId || discovered.realm_id,
    client_id: explicitClientId || discovered.client_id,
    source: 'auth-config',
  }
}

function loginWithConsent(baseUrl, authConfig, email, password) {
  const loginResponse = requestJson(
    `${baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/login`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        username: email,
        password,
        client_id: authConfig.client_id,
        scope: ['openid', 'profile', 'email', 'roles', 'groups'],
      }),
    },
  )

  if (!loginResponse.ok || !loginResponse.json) {
    fail('Browser login flow failed during preflight authentication.', loginResponse.text)
  }

  let loginPayload = loginResponse.json

  if (loginPayload.next_step === 'CONSENT_REQUIRED') {
    if (typeof loginPayload.login_transaction_id !== 'string') {
      fail('Login response required consent but did not include login_transaction_id.', JSON.stringify(loginPayload, null, 2))
    }

    const consentResponse = requestJson(
      `${baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/login/consent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          login_transaction_id: loginPayload.login_transaction_id,
          approve: true,
        }),
      },
    )

    if (!consentResponse.ok || !consentResponse.json) {
      fail('Consent completion failed during runtime cutover preflight.', consentResponse.text)
    }

    loginPayload = consentResponse.json
  }

  if (typeof loginPayload.session_id !== 'string' || loginPayload.session_id.trim().length === 0) {
    fail('Authenticated login flow did not yield an IAM browser session.', JSON.stringify(loginPayload, null, 2))
  }

  return loginPayload.session_id
}

function fetchOperationsHealth(baseUrl, realmId, sessionId) {
  const response = requestJson(
    `${baseUrl}/api/v1/iam/operations/health`,
    {
      headers: {
        'x-iam-session-id': sessionId,
        'x-iam-realm-id': realmId,
      },
    },
  )

  if (response.status !== 200 || !response.json) {
    fail(`Expected /api/v1/iam/operations/health to return 200, got ${response.status}.`, response.text)
  }

  return response.json
}

function formatTextOutput(payload) {
  return [
    `health_status=${payload.health_status}`,
    `overall_status=${payload.overall_status}`,
    `runtime_cutover_status=${payload.runtime_cutover_status}`,
    `runtime_cutover_summary=${payload.runtime_cutover_summary}`,
    `realm_id=${payload.realm_id}`,
    `client_id=${payload.client_id}`,
    `base_url=${payload.base_url}`,
    `auth_config_source=${payload.auth_config_source}`,
    `session_proof=${payload.session_proof}`,
  ].join('\n')
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.IDP_BASE_URL)
  const realmId = (process.env.IDP_IAM_REALM_ID || '').trim()
  const clientId = (process.env.IDP_IAM_CLIENT_ID || '').trim()
  const adminEmail = (process.env.IDP_ADMIN_EMAIL || 'admin@idp.local').trim()
  const adminPassword = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'
  const outputMode = (process.env.OUTPUT_MODE || 'text').trim().toLowerCase()

  const authConfig = resolveEffectiveAuthConfig(baseUrl, realmId, clientId)
  const sessionId = loginWithConsent(baseUrl, authConfig, adminEmail, adminPassword)
  const healthResponse = fetchOperationsHealth(baseUrl, authConfig.realm_id, sessionId)
  const runtimeCheck = Array.isArray(healthResponse.checks)
    ? healthResponse.checks.find((check) => check && check.id === 'runtime-cutover-readiness')
    : null

  if (!runtimeCheck || typeof runtimeCheck.status !== 'string' || typeof runtimeCheck.summary !== 'string') {
    fail('Runtime cutover health response did not include the runtime-cutover-readiness check.', JSON.stringify(healthResponse, null, 2))
  }

  if (runtimeCheck.status === 'FAIL') {
    fail(`Runtime cutover readiness failed: ${runtimeCheck.summary}`)
  }

  if (runtimeCheck.summary.includes('NOOP_FALLBACK')) {
    fail(`Runtime cutover readiness indicates noop fallback: ${runtimeCheck.summary}`)
  }

  const payload = {
    health_status: '200',
    overall_status: typeof healthResponse.overall_status === 'string' ? healthResponse.overall_status : 'UNKNOWN',
    runtime_cutover_status: runtimeCheck.status,
    runtime_cutover_summary: runtimeCheck.summary,
    realm_id: authConfig.realm_id,
    client_id: authConfig.client_id,
    base_url: baseUrl,
    auth_config_source: authConfig.source,
    session_proof: `iam-session:${randomUUID().slice(0, 8)}`,
    health_response: healthResponse,
  }

  if (outputMode === 'json') {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
    return
  }

  process.stdout.write(`${formatTextOutput(payload)}\n`)
}

main().catch((error) => {
  fail(
    `Runtime cutover preflight failed unexpectedly for base URL ${process.env.IDP_BASE_URL || 'http://127.0.0.1:3000'}.`,
    error instanceof Error ? error.stack || error.message : String(error),
  )
})
