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
    prompt?: string
  },
) {
  const authorizationUrl = new URL(authorizationEndpoint)
  authorizationUrl.searchParams.set('client_id', 'admin-console-demo')
  authorizationUrl.searchParams.set('redirect_uri', options.redirectUri ?? 'http://127.0.0.1:3004/login/callback')
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
  page: Parameters<typeof test>[0]['page'],
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

async function getDiscoveryDocument(request: Parameters<typeof test>[0]['request']) {
  const realmId = 'realm-idp-default'
  const discoveryResponse = await request.get(`http://127.0.0.1:4000/api/v1/iam/realms/${realmId}/.well-known/openid-configuration`)
  expect(discoveryResponse.ok()).toBeTruthy()
  const discovery = await discoveryResponse.json()

  expect(discovery.issuer).toBe(`http://127.0.0.1:4000/api/v1/iam/realms/${realmId}`)
  expect(discovery.authorization_endpoint).toBe(`${discovery.issuer}/protocol/openid-connect/auth`)
  expect(discovery.token_endpoint).toBe(`${discovery.issuer}/protocol/openid-connect/token`)
  expect(discovery.userinfo_endpoint).toBe(`${discovery.issuer}/protocol/openid-connect/userinfo`)
  expect(discovery.response_types_supported).toContain('code')
  expect(discovery.code_challenge_methods_supported).toEqual(['S256'])
  expect(discovery.token_endpoint_auth_methods_supported).toContain('none')
  return discovery
}

test('oidc discovery and auth-code pkce flow interoperate for the supported public client', async ({ page, request }) => {
  const discovery = await getDiscoveryDocument(request)
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest())
  const redirectUri = 'http://127.0.0.1:3004/login/callback'
  const state = `oidc-state-${Date.now()}`
  const nonce = `oidc-nonce-${Date.now()}`
  const authorizationUrl = createAuthorizationRequestUrl(discovery.authorization_endpoint, {
    state,
    nonce,
    codeChallenge,
    redirectUri,
  })

  const callbackUrl = await completeBrowserAuthorization(page, authorizationUrl, { interactiveLogin: true })
  await expect(page.getByRole('heading', { name: 'OIDC Callback Received' })).toBeVisible()

  const code = callbackUrl.searchParams.get('code')
  expect(code).toBeTruthy()
  expect(callbackUrl.searchParams.get('state')).toBe(state)
  await expect(page.getByText(state, { exact: false })).toBeVisible()

  const tokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'authorization_code',
      client_id: 'admin-console-demo',
      code: code!,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    },
  })
  expect(tokenResponse.ok()).toBeTruthy()
  const tokenSet = await tokenResponse.json()
  expect(tokenSet.token_type).toBe('Bearer')
  expect(tokenSet.access_token).toBeTruthy()
  expect(tokenSet.id_token).toBeTruthy()
  expect(tokenSet.expires_in).toBeGreaterThan(0)
  expect(tokenSet.scope).toContain('openid')

  const userinfoResponse = await request.get(discovery.userinfo_endpoint, {
    headers: {
      Authorization: `Bearer ${tokenSet.access_token}`,
    },
  })
  expect(userinfoResponse.ok()).toBeTruthy()
  const userinfo = await userinfoResponse.json()
  expect(userinfo.preferred_username).toBe('standalone.super.admin')
  expect(userinfo.email).toBe('admin@idp.local')
})

test('oidc browser session is reused for prompt=none and rejected after logout', async ({ page, request }) => {
  const discovery = await getDiscoveryDocument(request)
  const initialVerifier = base64UrlEncode(randomBytes(32))
  const initialChallenge = base64UrlEncode(createHash('sha256').update(initialVerifier).digest())
  const initialState = `oidc-initial-${Date.now()}`
  const initialNonce = `oidc-initial-nonce-${Date.now()}`

  const initialCallbackUrl = await completeBrowserAuthorization(
    page,
    createAuthorizationRequestUrl(discovery.authorization_endpoint, {
      state: initialState,
      nonce: initialNonce,
      codeChallenge: initialChallenge,
    }),
    { interactiveLogin: true },
  )
  expect(initialCallbackUrl.searchParams.get('code')).toBeTruthy()
  expect(initialCallbackUrl.searchParams.get('state')).toBe(initialState)

  await page.goto('/iam/account')
  await expect(page.getByRole('banner').getByRole('button', { name: 'Logout' })).toBeVisible()

  const reuseVerifier = base64UrlEncode(randomBytes(32))
  const reuseChallenge = base64UrlEncode(createHash('sha256').update(reuseVerifier).digest())
  const reuseState = `oidc-reuse-${Date.now()}`
  const reuseNonce = `oidc-reuse-nonce-${Date.now()}`

  const reuseCallbackUrl = await completeBrowserAuthorization(
    page,
    createAuthorizationRequestUrl(discovery.authorization_endpoint, {
      state: reuseState,
      nonce: reuseNonce,
      codeChallenge: reuseChallenge,
      prompt: 'none',
    }),
  )

  await expect(page.getByRole('heading', { name: 'OIDC Callback Received' })).toBeVisible()
  expect(reuseCallbackUrl.searchParams.get('code')).toBeTruthy()
  expect(reuseCallbackUrl.searchParams.get('error')).toBeNull()
  expect(reuseCallbackUrl.searchParams.get('state')).toBe(reuseState)

  await page.goto('/iam/account')
  const banner = page.getByRole('banner')
  await banner.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL('**/iam/login?logged_out=1')

  const loggedOutVerifier = base64UrlEncode(randomBytes(32))
  const loggedOutChallenge = base64UrlEncode(createHash('sha256').update(loggedOutVerifier).digest())
  const loggedOutState = `oidc-logged-out-${Date.now()}`
  const loggedOutNonce = `oidc-logged-out-nonce-${Date.now()}`

  const loggedOutCallbackUrl = await completeBrowserAuthorization(
    page,
    createAuthorizationRequestUrl(discovery.authorization_endpoint, {
      state: loggedOutState,
      nonce: loggedOutNonce,
      codeChallenge: loggedOutChallenge,
      prompt: 'none',
    }),
  )

  await expect(page.getByRole('heading', { name: 'OIDC Callback Error' })).toBeVisible()
  expect(loggedOutCallbackUrl.searchParams.get('error')).toBe('login_required')
  expect(loggedOutCallbackUrl.searchParams.get('state')).toBe(loggedOutState)
})
