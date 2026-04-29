import { generateKeyPairSync, sign } from 'crypto'
import { expect, test } from '@playwright/test'

const REALM_ID = 'realm-idp-default'
const API_PORT = process.env.IDP_JOURNEY_API_PORT ?? '4000'
const BASE_URL = `http://127.0.0.1:${API_PORT}`
const IAM_SESSION_HEADER = 'x-iam-session-id'

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64url')
}

function buildRegistrationPayload(
  realmId: string,
  userId: string,
  challengeId: string,
  challenge: string,
  credentialId: string,
): string {
  return `idp-iam-passkey:register:${realmId}:${userId}:${challengeId}:${challenge}:${credentialId}`
}

function buildAuthenticationPayload(
  realmId: string,
  userId: string,
  challengeId: string,
  challenge: string,
  credentialId: string,
): string {
  return `idp-iam-passkey:authenticate:${realmId}:${userId}:${challengeId}:${challenge}:${credentialId}`
}

function signPayload(privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'], payload: string): string {
  return base64UrlEncode(
    sign('sha256', Buffer.from(payload, 'utf8'), { key: privateKey, dsaEncoding: 'ieee-p1363' }),
  )
}

test('passkey bounded profile executes through account enrollment and login APIs', async ({ request }) => {
  const credentialId = 'journey-platform-passkey-1'
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
  const publicKeyJwk = publicKey.export({ format: 'jwk' }) as Record<string, unknown>

  const passwordLoginResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/login`,
    {
      data: {
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
      },
    },
  )

  expect(passwordLoginResponse.ok()).toBeTruthy()
  const passwordLoginBody = await passwordLoginResponse.json()
  expect(passwordLoginBody.next_step).toBe('AUTHENTICATED')
  expect(typeof passwordLoginBody.session_id).toBe('string')
  expect(passwordLoginBody.session_id).toContain('iam-session-')

  const sessionHeaders = {
    [IAM_SESSION_HEADER]: passwordLoginBody.session_id,
  }

  const registrationBeginResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/account/webauthn/register/begin`,
    {
      headers: sessionHeaders,
    },
  )

  expect(registrationBeginResponse.status()).toBe(201)
  const registrationBeginBody = await registrationBeginResponse.json()
  expect(registrationBeginBody.authenticator_attachment).toBe('PLATFORM')
  expect(registrationBeginBody.user_verification).toBe('REQUIRED')
  expect(registrationBeginBody.resident_key).toBe('REQUIRED')
  expect(registrationBeginBody.attestation).toBe('NONE')
  expect(registrationBeginBody.supported_transport_classes).toContain('INTERNAL')
  expect(registrationBeginBody.unsupported_transport_classes).toContain('SOFTWARE')

  const registrationSignature = signPayload(
    privateKey,
    buildRegistrationPayload(
      REALM_ID,
      registrationBeginBody.user_id,
      registrationBeginBody.challenge_id,
      registrationBeginBody.challenge,
      credentialId,
    ),
  )

  const registrationCompleteResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/account/webauthn/register/complete`,
    {
      headers: sessionHeaders,
      data: {
        challenge_id: registrationBeginBody.challenge_id,
        credential_id: credentialId,
        device_label: 'Journey Platform Passkey',
        public_key_jwk: publicKeyJwk,
        algorithm: 'ES256',
        transports: ['INTERNAL'],
        authenticator_attachment: 'PLATFORM',
        user_verification: 'REQUIRED',
        rp_id: registrationBeginBody.rp_id,
        origin: registrationBeginBody.supported_origins[0],
        proof_signature: registrationSignature,
      },
    },
  )

  expect(registrationCompleteResponse.ok()).toBeTruthy()
  const registrationCompleteBody = await registrationCompleteResponse.json()
  expect(registrationCompleteBody.credential_id).toBe(credentialId)
  expect(registrationCompleteBody.authenticator_attachment).toBe('PLATFORM')
  expect(registrationCompleteBody.user_verification).toBe('REQUIRED')
  expect(registrationCompleteBody.transports).toEqual(['INTERNAL'])

  const passkeyBeginResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/login/passkey/begin`,
    {
      data: {
        username_or_email: 'alex.morgan@northstar.example',
      },
    },
  )

  expect(passkeyBeginResponse.status()).toBe(201)
  const passkeyBeginBody = await passkeyBeginResponse.json()
  expect(passkeyBeginBody.authenticator_attachment).toBe('PLATFORM')
  expect(passkeyBeginBody.user_verification).toBe('REQUIRED')
  expect(passkeyBeginBody.allowed_credentials.some((credential: { credential_id: string }) => credential.credential_id === credentialId)).toBe(true)

  const authenticationSignature = signPayload(
    privateKey,
    buildAuthenticationPayload(
      REALM_ID,
      passkeyBeginBody.user_id,
      passkeyBeginBody.challenge_id,
      passkeyBeginBody.challenge,
      credentialId,
    ),
  )

  const passkeyCompleteResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/login/passkey/complete`,
    {
      data: {
        challenge_id: passkeyBeginBody.challenge_id,
        credential_id: credentialId,
        user_verification: 'REQUIRED',
        rp_id: passkeyBeginBody.rp_id,
        origin: passkeyBeginBody.supported_origins[0],
        proof_signature: authenticationSignature,
      },
    },
  )

  expect(passkeyCompleteResponse.ok()).toBeTruthy()
  const passkeyCompleteBody = await passkeyCompleteResponse.json()
  expect(passkeyCompleteBody.next_step).toBe('AUTHENTICATED')
  expect(typeof passkeyCompleteBody.session_id).toBe('string')
  expect(passkeyCompleteBody.session_id).toContain('iam-session-')
})
