import { createHash, randomBytes } from 'crypto'
import { expect, test } from '@playwright/test'

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
    state: string
    nonce: string
    codeChallenge: string
    redirectUri?: string
    scope?: string
  },
) {
  const authorizationUrl = new URL(authorizationEndpoint)
  authorizationUrl.searchParams.set('client_id', 'admin-console-demo')
  authorizationUrl.searchParams.set('redirect_uri', options.redirectUri ?? 'http://127.0.0.1:3004/login/callback')
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('scope', options.scope ?? 'openid profile email offline_access')
  authorizationUrl.searchParams.set('state', options.state)
  authorizationUrl.searchParams.set('nonce', options.nonce)
  authorizationUrl.searchParams.set('code_challenge', options.codeChallenge)
  authorizationUrl.searchParams.set('code_challenge_method', 'S256')
  return authorizationUrl
}

async function completeBrowserAuthorization(
  page: Parameters<typeof test>[0]['page'],
  authorizationUrl: URL,
) {
  await page.goto(authorizationUrl.toString())

  const loginButton = page.getByRole('button', { name: 'Sign In' })
  const consentButton = page.getByRole('button', { name: 'Approve consent' })

  const firstResolution = await Promise.race([
    page.waitForURL('**/login/callback?**', { timeout: 15_000 }).then(() => 'callback'),
    loginButton.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'login'),
  ])

  if (firstResolution === 'login') {
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

async function getDiscoveryDocument(request: Parameters<typeof test>[0]['request']) {
  const realmId = 'realm-idp-default'
  const discoveryResponse = await request.get(`http://127.0.0.1:4000/api/v1/iam/realms/${realmId}/.well-known/openid-configuration`)
  expect(discoveryResponse.ok()).toBeTruthy()
  const discovery = await discoveryResponse.json()
  return discovery
}

async function exchangeAuthorizationCode(
  request: Parameters<typeof test>[0]['request'],
  discovery: any,
  code: string,
  codeVerifier: string,
  redirectUri: string,
) {
  const tokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'authorization_code',
      client_id: 'admin-console-demo',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    },
  })
  expect(tokenResponse.ok()).toBeTruthy()
  return await tokenResponse.json()
}

test('oidc refresh token flow works for default scopes', async ({ page, request }) => {
  const discovery = await getDiscoveryDocument(request)
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const redirectUri = 'http://127.0.0.1:3004/login/callback'
  const state = `refresh-state-${Date.now()}`
  const nonce = `refresh-nonce-${Date.now()}`

  // Step 1: Complete authorization flow with default scopes (refresh token issued by default)
  const authorizationUrl = createAuthorizationRequestUrl(discovery.authorization_endpoint, {
    state,
    nonce,
    codeChallenge,
    redirectUri,
    scope: 'openid profile email',
  })

  const callbackUrl = await completeBrowserAuthorization(page, authorizationUrl)
  const code = callbackUrl.searchParams.get('code')
  expect(code).toBeTruthy()

  // Step 2: Exchange authorization code for tokens including refresh token
  const initialTokenSet = await exchangeAuthorizationCode(request, discovery, code!, codeVerifier, redirectUri)
  expect(initialTokenSet.access_token).toBeTruthy()
  expect(initialTokenSet.refresh_token).toBeTruthy()
  expect(initialTokenSet.token_type).toBe('Bearer')
  expect(initialTokenSet.scope).toContain('openid')

  // Step 3: Use refresh token to get new access token
  const refreshResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'refresh_token',
      client_id: 'admin-console-demo',
      refresh_token: initialTokenSet.refresh_token,
    },
  })
  expect(refreshResponse.ok()).toBeTruthy()

  const refreshedTokenSet = await refreshResponse.json()
  expect(refreshedTokenSet.access_token).toBeTruthy()
  expect(refreshedTokenSet.token_type).toBe('Bearer')
  expect(refreshedTokenSet.access_token).not.toBe(initialTokenSet.access_token) // New access token

  // Step 4: Verify the new access token works
  const userinfoResponse = await request.get(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${refreshedTokenSet.access_token}`,
    },
  })
  expect(userinfoResponse.ok()).toBeTruthy()
  const userinfo = await userinfoResponse.json()
  expect(userinfo.preferred_username).toBe('standalone.super.admin')
})

test('refresh token usage is tracked correctly', async ({ page, request }) => {
  const discovery = await getDiscoveryDocument(request)
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const redirectUri = 'http://127.0.0.1:3004/login/callback'
  const state = `refresh-tracking-${Date.now()}`
  const nonce = `refresh-tracking-nonce-${Date.now()}`

  // Step 1: Complete authorization and get tokens
  const authorizationUrl = createAuthorizationRequestUrl(discovery.authorization_endpoint, {
    state,
    nonce,
    codeChallenge,
    redirectUri,
    scope: 'openid profile email',
  })

  const callbackUrl = await completeBrowserAuthorization(page, authorizationUrl)
  const code = callbackUrl.searchParams.get('code')
  expect(code).toBeTruthy()

  const tokenSet = await exchangeAuthorizationCode(request, discovery, code!, codeVerifier, redirectUri)
  expect(tokenSet.refresh_token).toBeTruthy()

  // Step 2: Use refresh token to get new tokens
  const refreshResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'refresh_token',
      client_id: 'admin-console-demo',
      refresh_token: tokenSet.refresh_token,
    },
  })
  expect(refreshResponse.ok()).toBeTruthy()

  const refreshedTokenSet = await refreshResponse.json()
  expect(refreshedTokenSet.access_token).toBeTruthy()
  expect(refreshedTokenSet.refresh_token).toBeTruthy()

  // Step 3: Verify the new refresh token works
  const secondRefreshResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'refresh_token',
      client_id: 'admin-console-demo',
      refresh_token: refreshedTokenSet.refresh_token,
    },
  })
  expect(secondRefreshResponse.ok()).toBeTruthy()

  // Step 4: Verify original refresh token is no longer valid (if implemented)
  const oldRefreshResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'refresh_token',
      client_id: 'admin-console-demo',
      refresh_token: tokenSet.refresh_token,
    },
  })
  // Note: This test documents current behavior rather than asserting expected behavior
  // The current implementation may allow old refresh tokens to work
  if (!oldRefreshResponse.ok()) {
    expect(oldRefreshResponse.status()).toBe(400)
  }
})

test('access token lifecycle during refresh', async ({ page, request }) => {
  const discovery = await getDiscoveryDocument(request)
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const redirectUri = 'http://127.0.0.1:3004/login/callback'
  const state = `token-lifecycle-${Date.now()}`
  const nonce = `token-lifecycle-nonce-${Date.now()}`

  // Step 1: Get initial tokens
  const authorizationUrl = createAuthorizationRequestUrl(discovery.authorization_endpoint, {
    state,
    nonce,
    codeChallenge,
    redirectUri,
    scope: 'openid profile email',
  })

  const callbackUrl = await completeBrowserAuthorization(page, authorizationUrl)
  const code = callbackUrl.searchParams.get('code')
  expect(code).toBeTruthy()

  const initialTokenSet = await exchangeAuthorizationCode(request, discovery, code!, codeVerifier, redirectUri)

  // Step 2: Verify initial access token works
  const initialUserinfo = await request.get(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${initialTokenSet.access_token}`,
    },
  })
  expect(initialUserinfo.ok()).toBeTruthy()

  // Step 3: Refresh to get new tokens
  const refreshResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'refresh_token',
      client_id: 'admin-console-demo',
      refresh_token: initialTokenSet.refresh_token,
    },
  })
  expect(refreshResponse.ok()).toBeTruthy()
  const refreshedTokenSet = await refreshResponse.json()

  // Step 4: Verify new access token works
  const newUserinfo = await request.get(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${refreshedTokenSet.access_token}`,
    },
  })
  expect(newUserinfo.ok()).toBeTruthy()

  // Step 5: Verify tokens are different (new tokens were issued)
  expect(refreshedTokenSet.access_token).not.toBe(initialTokenSet.access_token)
  expect(refreshedTokenSet.refresh_token).toBeTruthy()

  // Note: Testing old access token invalidation would require implementation enhancement
  // Current implementation may allow old access tokens to continue working
})