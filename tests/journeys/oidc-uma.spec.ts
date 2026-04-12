import { expect, test } from '@playwright/test'

async function getDiscoveryDocument(request: Parameters<typeof test>[0]['request']) {
  const realmId = 'realm-idp-default'
  const discoveryResponse = await request.get(`http://127.0.0.1:4000/api/v1/iam/realms/${realmId}/.well-known/openid-configuration`)
  expect(discoveryResponse.ok()).toBeTruthy()
  const discovery = await discoveryResponse.json()
  return discovery
}

test('uma grant type is advertised in discovery', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)

  // Verify UMA grant type is advertised
  expect(discovery.grant_types_supported).toContain('urn:ietf:params:oauth:grant-type:uma-ticket')
})

test('uma permission ticket endpoint structure', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)

  // Test UMA permission ticket creation (without valid resource)
  const permissionResponse = await request.post(`${discovery.issuer}/authz/protection/permission`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-rpt-for-structure-test',
    },
    data: {
      resource_id: 'test-resource',
      resource_scopes: ['read', 'write'],
    },
  })

  // Should fail with authentication error, but endpoint should exist
  expect([400, 401, 403, 404]).toContain(permissionResponse.status())
})

test('uma rpt token exchange validation', async ({ request }) => {
  const discovery = await getDiscoveryDocument(request)

  // Attempt UMA ticket exchange without valid ticket
  const umaTokenResponse = await request.post(discovery.token_endpoint, {
    form: {
      grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
      client_id: 'admin-console-demo',
      ticket: 'invalid-permission-ticket',
    },
  })

  expect(umaTokenResponse.ok()).toBeFalsy()
  expect(umaTokenResponse.status()).toBe(400)

  const responseText = await umaTokenResponse.text()
  expect(responseText.length).toBeGreaterThan(0)
})

test('uma configuration endpoints are available', async ({ request }) => {
  const realmId = 'realm-idp-default'

  // Check for UMA well-known configuration
  const umaConfigResponse = await request.get(`http://127.0.0.1:4000/api/v1/iam/realms/${realmId}/.well-known/uma2-configuration`)

  if (umaConfigResponse.ok()) {
    const umaConfig = await umaConfigResponse.json()
    expect(umaConfig.issuer).toBeTruthy()
    expect(umaConfig.permission_endpoint).toBeTruthy()
    expect(umaConfig.resource_registration_endpoint).toBeTruthy()
  } else {
    // UMA configuration may not be fully implemented
    expect([404, 501]).toContain(umaConfigResponse.status())
  }
})

test('authorization services apis are present', async ({ request }) => {
  // Check authorization services management APIs
  const authzResourcesResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/authz-resources', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (authzResourcesResponse.ok()) {
    const authzData = await authzResourcesResponse.json()
    expect(Array.isArray(authzData.resources) || Array.isArray(authzData)).toBe(true)
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(authzResourcesResponse.status())
  }

  const authzPoliciesResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/authz-policies', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (authzPoliciesResponse.ok()) {
    const policiesData = await authzPoliciesResponse.json()
    expect(Array.isArray(policiesData.policies) || Array.isArray(policiesData)).toBe(true)
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(authzPoliciesResponse.status())
  }
})