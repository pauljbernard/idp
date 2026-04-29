import { expect, test } from '@playwright/test'

async function getDiscoveryDocument(request: Parameters<typeof test>[0]['request']) {
  const realmId = 'realm-idp-default'
  const discoveryResponse = await request.get(`http://127.0.0.1:4000/api/v1/iam/realms/${realmId}/.well-known/openid-configuration`)
  expect(discoveryResponse.ok()).toBeTruthy()
  const discovery = await discoveryResponse.json()
  return discovery
}

test('device authorization endpoint is advertised and returns valid device codes', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)

  // Verify device authorization endpoint is advertised in discovery
  expect(discovery.device_authorization_endpoint).toBeTruthy()
  expect(discovery.grant_types_supported).toContain('urn:ietf:params:oauth:grant-type:device_code')

  const clientId = 'admin-console-demo'
  const scope = 'openid profile email'

  // Step 1: Initiate device authorization
  const deviceAuthResponse = await request.post(discovery.device_authorization_endpoint, {
    form: {
      client_id: clientId,
      scope: scope,
    },
  })
  expect(deviceAuthResponse.ok()).toBeTruthy()

  const deviceAuthData = await deviceAuthResponse.json()
  expect(deviceAuthData.device_code).toBeTruthy()
  expect(deviceAuthData.user_code).toBeTruthy()
  expect(deviceAuthData.verification_uri).toBeTruthy()
  expect(deviceAuthData.verification_uri_complete).toBeTruthy()
  expect(deviceAuthData.expires_in).toBeGreaterThan(0)
  expect(deviceAuthData.interval).toBeGreaterThan(0)

  // Verify the verification URI is a valid URL
  expect(() => new URL(deviceAuthData.verification_uri)).not.toThrow()
  expect(() => new URL(deviceAuthData.verification_uri_complete)).not.toThrow()

  // Step 2: Verify device code can be polled (should return authorization_pending)
  const tokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: deviceAuthData.device_code,
    },
  })

  expect(tokenResponse.ok()).toBeFalsy()
  expect(tokenResponse.status()).toBe(400)

  const errorData = await tokenResponse.json()
  expect(errorData.error).toBe('authorization_pending')
  expect(errorData.error_description).toBeTruthy()

  // Note: Full device flow requires UI implementation for device verification page
})

test('device authorization rejects invalid device codes', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)
  const clientId = 'admin-console-demo'

  // Try to exchange an invalid device code
  const tokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: 'invalid-device-code-12345',
    },
  })

  expect(tokenResponse.ok()).toBeFalsy()
  expect(tokenResponse.status()).toBe(400)

  // The response should contain an error - exact error format may vary
  const responseText = await tokenResponse.text()
  expect(responseText.length).toBeGreaterThan(0)
})

test('device authorization validates client existence', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)

  // Try to use device authorization with a non-existent client
  const invalidClientId = 'nonexistent-client'

  const deviceAuthResponse = await request.post(discovery.device_authorization_endpoint, {
    form: {
      client_id: invalidClientId,
      scope: 'openid profile email',
    },
  })

  // Should fail with client validation error
  expect(deviceAuthResponse.ok()).toBeFalsy()
  expect(deviceAuthResponse.status()).toBe(400)

  // Response should contain error information
  const responseText = await deviceAuthResponse.text()
  expect(responseText.length).toBeGreaterThan(0)
})

test('device codes return authorization_pending before user approval', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)
  const clientId = 'admin-console-demo'

  // Step 1: Get a device code
  const deviceAuthResponse = await request.post(discovery.device_authorization_endpoint, {
    form: {
      client_id: clientId,
      scope: 'openid profile email',
    },
  })
  expect(deviceAuthResponse.ok()).toBeTruthy()

  const deviceAuthData = await deviceAuthResponse.json()

  // Step 2: Try to exchange immediately without user authorization
  const prematureTokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: deviceAuthData.device_code,
    },
  })

  expect(prematureTokenResponse.ok()).toBeFalsy()
  expect(prematureTokenResponse.status()).toBe(400)

  const errorData = await prematureTokenResponse.json()
  expect(errorData.error).toBe('authorization_pending')
  expect(errorData.error_description).toBeTruthy()
})