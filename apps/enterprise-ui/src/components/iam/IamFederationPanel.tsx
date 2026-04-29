import React, { useEffect, useMemo, useState } from 'react'
import { GitBranch, Link2, Network, RefreshCw, Rows3, ShieldCheck } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type IamGroupRecord,
  type IamIdentityProviderLinkPolicy,
  type IamIdentityProviderLoginMode,
  type IamIdentityProviderProtocol,
  type IamIdentityProviderRecord,
  type IamIdentityProviderStatus,
  type IamLinkedIdentityRecord,
  type IamRoleRecord,
  type IamUserFederationImportStrategy,
  type IamUserFederationProviderKind,
  type IamUserFederationProviderRecord,
  type IamUserFederationProviderStatus,
  type IamFederationSyncJobRecord,
  type IamFederationEventRecord,
} from '../../services/standaloneApi'

type IdentityProviderFormState = {
  id: string | null
  alias: string
  name: string
  summary: string
  protocol: IamIdentityProviderProtocol
  status: IamIdentityProviderStatus
  loginMode: IamIdentityProviderLoginMode
  linkPolicy: IamIdentityProviderLinkPolicy
  issuerUrl: string
  allowedScopes: string
  defaultRoleIds: string[]
  defaultGroupIds: string[]
}

type FederationProviderFormState = {
  id: string | null
  name: string
  summary: string
  kind: IamUserFederationProviderKind
  status: IamUserFederationProviderStatus
  importStrategy: IamUserFederationImportStrategy
  connectionLabel: string
  defaultRoleIds: string[]
  defaultGroupIds: string[]
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatList(values: string[]) {
  return values.join(', ')
}

function emptyIdentityProviderForm(): IdentityProviderFormState {
  return {
    id: null,
    alias: '',
    name: '',
    summary: '',
    protocol: 'OIDC',
    status: 'ACTIVE',
    loginMode: 'OPTIONAL',
    linkPolicy: 'AUTO_CREATE',
    issuerUrl: '',
    allowedScopes: 'openid, profile, email',
    defaultRoleIds: [],
    defaultGroupIds: [],
  }
}

function emptyFederationProviderForm(): FederationProviderFormState {
  return {
    id: null,
    name: '',
    summary: '',
    kind: 'LDAP',
    status: 'ACTIVE',
    importStrategy: 'IMPORT',
    connectionLabel: '',
    defaultRoleIds: [],
    defaultGroupIds: [],
  }
}

function buildIdentityProviderForm(provider: IamIdentityProviderRecord): IdentityProviderFormState {
  return {
    id: provider.id,
    alias: provider.alias,
    name: provider.name,
    summary: provider.summary,
    protocol: provider.protocol,
    status: provider.status,
    loginMode: provider.login_mode,
    linkPolicy: provider.link_policy,
    issuerUrl: provider.issuer_url ?? '',
    allowedScopes: formatList(provider.allowed_scopes),
    defaultRoleIds: provider.default_role_ids,
    defaultGroupIds: provider.default_group_ids,
  }
}

function buildFederationProviderForm(provider: IamUserFederationProviderRecord): FederationProviderFormState {
  return {
    id: provider.id,
    name: provider.name,
    summary: provider.summary,
    kind: provider.kind,
    status: provider.status,
    importStrategy: provider.import_strategy,
    connectionLabel: provider.connection_label,
    defaultRoleIds: provider.default_role_ids,
    defaultGroupIds: provider.default_group_ids,
  }
}

export function IamFederationPanel({
  selectedRealmId,
  canManage,
}: {
  selectedRealmId: string
  canManage: boolean
}) {
  const [identityProviders, setIdentityProviders] = useState<IamIdentityProviderRecord[]>([])
  const [federationProviders, setFederationProviders] = useState<IamUserFederationProviderRecord[]>([])
  const [linkedIdentities, setLinkedIdentities] = useState<IamLinkedIdentityRecord[]>([])
  const [syncJobs, setSyncJobs] = useState<IamFederationSyncJobRecord[]>([])
  const [events, setEvents] = useState<IamFederationEventRecord[]>([])
  const [roles, setRoles] = useState<IamRoleRecord[]>([])
  const [groups, setGroups] = useState<IamGroupRecord[]>([])
  const [identityProviderForm, setIdentityProviderForm] = useState<IdentityProviderFormState>(emptyIdentityProviderForm)
  const [federationProviderForm, setFederationProviderForm] = useState<FederationProviderFormState>(emptyFederationProviderForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingIdentityProvider, setIsSavingIdentityProvider] = useState(false)
  const [isSavingFederationProvider, setIsSavingFederationProvider] = useState(false)
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null)

  const loadFederation = async () => {
    if (!selectedRealmId) {
      setIdentityProviders([])
      setFederationProviders([])
      setLinkedIdentities([])
      setSyncJobs([])
      setEvents([])
      setRoles([])
      setGroups([])
      return
    }

    setIsLoading(true)
    try {
      const [
        identityProviderResponse,
        federationProviderResponse,
        linkedIdentityResponse,
        syncJobResponse,
        eventResponse,
        roleResponse,
        groupResponse,
      ] = await Promise.all([
        idpApi.listIamIdentityProviders({ realmId: selectedRealmId }),
        idpApi.listIamUserFederationProviders({ realmId: selectedRealmId }),
        idpApi.listIamLinkedIdentities({ realmId: selectedRealmId }),
        idpApi.listIamFederationSyncJobs({ realmId: selectedRealmId }),
        idpApi.listIamFederationEvents({ realmId: selectedRealmId }),
        idpApi.listIamRoles({ realmId: selectedRealmId }),
        idpApi.listIamGroups({ realmId: selectedRealmId }),
      ])
      setIdentityProviders(identityProviderResponse.identity_providers)
      setFederationProviders(federationProviderResponse.user_federation_providers)
      setLinkedIdentities(linkedIdentityResponse.linked_identities)
      setSyncJobs(syncJobResponse.sync_jobs)
      setEvents(eventResponse.events)
      setRoles(roleResponse.roles)
      setGroups(groupResponse.groups)
    } catch (error) {
      console.error('Failed to load IAM federation runtime', error)
      toast.error('Failed to load IAM federation runtime')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadFederation()
  }, [selectedRealmId])

  useEffect(() => {
    setIdentityProviderForm(emptyIdentityProviderForm())
    setFederationProviderForm(emptyFederationProviderForm())
  }, [selectedRealmId])

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.id, label: `${role.name} · ${role.kind}` })),
    [roles],
  )
  const groupOptions = useMemo(
    () => groups.map((group) => ({ value: group.id, label: group.name })),
    [groups],
  )

  const handleIdentityProviderSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) {
      toast.error('Select a realm first')
      return
    }
    setIsSavingIdentityProvider(true)
    try {
      if (identityProviderForm.id) {
        await idpApi.updateIamIdentityProvider(identityProviderForm.id, {
          alias: identityProviderForm.alias.trim(),
          name: identityProviderForm.name.trim(),
          summary: identityProviderForm.summary.trim(),
          status: identityProviderForm.status,
          login_mode: identityProviderForm.loginMode,
          link_policy: identityProviderForm.linkPolicy,
          issuer_url: identityProviderForm.issuerUrl || null,
          allowed_scopes: parseList(identityProviderForm.allowedScopes),
          default_role_ids: identityProviderForm.defaultRoleIds,
          default_group_ids: identityProviderForm.defaultGroupIds,
        })
        toast.success('Identity provider updated')
      } else {
        await idpApi.createIamIdentityProvider({
          realm_id: selectedRealmId,
          alias: identityProviderForm.alias.trim(),
          name: identityProviderForm.name.trim(),
          summary: identityProviderForm.summary.trim(),
          protocol: identityProviderForm.protocol,
          status: identityProviderForm.status,
          login_mode: identityProviderForm.loginMode,
          link_policy: identityProviderForm.linkPolicy,
          issuer_url: identityProviderForm.issuerUrl || null,
          allowed_scopes: parseList(identityProviderForm.allowedScopes),
          default_role_ids: identityProviderForm.defaultRoleIds,
          default_group_ids: identityProviderForm.defaultGroupIds,
        })
        toast.success('Identity provider created')
      }
      setIdentityProviderForm(emptyIdentityProviderForm())
      await loadFederation()
    } catch (error) {
      console.error('Failed to save IAM identity provider', error)
      toast.error('Failed to save identity provider')
    } finally {
      setIsSavingIdentityProvider(false)
    }
  }

  const handleFederationProviderSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) {
      toast.error('Select a realm first')
      return
    }
    setIsSavingFederationProvider(true)
    try {
      if (federationProviderForm.id) {
        await idpApi.updateIamUserFederationProvider(federationProviderForm.id, {
          name: federationProviderForm.name.trim(),
          summary: federationProviderForm.summary.trim(),
          status: federationProviderForm.status,
          import_strategy: federationProviderForm.importStrategy,
          connection_label: federationProviderForm.connectionLabel.trim(),
          default_role_ids: federationProviderForm.defaultRoleIds,
          default_group_ids: federationProviderForm.defaultGroupIds,
        })
        toast.success('Federation provider updated')
      } else {
        await idpApi.createIamUserFederationProvider({
          realm_id: selectedRealmId,
          name: federationProviderForm.name.trim(),
          summary: federationProviderForm.summary.trim(),
          kind: federationProviderForm.kind,
          status: federationProviderForm.status,
          import_strategy: federationProviderForm.importStrategy,
          connection_label: federationProviderForm.connectionLabel.trim(),
          default_role_ids: federationProviderForm.defaultRoleIds,
          default_group_ids: federationProviderForm.defaultGroupIds,
        })
        toast.success('Federation provider created')
      }
      setFederationProviderForm(emptyFederationProviderForm())
      await loadFederation()
    } catch (error) {
      console.error('Failed to save IAM federation provider', error)
      toast.error('Failed to save federation provider')
    } finally {
      setIsSavingFederationProvider(false)
    }
  }

  const handleRunSync = async (providerId: string) => {
    setSyncingProviderId(providerId)
    try {
      const job = await idpApi.syncIamUserFederationProvider(providerId)
      toast.success(`Federation sync completed: ${job.imported_count} imported`)
      await loadFederation()
    } catch (error) {
      console.error('Failed to run IAM federation sync', error)
      toast.error('Failed to run federation sync')
    } finally {
      setSyncingProviderId(null)
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
            <Network className="h-4 w-4" />
            Federation and Brokering
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Manage external OIDC and SAML brokers, directory federation providers, on-demand sync, linked identities,
            and federation event history for the selected standalone realm.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <span>{identityProviders.length} brokers</span>
          <span>{federationProviders.length} federation providers</span>
          <span>{linkedIdentities.length} linked identities</span>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          Loading IAM federation posture…
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel
              title="Identity Brokers"
              description="Public-facing broker definitions for OIDC and SAML sign-in."
              icon={<ShieldCheck className="h-5 w-5" />}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="pb-3">Broker</th>
                      <th className="pb-3">Policy</th>
                      <th className="pb-3">Mapped identities</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {identityProviders.map((provider) => (
                      <tr key={provider.id}>
                        <td className="py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{provider.name}</div>
                          <div className="text-xs text-slate-500">{provider.alias} · {provider.protocol}</div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {provider.login_mode} · {provider.link_policy}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {provider.external_identities.length} external profiles
                        </td>
                        <td className="py-3 text-right">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setIdentityProviderForm(buildIdentityProviderForm(provider))}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Directory Federation"
              description="On-demand directory adapters used to import or link external users."
              icon={<GitBranch className="h-5 w-5" />}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="pb-3">Provider</th>
                      <th className="pb-3">Strategy</th>
                      <th className="pb-3">Directory entries</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {federationProviders.map((provider) => (
                      <tr key={provider.id}>
                        <td className="py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{provider.name}</div>
                          <div className="text-xs text-slate-500">{provider.kind} · {provider.connection_label || 'No connection label'}</div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{provider.import_strategy}</td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{provider.external_identities.length}</td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => void handleRunSync(provider.id)}
                                disabled={syncingProviderId === provider.id}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                {syncingProviderId === provider.id ? 'Syncing…' : 'Run Sync'}
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => setFederationProviderForm(buildFederationProviderForm(provider))}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <FormCard
              title={identityProviderForm.id ? 'Edit Identity Broker' : 'Create Identity Broker'}
              description="Broker definitions drive the public broker-first login choices for the selected realm."
            >
              <form onSubmit={handleIdentityProviderSubmit} className="space-y-4">
                <LabeledInput label="Alias" value={identityProviderForm.alias} onChange={(value) => setIdentityProviderForm((current) => ({ ...current, alias: value }))} />
                <LabeledInput label="Name" value={identityProviderForm.name} onChange={(value) => setIdentityProviderForm((current) => ({ ...current, name: value }))} />
                <LabeledTextarea label="Summary" value={identityProviderForm.summary} onChange={(value) => setIdentityProviderForm((current) => ({ ...current, summary: value }))} rows={3} />
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledSelect
                    label="Protocol"
                    value={identityProviderForm.protocol}
                    onChange={(value) => setIdentityProviderForm((current) => ({ ...current, protocol: value as IamIdentityProviderProtocol }))}
                    options={[
                      { value: 'OIDC', label: 'OIDC' },
                      { value: 'SAML', label: 'SAML' },
                    ]}
                  />
                  <LabeledSelect
                    label="Status"
                    value={identityProviderForm.status}
                    onChange={(value) => setIdentityProviderForm((current) => ({ ...current, status: value as IamIdentityProviderStatus }))}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'DISABLED', label: 'Disabled' },
                      { value: 'ARCHIVED', label: 'Archived' },
                    ]}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledSelect
                    label="Login Mode"
                    value={identityProviderForm.loginMode}
                    onChange={(value) => setIdentityProviderForm((current) => ({ ...current, loginMode: value as IamIdentityProviderLoginMode }))}
                    options={[
                      { value: 'OPTIONAL', label: 'Optional' },
                      { value: 'BROKER_ONLY', label: 'Broker Only' },
                    ]}
                  />
                  <LabeledSelect
                    label="Link Policy"
                    value={identityProviderForm.linkPolicy}
                    onChange={(value) => setIdentityProviderForm((current) => ({ ...current, linkPolicy: value as IamIdentityProviderLinkPolicy }))}
                    options={[
                      { value: 'AUTO_CREATE', label: 'Auto Create' },
                      { value: 'EMAIL_MATCH', label: 'Email Match' },
                      { value: 'MANUAL', label: 'Manual' },
                    ]}
                  />
                </div>
                <LabeledInput label="Issuer URL" value={identityProviderForm.issuerUrl} onChange={(value) => setIdentityProviderForm((current) => ({ ...current, issuerUrl: value }))} />
                <LabeledInput label="Allowed Scopes" value={identityProviderForm.allowedScopes} onChange={(value) => setIdentityProviderForm((current) => ({ ...current, allowedScopes: value }))} />
                <LabeledMultiSelect
                  label="Default Roles"
                  values={identityProviderForm.defaultRoleIds}
                  options={roleOptions}
                  onChange={(values) => setIdentityProviderForm((current) => ({ ...current, defaultRoleIds: values }))}
                />
                <LabeledMultiSelect
                  label="Default Groups"
                  values={identityProviderForm.defaultGroupIds}
                  options={groupOptions}
                  onChange={(values) => setIdentityProviderForm((current) => ({ ...current, defaultGroupIds: values }))}
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!canManage || isSavingIdentityProvider}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isSavingIdentityProvider ? 'Saving…' : identityProviderForm.id ? 'Save Broker' : 'Create Broker'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdentityProviderForm(emptyIdentityProviderForm())}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormCard>

            <FormCard
              title={federationProviderForm.id ? 'Edit Federation Provider' : 'Create Federation Provider'}
              description="Directory adapters remain synthetic in this phase, but the admin workflow should be operational."
            >
              <form onSubmit={handleFederationProviderSubmit} className="space-y-4">
                <LabeledInput label="Name" value={federationProviderForm.name} onChange={(value) => setFederationProviderForm((current) => ({ ...current, name: value }))} />
                <LabeledTextarea label="Summary" value={federationProviderForm.summary} onChange={(value) => setFederationProviderForm((current) => ({ ...current, summary: value }))} rows={3} />
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledSelect
                    label="Kind"
                    value={federationProviderForm.kind}
                    onChange={(value) => setFederationProviderForm((current) => ({ ...current, kind: value as IamUserFederationProviderKind }))}
                    options={[
                      { value: 'LDAP', label: 'LDAP' },
                      { value: 'SCIM', label: 'SCIM' },
                      { value: 'AWS_IDENTITY_CENTER', label: 'AWS Identity Center' },
                      { value: 'COGNITO_USER_POOL', label: 'Cognito User Pool' },
                    ]}
                  />
                  <LabeledSelect
                    label="Status"
                    value={federationProviderForm.status}
                    onChange={(value) => setFederationProviderForm((current) => ({ ...current, status: value as IamUserFederationProviderStatus }))}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'DISABLED', label: 'Disabled' },
                      { value: 'ARCHIVED', label: 'Archived' },
                    ]}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <LabeledSelect
                    label="Import Strategy"
                    value={federationProviderForm.importStrategy}
                    onChange={(value) => setFederationProviderForm((current) => ({ ...current, importStrategy: value as IamUserFederationImportStrategy }))}
                    options={[
                      { value: 'IMPORT', label: 'Import' },
                      { value: 'READ_ONLY', label: 'Read Only' },
                    ]}
                  />
                  <LabeledInput label="Connection Label" value={federationProviderForm.connectionLabel} onChange={(value) => setFederationProviderForm((current) => ({ ...current, connectionLabel: value }))} />
                </div>
                <LabeledMultiSelect
                  label="Default Roles"
                  values={federationProviderForm.defaultRoleIds}
                  options={roleOptions}
                  onChange={(values) => setFederationProviderForm((current) => ({ ...current, defaultRoleIds: values }))}
                />
                <LabeledMultiSelect
                  label="Default Groups"
                  values={federationProviderForm.defaultGroupIds}
                  options={groupOptions}
                  onChange={(values) => setFederationProviderForm((current) => ({ ...current, defaultGroupIds: values }))}
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={!canManage || isSavingFederationProvider}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  >
                    {isSavingFederationProvider ? 'Saving…' : federationProviderForm.id ? 'Save Provider' : 'Create Provider'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFederationProviderForm(emptyFederationProviderForm())}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </FormCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Panel
              title="Linked Identities"
              description="Every brokered login and directory import results in a local link record."
              icon={<Link2 className="h-5 w-5" />}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="pb-3">Identity</th>
                      <th className="pb-3">Source</th>
                      <th className="pb-3">Linked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {linkedIdentities.slice(0, 10).map((record) => (
                      <tr key={record.id}>
                        <td className="py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{record.external_username}</div>
                          <div className="text-xs text-slate-500">{record.external_email}</div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {record.source_type} · {record.provider_name}
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">
                          {new Date(record.linked_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Sync Jobs and Events"
              description="Recent federation jobs and broker events for the selected realm."
              icon={<Rows3 className="h-5 w-5" />}
            >
              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Sync Jobs</div>
                  <div className="space-y-2">
                    {syncJobs.slice(0, 4).map((job) => (
                      <div key={job.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="font-medium text-slate-900 dark:text-white">{job.provider_name}</div>
                        <div className="mt-1 text-slate-600 dark:text-slate-300">
                          {job.status} · imported {job.imported_count} · linked {job.linked_count} · updated {job.updated_count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Recent Federation Events</div>
                  <div className="space-y-2">
                    {events.slice(0, 5).map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                        <div className="font-medium text-slate-900 dark:text-white">{event.kind}</div>
                        <div className="mt-1 text-slate-600 dark:text-slate-300">{event.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </>
      )}
    </section>
  )
}

function Panel({ title, description, icon, children }: { title: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  )
}

function LabeledTextarea({ label, value, onChange, rows }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      <textarea
        value={value}
        rows={rows ?? 4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  )
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function LabeledMultiSelect({
  label,
  values,
  onChange,
  options,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
      <select
        multiple
        value={values}
        onChange={(event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value))}
        className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
