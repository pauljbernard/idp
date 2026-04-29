import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

function rewriteEnvelopeState<T>(filePath: string, mutate: (state: T) => void) {
  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    version: number
    saved_at: string
    state: T
  }
  mutate(envelope.state)
  envelope.saved_at = new Date().toISOString()
  writeFileSync(filePath, JSON.stringify(envelope), 'utf8')
}

describe('transient state maintenance', () => {
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

  it('expires and records transient session and token state through the operations surface', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-transient-maintenance-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SYSTEM_USER_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamFoundationStore } = await import('../src/platform/iamFoundation')
    const { LocalIamOrganizationStore } = await import('../src/platform/iamOrganizations')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')
    const { LocalIamAuthorizationRuntimeStore } = await import('../src/platform/iamAuthorizationRuntime')
    const { LocalIamAuthorizationServicesStore } = await import('../src/platform/iamAuthorizationServices')
    const { LocalIamAdvancedOAuthRuntimeStore } = await import('../src/platform/iamAdvancedOAuthRuntime')
    const { LocalIamProtocolRuntimeStore } = await import('../src/platform/iamProtocolRuntime')
    const { LocalIamWebAuthnStore } = await import('../src/platform/iamWebAuthn')
    const { LocalIamOperationsRuntimeStore } = await import('../src/platform/iamOperationsRuntime')
    const persistence = await import('../src/platform/persistence')

    const expiredAt = new Date(Date.now() - 60_000).toISOString()
    const now = new Date().toISOString()

    const foundationDirectoryPath = persistence.getPersistedStatePath('iam-foundation-directory-state.json')
    const foundationRequestPath = persistence.getPersistedStatePath('iam-foundation-delegated-consent-requests-state.json')

    rewriteEnvelopeState<any>(
      foundationDirectoryPath,
      (runtimeState) => {
        const delegatedRelationship = runtimeState.delegated_relationships[0]
        runtimeState.delegated_consents.push({
          id: 'expired-delegated-consent',
          realm_id: IAM_DEFAULT_REALM_ID,
          relationship_id: delegatedRelationship.id,
          principal_user_id: delegatedRelationship.principal_user_id,
          delegate_user_id: delegatedRelationship.delegate_user_id,
          status: 'ACTIVE',
          scope_names: ['profile.read'],
          purpose_names: [],
          granted_at: now,
          expires_at: expiredAt,
          revoked_at: null,
          granted_by_user_id: IAM_SYSTEM_USER_ID,
          revoked_by_user_id: null,
          notes: [],
          synthetic: false,
        })
      },
    )

    rewriteEnvelopeState<any>(
      foundationRequestPath,
      (runtimeState) => {
        const foundationState = LocalIamFoundationStore.exportState() as any
        const delegatedRelationship = foundationState.delegated_relationships[0]
        runtimeState.delegated_consent_requests.push({
          id: 'expired-delegated-consent-request',
          realm_id: IAM_DEFAULT_REALM_ID,
          relationship_id: delegatedRelationship.id,
          principal_user_id: delegatedRelationship.principal_user_id,
          delegate_user_id: delegatedRelationship.delegate_user_id,
          requested_by_user_id: delegatedRelationship.delegate_user_id,
          status: 'PENDING',
          requested_scope_names: ['profile.read'],
          requested_purpose_names: [],
          requested_at: now,
          expires_at: expiredAt,
          responded_at: null,
          decided_by_user_id: null,
          delegated_consent_id: null,
          request_notes: [],
          decision_notes: [],
          synthetic: false,
        })
      },
    )

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-organizations-invitations-state.json'),
      (runtimeState) => {
        runtimeState.invitations.push({
          id: 'expired-organization-invitation',
          realm_id: IAM_DEFAULT_REALM_ID,
          organization_id: 'synthetic-maintenance-org',
          email: 'expired.invite@idp.local',
          role: 'MEMBER',
          status: 'PENDING',
          linked_identity_provider_aliases: [],
          invited_user_id: null,
          accepted_membership_id: null,
          expires_at: expiredAt,
          accepted_at: null,
          revoked_at: null,
          created_at: now,
          updated_at: now,
          created_by_user_id: IAM_SYSTEM_USER_ID,
          updated_by_user_id: IAM_SYSTEM_USER_ID,
        })
      },
    )

    LocalIamAuthenticationRuntimeStore.importState({
      account_sessions: [
        {
          id: 'expired-account-session',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          client_id: null,
          client_identifier: null,
          client_name: null,
          client_protocol: null,
          scope_names: [],
          assurance_level: 'PASSWORD',
          authenticated_at: now,
          issued_at: now,
          last_seen_at: now,
          expires_at: expiredAt,
          revoked_at: null,
          session_proof_hash: null,
          synthetic: true,
        },
      ],
      login_transactions: [
        {
          id: 'expired-login-transaction',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          flow_id: 'browser-flow',
          client_id: null,
          client_identifier: null,
          client_name: null,
          client_protocol: null,
          requested_scope_names: [],
          pending_required_actions: [],
          pending_scope_consent: [],
          pending_mfa: false,
          created_at: now,
          expires_at: expiredAt,
          completed_at: null,
          cancelled_at: null,
          status: 'PENDING_REQUIRED_ACTIONS',
        },
      ],
      password_reset_tickets: [
        {
          id: 'expired-password-reset-ticket',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          code_hash: 'hash',
          code_preview: null,
          issued_at: now,
          expires_at: expiredAt,
          status: 'PENDING',
          consumed_at: null,
        },
      ],
      email_verification_tickets: [
        {
          id: 'expired-email-verification-ticket',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          code_hash: 'hash',
          code_preview: null,
          issued_at: now,
          expires_at: expiredAt,
          status: 'PENDING',
          consumed_at: null,
        },
      ],
      pending_mfa_enrollments: [
        {
          id: 'expired-pending-mfa',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          secret: 'SECRET',
          backup_codes: ['A', 'B'],
          created_at: now,
          expires_at: expiredAt,
          consumed_at: null,
        },
      ],
    } as any)

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-authentication-transient-state.json'),
      (runtimeState) => {
        runtimeState.account_sessions[0].revoked_at = null
        runtimeState.account_sessions[0].expires_at = expiredAt
      },
    )

    LocalIamAuthorizationRuntimeStore.importState({
      authorization_requests: [
        {
          id: 'expired-auth-request',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-id',
          client_name: 'Client',
          redirect_uri: 'https://example.com/callback',
          response_type: 'code',
          response_mode: 'query',
          requested_scope_names: ['openid'],
          requested_purpose: null,
          state: null,
          nonce: null,
          prompt_values: [],
          code_challenge: null,
          code_challenge_method: null,
          created_at: now,
          expires_at: expiredAt,
          authorized_at: null,
          cancelled_at: null,
          status: 'PENDING',
        },
      ],
      authorization_codes: [
        {
          id: 'expired-auth-code',
          authorization_request_id: 'expired-auth-request',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-id',
          user_id: IAM_SUPER_ADMIN_USER_ID,
          session_id: 'expired-account-session',
          redirect_uri: 'https://example.com/callback',
          code: 'code',
          requested_scope_names: ['openid'],
          requested_purpose: null,
          state: null,
          nonce: null,
          code_challenge: null,
          code_challenge_method: null,
          issued_at: now,
          expires_at: expiredAt,
          consumed_at: null,
          status: 'ACTIVE',
        },
      ],
    } as any)

    LocalIamAdvancedOAuthRuntimeStore.importState({
      initial_access_tokens: [
        {
          id: 'expired-initial-access-token',
          realm_id: IAM_DEFAULT_REALM_ID,
          policy_id: 'policy-id',
          label: 'Expired initial access token',
          token_hash: 'token-hash',
          status: 'ACTIVE',
          remaining_uses: null,
          expires_at: expiredAt,
          created_at: now,
          created_by_user_id: IAM_SYSTEM_USER_ID,
        },
      ],
      registration_access_tokens: [
        {
          id: 'expired-registration-token',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-record-id',
          token_hash: 'registration-hash',
          status: 'ACTIVE',
          expires_at: expiredAt,
          created_at: now,
          created_by_user_id: IAM_SYSTEM_USER_ID,
        },
      ],
      pushed_authorization_requests: [
        {
          id: 'expired-par',
          request_uri: 'urn:ietf:params:oauth:request_uri:expired-par',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-id',
          redirect_uri: 'https://example.com/callback',
          response_type: 'code',
          response_mode: 'query',
          scope: 'openid',
          requested_purpose: null,
          state: null,
          nonce: null,
          prompt: null,
          code_challenge: null,
          code_challenge_method: null,
          status: 'ACTIVE',
          expires_at: expiredAt,
          created_at: now,
        },
      ],
      device_authorizations: [
        {
          id: 'expired-device-authorization',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-id',
          device_code: 'device-code',
          user_code: 'USER-CODE',
          scope: 'openid',
          scope_names: ['openid'],
          verification_uri: 'https://example.com/verify',
          verification_uri_complete: 'https://example.com/verify?code=USER-CODE',
          interval: 5,
          expires_at: expiredAt,
          status: 'PENDING',
          user_id: null,
          approved_at: null,
          denied_at: null,
          consumed_at: null,
          created_at: now,
          session_id: null,
          last_polled_at: null,
          poll_count: 0,
        },
      ],
      backchannel_authentication_requests: [
        {
          id: 'expired-backchannel-auth',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-id',
          auth_req_id: 'auth-req-id',
          scope: 'openid',
          scope_names: ['openid'],
          requested_purpose: null,
          login_hint: 'admin@idp.local',
          binding_message: null,
          expires_at: expiredAt,
          status: 'PENDING',
          user_id: null,
          approved_at: null,
          denied_at: null,
          consumed_at: null,
          created_at: now,
          last_polled_at: null,
          poll_count: 0,
        },
      ],
    } as any)

    LocalIamAuthorizationServicesStore.importState({
      permission_tickets: [
        {
          id: 'expired-permission-ticket',
          realm_id: IAM_DEFAULT_REALM_ID,
          resource_server_id: 'resource-server-id',
          resource_server_client_id: 'resource-server-client-id',
          requester_client_id: 'requester-client-id',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          resource_id: 'resource-id',
          requested_scope_names: ['view'],
          granted_scope_names: ['view'],
          status: 'GRANTED',
          reason: 'Granted for test',
          created_at: now,
          expires_at: expiredAt,
          exchanged_at: null,
          evaluation_id: null,
          rpt_token_id: null,
        },
      ],
    } as any)

    LocalIamProtocolRuntimeStore.importState({
      issued_tokens: [
        {
          id: 'expired-issued-token',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'client-id',
          subject_kind: 'USER',
          subject_id: IAM_SUPER_ADMIN_USER_ID,
          grant_type: 'password',
          token_family_id: 'family-id',
          scope: 'openid profile',
          scope_ids: [],
          claims: {},
          userinfo_claims: {},
          issued_at: now,
          expires_at: expiredAt,
          refresh_expires_at: new Date(Date.now() + 60_000).toISOString(),
          status: 'ACTIVE',
          revoked_at: null,
          requested_purpose: null,
          access_token_hash: 'access-hash',
          refresh_token_hash: null,
        },
      ],
      saml_auth_requests: [
        {
          id: 'expired-saml-auth-request',
          realm_id: IAM_DEFAULT_REALM_ID,
          client_id: 'saml-client-id',
          client_name: 'SAML Client',
          acs_url: 'https://example.com/saml/acs',
          relay_state: null,
          request_binding: 'REDIRECT',
          request_id: null,
          request_xml: null,
          force_authn: false,
          created_at: now,
          expires_at: expiredAt,
          completed_at: null,
          cancelled_at: null,
          status: 'PENDING',
        },
      ],
    } as any)

    LocalIamWebAuthnStore.importState({
      registration_challenges: [
        {
          id: 'expired-webauthn-registration',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          challenge: 'challenge',
          created_at: now,
          expires_at: expiredAt,
          consumed_at: null,
        },
      ],
      authentication_challenges: [
        {
          id: 'expired-webauthn-authentication',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          username_or_email: 'admin@idp.local',
          client_id: null,
          requested_scope_names: [],
          challenge: 'challenge',
          allowed_credential_ids: [],
          created_at: now,
          expires_at: expiredAt,
          consumed_at: null,
        },
      ],
    } as any)

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-authorization-runtime-state.json'),
      (runtimeState) => {
        runtimeState.authorization_requests[0].status = 'PENDING'
        runtimeState.authorization_requests[0].expires_at = expiredAt
        runtimeState.authorization_codes[0].status = 'ACTIVE'
        runtimeState.authorization_codes[0].expires_at = expiredAt
      },
    )

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-advanced-oauth-directory-state.json'),
      (runtimeState) => {
        runtimeState.initial_access_tokens[0].status = 'ACTIVE'
        runtimeState.initial_access_tokens[0].expires_at = expiredAt
        runtimeState.registration_access_tokens[0].status = 'ACTIVE'
        runtimeState.registration_access_tokens[0].expires_at = expiredAt
      },
    )

    rewriteEnvelopeState<any>(
      persistence.getPersistedStatePath('iam-advanced-oauth-transient-state.json'),
      (runtimeState) => {
        runtimeState.pushed_authorization_requests[0].status = 'ACTIVE'
        runtimeState.pushed_authorization_requests[0].expires_at = expiredAt
        runtimeState.device_authorizations[0].status = 'PENDING'
        runtimeState.device_authorizations[0].expires_at = expiredAt
        runtimeState.backchannel_authentication_requests[0].status = 'PENDING'
        runtimeState.backchannel_authentication_requests[0].expires_at = expiredAt
      },
    )

    const run = await LocalIamOperationsRuntimeStore.runTransientStateMaintenanceAsync(IAM_SYSTEM_USER_ID)

    expect(run.total_mutated_count).toBe(20)
    expect(run.foundation.expired_delegated_consent_count).toBe(1)
    expect(run.foundation.expired_delegated_consent_request_count).toBe(1)
    expect(run.organizations.expired_invitation_count).toBe(1)
    expect(run.authentication.expired_session_count).toBe(1)
    expect(run.authentication.expired_login_transaction_count).toBe(1)
    expect(run.authentication.expired_password_reset_ticket_count).toBe(1)
    expect(run.authentication.expired_email_verification_ticket_count).toBe(1)
    expect(run.authentication.expired_pending_mfa_enrollment_count).toBe(1)
    expect(run.authorization.expired_authorization_request_count).toBe(1)
    expect(run.authorization.expired_authorization_code_count).toBe(1)
    expect(run.authorization_services.expired_permission_ticket_count).toBe(1)
    expect(run.advanced_oauth.expired_initial_access_token_count).toBe(1)
    expect(run.advanced_oauth.expired_registration_access_token_count).toBe(1)
    expect(run.advanced_oauth.expired_pushed_authorization_request_count).toBe(1)
    expect(run.advanced_oauth.expired_device_authorization_count).toBe(1)
    expect(run.advanced_oauth.expired_backchannel_authentication_request_count).toBe(1)
    expect(run.protocol.expired_issued_token_count).toBe(1)
    expect(run.protocol.expired_saml_auth_request_count).toBe(1)
    expect(run.webauthn.expired_registration_challenge_count).toBe(1)
    expect(run.webauthn.expired_authentication_challenge_count).toBe(1)

    const recordedRuns = LocalIamOperationsRuntimeStore.listTransientStateMaintenanceRuns()
    expect(recordedRuns.count).toBe(1)
    expect(recordedRuns.runs[0]?.id).toBe(run.id)

    const foundationStateAfterMaintenance = LocalIamFoundationStore.exportState() as any
    expect(foundationStateAfterMaintenance.delegated_consents.find((record: any) => record.id === 'expired-delegated-consent')?.status).toBe('EXPIRED')
    expect(foundationStateAfterMaintenance.delegated_consents.find((record: any) => record.id === 'expired-delegated-consent')?.revoked_at).toBe(expiredAt)
    expect(foundationStateAfterMaintenance.delegated_consent_requests.find((record: any) => record.id === 'expired-delegated-consent-request')?.status).toBe('EXPIRED')
    expect(foundationStateAfterMaintenance.delegated_consent_requests.find((record: any) => record.id === 'expired-delegated-consent-request')?.responded_at).toBeTruthy()

    const organizationsStateAfterMaintenance = LocalIamOrganizationStore.exportState() as any
    expect(organizationsStateAfterMaintenance.invitations.find((record: any) => record.id === 'expired-organization-invitation')?.status).toBe('EXPIRED')

    const authenticationState = LocalIamAuthenticationRuntimeStore.exportState() as any
    expect(authenticationState.account_sessions[0]?.revoked_at).toBe(expiredAt)
    expect(authenticationState.login_transactions[0]?.status).toBe('EXPIRED')
    expect(authenticationState.password_reset_tickets[0]?.status).toBe('EXPIRED')
    expect(authenticationState.email_verification_tickets[0]?.status).toBe('EXPIRED')
    expect(authenticationState.pending_mfa_enrollments[0]?.consumed_at).toBe(expiredAt)

    const authorizationState = LocalIamAuthorizationRuntimeStore.exportState() as any
    expect(authorizationState.authorization_requests[0]?.status).toBe('EXPIRED')
    expect(authorizationState.authorization_codes[0]?.status).toBe('EXPIRED')

    const authorizationServicesState = LocalIamAuthorizationServicesStore.exportState() as any
    expect(authorizationServicesState.permission_tickets[0]?.status).toBe('EXPIRED')

    const advancedOauthState = LocalIamAdvancedOAuthRuntimeStore.exportState() as any
    expect(advancedOauthState.initial_access_tokens[0]?.status).toBe('EXPIRED')
    expect(advancedOauthState.registration_access_tokens[0]?.status).toBe('EXPIRED')
    expect(advancedOauthState.pushed_authorization_requests[0]?.status).toBe('EXPIRED')
    expect(advancedOauthState.device_authorizations[0]?.status).toBe('EXPIRED')
    expect(advancedOauthState.backchannel_authentication_requests[0]?.status).toBe('EXPIRED')

    const protocolState = LocalIamProtocolRuntimeStore.exportState() as any
    expect(protocolState.issued_tokens.find((record: any) => record.id === 'expired-issued-token')?.status).toBe('EXPIRED')
    expect(protocolState.saml_auth_requests.find((record: any) => record.id === 'expired-saml-auth-request')?.status).toBe('EXPIRED')

    const webauthnState = LocalIamWebAuthnStore.exportState() as any
    expect(webauthnState.registration_challenges[0]?.consumed_at).toBe(expiredAt)
    expect(webauthnState.authentication_challenges[0]?.consumed_at).toBe(expiredAt)
  }, 20000)
})
