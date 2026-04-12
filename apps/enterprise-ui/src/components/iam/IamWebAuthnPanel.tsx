import React, { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { KeyRound } from 'lucide-react'
import { idpApi, type IamWebAuthnCredentialRecord } from '../../services/standaloneApi'

export function IamWebAuthnPanel({
  selectedRealmId,
  canManage,
}: {
  selectedRealmId: string
  canManage: boolean
}) {
  const [credentials, setCredentials] = useState<IamWebAuthnCredentialRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedRealmId) {
      setCredentials([])
      return
    }
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const response = await idpApi.listIamWebAuthnCredentials({ realm_id: selectedRealmId })
        if (mounted) {
          setCredentials(response.credentials)
        }
      } catch (error: any) {
        console.error('Failed to load IAM WebAuthn credentials:', error)
        if (mounted) {
          toast.error(error?.response?.data?.error ?? 'Failed to load IAM passkey credentials')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [selectedRealmId])

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
      <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
        <KeyRound className="h-5 w-5" />
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Passkeys and WebAuthn</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Review the realm-level passkey inventory and confirm that passwordless credentials are present before moving on to later full-IDP phases.
          </p>
        </div>
      </div>

      {!selectedRealmId ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Choose a realm to review registered passkeys.
        </div>
      ) : loading ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Loading passkey inventory…
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
            {credentials.length} credential{credentials.length === 1 ? '' : 's'} registered in this realm. {canManage ? 'Enrollment and revocation are exposed through the account-console plane.' : 'Read-only review mode.'}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-4">User</th>
                  <th className="py-3 pr-4">Device</th>
                  <th className="py-3 pr-4">Transport</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3 pr-4">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {credentials.map((credential) => (
                  <tr key={credential.id}>
                    <td className="py-3 pr-4 text-slate-900 dark:text-white">
                      <div className="font-medium">{credential.username}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{credential.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      <div className="font-medium text-slate-900 dark:text-white">{credential.device_label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{credential.credential_id}</div>
                    </td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{credential.transports.join(', ')}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{credential.status}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">
                      {credential.last_used_at ? new Date(credential.last_used_at).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
                {credentials.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      No passkeys are registered in this realm yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
