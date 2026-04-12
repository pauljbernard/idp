import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('crew migration binding preparation', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('seeds Crew as a first-class migration consumer with informative-plane contract metadata', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-crew-binding-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const bindings = LocalIamFoundationStore.listRealmBindings({ binding_target_kind: 'APPLICATION' }).realm_bindings
    const crewBinding = bindings.find((binding) => binding.id === 'binding-application-crew-web')

    expect(crewBinding).toBeDefined()
    expect(crewBinding?.binding_target_id).toBe('crew-web')
    expect(crewBinding?.realm_id).toBe('realm-crew-validation')
    expect(crewBinding?.auth_binding).toMatchObject({
      client_id: 'crew-web-demo',
      preferred_authentication_mode: 'browser_authorization_code_pkce',
    })
    expect(crewBinding?.consumer_contract).toMatchObject({
      application_id: 'crew',
      application_name: 'Crew',
      contract_version: '2026-04-05',
      informative_authorization_plane: 'INFORMATIVE',
      enforcement_plane: 'ENFORCEMENT',
      enforcement_owner: 'crew',
      principal_context_source: 'IDP',
      tenant_context_source: 'IDP',
      identity_access_facts_source: 'IDP',
      business_policy_source: 'EXTERNAL_APPLICATIONS',
      identity_bootstrap_delivery: 'PLANNED',
      principal_context_delivery: 'PLANNED',
      tenant_context_delivery: 'PLANNED',
      identity_access_facts_delivery: 'PLANNED',
      account_self_service_delivery: 'PLANNED',
    })
    expect(crewBinding?.consumer_contract?.migration_scope).toContain('identity_access_facts')
    expect(crewBinding?.consumer_contract?.external_policy_sources).toContain('commercial_entitlements')
    expect(crewBinding?.projection_policy).toMatchObject({
      policy_id: 'projection-policy-crew-default',
      membership_projection_strategy: 'EXPLICIT_MEMBERSHIP_ONLY',
    })
    expect(crewBinding?.projection_policy?.projection_sources).toContain('explicit_identity_membership')

    const validationDomains = LocalIamFoundationStore.listValidationDomains().validation_domains
    expect(validationDomains).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'validation-crew-migration',
        migration_blocked: true,
      }),
    ]))
  })

  it('persists Crew consumer contract updates through the realm binding store', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-crew-binding-update-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const updated = LocalIamFoundationStore.updateRealmBinding('idp-super-admin', 'binding-application-crew-web', {
      consumer_contract: {
        application_id: 'crew',
        application_name: 'Crew',
        contract_version: '2026-04-06-draft',
        informative_authorization_plane: 'INFORMATIVE',
        enforcement_plane: 'ENFORCEMENT',
        enforcement_owner: 'crew',
        principal_context_source: 'IDP',
        tenant_context_source: 'IDP',
        identity_access_facts_source: 'IDP',
        business_policy_source: 'EXTERNAL_APPLICATIONS',
        summary: 'Crew consumes IDP facts and continues to enforce request-time authorization.',
        migration_scope: ['authentication', 'identity_bootstrap', 'tenant_context', 'identity_access_facts'],
        external_policy_sources: ['crew_domain_state', 'crew_business_rights'],
        identity_bootstrap_delivery: 'AVAILABLE',
        principal_context_delivery: 'AVAILABLE',
        tenant_context_delivery: 'AVAILABLE',
        identity_access_facts_delivery: 'PLANNED',
        account_self_service_delivery: 'PLANNED',
      },
      projection_policy: {
        policy_id: 'projection-policy-crew-v2',
        summary: 'Crew projection policy draft with explicit membership and claim matching.',
        membership_projection_strategy: 'CLAIMS_AND_EXPLICIT_MEMBERSHIP',
        platform_administrator_rule: {
          role_names: ['platform_administrator'],
          group_names: ['platform-admins'],
        },
        managed_role_mappings: [
          {
            managed_role_id: 'tenant_admin',
            summary: 'Administrative projection mapping.',
            match: {
              role_names: ['tenant_admin'],
              group_names: ['tenant-admins'],
            },
          },
        ],
        projection_sources: ['claim_match', 'explicit_identity_membership'],
      },
    })

    expect(updated.consumer_contract?.contract_version).toBe('2026-04-06-draft')
    expect(updated.consumer_contract?.principal_context_delivery).toBe('AVAILABLE')
    expect(updated.projection_policy?.policy_id).toBe('projection-policy-crew-v2')
    expect(updated.projection_policy?.membership_projection_strategy).toBe('CLAIMS_AND_EXPLICIT_MEMBERSHIP')

    const exported = LocalIamFoundationStore.exportState() as {
      realm_bindings: Array<{
        id: string
        consumer_contract: {
          contract_version: string
          principal_context_delivery: string
        } | null
        projection_policy: {
          policy_id: string
          membership_projection_strategy: string
        } | null
      }>
    }
    const crewBinding = exported.realm_bindings.find((binding) => binding.id === 'binding-application-crew-web')
    expect(crewBinding?.consumer_contract?.contract_version).toBe('2026-04-06-draft')
    expect(crewBinding?.consumer_contract?.principal_context_delivery).toBe('AVAILABLE')
    expect(crewBinding?.projection_policy?.policy_id).toBe('projection-policy-crew-v2')
    expect(crewBinding?.projection_policy?.membership_projection_strategy).toBe('CLAIMS_AND_EXPLICIT_MEMBERSHIP')
  })

  it('resolves generic consumer-contract lookup for an application binding', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-crew-binding-contract-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const response = LocalIamFoundationStore.getConsumerContract('binding-application-crew-web')

    expect(response.binding_id).toBe('binding-application-crew-web')
    expect(response.binding_target_kind).toBe('APPLICATION')
    expect(response.binding_target_id).toBe('crew-web')
    expect(response.consumer_contract).toMatchObject({
      application_id: 'crew',
      informative_authorization_plane: 'INFORMATIVE',
      enforcement_plane: 'ENFORCEMENT',
      enforcement_owner: 'crew',
    })
  })

  it('resolves an application binding by realm and client identifier', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-flightos-binding-lookup-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')

    const response = LocalIamFoundationStore.getApplicationBindingByRealmClient('realm-flightos-default', 'admin-console-demo')

    expect(response.id).toBe('binding-application-flightos-web')
    expect(response.binding_target_kind).toBe('APPLICATION')
    expect(response.binding_target_name).toBe('FlightOS Application')
    expect(response.consumer_contract).toMatchObject({
      application_id: 'flightos',
      enforcement_owner: 'flightos',
    })
  })
})
