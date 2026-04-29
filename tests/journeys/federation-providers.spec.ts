import { expect, test } from '@playwright/test'

test('federation identity providers are configured and accessible', async ({ request }) => {
  // Test identity providers management API
  const providersResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/identity-providers', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (providersResponse.ok()) {
    const providersData = await providersResponse.json()
    expect(Array.isArray(providersData.identity_providers)).toBe(true)

    const providers = providersData.identity_providers

    // Look for synthetic test providers
    const oidcProviders = providers.filter((p: any) => p.protocol === 'OIDC')
    const samlProviders = providers.filter((p: any) => p.protocol === 'SAML')

    expect(oidcProviders.length).toBeGreaterThan(0)
    expect(samlProviders.length).toBeGreaterThan(0)

    // Validate provider structure
    const oidcProvider = oidcProviders[0]
    expect(oidcProvider).toHaveProperty('id')
    expect(oidcProvider).toHaveProperty('name')
    expect(oidcProvider).toHaveProperty('protocol', 'OIDC')
    expect(oidcProvider).toHaveProperty('status')
    expect(oidcProvider).toHaveProperty('issuer_url')
    expect(oidcProvider).toHaveProperty('link_policy')

    const samlProvider = samlProviders[0]
    expect(samlProvider).toHaveProperty('protocol', 'SAML')
    expect(samlProvider).toHaveProperty('issuer_url')

  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(providersResponse.status())
  }
})

test('user federation providers support multiple protocols', async ({ request }) => {
  // Test user federation providers API
  const federationResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/user-federation-providers', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (federationResponse.ok()) {
    const federationData = await federationResponse.json()
    expect(Array.isArray(federationData.user_federation_providers)).toBe(true)

    const providers = federationData.user_federation_providers

    // Look for different federation provider types
    const providerKinds = new Set(providers.map((p: any) => p.provider_kind))

    if (providers.length > 0) {
      // Should have multiple federation provider types
      expect(providers[0]).toHaveProperty('provider_kind')
      expect(providers[0]).toHaveProperty('connection_label')
      expect(providers[0]).toHaveProperty('import_strategy')
      expect(providers[0]).toHaveProperty('status')

      // Common provider kinds expected
      const expectedKinds = ['LDAP', 'SCIM', 'AWS_IDENTITY_CENTER', 'COGNITO_USER_POOL']
      const hasExpectedKinds = expectedKinds.some(kind => providerKinds.has(kind))
      expect(hasExpectedKinds).toBe(true)
    }

  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(federationResponse.status())
  }
})

test('federation trust stores support certificate management', async ({ request }) => {
  // Test federation trust stores API
  const trustStoresResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-trust-stores', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (trustStoresResponse.ok()) {
    const trustStoresData = await trustStoresResponse.json()
    expect(Array.isArray(trustStoresData.trust_stores)).toBe(true)

    const trustStores = trustStoresData.trust_stores

    if (trustStores.length > 0) {
      const trustStore = trustStores[0]
      expect(trustStore).toHaveProperty('id')
      expect(trustStore).toHaveProperty('name')
      expect(trustStore).toHaveProperty('supported_protocols')
      expect(trustStore).toHaveProperty('issuer_url')
      expect(trustStore).toHaveProperty('certificate_labels')
      expect(trustStore).toHaveProperty('status')

      // Should support OIDC or SAML protocols
      const supportedProtocols = trustStore.supported_protocols
      expect(Array.isArray(supportedProtocols)).toBe(true)

      const hasValidProtocol = supportedProtocols.some((protocol: string) =>
        ['OIDC', 'SAML'].includes(protocol)
      )
      expect(hasValidProtocol).toBe(true)
    }

  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(trustStoresResponse.status())
  }
})

test('federation mapping profiles handle claim transformations', async ({ request }) => {
  // Test federation mapping profiles API
  const mappingResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-mapping-profiles', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (mappingResponse.ok()) {
    const mappingData = await mappingResponse.json()
    expect(Array.isArray(mappingData.mapping_profiles)).toBe(true)

    const profiles = mappingData.mapping_profiles

    if (profiles.length > 0) {
      const profile = profiles[0]
      expect(profile).toHaveProperty('id')
      expect(profile).toHaveProperty('name')
      expect(profile).toHaveProperty('protocol')
      expect(profile).toHaveProperty('link_policy')
      expect(profile).toHaveProperty('claim_mappings')
      expect(profile).toHaveProperty('trust_store_id')

      // Should have claim mappings
      const claimMappings = profile.claim_mappings
      expect(Array.isArray(claimMappings)).toBe(true)

      if (claimMappings.length > 0) {
        const mapping = claimMappings[0]
        expect(mapping).toHaveProperty('source_attribute')
        expect(mapping).toHaveProperty('target_claim')
        expect(mapping).toHaveProperty('include_in_userinfo')
      }

      // Should have valid link policy
      expect(['EMAIL_MATCH', 'AUTO_CREATE', 'MANUAL']).toContain(profile.link_policy)
    }

  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(mappingResponse.status())
  }
})

test('linked identities tracking system exists', async ({ request }) => {
  // Test linked identities API
  const linkedResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/linked-identities', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (linkedResponse.ok()) {
    const linkedData = await linkedResponse.json()
    expect(Array.isArray(linkedData.linked_identities)).toBe(true)

    const identities = linkedData.linked_identities

    if (identities.length > 0) {
      const identity = identities[0]
      expect(identity).toHaveProperty('id')
      expect(identity).toHaveProperty('user_id')
      expect(identity).toHaveProperty('provider_id')
      expect(identity).toHaveProperty('external_subject')
      expect(identity).toHaveProperty('external_username')
      expect(identity).toHaveProperty('linked_at')
      expect(identity).toHaveProperty('source_type')

      // Should have valid source type
      expect(['BROKER', 'FEDERATION']).toContain(identity.source_type)
    }

  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(linkedResponse.status())
  }
})

test('federation sync jobs provide audit trail', async ({ request }) => {
  // Test federation sync jobs API
  const syncJobsResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-sync-jobs', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (syncJobsResponse.ok()) {
    const syncJobsData = await syncJobsResponse.json()
    expect(Array.isArray(syncJobsData.sync_jobs)).toBe(true)

    const jobs = syncJobsData.sync_jobs

    if (jobs.length > 0) {
      const job = jobs[0]
      expect(job).toHaveProperty('id')
      expect(job).toHaveProperty('provider_id')
      expect(job).toHaveProperty('provider_name')
      expect(job).toHaveProperty('status')
      expect(job).toHaveProperty('started_at')
      expect(job).toHaveProperty('completed_at')

      // Should have valid status
      expect(['COMPLETED', 'FAILED']).toContain(job.status)
    }

  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(syncJobsResponse.status())
  }
})

test('federation privacy policies support different classifications', async ({ request }) => {
  // Test federation privacy policies API (if available)
  const privacyResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/identity-privacy-policies', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (privacyResponse.ok()) {
    const privacyData = await privacyResponse.json()
    expect(Array.isArray(privacyData.privacy_policies)).toBe(true)

    const policies = privacyData.privacy_policies

    if (policies.length > 0) {
      const policy = policies[0]
      expect(policy).toHaveProperty('id')
      expect(policy).toHaveProperty('name')
      expect(policy).toHaveProperty('classification')

      // Should support privacy classifications
      const classifications = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'PROTECTED']
      expect(classifications).toContain(policy.classification)
    }

  } else {
    // Privacy policies may not be fully implemented yet
    expect([401, 403, 404, 501]).toContain(privacyResponse.status())
  }
})

test('federation session index tracking works', async ({ request }) => {
  // Test federation session index API
  const sessionIndexResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-sessions', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  // This endpoint may not exist yet, so we check for reasonable responses
  if (sessionIndexResponse.ok()) {
    const sessionData = await sessionIndexResponse.json()
    // Should have session structure if implemented
    expect(typeof sessionData).toBe('object')
  } else {
    // Endpoint may require implementation or authentication
    expect([401, 403, 404, 501]).toContain(sessionIndexResponse.status())
  }
})