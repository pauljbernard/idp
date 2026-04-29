import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loginWithConsent(
  realmId: string,
  username: string,
  password: string,
) {
  const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')

  const login = await LocalIamAuthenticationRuntimeStore.loginAsync(realmId, {
    username,
    password,
    client_id: 'admin-console-demo',
    scope: ['openid', 'profile', 'email', 'roles', 'groups'],
  })

  if (login.next_step === 'CONSENT_REQUIRED') {
    return await LocalIamAuthenticationRuntimeStore.grantConsentAsync(realmId, {
      login_transaction_id: login.login_transaction_id!,
      approve: true,
    })
  }

  return login
}

describe('authentication runtime scenarios', () => {
  let stateRoot: string | null = null

  afterEach(() => {
    delete process.env.IDP_PLATFORM_STATE_ROOT
    delete process.env.IDP_PLATFORM_DURABLE_ROOT
    delete process.env.IDP_PLATFORM_PERSISTENCE_BACKEND
    delete process.env.IDP_DDB_RUNTIME_DUAL_WRITE
    delete process.env.IDP_DDB_RUNTIME_READ_V2
    vi.resetModules()
    if (stateRoot) {
      rmSync(stateRoot, { recursive: true, force: true })
      stateRoot = null
    }
  })

  it('handles profile re-verification, password reset, and session revocation through the runtime path', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-auth-runtime-scenarios-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')

    const initialLogin = await loginWithConsent(
      IAM_DEFAULT_REALM_ID,
      'admin@idp.local',
      'StandaloneIAM!SuperAdmin2026',
    )

    expect(initialLogin.next_step).toBe('AUTHENTICATED')
    expect(initialLogin.session_id).toBeTruthy()

    const sessionId = initialLogin.session_id!
    const loginUsername = initialLogin.user.username
    const updatedPassword = 'StandaloneIAM!ScenarioPassword2026'

    const secondLogin = await loginWithConsent(
      IAM_DEFAULT_REALM_ID,
      loginUsername,
      'StandaloneIAM!SuperAdmin2026',
    )
    expect(secondLogin.next_step).toBe('AUTHENTICATED')
    expect(secondLogin.session_id).toBeTruthy()
    expect(secondLogin.session_id).not.toBe(sessionId)

    const sessionsBeforeRevoke = await LocalIamAuthenticationRuntimeStore.listAccountSessionsAsync(
      IAM_DEFAULT_REALM_ID,
      secondLogin.session_id!,
    )
    expect(sessionsBeforeRevoke.count).toBeGreaterThanOrEqual(2)
    const nonCurrentSession = sessionsBeforeRevoke.sessions.find((candidate) => !candidate.is_current)
    expect(nonCurrentSession).toBeTruthy()

    const revoked = await LocalIamAuthenticationRuntimeStore.revokeOtherAccountSessionsAsync(
      IAM_DEFAULT_REALM_ID,
      secondLogin.session_id!,
    )
    expect(revoked.revoked_count).toBeGreaterThanOrEqual(1)

    await expect(
      LocalIamAuthenticationRuntimeStore.resolveAccountSessionAsync(IAM_DEFAULT_REALM_ID, nonCurrentSession!.session_id),
    ).rejects.toThrow()

    const sessionsAfterRevoke = await LocalIamAuthenticationRuntimeStore.listAccountSessionsAsync(
      IAM_DEFAULT_REALM_ID,
      secondLogin.session_id!,
    )
    expect(sessionsAfterRevoke.sessions.filter((candidate) => candidate.status === 'ACTIVE')).toHaveLength(1)
    expect(sessionsAfterRevoke.sessions.find((candidate) => candidate.is_current)?.session_id).toBe(
      secondLogin.session_id!.split('.')[0],
    )

    const emailVerification = await LocalIamAuthenticationRuntimeStore.requestEmailVerificationAsync(
      IAM_DEFAULT_REALM_ID,
      {
        username_or_email: 'platform.admin@iam.local',
      },
    )
    expect(emailVerification.code_preview).toMatch(/^\d{6}$/)

    const emailVerified = await LocalIamAuthenticationRuntimeStore.confirmEmailVerificationAsync(
      IAM_DEFAULT_REALM_ID,
      {
        ticket_id: emailVerification.ticket_id,
        code: emailVerification.code_preview!,
      },
    )

    expect(emailVerified.user_id).toBe('iam-user-platform-admin')
    expect(emailVerified.email_verified_at).toBeTruthy()

    const securityAfterVerification = LocalIamAuthenticationRuntimeStore.getAccountSecurityByUser(
      IAM_DEFAULT_REALM_ID,
      'iam-user-platform-admin',
    )
    expect(securityAfterVerification.pending_required_actions).not.toContain('VERIFY_EMAIL')
    expect(securityAfterVerification.email_verified_at).toBeTruthy()

    const passwordReset = await LocalIamAuthenticationRuntimeStore.requestPasswordResetAsync(
      IAM_DEFAULT_REALM_ID,
      {
        username_or_email: 'admin@idp.local',
      },
    )
    expect(passwordReset.code_preview).toMatch(/^\d{6}$/)

    const passwordUpdated = await LocalIamAuthenticationRuntimeStore.confirmPasswordResetAsync(
      IAM_DEFAULT_REALM_ID,
      {
        ticket_id: passwordReset.ticket_id,
        code: passwordReset.code_preview!,
        new_password: updatedPassword,
      },
    )
    expect(passwordUpdated.user_id).toBe(initialLogin.user.id)
    expect(passwordUpdated.password_updated_at).toBeTruthy()

    const thirdLogin = await loginWithConsent(
      IAM_DEFAULT_REALM_ID,
      loginUsername,
      updatedPassword,
    )
    expect(thirdLogin.next_step).toBe('AUTHENTICATED')
    expect(thirdLogin.session_id).toBeTruthy()
  }, 20000)
})
