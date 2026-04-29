import React, { useEffect, useMemo, useState } from 'react'
import { GitBranch, RefreshCw, Shield, Waypoints } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  idpApi,
  type CreateIamAuthExecutionRequest,
  type CreateIamAuthFlowRequest,
  type IamAuthExecutionKind,
  type IamAuthExecutionRecord,
  type IamAuthExecutionRequirement,
  type IamAuthenticatorKind,
  type IamAuthFlowKind,
  type IamAuthFlowRecord,
  type IamClientAuthFlowBindingRecord,
  type IamClientRecord,
  type IamFlowConditionKind,
  type IamRealmAuthFlowBindingRecord,
  type UpdateIamAuthExecutionRequest,
  type UpdateIamAuthFlowRequest,
  type UpdateIamClientAuthFlowBindingsRequest,
  type UpdateIamRealmAuthFlowBindingsRequest,
} from '../../services/standaloneApi'

type FlowFormState = {
  id: string | null
  name: string
  description: string
  kind: IamAuthFlowKind
  status: 'ACTIVE' | 'ARCHIVED'
  topLevel: boolean
}

type ExecutionFormState = {
  id: string | null
  displayName: string
  executionKind: IamAuthExecutionKind
  authenticatorKind: IamAuthenticatorKind
  subflowId: string
  requirement: IamAuthExecutionRequirement
  conditionKind: IamFlowConditionKind
  priority: string
}

type RealmBindingFormState = {
  browserFlowId: string
  directGrantFlowId: string
  accountConsoleFlowId: string
}

type ClientBindingFormState = {
  clientId: string
  browserFlowId: string
  directGrantFlowId: string
  accountConsoleFlowId: string
}

function emptyFlowForm(): FlowFormState {
  return {
    id: null,
    name: '',
    description: '',
    kind: 'BROWSER',
    status: 'ACTIVE',
    topLevel: true,
  }
}

function buildFlowForm(flow: IamAuthFlowRecord): FlowFormState {
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description,
    kind: flow.kind,
    status: flow.status,
    topLevel: flow.top_level,
  }
}

function emptyExecutionForm(): ExecutionFormState {
  return {
    id: null,
    displayName: '',
    executionKind: 'AUTHENTICATOR',
    authenticatorKind: 'REQUIRED_ACTIONS',
    subflowId: '',
    requirement: 'REQUIRED',
    conditionKind: 'ALWAYS',
    priority: '10',
  }
}

function buildExecutionForm(execution: IamAuthExecutionRecord): ExecutionFormState {
  return {
    id: execution.id,
    displayName: execution.display_name,
    executionKind: execution.execution_kind,
    authenticatorKind: execution.authenticator_kind ?? 'ALLOW',
    subflowId: execution.subflow_id ?? '',
    requirement: execution.requirement,
    conditionKind: execution.condition_kind,
    priority: String(execution.priority),
  }
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

export function IamAuthFlowsPanel({
  selectedRealmId,
  canManage,
}: {
  selectedRealmId: string
  canManage: boolean
}) {
  const [flows, setFlows] = useState<IamAuthFlowRecord[]>([])
  const [executions, setExecutions] = useState<IamAuthExecutionRecord[]>([])
  const [clients, setClients] = useState<IamClientRecord[]>([])
  const [realmBinding, setRealmBinding] = useState<IamRealmAuthFlowBindingRecord | null>(null)
  const [clientBindings, setClientBindings] = useState<IamClientAuthFlowBindingRecord[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState('')
  const [selectedClientBindingId, setSelectedClientBindingId] = useState('')
  const [flowForm, setFlowForm] = useState<FlowFormState>(emptyFlowForm)
  const [executionForm, setExecutionForm] = useState<ExecutionFormState>(emptyExecutionForm)
  const [realmBindingForm, setRealmBindingForm] = useState<RealmBindingFormState>({
    browserFlowId: '',
    directGrantFlowId: '',
    accountConsoleFlowId: '',
  })
  const [clientBindingForm, setClientBindingForm] = useState<ClientBindingFormState>({
    clientId: '',
    browserFlowId: '',
    directGrantFlowId: '',
    accountConsoleFlowId: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingFlow, setIsSavingFlow] = useState(false)
  const [isSavingExecution, setIsSavingExecution] = useState(false)
  const [isSavingBindings, setIsSavingBindings] = useState(false)

  const loadPanel = async (preferredFlowId?: string) => {
    if (!selectedRealmId) {
      setFlows([])
      setExecutions([])
      setClients([])
      setRealmBinding(null)
      setClientBindings([])
      return
    }

    setIsLoading(true)
    try {
      const [flowResponse, bindingResponse, clientResponse] = await Promise.all([
        idpApi.listIamAuthFlows({ realmId: selectedRealmId }),
        idpApi.listIamAuthFlowBindings({ realmId: selectedRealmId }),
        idpApi.listIamClients({ realmId: selectedRealmId }),
      ])
      const nextFlowId = preferredFlowId && flowResponse.flows.some((flow) => flow.id === preferredFlowId)
        ? preferredFlowId
        : flowResponse.flows[0]?.id ?? ''
      setFlows(flowResponse.flows)
      setSelectedFlowId(nextFlowId)
      setClients(clientResponse.clients)
      setRealmBinding(bindingResponse.realm_bindings[0] ?? null)
      setClientBindings(bindingResponse.client_bindings)
      setRealmBindingForm({
        browserFlowId: bindingResponse.realm_bindings[0]?.browser_flow_id ?? '',
        directGrantFlowId: bindingResponse.realm_bindings[0]?.direct_grant_flow_id ?? '',
        accountConsoleFlowId: bindingResponse.realm_bindings[0]?.account_console_flow_id ?? '',
      })
      if (!clientBindingForm.clientId && clientResponse.clients[0]) {
        setClientBindingForm((current) => ({ ...current, clientId: clientResponse.clients[0].id }))
      }
      if (nextFlowId) {
        const executionResponse = await idpApi.listIamAuthExecutions({ flowId: nextFlowId })
        setExecutions(executionResponse.executions)
      } else {
        setExecutions([])
      }
    } catch (error) {
      console.error('Failed to load IAM auth flows panel', error)
      toast.error('Failed to load IAM auth flows')
    } finally {
      setIsLoading(false)
    }
  }

  const loadExecutions = async (flowId: string) => {
    if (!flowId) {
      setExecutions([])
      return
    }
    try {
      const response = await idpApi.listIamAuthExecutions({ flowId })
      setExecutions(response.executions)
    } catch (error) {
      console.error('Failed to load IAM auth executions', error)
      toast.error('Failed to load IAM auth executions')
    }
  }

  useEffect(() => {
    void loadPanel(selectedFlowId)
  }, [selectedRealmId])

  useEffect(() => {
    void loadExecutions(selectedFlowId)
  }, [selectedFlowId])

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.id === selectedFlowId) ?? null,
    [flows, selectedFlowId],
  )

  const selectedClientBinding = useMemo(
    () => clientBindings.find((binding) => binding.id === selectedClientBindingId) ?? null,
    [clientBindings, selectedClientBindingId],
  )

  const topLevelBrowserFlows = useMemo(
    () => flows.filter((flow) => flow.kind === 'BROWSER' && flow.top_level && flow.status === 'ACTIVE'),
    [flows],
  )
  const topLevelDirectGrantFlows = useMemo(
    () => flows.filter((flow) => flow.kind === 'DIRECT_GRANT' && flow.top_level && flow.status === 'ACTIVE'),
    [flows],
  )
  const topLevelAccountFlows = useMemo(
    () => flows.filter((flow) => flow.kind === 'ACCOUNT_CONSOLE' && flow.top_level && flow.status === 'ACTIVE'),
    [flows],
  )
  const subflowOptions = useMemo(
    () => flows.filter((flow) => flow.kind === 'SUBFLOW' && flow.status === 'ACTIVE'),
    [flows],
  )

  useEffect(() => {
    if (selectedFlow) {
      setFlowForm(buildFlowForm(selectedFlow))
      setExecutionForm(emptyExecutionForm())
    }
  }, [selectedFlowId])

  useEffect(() => {
    if (selectedClientBinding) {
      setClientBindingForm({
        clientId: selectedClientBinding.client_id,
        browserFlowId: selectedClientBinding.browser_flow_id ?? '',
        directGrantFlowId: selectedClientBinding.direct_grant_flow_id ?? '',
        accountConsoleFlowId: selectedClientBinding.account_console_flow_id ?? '',
      })
    }
  }, [selectedClientBindingId])

  const handleFlowSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setIsSavingFlow(true)
    try {
      if (flowForm.id) {
        const payload: UpdateIamAuthFlowRequest = {
          name: flowForm.name.trim(),
          description: flowForm.description.trim(),
          status: flowForm.status,
        }
        const updated = await idpApi.updateIamAuthFlow(flowForm.id, payload)
        toast.success('IAM auth flow updated')
        await loadPanel(updated.id)
      } else {
        const payload: CreateIamAuthFlowRequest = {
          realm_id: selectedRealmId,
          name: flowForm.name.trim(),
          description: flowForm.description.trim(),
          kind: flowForm.kind,
          status: flowForm.status,
          top_level: flowForm.kind === 'SUBFLOW' ? false : flowForm.topLevel,
        }
        const created = await idpApi.createIamAuthFlow(payload)
        toast.success('IAM auth flow created')
        setFlowForm(emptyFlowForm())
        await loadPanel(created.id)
      }
    } catch (error) {
      console.error('Failed to save IAM auth flow', error)
      toast.error('Failed to save IAM auth flow')
    } finally {
      setIsSavingFlow(false)
    }
  }

  const handleExecutionSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId || !selectedFlowId) return
    setIsSavingExecution(true)
    try {
      if (executionForm.id) {
        const payload: UpdateIamAuthExecutionRequest = {
          display_name: executionForm.displayName.trim(),
          requirement: executionForm.requirement,
          condition_kind: executionForm.conditionKind,
          priority: Number.parseInt(executionForm.priority, 10),
          authenticator_kind: executionForm.executionKind === 'AUTHENTICATOR' ? executionForm.authenticatorKind : undefined,
          subflow_id: executionForm.executionKind === 'SUBFLOW' ? executionForm.subflowId || null : undefined,
        }
        await idpApi.updateIamAuthExecution(executionForm.id, payload)
        toast.success('IAM auth execution updated')
      } else {
        const payload: CreateIamAuthExecutionRequest = {
          realm_id: selectedRealmId,
          flow_id: selectedFlowId,
          display_name: executionForm.displayName.trim(),
          execution_kind: executionForm.executionKind,
          requirement: executionForm.requirement,
          condition_kind: executionForm.conditionKind,
          priority: Number.parseInt(executionForm.priority, 10),
          authenticator_kind: executionForm.executionKind === 'AUTHENTICATOR' ? executionForm.authenticatorKind : undefined,
          subflow_id: executionForm.executionKind === 'SUBFLOW' ? executionForm.subflowId || null : undefined,
        }
        await idpApi.createIamAuthExecution(payload)
        toast.success('IAM auth execution created')
      }
      setExecutionForm(emptyExecutionForm())
      await loadExecutions(selectedFlowId)
      await loadPanel(selectedFlowId)
    } catch (error) {
      console.error('Failed to save IAM auth execution', error)
      toast.error('Failed to save IAM auth execution')
    } finally {
      setIsSavingExecution(false)
    }
  }

  const handleRealmBindingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedRealmId) return
    setIsSavingBindings(true)
    try {
      const payload: UpdateIamRealmAuthFlowBindingsRequest = {
        browser_flow_id: realmBindingForm.browserFlowId,
        direct_grant_flow_id: realmBindingForm.directGrantFlowId,
        account_console_flow_id: realmBindingForm.accountConsoleFlowId,
      }
      await idpApi.updateIamRealmAuthFlowBindings(selectedRealmId, payload)
      toast.success('Realm auth-flow bindings updated')
      await loadPanel(selectedFlowId)
    } catch (error) {
      console.error('Failed to update IAM realm bindings', error)
      toast.error('Failed to update IAM realm bindings')
    } finally {
      setIsSavingBindings(false)
    }
  }

  const handleClientBindingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!clientBindingForm.clientId) {
      toast.error('Select a client first')
      return
    }
    setIsSavingBindings(true)
    try {
      const payload: UpdateIamClientAuthFlowBindingsRequest = {
        browser_flow_id: clientBindingForm.browserFlowId || null,
        direct_grant_flow_id: clientBindingForm.directGrantFlowId || null,
        account_console_flow_id: clientBindingForm.accountConsoleFlowId || null,
      }
      await idpApi.updateIamClientAuthFlowBindings(clientBindingForm.clientId, payload)
      toast.success('Client auth-flow bindings updated')
      setSelectedClientBindingId('')
      await loadPanel(selectedFlowId)
    } catch (error) {
      console.error('Failed to update IAM client bindings', error)
      toast.error('Failed to update IAM client bindings')
    } finally {
      setIsSavingBindings(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Waypoints className="h-3.5 w-3.5" />
              Full IDP Phase D
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-white">Authentication Flows</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Replace hardcoded browser-login branching with explicit, realm-aware flow graphs. This panel governs top-level
              flows, reusable subflows, execution order, and realm/client flow bindings for the standalone IAM plane.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadPanel(selectedFlowId)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Flow State
          </button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Flows"
          value={String(flows.length)}
          detail="Top-level and subflow definitions in this realm"
          icon={<GitBranch className="h-5 w-5" />}
        />
        <MetricCard
          label="Executions"
          value={String(executions.length)}
          detail="Ordered steps in the selected flow"
          icon={<Waypoints className="h-5 w-5" />}
        />
        <MetricCard
          label="Realm Bindings"
          value={realmBinding ? '1' : '0'}
          detail="Browser, direct-grant, and account-console defaults"
          icon={<Shield className="h-5 w-5" />}
        />
        <MetricCard
          label="Client Overrides"
          value={String(clientBindings.length)}
          detail="Client-specific flow substitutions"
          icon={<RefreshCw className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Section
            title="Flow Registry"
            description="Select a flow to inspect its execution graph, or create a new top-level flow or subflow for this realm."
          >
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              {flows.map((flow) => (
                <button
                  key={flow.id}
                  type="button"
                  onClick={() => {
                    setSelectedFlowId(flow.id)
                    setFlowForm(buildFlowForm(flow))
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedFlowId === flow.id
                      ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{flow.name}</div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {flow.kind}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{flow.description || 'No description provided.'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    <span>{flow.top_level ? 'Top-Level' : 'Subflow'}</span>
                    <span>{flow.synthetic ? 'Built-In' : 'Custom'}</span>
                    <span>{flow.status}</span>
                  </div>
                </button>
              ))}
            </div>

            <form className="space-y-4" onSubmit={handleFlowSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Flow Name</span>
                  <input
                    value={flowForm.name}
                    onChange={(event) => setFlowForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Training Validation Browser Flow"
                    disabled={!canManage}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Flow Kind</span>
                  <select
                    value={flowForm.kind}
                    onChange={(event) => setFlowForm((current) => ({
                      ...current,
                      kind: event.target.value as IamAuthFlowKind,
                      topLevel: event.target.value === 'SUBFLOW' ? false : current.topLevel,
                    }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    disabled={!canManage || Boolean(flowForm.id)}
                  >
                    <option value="BROWSER">Browser</option>
                    <option value="DIRECT_GRANT">Direct Grant</option>
                    <option value="ACCOUNT_CONSOLE">Account Console</option>
                    <option value="SUBFLOW">Subflow</option>
                  </select>
                </label>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</span>
                <textarea
                  value={flowForm.description}
                  onChange={(event) => setFlowForm((current) => ({ ...current, description: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  placeholder="Describe the target login posture and expected orchestration."
                  disabled={!canManage}
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
                  <select
                    value={flowForm.status}
                    onChange={(event) => setFlowForm((current) => ({ ...current, status: event.target.value as 'ACTIVE' | 'ARCHIVED' }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    disabled={!canManage}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={flowForm.topLevel}
                    onChange={(event) => setFlowForm((current) => ({ ...current, topLevel: event.target.checked }))}
                    disabled={!canManage || flowForm.kind === 'SUBFLOW'}
                  />
                  Top-level flow
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canManage || isSavingFlow || !flowForm.name.trim()}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >
                  {flowForm.id ? 'Update Flow' : 'Create Flow'}
                </button>
                <button
                  type="button"
                  onClick={() => setFlowForm(emptyFlowForm())}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Reset
                </button>
              </div>
            </form>
          </Section>

          <Section
            title="Execution Graph"
            description="Each flow is an ordered execution graph. Define authenticators or subflows, then assign conditions and requirements."
          >
            {selectedFlow ? (
              <>
                <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  Editing flow: <span className="font-semibold text-slate-900 dark:text-white">{selectedFlow.name}</span>
                </div>
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <button
                      key={execution.id}
                      type="button"
                      onClick={() => setExecutionForm(buildExecutionForm(execution))}
                      className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{execution.display_name}</div>
                        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <span>{execution.execution_kind}</span>
                          <span>{execution.requirement}</span>
                          <span>P{execution.priority}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {execution.execution_kind === 'AUTHENTICATOR'
                          ? execution.authenticator_kind
                          : `Subflow: ${subflowOptions.find((flow) => flow.id === execution.subflow_id)?.name ?? execution.subflow_id}`}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Condition: {execution.condition_kind}
                      </div>
                    </button>
                  ))}
                </div>

                <form className="mt-5 space-y-4" onSubmit={handleExecutionSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Execution Name</span>
                      <input
                        value={executionForm.displayName}
                        onChange={(event) => setExecutionForm((current) => ({ ...current, displayName: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        placeholder="Required Actions"
                        disabled={!canManage}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Execution Type</span>
                      <select
                        value={executionForm.executionKind}
                        onChange={(event) => setExecutionForm((current) => ({
                          ...current,
                          executionKind: event.target.value as IamAuthExecutionKind,
                        }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        disabled={!canManage}
                      >
                        <option value="AUTHENTICATOR">Authenticator</option>
                        <option value="SUBFLOW">Subflow</option>
                      </select>
                    </label>
                  </div>

                  {executionForm.executionKind === 'AUTHENTICATOR' ? (
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Authenticator</span>
                      <select
                        value={executionForm.authenticatorKind}
                        onChange={(event) => setExecutionForm((current) => ({ ...current, authenticatorKind: event.target.value as IamAuthenticatorKind }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        disabled={!canManage}
                      >
                        <option value="USERNAME_PASSWORD">Username and Password</option>
                        <option value="PASSKEY_WEBAUTHN">Passkey (WebAuthn)</option>
                        <option value="REQUIRED_ACTIONS">Required Actions</option>
                        <option value="CONSENT">Consent</option>
                        <option value="TOTP_MFA">TOTP MFA</option>
                        <option value="ALLOW">Allow</option>
                      </select>
                    </label>
                  ) : (
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subflow</span>
                      <select
                        value={executionForm.subflowId}
                        onChange={(event) => setExecutionForm((current) => ({ ...current, subflowId: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        disabled={!canManage}
                      >
                        <option value="">Select subflow</option>
                        {subflowOptions.map((flow) => (
                          <option key={flow.id} value={flow.id}>{flow.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Requirement</span>
                      <select
                        value={executionForm.requirement}
                        onChange={(event) => setExecutionForm((current) => ({ ...current, requirement: event.target.value as IamAuthExecutionRequirement }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        disabled={!canManage}
                      >
                        <option value="REQUIRED">Required</option>
                        <option value="ALTERNATIVE">Alternative</option>
                        <option value="CONDITIONAL">Conditional</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Condition</span>
                      <select
                        value={executionForm.conditionKind}
                        onChange={(event) => setExecutionForm((current) => ({ ...current, conditionKind: event.target.value as IamFlowConditionKind }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        disabled={!canManage}
                      >
                        <option value="ALWAYS">Always</option>
                        <option value="USER_HAS_REQUIRED_ACTIONS">User Has Required Actions</option>
                        <option value="USER_HAS_PASSKEY_ENABLED">User Has Passkey Enabled</option>
                        <option value="CONSENT_REQUIRED">Consent Required</option>
                        <option value="USER_HAS_MFA_ENABLED">User Has MFA Enabled</option>
                        <option value="CLIENT_PROTOCOL_IS_OIDC">Client Protocol Is OIDC</option>
                        <option value="CLIENT_PROTOCOL_IS_SAML">Client Protocol Is SAML</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</span>
                      <input
                        value={executionForm.priority}
                        onChange={(event) => setExecutionForm((current) => ({ ...current, priority: event.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                        disabled={!canManage}
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={!canManage || isSavingExecution || !executionForm.displayName.trim()}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                    >
                      {executionForm.id ? 'Update Execution' : 'Create Execution'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExecutionForm(emptyExecutionForm())}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No flow selected for this realm yet.
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="Realm Bindings"
            description="Choose which top-level flow the realm uses for browser login, direct grants, and account-console interactions."
          >
            <form className="space-y-4" onSubmit={handleRealmBindingsSubmit}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Browser Flow</span>
                <select
                  value={realmBindingForm.browserFlowId}
                  onChange={(event) => setRealmBindingForm((current) => ({ ...current, browserFlowId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  {topLevelBrowserFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Direct Grant Flow</span>
                <select
                  value={realmBindingForm.directGrantFlowId}
                  onChange={(event) => setRealmBindingForm((current) => ({ ...current, directGrantFlowId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  {topLevelDirectGrantFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Console Flow</span>
                <select
                  value={realmBindingForm.accountConsoleFlowId}
                  onChange={(event) => setRealmBindingForm((current) => ({ ...current, accountConsoleFlowId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  {topLevelAccountFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={!canManage || isSavingBindings || !realmBinding}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                Update Realm Bindings
              </button>
            </form>
          </Section>

          <Section
            title="Client Overrides"
            description="Override the realm defaults for specific clients when a browser or grant flow needs distinct orchestration."
          >
            <div className="mb-4 space-y-2">
              {clientBindings.map((binding) => {
                const client = clients.find((candidate) => candidate.id === binding.client_id)
                return (
                  <button
                    key={binding.id}
                    type="button"
                    onClick={() => setSelectedClientBindingId(binding.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedClientBindingId === binding.id
                        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">{client?.name ?? binding.client_id}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Browser {binding.browser_flow_id ?? 'inherit'} · Direct {binding.direct_grant_flow_id ?? 'inherit'} · Account {binding.account_console_flow_id ?? 'inherit'}
                    </div>
                  </button>
                )
              })}
            </div>

            <form className="space-y-4" onSubmit={handleClientBindingsSubmit}>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Client</span>
                <select
                  value={clientBindingForm.clientId}
                  onChange={(event) => setClientBindingForm((current) => ({ ...current, clientId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name} ({client.client_id})</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Browser Flow Override</span>
                <select
                  value={clientBindingForm.browserFlowId}
                  onChange={(event) => setClientBindingForm((current) => ({ ...current, browserFlowId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  <option value="">Inherit realm default</option>
                  {topLevelBrowserFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Direct Grant Override</span>
                <select
                  value={clientBindingForm.directGrantFlowId}
                  onChange={(event) => setClientBindingForm((current) => ({ ...current, directGrantFlowId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  <option value="">Inherit realm default</option>
                  {topLevelDirectGrantFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Account Console Override</span>
                <select
                  value={clientBindingForm.accountConsoleFlowId}
                  onChange={(event) => setClientBindingForm((current) => ({ ...current, accountConsoleFlowId: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={!canManage}
                >
                  <option value="">Inherit realm default</option>
                  {topLevelAccountFlows.map((flow) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={!canManage || isSavingBindings || !clientBindingForm.clientId}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                >
                  Save Client Override
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientBindingId('')
                    setClientBindingForm({
                      clientId: '',
                      browserFlowId: '',
                      directGrantFlowId: '',
                      accountConsoleFlowId: '',
                    })
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Reset
                </button>
              </div>
            </form>
          </Section>
        </div>
      </div>
    </div>
  )
}
