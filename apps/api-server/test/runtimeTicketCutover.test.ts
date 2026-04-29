import { mkdtempSync, rmSync } from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('runtime ticket cutover behavior', () => {
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

  it('redeems an active password reset ticket after a module reload while runtime flags are enabled', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-ticket-reload-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'

    const { IAM_DEFAULT_REALM_ID } = await import('../src/platform/iamIdentifiers')
    const firstRuntime = await import('../src/platform/iamAuthenticationRuntime')

    const ticket = await firstRuntime.LocalIamAuthenticationRuntimeStore.requestPasswordResetAsync(
      IAM_DEFAULT_REALM_ID,
      {
        username_or_email: 'alex.morgan@northstar.example',
      },
    )

    expect(ticket.ticket_id).toContain('iam-password-reset-')
    expect(ticket.code_preview).toMatch(/^\d{6}$/)

    vi.resetModules()

    const reloadedRuntime = await import('../src/platform/iamAuthenticationRuntime')
    const confirmed = await reloadedRuntime.LocalIamAuthenticationRuntimeStore.confirmPasswordResetAsync(
      IAM_DEFAULT_REALM_ID,
      {
        ticket_id: ticket.ticket_id,
        code: ticket.code_preview!,
        new_password: 'StandaloneIAM!TenantAdmin2026',
      },
    )

    const exportedState = reloadedRuntime.LocalIamAuthenticationRuntimeStore.exportState() as any
    const persistedTicket = exportedState.password_reset_tickets.find(
      (candidate: any) => candidate.id === ticket.ticket_id,
    )

    expect(confirmed.user_id).toBe('iam-user-tenant-admin')
    expect(persistedTicket).toBeTruthy()
    expect(persistedTicket.status).toBe('CONSUMED')
    expect(persistedTicket.consumed_at).toBeTruthy()
  }, 20000)

  it('expires pending ticket entities during maintenance while runtime flags are enabled', async () => {
    stateRoot = mkdtempSync(path.join(os.tmpdir(), 'idp-runtime-ticket-expiry-'))
    process.env.IDP_PLATFORM_STATE_ROOT = stateRoot
    process.env.IDP_PLATFORM_DURABLE_ROOT = path.join(stateRoot, 'durable')
    process.env.IDP_PLATFORM_PERSISTENCE_BACKEND = 'filesystem'
    process.env.IDP_DDB_RUNTIME_DUAL_WRITE = 'true'
    process.env.IDP_DDB_RUNTIME_READ_V2 = 'true'

    const { IAM_DEFAULT_REALM_ID, IAM_SUPER_ADMIN_USER_ID } = await import('../src/platform/iamIdentifiers')
    const { LocalIamAuthenticationRuntimeStore } = await import('../src/platform/iamAuthenticationRuntime')

    const expiredAt = new Date(Date.now() - 60_000).toISOString()
    const now = new Date().toISOString()

    LocalIamAuthenticationRuntimeStore.importState({
      password_reset_tickets: [
        {
          id: 'expired-runtime-password-reset-ticket',
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
          id: 'expired-runtime-email-verification-ticket',
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
          id: 'expired-runtime-pending-mfa',
          realm_id: IAM_DEFAULT_REALM_ID,
          user_id: IAM_SUPER_ADMIN_USER_ID,
          secret: 'SECRET',
          backup_codes: ['AAAA-BBBB'],
          created_at: now,
          expires_at: expiredAt,
          consumed_at: null,
        },
      ],
    } as any)

    const result = await LocalIamAuthenticationRuntimeStore.runTransientStateMaintenanceAsync()
    const exportedState = LocalIamAuthenticationRuntimeStore.exportState() as any

    expect(result.expired_password_reset_ticket_count).toBe(1)
    expect(result.expired_email_verification_ticket_count).toBe(1)
    expect(result.expired_pending_mfa_enrollment_count).toBe(1)
    expect(
      exportedState.password_reset_tickets.find((candidate: any) => candidate.id === 'expired-runtime-password-reset-ticket')?.status,
    ).toBe('EXPIRED')
    expect(
      exportedState.email_verification_tickets.find((candidate: any) => candidate.id === 'expired-runtime-email-verification-ticket')?.status,
    ).toBe('EXPIRED')
    expect(
      exportedState.pending_mfa_enrollments.find((candidate: any) => candidate.id === 'expired-runtime-pending-mfa')?.consumed_at,
    ).toBe(expiredAt)
  }, 20000)
})
