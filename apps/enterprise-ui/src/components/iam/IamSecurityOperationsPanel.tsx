import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, KeyRound, Lock, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type IamSecurityAuditEvent,
  type IamSecuritySummaryResponse,
  type IamUserLoginHistoryResponse,
  type IamUserRecord,
  type IamUserSecuritySummaryResponse,
  type IamValidationSummaryResponse,
} from '../../services/standaloneApi'

type PasswordResetFormState = {
  newPassword: string
  forceUpdateOnLogin: boolean
  revokeExistingSessions: boolean
  clearLockout: boolean
}

function emptyPasswordResetForm(): PasswordResetFormState {
  return {
    newPassword: '',
    forceUpdateOnLogin: true,
    revokeExistingSessions: true,
    clearLockout: true,
  }
}

export function IamSecurityOperationsPanel({
  selectedRealmId,
  canManage,
}: {
  selectedRealmId: string
  canManage: boolean
}) {
  const [users, setUsers] = useState<IamUserRecord[]>([])
  const [securitySummary, setSecuritySummary] = useState<IamSecuritySummaryResponse | null>(null)
  const [validationSummary, setValidationSummary] = useState<IamValidationSummaryResponse | null>(null)
  const [securityEvents, setSecurityEvents] = useState<IamSecurityAuditEvent[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [userSecurity, setUserSecurity] = useState<IamUserSecuritySummaryResponse | null>(null)
  const [loginHistory, setLoginHistory] = useState<IamUserLoginHistoryResponse | null>(null)
  const [passwordResetForm, setPasswordResetForm] = useState<PasswordResetFormState>(emptyPasswordResetForm)
  const [lastIssuedPassword, setLastIssuedPassword] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadPanel = async (preferredUserId?: string) => {
    if (!selectedRealmId) {
      setUsers([])
      setSelectedUserId('')
      setUserSecurity(null)
      setLoginHistory(null)
      return
    }

    setIsLoading(true)
    try {
      const [userResponse, securityResponse, validationResponse, eventResponse] = await Promise.all([
        idpApi.listIamUsers({ realmId: selectedRealmId }),
        idpApi.getIamSecuritySummary(),
        idpApi.getIamValidationSummary(),
        idpApi.listIamSecurityEvents({ realmId: selectedRealmId, limit: 12 }),
      ])
      const realmUsers = userResponse.users.filter((user) => user.realm_id === selectedRealmId)
      const nextUserId = preferredUserId && realmUsers.some((user) => user.id === preferredUserId)
        ? preferredUserId
        : realmUsers[0]?.id ?? ''

      setUsers(realmUsers)
      setSelectedUserId(nextUserId)
      setSecuritySummary(securityResponse)
      setValidationSummary(validationResponse)
      setSecurityEvents(eventResponse.events)

      if (nextUserId) {
        const [userSecurityResponse, loginHistoryResponse] = await Promise.all([
          idpApi.getIamUserSecuritySummary(nextUserId),
          idpApi.getIamUserLoginHistory(nextUserId, 20),
        ])
        setUserSecurity(userSecurityResponse)
        setLoginHistory(loginHistoryResponse)
      } else {
        setUserSecurity(null)
        setLoginHistory(null)
      }
    } catch (error) {
      console.error('Failed to load IAM security operations panel', error)
      toast.error('Failed to load IAM security operations')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPanel(selectedUserId)
  }, [selectedRealmId])

  useEffect(() => {
    if (!selectedUserId) {
      setUserSecurity(null)
      setLoginHistory(null)
      return
    }
    void (async () => {
      try {
        const [userSecurityResponse, loginHistoryResponse] = await Promise.all([
          idpApi.getIamUserSecuritySummary(selectedUserId),
          idpApi.getIamUserLoginHistory(selectedUserId, 20),
        ])
        setUserSecurity(userSecurityResponse)
        setLoginHistory(loginHistoryResponse)
      } catch (error) {
        console.error('Failed to load IAM user security detail', error)
        toast.error('Failed to load IAM user security detail')
      }
    })()
  }, [selectedUserId])

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId],
  )

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedUserId) {
      toast.error('Select a user first')
      return
    }
    setIsSaving(true)
    try {
      const response = await idpApi.resetIamUserPassword(selectedUserId, {
        new_password: passwordResetForm.newPassword.trim() || undefined,
        force_update_on_login: passwordResetForm.forceUpdateOnLogin,
        revoke_existing_sessions: passwordResetForm.revokeExistingSessions,
        clear_lockout: passwordResetForm.clearLockout,
      })
      setLastIssuedPassword(response.issued_temporary_password)
      setPasswordResetForm(emptyPasswordResetForm())
      toast.success('Standalone IAM password reset completed')
      await loadPanel(selectedUserId)
    } catch (error) {
      console.error('Failed to reset IAM user password', error)
      toast.error('Failed to reset IAM user password')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevokeSessions = async () => {
    if (!selectedUserId) {
      toast.error('Select a user first')
      return
    }
    setIsSaving(true)
    try {
      await idpApi.revokeIamUserSessions(selectedUserId, { revoke_tokens: true })
      toast.success('Standalone IAM sessions revoked')
      await loadPanel(selectedUserId)
    } catch (error) {
      console.error('Failed to revoke IAM sessions', error)
      toast.error('Failed to revoke IAM sessions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClearLockout = async () => {
    if (!selectedUserId) {
      toast.error('Select a user first')
      return
    }
    setIsSaving(true)
    try {
      await idpApi.clearIamUserLockout(selectedUserId)
      toast.success('Standalone IAM lockout cleared')
      await loadPanel(selectedUserId)
    } catch (error) {
      console.error('Failed to clear IAM lockout', error)
      toast.error('Failed to clear IAM lockout')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            <ShieldAlert className="h-3.5 w-3.5" />
            Operations and Hardening
          </div>
          <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">Security Operations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            This panel validates the standalone IAM plane on its own terms: lockout behavior, failed-login telemetry,
            session and token invalidation, request-level audit logging, and review gates for interactive agentic development.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Failed Logins"
          value={String(securitySummary?.failed_login_attempt_count ?? 0)}
          detail="Standalone failed credential and MFA attempts"
        />
        <MetricCard
          icon={<Lock className="h-5 w-5" />}
          label="Active Lockouts"
          value={String(securitySummary?.active_lockout_count ?? 0)}
          detail="Accounts currently throttled by the IAM plane"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Audited Requests"
          value={String(securitySummary?.request_audit.request_count ?? 0)}
          detail={`${securitySummary?.request_audit.failure_count ?? 0} audited failures`}
        />
        <MetricCard
          icon={<KeyRound className="h-5 w-5" />}
          label="Admin Actions"
          value={String(securitySummary?.admin_security_actions ?? 0)}
          detail="Reset password, revoke sessions, clear lockout, validation review"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">User Security Operations</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Standalone user actions for review realms only. These actions do not touch downstream application auth.
                </div>
              </div>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                <option value="">Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} · {user.status}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                Loading security posture…
              </div>
            ) : !selectedUser || !userSecurity ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Select a standalone IAM user to review lockout state, sessions, and login history.
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <SummaryRow label="User" value={`${userSecurity.user.first_name} ${userSecurity.user.last_name}`} />
                  <SummaryRow label="Status" value={userSecurity.status} />
                  <SummaryRow label="MFA" value={userSecurity.mfa_enabled ? 'Enabled' : 'Not enabled'} />
                  <SummaryRow label="Email Verification" value={userSecurity.email_verified_at ? 'Verified' : 'Pending'} />
                  <SummaryRow label="Last Login" value={userSecurity.last_login_at ? new Date(userSecurity.last_login_at).toLocaleString() : 'Never'} />
                  <SummaryRow label="Last Failed Login" value={userSecurity.last_failed_login_at ? new Date(userSecurity.last_failed_login_at).toLocaleString() : 'None'} />
                  <SummaryRow label="Lockout Until" value={userSecurity.lockout_until ? new Date(userSecurity.lockout_until).toLocaleString() : 'Clear'} />
                  <SummaryRow label="Active Sessions / Tokens" value={`${userSecurity.active_session_count} / ${userSecurity.active_token_count}`} />
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Administrative Password Reset</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">New Password</span>
                      <input
                        value={passwordResetForm.newPassword}
                        onChange={(event) => setPasswordResetForm((current) => ({ ...current, newPassword: event.target.value }))}
                        placeholder="Leave blank to generate a temporary password"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </label>
                    <div className="space-y-2 text-sm">
                      <div className="font-medium text-slate-700 dark:text-slate-200">Reset Options</div>
                      <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={passwordResetForm.forceUpdateOnLogin}
                          onChange={(event) => setPasswordResetForm((current) => ({ ...current, forceUpdateOnLogin: event.target.checked }))}
                        />
                        Require password update on next login
                      </label>
                      <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={passwordResetForm.revokeExistingSessions}
                          onChange={(event) => setPasswordResetForm((current) => ({ ...current, revokeExistingSessions: event.target.checked }))}
                        />
                        Revoke active sessions and tokens
                      </label>
                      <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={passwordResetForm.clearLockout}
                          onChange={(event) => setPasswordResetForm((current) => ({ ...current, clearLockout: event.target.checked }))}
                        />
                        Clear lockout while resetting
                      </label>
                    </div>
                  </div>
                  {lastIssuedPassword && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                      Temporary standalone password issued for review: <span className="font-mono">{lastIssuedPassword}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={!canManage || isSaving}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                    >
                      {isSaving ? 'Applying…' : 'Reset Password'}
                    </button>
                    <button
                      type="button"
                      disabled={!canManage || isSaving}
                      onClick={handleRevokeSessions}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Revoke Sessions and Tokens
                    </button>
                    <button
                      type="button"
                      disabled={!canManage || isSaving}
                      onClick={handleClearLockout}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Clear Lockout
                    </button>
                  </div>
                </form>

                <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Recent Login History</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                          <th className="pb-3">Time</th>
                          <th className="pb-3">Outcome</th>
                          <th className="pb-3">Client</th>
                          <th className="pb-3">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(loginHistory?.login_attempts ?? []).map((attempt) => (
                          <tr key={attempt.id}>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{new Date(attempt.occurred_at).toLocaleString()}</td>
                            <td className="py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                attempt.outcome === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                              }`}>
                                {attempt.outcome}
                              </span>
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{attempt.client_identifier ?? 'Direct'}</td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">{attempt.summary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Validation Gates</div>
            <div className="mt-4 space-y-3">
              {(validationSummary?.checks ?? []).map((check) => (
                <div key={check.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{check.name}</div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      check.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                    }`}>
                      {check.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{check.summary}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/40 dark:bg-sky-950/30">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-200">Agentic Review Notes</div>
              <ul className="mt-3 space-y-2 text-sm text-sky-900 dark:text-sky-100">
                {(validationSummary?.agentic_development_notes ?? []).map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <RefreshCw className="h-4 w-4" />
              Recent Security Audit Events
            </div>
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{event.method} {event.path}</div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      event.outcome === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                    }`}>
                      {event.status_code}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {event.category} · {new Date(event.occurred_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3 text-slate-500 dark:text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{detail}</div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-900 dark:text-white">{value}</div>
    </div>
  )
}
