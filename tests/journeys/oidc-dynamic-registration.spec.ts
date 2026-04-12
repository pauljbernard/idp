import { createHash, randomBytes } from 'crypto'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

const API_BASE_URL = 'http://127.0.0.1:4000'
const UI_CALLBACK_URL = 'http://127.0.0.1:3004/login/callback'
const REALM_ID = 'realm-idp-default'
const IAM_SESSION_HEADER = 'x-iam-session-id'

function base64UrlEncode(value: Buffer) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createAuthorizationRequestUrl(
  authorizationEndpoint: string,
  options: {
    clientId: string
    state: string
    nonce: string
    codeChallenge: string
    redirectUri?: string
    prompt?: string
  },
) {
  const authorizationUrl = new URL(authorizationEndpoint)
  authorizationUrl.searchParams.set('client_id', options.clientId)
  authorizationUrl.searchParams.set('redirect_uri', options.redirectUri ?? UI_CALLBACK_URL)
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('scope', 'openid profile email roles')
  authorizationUrl.searchParams.set('state', options.state)
  authorizationUrl.searchParams.set('nonce', options.nonce)
  authorizationUrl.searchParams.set('code_challenge', options.codeChallenge)
  authorizationUrl.searchParams.set('code_challenge_method', 'S256')
  if (options.prompt) {
    authorizationUrl.searchParams.set('prompt', options.prompt)
  }
  return authorizationUrl
}

async function completeBrowserAuthorization(
  page: Page,
  authorizationUrl: URL,
  options?: {
    interactiveLogin?: boolean
  },
) {
  await page.goto(authorizationUrl.toString())

  const loginButton = page.getByRole('button', { name: 'Sign In' })
  const consentButton = page.getByRole('button', { name: 'Approve consent' })

  const firstResolution = await Promise.race([
    page.waitForURL('**/login/callback?**', { timeout: 15_000 }).then(() => 'callback'),
    loginButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login'),
  ])

  if (firstResolution === 'login') {
    if (!options?.interactiveLogin) {
      await page.waitForURL('**/login/callback?**')
      return new URL(page.url())
    }

    await page.getByLabel('Username or email').fill('admin@idp.local')
    await page.getByLabel('Password').fill('StandaloneIAM!SuperAdmin2026')
    await page.getByRole('button', { name: 'Sign In' }).click()

    const postLoginResolution = await Promise.race([
      page.waitForURL('**/login/callback?**', { timeout: 15_000 }).then(() => 'callback'),
      consentButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'consent'),
    ])
    if (postLoginResolution === 'consent') {
      const consentResponsePromise = page.waitForResponse((response) =>
        response.request().method() === 'POST' && response.url().includes('/login/consent'),
      )
      await consentButton.click()
      await consentResponsePromise
      await page.waitForURL('**/login/callback?**')
    }
  }

  return new URL(page.url())
}

async function getDiscoveryDocument(request: APIRequestContext) {
  const discoveryResponse = await request.get(`${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/.well-known/openid-configuration`)
  expect(discoveryResponse.ok()).toBeTruthy()
  const discovery = await discoveryResponse.json()

  expect(discovery.issuer).toBe(`${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}`)
  expect(discovery.registration_endpoint).toBe(`${discovery.issuer}/clients-registrations/openid-connect`)
  expect(discovery.code_challenge_methods_supported).toEqual(['S256'])
  expect(discovery.token_endpoint_auth_methods_supported).toContain('none')
  return discovery
}

async function loginAsAdmin(request: APIRequestContext) {
  const response = await request.post(`${API_BASE_URL}/api/v1/iam/realms/${REALM_ID}/login`, {
    data: {
      username: 'admin@idp.local',
      password: 'StandaloneIAM!SuperAdmin2026',
    },
  })
  expect(response.ok()).toBeTruthy()
  const login = await response.json()
  expect(login.next_step).toBe('AUTHENTICATED')
  expect(login.session_id).toBeTruthy()
  return login.session_id as string
}

test('dynamic client registration and client-policy flow interoperate for supported public oidc clients', async ({ page, request }) => {
  const discovery = await getDiscoveryDocument(request)
  const adminSessionId = await loginAsAdmin(request)
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`

  const policyResponse = await request.post(`${API_BASE_URL}/api/v1/iam/client-policies`, {
    headers: {
      [IAM_SESSION_HEADER]: adminSessionId,
    },
    data: {
      realm_id: REALM_ID,
      name: `WS3 Public OIDC Registration ${suffix}`,
      description: 'WS3 interoperability policy for public OIDC dynamic registration.',
      status: 'ACTIVE',
      allow_dynamic_registration: true,
      require_pkce_for_public_clients: true,
      allow_wildcard_redirect_uris: false,
      allowed_protocols: ['OIDC'],
      allowed_access_types: ['PUBLIC'],
    },
  })
  expect(policyResponse.ok()).toBeTruthy()
  const policy = await policyResponse.json()
  expect(policy.id).toBeTruthy()
  expect(policy.allow_dynamic_registration).toBe(true)

  const initialAccessTokenResponse = await request.post(`${API_BASE_URL}/api/v1/iam/initial-access-tokens`, {
    headers: {
      [IAM_SESSION_HEADER]: adminSessionId,
    },
    data: {
      realm_id: REALM_ID,
      policy_id: policy.id,
      label: `WS3 Public Registration ${suffix}`,
      max_uses: 1,
      expires_in_hours: 1,
    },
  })
  expect(initialAccessTokenResponse.ok()).toBeTruthy()
  const initialAccessToken = await initialAccessTokenResponse.json()
  expect(initialAccessToken.issued_token).toBeTruthy()

  const clientId = `ws3-public-client-${suffix}`
  const registerResponse = await request.post(discovery.registration_endpoint, {
    headers: {
      Authorization: `Bearer ${initialAccessToken.issued_token}`,
    },
    data: {
      client_name: `WS3 Dynamic Client ${suffix}`,
      client_id: clientId,
      redirect_uris: [UI_CALLBACK_URL],
      grant_types: ['authorization_code'],
      token_endpoint_auth_method: 'none',
      response_types: ['code'],
      scope: 'openid profile email roles',
      client_uri: 'https://example.local/ws3-client',
      policy_id: policy.id,
    },
  })
  expect(registerResponse.ok()).toBeTruthy()
  const registration = await registerResponse.json()
  expect(registration.client.client_id).toBe(clientId)
  expect(registration.client.access_type).toBe('PUBLIC')
  expect(registration.client_secret).toBeNull()
  expect(registration.token_endpoint_auth_method).toBe('none')
  expect(registration.grant_types).toContain('authorization_code')
  expect(registration.assigned_policy_ids).toContain(policy.id)
  expect(registration.registration_access_token).toBeTruthy()
  expect(registration.registration_client_uri).toBe(`${discovery.registration_endpoint}/${registration.client.id}`)

  const readResponse = await request.get(registration.registration_client_uri, {
    headers: {
      Authorization: `Bearer ${registration.registration_access_token}`,
    },
  })
  expect(readResponse.ok()).toBeTruthy()
  const registeredClient = await readResponse.json()
  expect(registeredClient.client.client_id).toBe(clientId)
  expect(registeredClient.assigned_policy_ids).toContain(policy.id)

  const rejectedUpdateResponse = await request.put(registration.registration_client_uri, {
    headers: {
      Authorization: `Bearer ${registration.registration_access_token}`,
    },
    data: {
      client_name: `WS3 Dynamic Client ${suffix} Invalid`,
      redirect_uris: ['http://127.0.0.1:3004/*'],
      grant_types: ['authorization_code'],
      token_endpoint_auth_method: 'none',
      response_types: ['code'],
      scope: 'openid profile email roles',
    },
  })
  expect(rejectedUpdateResponse.status()).toBe(400)
  const rejectedUpdate = await rejectedUpdateResponse.json()
  expect(rejectedUpdate.error).toContain('wildcard redirect URIs')

  const updateResponse = await request.put(registration.registration_client_uri, {
    headers: {
      Authorization: `Bearer ${registration.registration_access_token}`,
    },
    data: {
      client_name: `WS3 Dynamic Client ${suffix} Updated`,
      redirect_uris: [UI_CALLBACK_URL],
      grant_types: ['authorization_code'],
      token_endpoint_auth_method: 'none',
      response_types: ['code'],
      scope: 'openid profile email roles',
      client_uri: 'https://example.local/ws3-client-updated',
    },
  })
  expect(updateResponse.ok()).toBeTruthy()
  const updatedRegistration = await updateResponse.json()
  expect(updatedRegistration.client.name).toContain('Updated')
  expect(updatedRegistration.client.redirect_uris).toEqual([UI_CALLBACK_URL])

  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const state = `oidc-dynamic-state-${suffix}`
  const nonce = `oidc-dynamic-nonce-${suffix}`
  const callbackUrl = await completeBrowserAuthorization(
    page,
    createAuthorizationRequestUrl(discovery.authorization_endpoint, {
      clientId,
      state,
      nonce,
      codeChallenge,
    }),
    { interactiveLogin: true },
  )

  await expect(page.getByRole('heading', { name: 'OIDC Callback Received' })).toBeVisible()
  const code = callbackUrl.searchParams.get('code')
  expect(code).toBeTruthy()
  expect(callbackUrl.searchParams.get('state')).toBe(state)

  const tokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code!,
      redirect_uri: UI_CALLBACK_URL,
      code_verifier: codeVerifier,
    },
  })
  expect(tokenResponse.ok()).toBeTruthy()
  const tokenSet = await tokenResponse.json()
  expect(tokenSet.token_type).toBe('Bearer')
  expect(tokenSet.access_token).toBeTruthy()
  expect(tokenSet.id_token).toBeTruthy()

  const userinfoResponse = await request.get(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${tokenSet.access_token}`,
    },
  })
  expect(userinfoResponse.ok()).toBeTruthy()
  const userinfo = await userinfoResponse.json()
  expect(userinfo.preferred_username).toBe('standalone.super.admin')

  const archiveResponse = await request.delete(registration.registration_client_uri, {
    headers: {
      Authorization: `Bearer ${registration.registration_access_token}`,
    },
  })
  expect(archiveResponse.ok()).toBeTruthy()
  const archived = await archiveResponse.json()
  expect(archived.archived).toBe(true)
  expect(archived.client_id).toBe(clientId)

  const postArchiveReadResponse = await request.get(registration.registration_client_uri, {
    headers: {
      Authorization: `Bearer ${registration.registration_access_token}`,
    },
  })
  expect(postArchiveReadResponse.status()).toBe(400)
  const postArchiveRead = await postArchiveReadResponse.json()
  expect(postArchiveRead.error).toContain('registration access token')
})
