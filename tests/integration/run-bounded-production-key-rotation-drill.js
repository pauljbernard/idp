const path = require('path')
const { randomUUID } = require('crypto')
const { rootDir, startDistributedStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  getUserInfo,
  introspectToken,
  issueBrowserToken,
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

function decodeJwtHeader(token) {
  const parts = String(token).split('.')
  if (parts.length !== 3) {
    throw new Error('Expected JWT token with three parts.')
  }
  const normalized = parts[0].replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
}

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4114,
    tempRoot: path.join(rootDir, '.tmp', 'integration', 'bounded-production-key-rotation-drill'),
    logFile: path.join(rootDir, '.tmp', 'integration', 'bounded-production-key-rotation-drill', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'
    const login = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const rotationIdempotencyKey = `bounded-production-key-rotation-${randomUUID()}`

    const keysBefore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys?realm_id=global`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(keysBefore.ok, 'Failed to list signing keys before rotation.', keysBefore.text)

    const rotationsBefore = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys/rotations`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(rotationsBefore.ok, 'Failed to list signing key rotations before drill.', rotationsBefore.text)

    const firstTokenSet = await issueBrowserToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, login.session_id)
    const firstTokenHeader = decodeJwtHeader(firstTokenSet.access_token)
    assert(typeof firstTokenHeader.kid === 'string', 'First token is missing kid header.', firstTokenHeader)

    const firstTokenIntrospectionBefore = await introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, firstTokenSet.access_token)
    const firstTokenUserinfoBefore = await getUserInfo(api.baseUrl, authConfig.realm_id, firstTokenSet.access_token)
    assert(firstTokenIntrospectionBefore.active === true, 'First token was not active before rotation.', firstTokenIntrospectionBefore)
    assert(typeof firstTokenUserinfoBefore.sub === 'string' && firstTokenUserinfoBefore.sub.length > 0, 'First token userinfo missing subject before rotation.', firstTokenUserinfoBefore)

    const rotate = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys/rotate`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': rotationIdempotencyKey,
      }),
      body: JSON.stringify({
        realm_id: 'global',
      }),
    })
    assert(rotate.status === 201, 'Signing key rotation did not return 201.', rotate.text)
    assert(typeof rotate.json?.activated_key_id === 'string', 'Signing key rotation did not return an activated key id.', rotate.json)

    const rotateReplay = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys/rotate`, {
      method: 'POST',
      headers: operationsHeaders(authConfig.realm_id, login.session_id, {
        'Idempotency-Key': rotationIdempotencyKey,
      }),
      body: JSON.stringify({
        realm_id: 'global',
      }),
    })
    assert(rotateReplay.status === 201, 'Signing key rotation replay did not return 201.', rotateReplay.text)
    assert(rotateReplay.json?.id === rotate.json.id, 'Signing key rotation replay returned a different rotation id.', {
      first: rotate.json,
      replay: rotateReplay.json,
    })

    const keysAfter = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys?realm_id=global`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(keysAfter.ok, 'Failed to list signing keys after rotation.', keysAfter.text)
    const activeKeysAfter = (keysAfter.json?.signing_keys ?? []).filter((key) => key.status === 'ACTIVE')
    const retiredKeysAfter = (keysAfter.json?.signing_keys ?? []).filter((key) => key.status === 'RETIRED')
    const activatedKeyRecord = activeKeysAfter.find((key) => key.id === rotate.json.activated_key_id)
    assert(activatedKeyRecord, 'Signing key list did not include the activated key record.', {
      activated_key_id: rotate.json.activated_key_id,
      signing_keys: keysAfter.json?.signing_keys,
    })

    const rotationsAfter = await requestJson(`${api.baseUrl}/api/v1/iam/operations/keys/rotations`, {
      headers: operationsHeaders(authConfig.realm_id, login.session_id),
    })
    assert(rotationsAfter.ok, 'Failed to list signing key rotations after drill.', rotationsAfter.text)
    assert(rotationsAfter.json?.active_run === null, 'Signing key rotation drill left an active run behind.', rotationsAfter.json)

    const jwks = await requestJson(`${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/protocol/openid-connect/certs`)
    assert(jwks.ok, 'Failed to read JWKS after signing key rotation.', jwks.text)
    assert(Array.isArray(jwks.json?.keys), 'JWKS did not return keys array.', jwks.json)

    const secondTokenSet = await issueBrowserToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, login.session_id)
    const secondTokenHeader = decodeJwtHeader(secondTokenSet.access_token)
    assert(typeof secondTokenHeader.kid === 'string', 'Second token is missing kid header.', secondTokenHeader)

    const firstTokenIntrospectionAfter = await introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, firstTokenSet.access_token)
    const firstTokenUserinfoAfter = await getUserInfo(api.baseUrl, authConfig.realm_id, firstTokenSet.access_token)
    const secondTokenIntrospectionAfter = await introspectToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, secondTokenSet.access_token)
    const secondTokenUserinfoAfter = await getUserInfo(api.baseUrl, authConfig.realm_id, secondTokenSet.access_token)

    assert(firstTokenIntrospectionAfter.active === true, 'First token became inactive after signing key rotation.', firstTokenIntrospectionAfter)
    assert(secondTokenIntrospectionAfter.active === true, 'Second token was not active after signing key rotation.', secondTokenIntrospectionAfter)
    assert(firstTokenHeader.kid !== secondTokenHeader.kid, 'Signing key rotation did not change the token kid.', {
      first: firstTokenHeader,
      second: secondTokenHeader,
    })
    assert(activatedKeyRecord.key_id === secondTokenHeader.kid, 'Post-rotation token kid does not match activated key.', {
      rotation: rotate.json,
      activated_key_record: activatedKeyRecord,
      token_header: secondTokenHeader,
    })

    const jwksKids = jwks.json.keys.map((key) => key.kid)
    assert(jwksKids.includes(firstTokenHeader.kid), 'JWKS did not retain the pre-rotation verification key.', {
      jwksKids,
      old_kid: firstTokenHeader.kid,
    })
    assert(jwksKids.includes(secondTokenHeader.kid), 'JWKS did not publish the post-rotation verification key.', {
      jwksKids,
      new_kid: secondTokenHeader.kid,
    })

    assert(activeKeysAfter.some((key) => key.key_id === secondTokenHeader.kid), 'Signing key list did not show the new active key.', keysAfter.json)
    assert(retiredKeysAfter.some((key) => key.key_id === firstTokenHeader.kid), 'Signing key list did not show the old key as retired.', keysAfter.json)
    assert(
      rotationsAfter.json.count === rotationsBefore.json.count + 1,
      'Signing key rotation drill added an unexpected number of rotation records.',
      {
        before: rotationsBefore.json.count,
        after: rotationsAfter.json.count,
      },
    )

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      checks: {
        all_steps_passed: true,
        overall_pass: true,
        realm_id: authConfig.realm_id,
        rotation_id: rotate.json.id,
        rotation_replay_same_id: rotateReplay.json.id === rotate.json.id,
        activated_key_record_id: rotate.json.activated_key_id,
        activated_key_id: activatedKeyRecord.key_id,
        pre_rotation_token_kid: firstTokenHeader.kid,
        post_rotation_token_kid: secondTokenHeader.kid,
        old_token_still_active_after_rotation: firstTokenIntrospectionAfter.active === true,
        new_token_active_after_rotation: secondTokenIntrospectionAfter.active === true,
        jwks_contains_old_kid: jwksKids.includes(firstTokenHeader.kid),
        jwks_contains_new_kid: jwksKids.includes(secondTokenHeader.kid),
        active_run_cleared: rotationsAfter.json.active_run === null,
        rotation_count_before: rotationsBefore.json.count,
        rotation_count_after: rotationsAfter.json.count,
        first_token_subject_before_rotation: firstTokenUserinfoBefore.sub,
        first_token_subject_after_rotation: firstTokenUserinfoAfter.sub,
        second_token_subject_after_rotation: secondTokenUserinfoAfter.sub,
      },
    }

    const reportPath = writeReport('latest-bounded-production-key-rotation-drill.json', report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
