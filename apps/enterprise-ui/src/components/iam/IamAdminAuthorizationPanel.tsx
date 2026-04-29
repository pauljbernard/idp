import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type CreateIamAdminPermissionRequest,
  type CreateIamAdminPolicyRequest,
  type IamAdminEvaluationRecord,
  type IamAdminPermissionAction,
  type IamAdminPermissionDomain,
  type IamAdminPermissionRecord,
  type IamAdminPermissionScopeKind,
  type IamAdminPolicyPrincipalKind,
  type IamAdminPolicyRecord,
  type IamClientRecord,
  type IamGroupRecord,
  type IamRoleRecord,
  type IamUserRecord,
  type UpdateIamAdminPermissionRequest,
  type UpdateIamAdminPolicyRequest,
} from '../../services/standaloneApi'

type Props = {
  selectedRealmId: string
  canManage: boolean
  users: IamUserRecord[]
  groups: IamGroupRecord[]
  roles: IamRoleRecord[]
}

type PermissionFormState = {
  id: string | null
  name: string
  summary: string
  domain: IamAdminPermissionDomain
  actions: IamAdminPermissionAction[]
  scopeKind: IamAdminPermissionScopeKind
  managedUserIds: string[]
  managedGroupIds: string[]
  managedRoleIds: string[]
  managedClientIds: string[]
}

type PolicyFormState = {
  id: string | null
  name: string
  summary: string
  principalKind: IamAdminPolicyPrincipalKind
  principalId: string
  principalLabel: string
  permissionIds: string[]
  status: 'ACTIVE' | 'DISABLED'
}

function emptyPermissionForm(): PermissionFormState {
  return {
    id: null,
    name: '',
    summary: '',
    domain: 'USERS',
    actions: ['READ'],
    scopeKind: 'SCOPED',
    managedUserIds: [],
    managedGroupIds: [],
    managedRoleIds: [],
    managedClientIds: [],
  }
}

function emptyPolicyForm(): PolicyFormState {
  return {
    id: null,
    name: '',
    summary: '',
    principalKind: 'GROUP',
    principalId: '',
    principalLabel: '',
    permissionIds: [],
    status: 'ACTIVE',
  }
}

function buildPermissionForm(record: IamAdminPermissionRecord): PermissionFormState {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    domain: record.domain,
    actions: record.actions,
    scopeKind: record.scope_kind,
    managedUserIds: record.managed_user_ids,
    managedGroupIds: record.managed_group_ids,
    managedRoleIds: record.managed_role_ids,
    managedClientIds: record.managed_client_ids,
  }
}

function buildPolicyForm(record: IamAdminPolicyRecord): PolicyFormState {
  return {
    id: record.id,
    name: record.name,
    summary: record.summary,
    principalKind: record.principal_kind,
    principalId: record.principal_id,
    principalLabel: record.principal_label,
    permissionIds: record.permission_ids,
    status: record.status,
  }
}

export function IamAdminAuthorizationPanel({ selectedRealmId, canManage, users, groups, roles }: Props) {
  const [permissions, setPermissions] = useState<IamAdminPermissionRecord[]>([])
  const [policies, setPolicies] = useState<IamAdminPolicyRecord[]>([])
  const [evaluations, setEvaluations] = useState<IamAdminEvaluationRecord[]>([])
  const [clients, setClients] = useState<IamClientRecord[]>([])
  const [permissionForm, setPermissionForm] = useState<PermissionFormState>(emptyPermissionForm)
  const [policyForm, setPolicyForm] = useState<PolicyFormState>(emptyPolicyForm)
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingPermission, setIsSavingPermission] = useState(false)
  const [isSavingPolicy, setIsSavingPolicy] = useState(false)

  const realmUsers = useMemo(
    () => users.filter((user) => user.realm_id === selectedRealmId),
    [users, selectedRealmId],
  )
  const realmGroups = useMemo(
    () => groups.filter((group) => group.realm_id === selectedRealmId),
    [groups, selectedRealmId],
  )
  const realmRoles = useMemo(
    () => roles.filter((role) => role.realm_id === selectedRealmId),
    [roles, selectedRealmId],
  )

  const loadPanel = async () => {
    if (!selectedRealmId) {
      setPermissions([])
      setPolicies([])
      setEvaluations([])
      setClients([])
      return
    }

    setIsLoading(true)
    try {
      const [permissionsResponse, policiesResponse, evaluationsResponse, clientsResponse] = await Promise.all([
        idpApi.listIamAdminPermissions({ realmId: selectedRealmId }),
        idpApi.listIamAdminPolicies({ realmId: selectedRealmId }),
        idpApi.listIamAdminEvaluations({ realmId: selectedRealmId }),
        idpApi.listIamClients({ realmId: selectedRealmId }),
      ])
      setPermissions(permissionsResponse.permissions)
      setPolicies(policiesResponse.policies)
      setEvaluations(evaluationsResponse.evaluations)
      setClients(clientsResponse.clients)
    } catch (error) {
      console.error('Failed to load IAM admin authorization panel', error)
      toast.error('Unable to load IAM admin authorization data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadPanel()
  }, [selectedRealmId])

  useEffect(() => {
    if (!policyForm.id && !policyForm.principalId && realmGroups[0]) {
      setPolicyForm((current) => ({
        ...current,
        principalKind: 'GROUP',
        principalId: realmGroups[0]?.id ?? '',
        principalLabel: realmGroups[0]?.name ?? '',
      }))
    }
  }, [realmGroups, policyForm.id, policyForm.principalId])

  const handleToggleAction = (action: IamAdminPermissionAction) => {
    setPermissionForm((current) => ({
      ...current,
      actions: current.actions.includes(action)
        ? current.actions.filter((value) => value !== action)
        : [...current.actions, action],
    }))
  }

  const handlePermissionSave = async () => {
    if (!selectedRealmId) {
      toast.error('Select a realm first.')
      return
    }
    if (!permissionForm.name.trim() || !permissionForm.summary.trim() || permissionForm.actions.length === 0) {
      toast.error('Permission name, summary, and at least one action are required.')
      return
    }

    setIsSavingPermission(true)
    try {
      if (permissionForm.id) {
        const request: UpdateIamAdminPermissionRequest = {
          name: permissionForm.name,
          summary: permissionForm.summary,
          actions: permissionForm.actions,
          scope_kind: permissionForm.scopeKind,
          managed_user_ids: permissionForm.managedUserIds,
          managed_group_ids: permissionForm.managedGroupIds,
          managed_role_ids: permissionForm.managedRoleIds,
          managed_client_ids: permissionForm.managedClientIds,
        }
        await idpApi.updateIamAdminPermission(permissionForm.id, request)
        toast.success('Admin permission updated.')
      } else {
        const request: CreateIamAdminPermissionRequest = {
          realm_id: selectedRealmId,
          name: permissionForm.name,
          summary: permissionForm.summary,
          domain: permissionForm.domain,
          actions: permissionForm.actions,
          scope_kind: permissionForm.scopeKind,
          managed_user_ids: permissionForm.managedUserIds,
          managed_group_ids: permissionForm.managedGroupIds,
          managed_role_ids: permissionForm.managedRoleIds,
          managed_client_ids: permissionForm.managedClientIds,
        }
        await idpApi.createIamAdminPermission(request)
        toast.success('Admin permission created.')
      }
      setPermissionForm(emptyPermissionForm())
      await loadPanel()
    } catch (error) {
      console.error('Failed to save IAM admin permission', error)
      toast.error('Unable to save the IAM admin permission.')
    } finally {
      setIsSavingPermission(false)
    }
  }

  const handlePolicySave = async () => {
    if (!selectedRealmId) {
      toast.error('Select a realm first.')
      return
    }
    if (!policyForm.name.trim() || !policyForm.summary.trim() || !policyForm.principalId || !policyForm.principalLabel.trim() || policyForm.permissionIds.length === 0) {
      toast.error('Policy name, summary, principal, and permissions are required.')
      return
    }

    setIsSavingPolicy(true)
    try {
      if (policyForm.id) {
        const request: UpdateIamAdminPolicyRequest = {
          name: policyForm.name,
          summary: policyForm.summary,
          principal_label: policyForm.principalLabel,
          permission_ids: policyForm.permissionIds,
          status: policyForm.status,
        }
        await idpApi.updateIamAdminPolicy(policyForm.id, request)
        toast.success('Admin policy updated.')
      } else {
        const request: CreateIamAdminPolicyRequest = {
          realm_id: selectedRealmId,
          name: policyForm.name,
          summary: policyForm.summary,
          principal_kind: policyForm.principalKind,
          principal_id: policyForm.principalId,
          principal_label: policyForm.principalLabel,
          permission_ids: policyForm.permissionIds,
          status: policyForm.status,
        }
        await idpApi.createIamAdminPolicy(request)
        toast.success('Admin policy created.')
      }
      setPolicyForm(emptyPolicyForm())
      await loadPanel()
    } catch (error) {
      console.error('Failed to save IAM admin policy', error)
      toast.error('Unable to save the IAM admin policy.')
    } finally {
      setIsSavingPolicy(false)
    }
  }

  const principalOptions = policyForm.principalKind === 'USER'
    ? realmUsers.map((user) => ({ id: user.id, label: `${user.username} (${user.email})` }))
    : policyForm.principalKind === 'GROUP'
      ? realmGroups.map((group) => ({ id: group.id, label: group.name }))
      : realmRoles.map((role) => ({ id: role.id, label: role.name }))

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">Admin Authorization</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Fine-grained admin governance</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Permission objects and policy bindings define what restricted administrators can read, manage, or impersonate inside a realm.
            </p>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {selectedRealmId ? `Realm: ${selectedRealmId}` : 'Select a realm'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Permission Objects</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Name
              <input
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.name}
                onChange={(event) => setPermissionForm((current) => ({ ...current, name: event.target.value }))}
                disabled={!canManage}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Domain
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.domain}
                onChange={(event) => setPermissionForm((current) => ({ ...current, domain: event.target.value as IamAdminPermissionDomain }))}
                disabled={!canManage || !!permissionForm.id}
              >
                <option value="USERS">Users</option>
                <option value="GROUPS">Groups</option>
                <option value="ROLES">Roles</option>
                <option value="CLIENTS">Clients</option>
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
              Summary
              <textarea
                className="mt-1 min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.summary}
                onChange={(event) => setPermissionForm((current) => ({ ...current, summary: event.target.value }))}
                disabled={!canManage}
              />
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Scope
              <select
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.scopeKind}
                onChange={(event) => setPermissionForm((current) => ({ ...current, scopeKind: event.target.value as IamAdminPermissionScopeKind }))}
                disabled={!canManage}
              >
                <option value="SCOPED">Scoped</option>
                <option value="REALM">Realm-wide</option>
              </select>
            </label>
            <div className="text-sm text-slate-700 dark:text-slate-200">
              Actions
              <div className="mt-2 flex flex-wrap gap-2">
                {(['READ', 'MANAGE', 'IMPERSONATE'] as IamAdminPermissionAction[]).map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${permissionForm.actions.includes(action)
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-200'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}
                    onClick={() => handleToggleAction(action)}
                    disabled={!canManage}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Managed Users
              <select
                multiple
                className="mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.managedUserIds}
                onChange={(event) => setPermissionForm((current) => ({
                  ...current,
                  managedUserIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))}
                disabled={!canManage || permissionForm.scopeKind === 'REALM'}
              >
                {realmUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Managed Groups
              <select
                multiple
                className="mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.managedGroupIds}
                onChange={(event) => setPermissionForm((current) => ({
                  ...current,
                  managedGroupIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))}
                disabled={!canManage || permissionForm.scopeKind === 'REALM'}
              >
                {realmGroups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Managed Roles
              <select
                multiple
                className="mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.managedRoleIds}
                onChange={(event) => setPermissionForm((current) => ({
                  ...current,
                  managedRoleIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))}
                disabled={!canManage || permissionForm.scopeKind === 'REALM'}
              >
                {realmRoles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-700 dark:text-slate-200">
              Managed Clients
              <select
                multiple
                className="mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={permissionForm.managedClientIds}
                onChange={(event) => setPermissionForm((current) => ({
                  ...current,
                  managedClientIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                }))}
                disabled={!canManage || permissionForm.scopeKind === 'REALM'}
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.client_id}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void handlePermissionSave()}
              disabled={!canManage || isSavingPermission || !selectedRealmId}
            >
              {permissionForm.id ? 'Update Permission' : 'Create Permission'}
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              onClick={() => setPermissionForm(emptyPermissionForm())}
            >
              Reset
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {permissions.map((permission) => (
              <button
                key={permission.id}
                type="button"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800"
                onClick={() => setPermissionForm(buildPermissionForm(permission))}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{permission.name}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{permission.summary}</p>
                  </div>
                  <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                    <div>{permission.domain}</div>
                    <div>{permission.actions.join(', ')}</div>
                  </div>
                </div>
              </button>
            ))}
            {!permissions.length && !isLoading && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No admin permissions defined for this realm yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Policy Bindings</h4>
            <div className="mt-4 grid gap-4">
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Name
                <input className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={policyForm.name} onChange={(event) => setPolicyForm((current) => ({ ...current, name: event.target.value }))} disabled={!canManage} />
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Summary
                <textarea className="mt-1 min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={policyForm.summary} onChange={(event) => setPolicyForm((current) => ({ ...current, summary: event.target.value }))} disabled={!canManage} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-700 dark:text-slate-200">
                  Principal Type
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    value={policyForm.principalKind}
                    onChange={(event) => setPolicyForm((current) => ({
                      ...current,
                      principalKind: event.target.value as IamAdminPolicyPrincipalKind,
                      principalId: '',
                      principalLabel: '',
                    }))}
                    disabled={!canManage || !!policyForm.id}
                  >
                    <option value="USER">User</option>
                    <option value="GROUP">Group</option>
                    <option value="ROLE">Role</option>
                  </select>
                </label>
                <label className="text-sm text-slate-700 dark:text-slate-200">
                  Status
                  <select
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    value={policyForm.status}
                    onChange={(event) => setPolicyForm((current) => ({ ...current, status: event.target.value as 'ACTIVE' | 'DISABLED' }))}
                    disabled={!canManage}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </label>
              </div>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Principal
                <select
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={policyForm.principalId}
                  onChange={(event) => {
                    const option = principalOptions.find((candidate) => candidate.id === event.target.value)
                    setPolicyForm((current) => ({
                      ...current,
                      principalId: event.target.value,
                      principalLabel: option?.label ?? '',
                    }))
                  }}
                  disabled={!canManage || !!policyForm.id}
                >
                  <option value="">Select principal</option>
                  {principalOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-slate-700 dark:text-slate-200">
                Permission Bindings
                <select
                  multiple
                  className="mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={policyForm.permissionIds}
                  onChange={(event) => setPolicyForm((current) => ({
                    ...current,
                    permissionIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                  }))}
                  disabled={!canManage}
                >
                  {permissions.map((permission) => (
                    <option key={permission.id} value={permission.id}>
                      {permission.name} ({permission.domain})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void handlePolicySave()}
                disabled={!canManage || isSavingPolicy || !selectedRealmId}
              >
                {policyForm.id ? 'Update Policy' : 'Create Policy'}
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                onClick={() => setPolicyForm(emptyPolicyForm())}
              >
                Reset
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800"
                  onClick={() => setPolicyForm(buildPolicyForm(policy))}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{policy.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{policy.principal_label}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                      <div>{policy.principal_kind}</div>
                      <div>{policy.status}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Evaluation Audit</h4>
            <div className="mt-4 space-y-3">
              {evaluations.slice(0, 12).map((evaluation) => (
                <div key={evaluation.id} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {evaluation.actor_username} {evaluation.allowed ? 'allowed' : 'denied'} {evaluation.action.toLowerCase()} on {evaluation.domain.toLowerCase()}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{evaluation.reason}</p>
                    </div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ${evaluation.allowed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                      {evaluation.allowed ? 'Allowed' : 'Denied'}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{evaluation.method} {evaluation.route} {evaluation.target_resource_label ? `• ${evaluation.target_resource_label}` : ''}</p>
                </div>
              ))}
              {!evaluations.length && !isLoading && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No admin authorization evaluations have been recorded for this realm yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
