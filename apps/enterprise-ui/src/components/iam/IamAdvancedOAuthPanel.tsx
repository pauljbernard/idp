import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, KeyRound, Plus, RefreshCw, Smartphone, Waypoints } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type CreateIamClientPolicyRequest,
  type CreateIamInitialAccessTokenRequest,
  type IamClientPolicyRecord,
  type IamClientRecord,
  type IamDeviceAuthorizationRecord,
  type IamDynamicClientRegistrationResponse,
  type IamInitialAccessTokenRecord,
  type IamPushedAuthorizationRequestRecord,
  type IamTokenExchangeRecord,
  type UpdateIamClientPolicyRequest,
} from '../../services/standaloneApi'

type PolicyFormState = {
  id: string | null
  name: string
  description: string
  allowDynamicRegistration: boolean
  allowDeviceAuthorization: boolean
  allowTokenExchange: boolean
  allowPushedAuthorizationRequests: boolean
  requireParForPublicClients: boolean
  requirePkceForPublicClients: boolean
  allowWildcardRedirectUris: boolean
  assignedClientIds: string[]
}

type InitialAccessTokenFormState = {
  policyId: string
  label: string
  maxUses: string
  expiresInHours: string
}

type DynamicRegistrationFormState = {
  clientName: string
  clientId: string
  redirectUri: string
  grantTypes: string
  tokenEndpointAuthMethod: 'none' | 'client_secret_basic' | 'client_secret_post'
  scope: string
}

type ProtocolHarnessState = {
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string
  subjectToken: string
  audience: string
}

function emptyPolicyForm(): PolicyFormState {
  return {
    id: null,
    name: '',
    description: '',
    allowDynamicRegistration: true,
    allowDeviceAuthorization: true,
    allowTokenExchange: true,
    allowPushedAuthorizationRequests: true,
    requireParForPublicClients: false,
    requirePkceForPublicClients: true,
    allowWildcardRedirectUris: false,
    assignedClientIds: [],
  }
}

function buildPolicyForm(policy: IamClientPolicyRecord): PolicyFormState {
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    allowDynamicRegistration: policy.allow_dynamic_registration,
    allowDeviceAuthorization: policy.allow_device_authorization,
    allowTokenExchange: policy.allow_token_exchange,
    allowPushedAuthorizationRequests: policy.allow_pushed_authorization_requests,
    requireParForPublicClients: policy.require_par_for_public_clients,
    requirePkceForPublicClients: policy.require_pkce_for_public_clients,
    allowWildcardRedirectUris: policy.allow_wildcard_redirect_uris,
    assignedClientIds: policy.assigned_client_ids,
  }
}

function emptyInitialAccessTokenForm(): InitialAccessTokenFormState {
  return {
    policyId: '',
    label: 'Phase B Dynamic Registration',
    maxUses: '10',
    expiresInHours: '24',
  }
}

function emptyDynamicRegistrationForm(): DynamicRegistrationFormState {
  return {
    clientName: 'Phase B Validation Client',
    clientId: '',
    redirectUri: 'http://localhost:3004/oidc/callback',
    grantTypes: 'authorization_code refresh_token',
    tokenEndpointAuthMethod: 'none',
    scope: 'openid profile email',
  }
}

function emptyProtocolHarness(): ProtocolHarnessState {
  return {
    clientId: 'training-portal-demo',
    clientSecret: '',
    redirectUri: 'http://localhost:3004/training/callback',
    scope: 'openid profile email',
    subjectToken: '',
    audience: 'admin-console-demo',
  }
}

function parseCsv(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function toggleItem(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{detail}</div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function IamAdvancedOAuthPanel({
  selectedRealmId,
  canManage,
}: {
  selectedRealmId: string
  canManage: boolean
}) {
  const [clients, setClients] = useState<IamClientRecord[]>([])
  const [policies, setPolicies] = useState<IamClientPolicyRecord[]>([])
  const [initialAccessTokens, setInitialAccessTokens] = useState<IamInitialAccessTokenRecord[]>([])
  const [parRequests, setParRequests] = useState<IamPushedAuthorizationRequestRecord[]>([])
  const [deviceAuthorizations, setDeviceAuthorizations] = useState<IamDeviceAuthorizationRecord[]>([])
  const [tokenExchanges, setTokenExchanges] = useState<IamTokenExchangeRecord[]>([])
  const [policyForm, setPolicyForm] = useState<PolicyFormState>(emptyPolicyForm)
  const [initialAccessTokenForm, setInitialAccessTokenForm] = useState<InitialAccessTokenFormState>(emptyInitialAccessTokenForm)
  const [dynamicRegistrationForm, setDynamicRegistrationForm] = useState<DynamicRegistrationFormState>(emptyDynamicRegistrationForm)
  const [protocolHarness, setProtocolHarness] = useState<ProtocolHarnessState>(emptyProtocolHarness)
  const [latestInitialAccessToken, setLatestInitialAccessToken] = useState<string>('')
  const [lastRegistration, setLastRegistration] = useState<IamDynamicClientRegistrationResponse | null>(null)
  const [parResult, setParResult] = useState<string | null>(null)
  const [deviceResult, setDeviceResult] = useState<string | null>(null)
  const [tokenExchangeResult, setTokenExchangeResult] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)
  const [isIssuingInitialAccessToken, setIsIssuingInitialAccessToken] = useState(false)
  const [isRegisteringClient, setIsRegisteringClient] = useState(false)
  const [isRunningPar, setIsRunningPar] = useState(false)
  const [isRunningDeviceAuth, setIsRunningDeviceAuth] = useState(false)
  const [isRunningTokenExchange, setIsRunningTokenExchange] = useState(false)

  const loadRuntime = async () => {
    if (!selectedRealmId) {
      setClients([])
      setPolicies([])
      setInitialAccessTokens([])
      setParRequests([])
      setDeviceAuthorizations([])
      setTokenExchanges([])
      return
    }

    setIsLoading(true)
    try {
      const [
        clientResponse,
        policyResponse,
        tokenResponse,
        parResponse,
        deviceResponse,
        tokenExchangeResponse,
      ] = await Promise.all([
        idpApi.listIamClients({ realmId: selectedRealmId, protocol: 'OIDC' }),
        idpApi.listIamClientPolicies({ realmId: selectedRealmId }),
        idpApi.listIamInitialAccessTokens({ realmId: selectedRealmId }),
        idpApi.listIamPushedAuthorizationRequests({ realmId: selectedRealmId }),
        idpApi.listIamDeviceAuthorizations({ realmId: selectedRealmId }),
        idpApi.listIamTokenExchanges({ realmId: selectedRealmId }),
      ])
      setClients(clientResponse.clients)
      setPolicies(policyResponse.client_policies)
      setInitialAccessTokens(tokenResponse.tokens)
      setParRequests(parResponse.requests)
      setDeviceAuthorizations(deviceResponse.device_authorizations)
      setTokenExchanges(tokenExchangeResponse.token_exchanges)
      if (!initialAccessTokenForm.policyId && policyResponse.client_policies[0]) {
        setInitialAccessTokenForm((current) => ({ ...current, policyId: policyResponse.client_policies[0].id }))
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load advanced OAuth runtime')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRuntime()
  }, [selectedRealmId])

  const selectedClientOptions = useMemo(
    () => clients.map((client) => ({ id: client.id, label: `${client.name} (${client.client_id})`, client })),
    [clients],
  )

  const handlePolicySubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setIsSavingPolicy(true)
    try {
      const payload: CreateIamClientPolicyRequest | UpdateIamClientPolicyRequest = {
        realm_id: selectedRealmId,
        name: policyForm.name,
        description: policyForm.description,
        allow_dynamic_registration: policyForm.allowDynamicRegistration,
        allow_device_authorization: policyForm.allowDeviceAuthorization,
        allow_token_exchange: policyForm.allowTokenExchange,
        allow_pushed_authorization_requests: policyForm.allowPushedAuthorizationRequests,
        require_par_for_public_clients: policyForm.requireParForPublicClients,
        require_pkce_for_public_clients: policyForm.requirePkceForPublicClients,
        allow_wildcard_redirect_uris: policyForm.allowWildcardRedirectUris,
        allowed_protocols: ['OIDC'],
        allowed_access_types: ['PUBLIC', 'CONFIDENTIAL'],
        assigned_client_ids: policyForm.assignedClientIds,
      }
      if (policyForm.id) {
        await idpApi.updateIamClientPolicy(policyForm.id, payload as UpdateIamClientPolicyRequest)
        toast.success('Client policy updated')
      } else {
        await idpApi.createIamClientPolicy(payload as CreateIamClientPolicyRequest)
        toast.success('Client policy created')
      }
      setPolicyForm(emptyPolicyForm())
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save client policy')
    } finally {
      setIsSavingPolicy(false)
    }
  }

  const handleIssueInitialAccessToken = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setIsIssuingInitialAccessToken(true)
    try {
      const request: CreateIamInitialAccessTokenRequest = {
        realm_id: selectedRealmId,
        policy_id: initialAccessTokenForm.policyId,
        label: initialAccessTokenForm.label,
        max_uses: initialAccessTokenForm.maxUses ? Number(initialAccessTokenForm.maxUses) : null,
        expires_in_hours: initialAccessTokenForm.expiresInHours ? Number(initialAccessTokenForm.expiresInHours) : null,
      }
      const response = await idpApi.issueIamInitialAccessToken(request)
      setLatestInitialAccessToken(response.issued_token)
      toast.success('Initial access token issued')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to issue initial access token')
    } finally {
      setIsIssuingInitialAccessToken(false)
    }
  }

  const handleDynamicRegistration = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId || !latestInitialAccessToken) {
      toast.error('Issue an initial access token first')
      return
    }
    setIsRegisteringClient(true)
    try {
      const response = await idpApi.dynamicallyRegisterIamClient(
        selectedRealmId,
        {
          client_name: dynamicRegistrationForm.clientName,
          client_id: dynamicRegistrationForm.clientId || undefined,
          redirect_uris: [dynamicRegistrationForm.redirectUri],
          grant_types: parseCsv(dynamicRegistrationForm.grantTypes),
          token_endpoint_auth_method: dynamicRegistrationForm.tokenEndpointAuthMethod,
          scope: dynamicRegistrationForm.scope,
          policy_id: initialAccessTokenForm.policyId || undefined,
        },
        latestInitialAccessToken,
      )
      setLastRegistration(response)
      if (response.client_secret) {
        setProtocolHarness((current) => ({
          ...current,
          clientId: response.client.client_id,
          clientSecret: response.client_secret ?? '',
          redirectUri: response.client.redirect_uris[0] ?? current.redirectUri,
        }))
      } else {
        setProtocolHarness((current) => ({
          ...current,
          clientId: response.client.client_id,
          clientSecret: '',
          redirectUri: response.client.redirect_uris[0] ?? current.redirectUri,
        }))
      }
      toast.success('Dynamic client registered')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to dynamically register client')
    } finally {
      setIsRegisteringClient(false)
    }
  }

  const handleCreatePar = async () => {
    if (!selectedRealmId || !protocolHarness.clientId) return
    setIsRunningPar(true)
    try {
      const response = await idpApi.createIamPushedAuthorizationRequest(
        selectedRealmId,
        {
          client_id: protocolHarness.clientId,
          redirect_uri: protocolHarness.redirectUri,
          response_type: 'code',
          scope: protocolHarness.scope,
          state: 'phase-b-par-smoke',
          code_challenge: 'p1XWnEncNBsT8eo4fnD_7Ww-sTinlz5m50FMCOIdNbQ',
          code_challenge_method: 'S256',
        },
        protocolHarness.clientSecret
          ? { basicClientAuth: { clientId: protocolHarness.clientId, clientSecret: protocolHarness.clientSecret } }
          : undefined,
      )
      setParResult(response.request_uri)
      toast.success('PAR created')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to create PAR')
    } finally {
      setIsRunningPar(false)
    }
  }

  const handleCreateDeviceAuthorization = async () => {
    if (!selectedRealmId || !protocolHarness.clientId) return
    setIsRunningDeviceAuth(true)
    try {
      const response = await idpApi.createIamDeviceAuthorization(
        selectedRealmId,
        {
          client_id: protocolHarness.clientId,
          scope: protocolHarness.scope,
        },
        protocolHarness.clientSecret
          ? { basicClientAuth: { clientId: protocolHarness.clientId, clientSecret: protocolHarness.clientSecret } }
          : undefined,
      )
      setDeviceResult(`${response.user_code} -> ${response.verification_uri_complete}`)
      toast.success('Device authorization created')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to create device authorization')
    } finally {
      setIsRunningDeviceAuth(false)
    }
  }

  const handleTokenExchange = async () => {
    if (!selectedRealmId || !protocolHarness.clientId || !protocolHarness.subjectToken) return
    setIsRunningTokenExchange(true)
    try {
      const response = await idpApi.issueIamToken(
        selectedRealmId,
        {
          grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
          client_id: protocolHarness.clientId,
          subject_token: protocolHarness.subjectToken,
          audience: protocolHarness.audience,
          scope: protocolHarness.scope,
        },
        protocolHarness.clientSecret
          ? { basicClientAuth: { clientId: protocolHarness.clientId, clientSecret: protocolHarness.clientSecret } }
          : undefined,
      )
      setTokenExchangeResult(response.access_token)
      toast.success('Token exchange completed')
      await loadRuntime()
    } catch (error) {
      console.error(error)
      toast.error('Failed to exchange token')
    } finally {
      setIsRunningTokenExchange(false)
    }
  }

  if (!selectedRealmId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
        Select a realm to manage advanced OAuth governance.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Policies" value={String(policies.length)} detail="Realm governance controls" icon={<KeyRound className="h-5 w-5" />} />
        <MetricCard label="Initial Tokens" value={String(initialAccessTokens.filter((token) => token.status === 'ACTIVE').length)} detail={`${initialAccessTokens.length} issued`} icon={<Plus className="h-5 w-5" />} />
        <MetricCard label="PAR" value={String(parRequests.length)} detail="Pushed authorization requests" icon={<Waypoints className="h-5 w-5" />} />
        <MetricCard label="Device" value={String(deviceAuthorizations.length)} detail="Device authorization requests" icon={<Smartphone className="h-5 w-5" />} />
        <MetricCard label="Exchanges" value={String(tokenExchanges.length)} detail="Token exchange ledger" icon={<ArrowRightLeft className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Section title="Client Policies" description="Phase B introduces explicit realm-level client governance over dynamic registration, PAR, device flow, token exchange, and redirect posture.">
          <div className="space-y-4">
            <div className="space-y-2">
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setPolicyForm(buildPolicyForm(policy))}
                  className="flex w-full items-start justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{policy.name}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">{policy.description || 'No description provided.'}</div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {policy.status}
                  </span>
                </button>
              ))}
            </div>
            <form onSubmit={handlePolicySubmit} className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Policy Name</span>
                  <input value={policyForm.name} onChange={(event) => setPolicyForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Assigned Clients</span>
                  <div className="rounded-lg border border-slate-300 p-3 dark:border-slate-700">
                    <div className="grid gap-2">
                      {selectedClientOptions.map(({ id, label }) => (
                        <label key={id} className="flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-200">
                          <span>{label}</span>
                          <input type="checkbox" checked={policyForm.assignedClientIds.includes(id)} onChange={() => setPolicyForm((current) => ({ ...current, assignedClientIds: toggleItem(current.assignedClientIds, id) }))} />
                        </label>
                      ))}
                    </div>
                  </div>
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">Description</span>
                <textarea value={policyForm.description} onChange={(event) => setPolicyForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['allowDynamicRegistration', 'Dynamic registration'],
                  ['allowDeviceAuthorization', 'Device authorization'],
                  ['allowTokenExchange', 'Token exchange'],
                  ['allowPushedAuthorizationRequests', 'PAR'],
                  ['requireParForPublicClients', 'Require PAR for public clients'],
                  ['requirePkceForPublicClients', 'Require PKCE for public clients'],
                  ['allowWildcardRedirectUris', 'Allow wildcard redirects'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-200">{label}</span>
                    <input
                      type="checkbox"
                      checked={policyForm[key as keyof PolicyFormState] as boolean}
                      onChange={() => setPolicyForm((current) => ({ ...current, [key]: !(current[key as keyof PolicyFormState] as boolean) }))}
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={!canManage || isSavingPolicy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                  {isSavingPolicy ? 'Saving…' : policyForm.id ? 'Update Policy' : 'Create Policy'}
                </button>
                <button type="button" onClick={() => setPolicyForm(emptyPolicyForm())} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  Reset
                </button>
              </div>
            </form>
          </div>
        </Section>

        <Section title="Registration and Advanced Flows" description="Issue initial access tokens, dynamically register OIDC clients, and exercise the advanced OAuth lanes without leaving the IAM workspace.">
          <div className="space-y-5">
            <form onSubmit={handleIssueInitialAccessToken} className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Client Policy</span>
                  <select value={initialAccessTokenForm.policyId} onChange={(event) => setInitialAccessTokenForm((current) => ({ ...current, policyId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Select a policy</option>
                    {policies.map((policy) => (
                      <option key={policy.id} value={policy.id}>{policy.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Label</span>
                  <input value={initialAccessTokenForm.label} onChange={(event) => setInitialAccessTokenForm((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Max Uses</span>
                  <input value={initialAccessTokenForm.maxUses} onChange={(event) => setInitialAccessTokenForm((current) => ({ ...current, maxUses: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Expires In (Hours)</span>
                  <input value={initialAccessTokenForm.expiresInHours} onChange={(event) => setInitialAccessTokenForm((current) => ({ ...current, expiresInHours: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              <button type="submit" disabled={!canManage || isIssuingInitialAccessToken} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
                {isIssuingInitialAccessToken ? 'Issuing…' : 'Issue Initial Access Token'}
              </button>
              {latestInitialAccessToken && (
                <div className="rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                  Latest token: <code className="break-all">{latestInitialAccessToken}</code>
                </div>
              )}
            </form>

            <form onSubmit={handleDynamicRegistration} className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Client Name</span>
                  <input value={dynamicRegistrationForm.clientName} onChange={(event) => setDynamicRegistrationForm((current) => ({ ...current, clientName: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Client ID</span>
                  <input value={dynamicRegistrationForm.clientId} onChange={(event) => setDynamicRegistrationForm((current) => ({ ...current, clientId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">Redirect URI</span>
                <input value={dynamicRegistrationForm.redirectUri} onChange={(event) => setDynamicRegistrationForm((current) => ({ ...current, redirectUri: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Grant Types</span>
                  <input value={dynamicRegistrationForm.grantTypes} onChange={(event) => setDynamicRegistrationForm((current) => ({ ...current, grantTypes: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Token Auth Method</span>
                  <select value={dynamicRegistrationForm.tokenEndpointAuthMethod} onChange={(event) => setDynamicRegistrationForm((current) => ({ ...current, tokenEndpointAuthMethod: event.target.value as DynamicRegistrationFormState['tokenEndpointAuthMethod'] }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                    <option value="none">Public (none)</option>
                    <option value="client_secret_basic">client_secret_basic</option>
                    <option value="client_secret_post">client_secret_post</option>
                  </select>
                </label>
              </div>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-900 dark:text-white">Scopes</span>
                <input value={dynamicRegistrationForm.scope} onChange={(event) => setDynamicRegistrationForm((current) => ({ ...current, scope: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <button type="submit" disabled={isRegisteringClient || !latestInitialAccessToken} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                {isRegisteringClient ? 'Registering…' : 'Dynamically Register Client'}
              </button>
              {lastRegistration && (
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
                  <div><strong>Client:</strong> {lastRegistration.client.client_id}</div>
                  <div><strong>Registration URI:</strong> <code className="break-all">{lastRegistration.registration_client_uri}</code></div>
                  <div><strong>Registration Token:</strong> <code className="break-all">{lastRegistration.registration_access_token}</code></div>
                  {lastRegistration.client_secret && <div><strong>Client Secret:</strong> <code className="break-all">{lastRegistration.client_secret}</code></div>}
                </div>
              )}
            </form>

            <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-sm font-medium text-slate-900 dark:text-white">Protocol Harness</div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Client ID</span>
                  <input value={protocolHarness.clientId} onChange={(event) => setProtocolHarness((current) => ({ ...current, clientId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Client Secret</span>
                  <input value={protocolHarness.clientSecret} onChange={(event) => setProtocolHarness((current) => ({ ...current, clientSecret: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Redirect URI</span>
                  <input value={protocolHarness.redirectUri} onChange={(event) => setProtocolHarness((current) => ({ ...current, redirectUri: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Scope</span>
                  <input value={protocolHarness.scope} onChange={(event) => setProtocolHarness((current) => ({ ...current, scope: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <button type="button" onClick={handleCreatePar} disabled={isRunningPar} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  {isRunningPar ? 'Running…' : 'Create PAR'}
                </button>
                <button type="button" onClick={handleCreateDeviceAuthorization} disabled={isRunningDeviceAuth} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  {isRunningDeviceAuth ? 'Running…' : 'Create Device Flow'}
                </button>
                <button type="button" onClick={handleTokenExchange} disabled={isRunningTokenExchange || !protocolHarness.subjectToken} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  {isRunningTokenExchange ? 'Running…' : 'Run Token Exchange'}
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Subject Token</span>
                  <textarea value={protocolHarness.subjectToken} onChange={(event) => setProtocolHarness((current) => ({ ...current, subjectToken: event.target.value }))} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900 dark:text-white">Audience Client</span>
                  <input value={protocolHarness.audience} onChange={(event) => setProtocolHarness((current) => ({ ...current, audience: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
                </label>
              </div>
              {parResult && <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300"><strong>PAR:</strong> {parResult}</div>}
              {deviceResult && <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300"><strong>Device:</strong> {deviceResult}</div>}
              {tokenExchangeResult && <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300"><strong>Exchanged Token:</strong> <code className="break-all">{tokenExchangeResult}</code></div>}
            </div>
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section title="Initial Access Tokens" description="Admin-issued bootstrap tokens for dynamic client registration.">
          <div className="space-y-3 text-sm">
            {initialAccessTokens.map((token) => (
              <div key={token.id} className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                <div className="font-medium text-slate-900 dark:text-white">{token.label}</div>
                <div className="mt-1 text-xs text-slate-500">{token.policy_id}</div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  {token.status} • uses: {token.remaining_uses ?? 'unlimited'} • expires: {token.expires_at ?? 'never'}
                </div>
              </div>
            ))}
            {!isLoading && initialAccessTokens.length === 0 && <div className="text-slate-500 dark:text-slate-400">No initial access tokens issued yet.</div>}
          </div>
        </Section>

        <Section title="Pushed Authorization Requests" description="Recent PAR records for this realm.">
          <div className="space-y-3 text-sm">
            {parRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                <div className="font-medium text-slate-900 dark:text-white">{request.client_id}</div>
                <div className="mt-1 break-all text-xs text-slate-500">{request.request_uri}</div>
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{request.status} • expires {request.expires_at}</div>
              </div>
            ))}
            {!isLoading && parRequests.length === 0 && <div className="text-slate-500 dark:text-slate-400">No PAR records yet.</div>}
          </div>
        </Section>

        <Section title="Device and Token Exchange Ledgers" description="Current device authorization and token exchange activity for validation.">
          <div className="space-y-4 text-sm">
            <div>
              <div className="mb-2 font-medium text-slate-900 dark:text-white">Device Authorizations</div>
              <div className="space-y-2">
                {deviceAuthorizations.slice(0, 5).map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <div className="font-medium text-slate-900 dark:text-white">{record.client_id}</div>
                    <div className="mt-1 text-xs text-slate-500">{record.user_code}</div>
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{record.status} • expires {record.expires_at}</div>
                  </div>
                ))}
                {!isLoading && deviceAuthorizations.length === 0 && <div className="text-slate-500 dark:text-slate-400">No device authorization records yet.</div>}
              </div>
            </div>
            <div>
              <div className="mb-2 font-medium text-slate-900 dark:text-white">Token Exchanges</div>
              <div className="space-y-2">
                {tokenExchanges.slice(0, 5).map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                    <div className="font-medium text-slate-900 dark:text-white">{record.requesting_client_id} → {record.audience_client_id}</div>
                    <div className="mt-1 text-xs text-slate-500">{record.subject_kind} {record.subject_id}</div>
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{record.status} • {record.created_at}</div>
                  </div>
                ))}
                {!isLoading && tokenExchanges.length === 0 && <div className="text-slate-500 dark:text-slate-400">No token exchange records yet.</div>}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
