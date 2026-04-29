import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('authentication runtime store separation', () => {
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

  it('migrates legacy combined authentication state into split directory and transient stores', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-auth-runtime-store-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const persistence = await import('../src/platform/persistence')

    const now = new Date().toISOString()
    const future = new Date(Date.now() + 60_000).toISOString()
    const legacyPath = persistence.getPersistedStatePath('iam-authentication-runtime-state.json')
    mkdirSync(path.dirname(legacyPath), { recursive: true })
    writeFileSync(
      legacyPath,
      JSON.stringify({
        version: 1,
        saved_at: now,
        state: {
          account_security_states: [
            {
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              email_verified_at: now,
              last_login_at: now,
              last_password_updated_at: now,
              last_mfa_authenticated_at: now,
              last_passkey_authenticated_at: null,
            },
          ],
          mfa_states: [
            {
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              totp_reference_id: 'legacy-totp',
              backup_codes_reference_id: 'legacy-backup-codes',
              enrolled_at: now,
              disabled_at: null,
            },
          ],
          consent_records: [
            {
              id: 'legacy-consent',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              client_id: 'legacy-client',
              client_identifier: 'legacy-client',
              client_name: 'Legacy Client',
              scope_names: ['openid'],
              granted_at: now,
              revoked_at: null,
            },
          ],
          user_lockout_states: [
            {
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              failed_attempt_count: 2,
              last_failed_at: now,
              lockout_until: null,
              locked_at: null,
            },
          ],
          pending_mfa_enrollments: [
            {
              id: 'legacy-pending-mfa',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              secret: 'SECRET',
              backup_codes: ['A', 'B'],
              created_at: now,
              expires_at: future,
              consumed_at: null,
            },
          ],
          account_sessions: [
            {
              id: 'legacy-session',
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
              expires_at: future,
              revoked_at: null,
              session_proof_hash: null,
              synthetic: true,
            },
          ],
          login_transactions: [
            {
              id: 'legacy-login-transaction',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              flow_id: 'browser',
              client_id: null,
              client_identifier: null,
              client_name: null,
              client_protocol: null,
              requested_scope_names: [],
              pending_required_actions: [],
              pending_scope_consent: [],
              pending_mfa: false,
              federated_login_context: null,
              created_at: now,
              expires_at: future,
              completed_at: null,
              cancelled_at: null,
              status: 'PENDING_REQUIRED_ACTIONS',
            },
          ],
          password_reset_tickets: [
            {
              id: 'legacy-password-reset-ticket',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              code_hash: 'hash',
              code_preview: null,
              issued_at: now,
              expires_at: future,
              status: 'PENDING',
              consumed_at: null,
            },
          ],
          email_verification_tickets: [
            {
              id: 'legacy-email-verification-ticket',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              code_hash: 'hash',
              code_preview: null,
              issued_at: now,
              expires_at: future,
              status: 'PENDING',
              consumed_at: null,
            },
          ],
          login_attempts: [
            {
              id: 'legacy-login-attempt',
              realm_id: IAM_DEFAULT_REALM_ID,
              user_id: IAM_SUPER_ADMIN_USER_ID,
              username_or_email: 'admin@idp.local',
              client_identifier: null,
              outcome: 'SUCCESS',
              summary: 'Legacy login',
              occurred_at: now,
            },
          ],
        },
      }, null, 2),
      'utf8',
    )

    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')

    const directoryPath = persistence.getPersistedStatePath('iam-authentication-directory-state.json')
    const transientPath = persistence.getPersistedStatePath('iam-authentication-transient-state.json')

    expect(existsSync(directoryPath)).toBe(true)
    expect(existsSync(transientPath)).toBe(true)

    const directoryEnvelope = JSON.parse(readFileSync(directoryPath, 'utf8')) as { state: Record<string, unknown> }
    const transientEnvelope = JSON.parse(readFileSync(transientPath, 'utf8')) as { state: Record<string, unknown> }

    expect(directoryEnvelope.state.account_security_states).toHaveLength(1)
    expect(directoryEnvelope.state.mfa_states).toHaveLength(1)
    expect(directoryEnvelope.state.consent_records).toHaveLength(1)
    expect(directoryEnvelope.state.user_lockout_states).toHaveLength(1)
    expect(directoryEnvelope.state).not.toHaveProperty('account_sessions')
    expect(transientEnvelope.state.account_sessions).toHaveLength(1)
    expect(transientEnvelope.state.login_transactions).toHaveLength(1)
    expect(transientEnvelope.state.password_reset_tickets).toHaveLength(1)
    expect(transientEnvelope.state.email_verification_tickets).toHaveLength(1)
    expect(transientEnvelope.state.pending_mfa_enrollments).toHaveLength(1)
    expect(transientEnvelope.state.login_attempts).toHaveLength(1)
    expect(transientEnvelope.state).not.toHaveProperty('account_security_states')

    const exported = LocalIamAuthenticationRuntimeStore.exportState() as any
    expect(exported.account_security_states.some((record: any) => record.user_id === IAM_SUPER_ADMIN_USER_ID)).toBe(true)
    expect(exported.account_sessions.some((record: any) => record.id === 'legacy-session')).toBe(true)
    expect(exported.login_transactions.some((record: any) => record.id === 'legacy-login-transaction')).toBe(true)
    expect(exported.login_attempts.some((record: any) => record.id === 'legacy-login-attempt')).toBe(true)
  })
})
