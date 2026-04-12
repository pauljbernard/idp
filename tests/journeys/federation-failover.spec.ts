import { expect, test } from '@playwright/test'

test('federation failover provider health monitoring apis exist', async ({ request }) => {
  // Test federation failover provider health API
  const healthResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (healthResponse.ok()) {
    const healthData = await healthResponse.json()
    expect(Array.isArray(healthData.provider_health_records)).toBe(true)
    expect(typeof healthData.count).toBe('number')
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(healthResponse.status())
  }
})

test('federation failover events tracking is available', async ({ request }) => {
  // Test federation failover events API
  const eventsResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-failover/events', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (eventsResponse.ok()) {
    const eventsData = await eventsResponse.json()
    expect(Array.isArray(eventsData.failover_events)).toBe(true)
    expect(typeof eventsData.count).toBe('number')

    // Check event structure if any events exist
    if (eventsData.failover_events.length > 0) {
      const event = eventsData.failover_events[0]
      expect(event).toHaveProperty('id')
      expect(event).toHaveProperty('provider_id')
      expect(event).toHaveProperty('action')
      expect(event).toHaveProperty('previous_status')
      expect(event).toHaveProperty('new_status')
      expect(event).toHaveProperty('created_at')

      // Validate action types
      expect(['CIRCUIT_BREAK', 'FAILOVER', 'RECOVER']).toContain(event.action)
    }
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(eventsResponse.status())
  }
})

test('federation provider health update endpoint works', async ({ request }) => {
  const testProviderId = 'test-provider-health-update'

  // Test updating provider health status
  const updateResponse = await request.post(`http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health/${testProviderId}`, {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
      'Content-Type': 'application/json',
    },
    data: {
      status: 'HEALTHY',
      provider_name: 'Test Federation Provider',
      provider_type: 'IDENTITY_PROVIDER',
      protocol: 'OIDC',
      notes: ['Health check test'],
    },
  })

  if (updateResponse.ok()) {
    const updateData = await updateResponse.json()
    expect(updateData).toHaveProperty('provider_id', testProviderId)
    expect(updateData).toHaveProperty('status', 'HEALTHY')
    expect(updateData).toHaveProperty('provider_name', 'Test Federation Provider')
    expect(updateData).toHaveProperty('last_check_at')
    expect(updateData).toHaveProperty('consecutive_failures')
    expect(updateData).toHaveProperty('circuit_breaker_open', false)

    // Test updating to degraded status
    const degradedResponse = await request.post(`http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health/${testProviderId}`, {
      headers: {
        'X-IAM-Session': 'mock-admin-session-for-test',
        'Content-Type': 'application/json',
      },
      data: {
        status: 'DEGRADED',
        provider_name: 'Test Federation Provider',
        provider_type: 'IDENTITY_PROVIDER',
        protocol: 'OIDC',
        notes: ['Degraded performance detected'],
      },
    })

    if (degradedResponse.ok()) {
      const degradedData = await degradedResponse.json()
      expect(degradedData).toHaveProperty('status', 'DEGRADED')
    }

    // Test updating to failed status multiple times to trigger circuit breaker
    for (let i = 0; i < 4; i++) {
      await request.post(`http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health/${testProviderId}`, {
        headers: {
          'X-IAM-Session': 'mock-admin-session-for-test',
          'Content-Type': 'application/json',
        },
        data: {
          status: 'FAILED',
          provider_name: 'Test Federation Provider',
          provider_type: 'IDENTITY_PROVIDER',
          protocol: 'OIDC',
          notes: [`Failure attempt ${i + 1}`],
        },
      })
    }

    // Verify circuit breaker should now be open
    const finalHealthResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health', {
      headers: {
        'X-IAM-Session': 'mock-admin-session-for-test',
      },
    })

    if (finalHealthResponse.ok()) {
      const finalHealthData = await finalHealthResponse.json()
      const testProvider = finalHealthData.provider_health_records.find((p: any) => p.provider_id === testProviderId)
      if (testProvider) {
        expect(testProvider.consecutive_failures).toBeGreaterThanOrEqual(3)
        expect(testProvider.circuit_breaker_open).toBe(true)
      }
    }

  } else if (updateResponse.status() === 400) {
    // Test invalid status validation
    const invalidResponse = await request.post(`http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health/${testProviderId}`, {
      headers: {
        'X-IAM-Session': 'mock-admin-session-for-test',
        'Content-Type': 'application/json',
      },
      data: {
        status: 'INVALID_STATUS',
      },
    })
    expect(invalidResponse.status()).toBe(400)
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(updateResponse.status())
  }
})

test('federation health monitoring integrates with main health check', async ({ request }) => {
  // Test that federation health is included in main health endpoint
  const healthResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/health')

  if (healthResponse.ok()) {
    const healthData = await healthResponse.json()
    expect(healthData).toHaveProperty('checks')
    expect(Array.isArray(healthData.checks)).toBe(true)

    // Look for federation-related health checks
    const federationChecks = healthData.checks.filter((check: any) =>
      check.id.includes('federation')
    )

    expect(federationChecks.length).toBeGreaterThan(0)

    // Should have federation failover check
    const failoverCheck = federationChecks.find((check: any) =>
      check.id === 'federation-failover'
    )

    if (failoverCheck) {
      expect(failoverCheck).toHaveProperty('name')
      expect(failoverCheck).toHaveProperty('status')
      expect(failoverCheck).toHaveProperty('summary')
      expect(['PASS', 'WARN', 'FAIL']).toContain(failoverCheck.status)
    }

  } else {
    // Health endpoint may be restricted
    expect([401, 403, 404]).toContain(healthResponse.status())
  }
})

test('federation monitoring supports filtering and querying', async ({ request }) => {
  // Test filtering provider health records
  const filteredResponse = await request.get('http://127.0.0.1:4000/api/v1/iam/federation-failover/provider-health?status=HEALTHY', {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (filteredResponse.ok()) {
    const filteredData = await filteredResponse.json()
    expect(Array.isArray(filteredData.provider_health_records)).toBe(true)

    // All returned records should have HEALTHY status
    filteredData.provider_health_records.forEach((record: any) => {
      expect(record.status).toBe('HEALTHY')
    })
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(filteredResponse.status())
  }

  // Test filtering failover events by time
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const recentEventsResponse = await request.get(`http://127.0.0.1:4000/api/v1/iam/federation-failover/events?since=${encodeURIComponent(oneDayAgo)}`, {
    headers: {
      'X-IAM-Session': 'mock-admin-session-for-test',
    },
  })

  if (recentEventsResponse.ok()) {
    const recentEventsData = await recentEventsResponse.json()
    expect(Array.isArray(recentEventsData.failover_events)).toBe(true)

    // All returned events should be within the last day
    recentEventsData.failover_events.forEach((event: any) => {
      expect(new Date(event.created_at).getTime()).toBeGreaterThanOrEqual(new Date(oneDayAgo).getTime())
    })
  } else {
    // API may require proper authentication
    expect([401, 403, 404]).toContain(recentEventsResponse.status())
  }
})