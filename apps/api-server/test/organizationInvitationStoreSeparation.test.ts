import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('organization invitation store separation', () => {
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

  it('migrates legacy combined organization state into split directory and invitation stores', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-org-store-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID, IAM_SYSTEM_USER_ID } = await import('../src/platform/iamIdentifiers')
    const persistence = await import('../src/platform/persistence')

    const now = new Date().toISOString()
    const legacyPath = persistence.getPersistedStatePath('iam-organizations-state.json')
    mkdirSync(path.dirname(legacyPath), { recursive: true })
    writeFileSync(
      legacyPath,
      JSON.stringify({
        version: 1,
        saved_at: now,
        state: {
          organizations: [
            {
              id: 'legacy-organization',
              realm_id: IAM_DEFAULT_REALM_ID,
              name: 'Legacy Organization',
              slug: 'legacy-organization',
              summary: 'Legacy organization summary',
              kind: 'COMPANY',
              status: 'ACTIVE',
              domain_hint: 'legacy.example.com',
              linked_identity_provider_aliases: [],
              synthetic: false,
              source_organization_id: null,
              created_at: now,
              updated_at: now,
              created_by_user_id: IAM_SYSTEM_USER_ID,
              updated_by_user_id: IAM_SYSTEM_USER_ID,
            },
          ],
          memberships: [
            {
              id: 'legacy-membership',
              realm_id: IAM_DEFAULT_REALM_ID,
              organization_id: 'legacy-organization',
              user_id: IAM_SUPER_ADMIN_USER_ID,
              role: 'OWNER',
              status: 'ACTIVE',
              synthetic: false,
              invited_at: null,
              joined_at: now,
              suspended_at: null,
              revoked_at: null,
              created_at: now,
              updated_at: now,
              created_by_user_id: IAM_SYSTEM_USER_ID,
              updated_by_user_id: IAM_SYSTEM_USER_ID,
            },
          ],
          invitations: [
            {
              id: 'legacy-invitation',
              realm_id: IAM_DEFAULT_REALM_ID,
              organization_id: 'legacy-organization',
              email: 'invitee@example.com',
              role: 'MEMBER',
              status: 'PENDING',
              linked_identity_provider_aliases: [],
              invited_user_id: null,
              accepted_membership_id: null,
              expires_at: new Date(Date.now() + 60_000).toISOString(),
              accepted_at: null,
              revoked_at: null,
              created_at: now,
              updated_at: now,
              created_by_user_id: IAM_SYSTEM_USER_ID,
              updated_by_user_id: IAM_SYSTEM_USER_ID,
            },
          ],
        },
      }, null, 2),
      'utf8',
    )

    const { LocalIamOrganizationStore } = await import('../src/platform/iamOrganizations')

    const directoryPath = persistence.getPersistedStatePath('iam-organizations-directory-state.json')
    const invitationsPath = persistence.getPersistedStatePath('iam-organizations-invitations-state.json')

    expect(existsSync(directoryPath)).toBe(true)
    expect(existsSync(invitationsPath)).toBe(true)

    const directoryEnvelope = JSON.parse(readFileSync(directoryPath, 'utf8')) as {
      state: { organizations: unknown[]; memberships: unknown[] }
    }
    const invitationsEnvelope = JSON.parse(readFileSync(invitationsPath, 'utf8')) as {
      state: { invitations: unknown[] }
    }

    expect(directoryEnvelope.state.organizations).toHaveLength(1)
    expect(directoryEnvelope.state.memberships).toHaveLength(1)
    expect(invitationsEnvelope.state.invitations).toHaveLength(1)

    const exported = LocalIamOrganizationStore.exportState() as any
    expect(exported.organizations.some((record: any) => record.id === 'legacy-organization')).toBe(true)
    expect(exported.memberships.some((record: any) => record.id === 'legacy-membership')).toBe(true)
    expect(exported.invitations.some((record: any) => record.id === 'legacy-invitation')).toBe(true)
  })

  it('updates only pending invitations and preserves generic invitation lifecycle semantics', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-org-invite-update-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOrganizationStore } = await import('../src/platform/iamOrganizations')

    const organization = LocalIamOrganizationStore.createOrganization(IAM_SUPER_ADMIN_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'Update Test Org',
      summary: 'Invitation update coverage',
    })

    const invitation = LocalIamOrganizationStore.createInvitation(IAM_SUPER_ADMIN_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      organization_id: organization.id,
      email: 'pending-invite@example.com',
      role: 'MEMBER',
      linked_identity_provider_aliases: ['oidc-primary'],
    })

    const extendedExpiry = new Date(Date.now() + 86_400_000).toISOString()
    const updated = LocalIamOrganizationStore.updateInvitation(IAM_SUPER_ADMIN_USER_ID, invitation.id, {
      role: 'ADMIN',
      linked_identity_provider_aliases: ['oidc-primary', 'saml-secondary'],
      expires_at: extendedExpiry,
    })

    expect(updated.id).toBe(invitation.id)
    expect(updated.role).toBe('ADMIN')
    expect(updated.linked_identity_provider_aliases).toEqual(['oidc-primary', 'saml-secondary'])
    expect(updated.expires_at).toBe(extendedExpiry)
    expect(updated.updated_by_user_id).toBe(IAM_SUPER_ADMIN_USER_ID)

    LocalIamOrganizationStore.revokeInvitation(IAM_SUPER_ADMIN_USER_ID, invitation.id)

    expect(() => LocalIamOrganizationStore.updateInvitation(IAM_SUPER_ADMIN_USER_ID, invitation.id, {
      role: 'MEMBER',
    })).toThrow('Only pending IAM organization invitations can be updated')
  })

  it('supports lifecycle-action revoke through the generic invitation update contract', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-org-invite-lifecycle-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOrganizationStore } = await import('../src/platform/iamOrganizations')

    const organization = LocalIamOrganizationStore.createOrganization(IAM_SUPER_ADMIN_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'Lifecycle Test Org',
      summary: 'Invitation lifecycle action coverage',
    })

    const invitation = LocalIamOrganizationStore.createInvitation(IAM_SUPER_ADMIN_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      organization_id: organization.id,
      email: 'revoke-invite@example.com',
      role: 'MEMBER',
    })

    const revoked = LocalIamOrganizationStore.updateInvitation(IAM_SUPER_ADMIN_USER_ID, invitation.id, {
      lifecycle_action: 'REVOKE',
    })

    expect(revoked.id).toBe(invitation.id)
    expect(revoked.status).toBe('REVOKED')
    expect(revoked.revoked_at).toBeTruthy()
    expect(revoked.updated_by_user_id).toBe(IAM_SUPER_ADMIN_USER_ID)
  })

  it('supports resend and refresh-expiration lifecycle actions through the generic invitation update contract', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-org-invite-refresh-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamOrganizationStore } = await import('../src/platform/iamOrganizations')

    const organization = LocalIamOrganizationStore.createOrganization(IAM_SUPER_ADMIN_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      name: 'Refresh Test Org',
      summary: 'Invitation lifecycle refresh coverage',
    })

    const invitation = LocalIamOrganizationStore.createInvitation(IAM_SUPER_ADMIN_USER_ID, {
      realm_id: IAM_DEFAULT_REALM_ID,
      organization_id: organization.id,
      email: 'refresh-invite@example.com',
      role: 'MEMBER',
    })

    const resent = LocalIamOrganizationStore.updateInvitation(IAM_SUPER_ADMIN_USER_ID, invitation.id, {
      lifecycle_action: 'RESEND',
    })

    expect(resent.id).toBe(invitation.id)
    expect(resent.status).toBe('PENDING')
    expect(new Date(resent.updated_at).getTime()).toBeGreaterThanOrEqual(new Date(invitation.updated_at).getTime())
    expect(resent.updated_by_user_id).toBe(IAM_SUPER_ADMIN_USER_ID)

    const refreshed = LocalIamOrganizationStore.updateInvitation(IAM_SUPER_ADMIN_USER_ID, invitation.id, {
      lifecycle_action: 'REFRESH_EXPIRATION',
    })

    expect(refreshed.id).toBe(invitation.id)
    expect(refreshed.status).toBe('PENDING')
    expect(new Date(refreshed.expires_at).getTime()).toBeGreaterThan(Date.now())
    expect(new Date(refreshed.expires_at).getTime()).toBeGreaterThanOrEqual(new Date(resent.expires_at).getTime())
    expect(refreshed.updated_by_user_id).toBe(IAM_SUPER_ADMIN_USER_ID)
  })
})
