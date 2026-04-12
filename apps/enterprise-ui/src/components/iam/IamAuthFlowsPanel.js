import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { GitBranch, RefreshCw, Shield, Waypoints } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function emptyFlowForm() {
    return {
        id: null,
        name: '',
        description: '',
        kind: 'BROWSER',
        status: 'ACTIVE',
        topLevel: true,
    };
}
function buildFlowForm(flow) {
    return {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        kind: flow.kind,
        status: flow.status,
        topLevel: flow.top_level,
    };
}
function emptyExecutionForm() {
    return {
        id: null,
        displayName: '',
        executionKind: 'AUTHENTICATOR',
        authenticatorKind: 'REQUIRED_ACTIONS',
        subflowId: '',
        requirement: 'REQUIRED',
        conditionKind: 'ALWAYS',
        priority: '10',
    };
}
function buildExecutionForm(execution) {
    return {
        id: execution.id,
        displayName: execution.display_name,
        executionKind: execution.execution_kind,
        authenticatorKind: execution.authenticator_kind ?? 'ALLOW',
        subflowId: execution.subflow_id ?? '',
        requirement: execution.requirement,
        conditionKind: execution.condition_kind,
        priority: String(execution.priority),
    };
}
function Section({ title, description, children, }) {
    return (_jsxs("section", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), children] }));
}
function MetricCard({ label, value, detail, icon, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: icon })] }), _jsx("div", { className: "mt-3 text-2xl font-semibold text-slate-900 dark:text-white", children: value }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
export function IamAuthFlowsPanel({ selectedRealmId, canManage, }) {
    const [flows, setFlows] = useState([]);
    const [executions, setExecutions] = useState([]);
    const [clients, setClients] = useState([]);
    const [realmBinding, setRealmBinding] = useState(null);
    const [clientBindings, setClientBindings] = useState([]);
    const [selectedFlowId, setSelectedFlowId] = useState('');
    const [selectedClientBindingId, setSelectedClientBindingId] = useState('');
    const [flowForm, setFlowForm] = useState(emptyFlowForm);
    const [executionForm, setExecutionForm] = useState(emptyExecutionForm);
    const [realmBindingForm, setRealmBindingForm] = useState({
        browserFlowId: '',
        directGrantFlowId: '',
        accountConsoleFlowId: '',
    });
    const [clientBindingForm, setClientBindingForm] = useState({
        clientId: '',
        browserFlowId: '',
        directGrantFlowId: '',
        accountConsoleFlowId: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingFlow, setIsSavingFlow] = useState(false);
    const [isSavingExecution, setIsSavingExecution] = useState(false);
    const [isSavingBindings, setIsSavingBindings] = useState(false);
    const loadPanel = async (preferredFlowId) => {
        if (!selectedRealmId) {
            setFlows([]);
            setExecutions([]);
            setClients([]);
            setRealmBinding(null);
            setClientBindings([]);
            return;
        }
        setIsLoading(true);
        try {
            const [flowResponse, bindingResponse, clientResponse] = await Promise.all([
                idpApi.listIamAuthFlows({ realmId: selectedRealmId }),
                idpApi.listIamAuthFlowBindings({ realmId: selectedRealmId }),
                idpApi.listIamClients({ realmId: selectedRealmId }),
            ]);
            const nextFlowId = preferredFlowId && flowResponse.flows.some((flow) => flow.id === preferredFlowId)
                ? preferredFlowId
                : flowResponse.flows[0]?.id ?? '';
            setFlows(flowResponse.flows);
            setSelectedFlowId(nextFlowId);
            setClients(clientResponse.clients);
            setRealmBinding(bindingResponse.realm_bindings[0] ?? null);
            setClientBindings(bindingResponse.client_bindings);
            setRealmBindingForm({
                browserFlowId: bindingResponse.realm_bindings[0]?.browser_flow_id ?? '',
                directGrantFlowId: bindingResponse.realm_bindings[0]?.direct_grant_flow_id ?? '',
                accountConsoleFlowId: bindingResponse.realm_bindings[0]?.account_console_flow_id ?? '',
            });
            if (!clientBindingForm.clientId && clientResponse.clients[0]) {
                setClientBindingForm((current) => ({ ...current, clientId: clientResponse.clients[0].id }));
            }
            if (nextFlowId) {
                const executionResponse = await idpApi.listIamAuthExecutions({ flowId: nextFlowId });
                setExecutions(executionResponse.executions);
            }
            else {
                setExecutions([]);
            }
        }
        catch (error) {
            console.error('Failed to load IAM auth flows panel', error);
            toast.error('Failed to load IAM auth flows');
        }
        finally {
            setIsLoading(false);
        }
    };
    const loadExecutions = async (flowId) => {
        if (!flowId) {
            setExecutions([]);
            return;
        }
        try {
            const response = await idpApi.listIamAuthExecutions({ flowId });
            setExecutions(response.executions);
        }
        catch (error) {
            console.error('Failed to load IAM auth executions', error);
            toast.error('Failed to load IAM auth executions');
        }
    };
    useEffect(() => {
        void loadPanel(selectedFlowId);
    }, [selectedRealmId]);
    useEffect(() => {
        void loadExecutions(selectedFlowId);
    }, [selectedFlowId]);
    const selectedFlow = useMemo(() => flows.find((flow) => flow.id === selectedFlowId) ?? null, [flows, selectedFlowId]);
    const selectedClientBinding = useMemo(() => clientBindings.find((binding) => binding.id === selectedClientBindingId) ?? null, [clientBindings, selectedClientBindingId]);
    const topLevelBrowserFlows = useMemo(() => flows.filter((flow) => flow.kind === 'BROWSER' && flow.top_level && flow.status === 'ACTIVE'), [flows]);
    const topLevelDirectGrantFlows = useMemo(() => flows.filter((flow) => flow.kind === 'DIRECT_GRANT' && flow.top_level && flow.status === 'ACTIVE'), [flows]);
    const topLevelAccountFlows = useMemo(() => flows.filter((flow) => flow.kind === 'ACCOUNT_CONSOLE' && flow.top_level && flow.status === 'ACTIVE'), [flows]);
    const subflowOptions = useMemo(() => flows.filter((flow) => flow.kind === 'SUBFLOW' && flow.status === 'ACTIVE'), [flows]);
    useEffect(() => {
        if (selectedFlow) {
            setFlowForm(buildFlowForm(selectedFlow));
            setExecutionForm(emptyExecutionForm());
        }
    }, [selectedFlowId]);
    useEffect(() => {
        if (selectedClientBinding) {
            setClientBindingForm({
                clientId: selectedClientBinding.client_id,
                browserFlowId: selectedClientBinding.browser_flow_id ?? '',
                directGrantFlowId: selectedClientBinding.direct_grant_flow_id ?? '',
                accountConsoleFlowId: selectedClientBinding.account_console_flow_id ?? '',
            });
        }
    }, [selectedClientBindingId]);
    const handleFlowSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setIsSavingFlow(true);
        try {
            if (flowForm.id) {
                const payload = {
                    name: flowForm.name.trim(),
                    description: flowForm.description.trim(),
                    status: flowForm.status,
                };
                const updated = await idpApi.updateIamAuthFlow(flowForm.id, payload);
                toast.success('IAM auth flow updated');
                await loadPanel(updated.id);
            }
            else {
                const payload = {
                    realm_id: selectedRealmId,
                    name: flowForm.name.trim(),
                    description: flowForm.description.trim(),
                    kind: flowForm.kind,
                    status: flowForm.status,
                    top_level: flowForm.kind === 'SUBFLOW' ? false : flowForm.topLevel,
                };
                const created = await idpApi.createIamAuthFlow(payload);
                toast.success('IAM auth flow created');
                setFlowForm(emptyFlowForm());
                await loadPanel(created.id);
            }
        }
        catch (error) {
            console.error('Failed to save IAM auth flow', error);
            toast.error('Failed to save IAM auth flow');
        }
        finally {
            setIsSavingFlow(false);
        }
    };
    const handleExecutionSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId || !selectedFlowId)
            return;
        setIsSavingExecution(true);
        try {
            if (executionForm.id) {
                const payload = {
                    display_name: executionForm.displayName.trim(),
                    requirement: executionForm.requirement,
                    condition_kind: executionForm.conditionKind,
                    priority: Number.parseInt(executionForm.priority, 10),
                    authenticator_kind: executionForm.executionKind === 'AUTHENTICATOR' ? executionForm.authenticatorKind : undefined,
                    subflow_id: executionForm.executionKind === 'SUBFLOW' ? executionForm.subflowId || null : undefined,
                };
                await idpApi.updateIamAuthExecution(executionForm.id, payload);
                toast.success('IAM auth execution updated');
            }
            else {
                const payload = {
                    realm_id: selectedRealmId,
                    flow_id: selectedFlowId,
                    display_name: executionForm.displayName.trim(),
                    execution_kind: executionForm.executionKind,
                    requirement: executionForm.requirement,
                    condition_kind: executionForm.conditionKind,
                    priority: Number.parseInt(executionForm.priority, 10),
                    authenticator_kind: executionForm.executionKind === 'AUTHENTICATOR' ? executionForm.authenticatorKind : undefined,
                    subflow_id: executionForm.executionKind === 'SUBFLOW' ? executionForm.subflowId || null : undefined,
                };
                await idpApi.createIamAuthExecution(payload);
                toast.success('IAM auth execution created');
            }
            setExecutionForm(emptyExecutionForm());
            await loadExecutions(selectedFlowId);
            await loadPanel(selectedFlowId);
        }
        catch (error) {
            console.error('Failed to save IAM auth execution', error);
            toast.error('Failed to save IAM auth execution');
        }
        finally {
            setIsSavingExecution(false);
        }
    };
    const handleRealmBindingsSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setIsSavingBindings(true);
        try {
            const payload = {
                browser_flow_id: realmBindingForm.browserFlowId,
                direct_grant_flow_id: realmBindingForm.directGrantFlowId,
                account_console_flow_id: realmBindingForm.accountConsoleFlowId,
            };
            await idpApi.updateIamRealmAuthFlowBindings(selectedRealmId, payload);
            toast.success('Realm auth-flow bindings updated');
            await loadPanel(selectedFlowId);
        }
        catch (error) {
            console.error('Failed to update IAM realm bindings', error);
            toast.error('Failed to update IAM realm bindings');
        }
        finally {
            setIsSavingBindings(false);
        }
    };
    const handleClientBindingsSubmit = async (event) => {
        event.preventDefault();
        if (!clientBindingForm.clientId) {
            toast.error('Select a client first');
            return;
        }
        setIsSavingBindings(true);
        try {
            const payload = {
                browser_flow_id: clientBindingForm.browserFlowId || null,
                direct_grant_flow_id: clientBindingForm.directGrantFlowId || null,
                account_console_flow_id: clientBindingForm.accountConsoleFlowId || null,
            };
            await idpApi.updateIamClientAuthFlowBindings(clientBindingForm.clientId, payload);
            toast.success('Client auth-flow bindings updated');
            setSelectedClientBindingId('');
            await loadPanel(selectedFlowId);
        }
        catch (error) {
            console.error('Failed to update IAM client bindings', error);
            toast.error('Failed to update IAM client bindings');
        }
        finally {
            setIsSavingBindings(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("section", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: _jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200", children: [_jsx(Waypoints, { className: "h-3.5 w-3.5" }), "Full IDP Phase D"] }), _jsx("h2", { className: "mt-3 text-xl font-semibold text-slate-900 dark:text-white", children: "Authentication Flows" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400", children: "Replace hardcoded browser-login branching with explicit, realm-aware flow graphs. This panel governs top-level flows, reusable subflows, execution order, and realm/client flow bindings for the standalone IAM plane." })] }), _jsxs("button", { type: "button", onClick: () => void loadPanel(selectedFlowId), className: "inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500", disabled: isLoading, children: [_jsx(RefreshCw, { className: `h-4 w-4 ${isLoading ? 'animate-spin' : ''}` }), "Refresh Flow State"] })] }) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(MetricCard, { label: "Flows", value: String(flows.length), detail: "Top-level and subflow definitions in this realm", icon: _jsx(GitBranch, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "Executions", value: String(executions.length), detail: "Ordered steps in the selected flow", icon: _jsx(Waypoints, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "Realm Bindings", value: realmBinding ? '1' : '0', detail: "Browser, direct-grant, and account-console defaults", icon: _jsx(Shield, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "Client Overrides", value: String(clientBindings.length), detail: "Client-specific flow substitutions", icon: _jsx(RefreshCw, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("div", { className: "space-y-6", children: [_jsxs(Section, { title: "Flow Registry", description: "Select a flow to inspect its execution graph, or create a new top-level flow or subflow for this realm.", children: [_jsx("div", { className: "mb-4 grid gap-3 md:grid-cols-2", children: flows.map((flow) => (_jsxs("button", { type: "button", onClick: () => {
                                                setSelectedFlowId(flow.id);
                                                setFlowForm(buildFlowForm(flow));
                                            }, className: `rounded-2xl border p-4 text-left transition ${selectedFlowId === flow.id
                                                ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                                                : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'}`, children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: flow.name }), _jsx("span", { className: "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300", children: flow.kind })] }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: flow.description || 'No description provided.' }), _jsxs("div", { className: "mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500", children: [_jsx("span", { children: flow.top_level ? 'Top-Level' : 'Subflow' }), _jsx("span", { children: flow.synthetic ? 'Built-In' : 'Custom' }), _jsx("span", { children: flow.status })] })] }, flow.id))) }), _jsxs("form", { className: "space-y-4", onSubmit: handleFlowSubmit, children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Flow Name" }), _jsx("input", { value: flowForm.name, onChange: (event) => setFlowForm((current) => ({ ...current, name: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Training Validation Browser Flow", disabled: !canManage })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Flow Kind" }), _jsxs("select", { value: flowForm.kind, onChange: (event) => setFlowForm((current) => ({
                                                                    ...current,
                                                                    kind: event.target.value,
                                                                    topLevel: event.target.value === 'SUBFLOW' ? false : current.topLevel,
                                                                })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage || Boolean(flowForm.id), children: [_jsx("option", { value: "BROWSER", children: "Browser" }), _jsx("option", { value: "DIRECT_GRANT", children: "Direct Grant" }), _jsx("option", { value: "ACCOUNT_CONSOLE", children: "Account Console" }), _jsx("option", { value: "SUBFLOW", children: "Subflow" })] })] })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Description" }), _jsx("textarea", { value: flowForm.description, onChange: (event) => setFlowForm((current) => ({ ...current, description: event.target.value })), rows: 3, className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Describe the target login posture and expected orchestration.", disabled: !canManage })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Status" }), _jsxs("select", { value: flowForm.status, onChange: (event) => setFlowForm((current) => ({ ...current, status: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "ARCHIVED", children: "Archived" })] })] }), _jsxs("label", { className: "flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300", children: [_jsx("input", { type: "checkbox", checked: flowForm.topLevel, onChange: (event) => setFlowForm((current) => ({ ...current, topLevel: event.target.checked })), disabled: !canManage || flowForm.kind === 'SUBFLOW' }), "Top-level flow"] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSavingFlow || !flowForm.name.trim(), className: "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900", children: flowForm.id ? 'Update Flow' : 'Create Flow' }), _jsx("button", { type: "button", onClick: () => setFlowForm(emptyFlowForm()), className: "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300", children: "Reset" })] })] })] }), _jsx(Section, { title: "Execution Graph", description: "Each flow is an ordered execution graph. Define authenticators or subflows, then assign conditions and requirements.", children: selectedFlow ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 text-sm text-slate-600 dark:text-slate-400", children: ["Editing flow: ", _jsx("span", { className: "font-semibold text-slate-900 dark:text-white", children: selectedFlow.name })] }), _jsx("div", { className: "space-y-3", children: executions.map((execution) => (_jsxs("button", { type: "button", onClick: () => setExecutionForm(buildExecutionForm(execution)), className: "w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: execution.display_name }), _jsxs("div", { className: "flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500", children: [_jsx("span", { children: execution.execution_kind }), _jsx("span", { children: execution.requirement }), _jsxs("span", { children: ["P", execution.priority] })] })] }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: execution.execution_kind === 'AUTHENTICATOR'
                                                            ? execution.authenticator_kind
                                                            : `Subflow: ${subflowOptions.find((flow) => flow.id === execution.subflow_id)?.name ?? execution.subflow_id}` }), _jsxs("div", { className: "mt-1 text-xs uppercase tracking-[0.18em] text-slate-500", children: ["Condition: ", execution.condition_kind] })] }, execution.id))) }), _jsxs("form", { className: "mt-5 space-y-4", onSubmit: handleExecutionSubmit, children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Execution Name" }), _jsx("input", { value: executionForm.displayName, onChange: (event) => setExecutionForm((current) => ({ ...current, displayName: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", placeholder: "Required Actions", disabled: !canManage })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Execution Type" }), _jsxs("select", { value: executionForm.executionKind, onChange: (event) => setExecutionForm((current) => ({
                                                                        ...current,
                                                                        executionKind: event.target.value,
                                                                    })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "AUTHENTICATOR", children: "Authenticator" }), _jsx("option", { value: "SUBFLOW", children: "Subflow" })] })] })] }), executionForm.executionKind === 'AUTHENTICATOR' ? (_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Authenticator" }), _jsxs("select", { value: executionForm.authenticatorKind, onChange: (event) => setExecutionForm((current) => ({ ...current, authenticatorKind: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "USERNAME_PASSWORD", children: "Username and Password" }), _jsx("option", { value: "PASSKEY_WEBAUTHN", children: "Passkey (WebAuthn)" }), _jsx("option", { value: "REQUIRED_ACTIONS", children: "Required Actions" }), _jsx("option", { value: "CONSENT", children: "Consent" }), _jsx("option", { value: "TOTP_MFA", children: "TOTP MFA" }), _jsx("option", { value: "ALLOW", children: "Allow" })] })] })) : (_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Subflow" }), _jsxs("select", { value: executionForm.subflowId, onChange: (event) => setExecutionForm((current) => ({ ...current, subflowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "", children: "Select subflow" }), subflowOptions.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id)))] })] })), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Requirement" }), _jsxs("select", { value: executionForm.requirement, onChange: (event) => setExecutionForm((current) => ({ ...current, requirement: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "REQUIRED", children: "Required" }), _jsx("option", { value: "ALTERNATIVE", children: "Alternative" }), _jsx("option", { value: "CONDITIONAL", children: "Conditional" }), _jsx("option", { value: "DISABLED", children: "Disabled" })] })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Condition" }), _jsxs("select", { value: executionForm.conditionKind, onChange: (event) => setExecutionForm((current) => ({ ...current, conditionKind: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "ALWAYS", children: "Always" }), _jsx("option", { value: "USER_HAS_REQUIRED_ACTIONS", children: "User Has Required Actions" }), _jsx("option", { value: "USER_HAS_PASSKEY_ENABLED", children: "User Has Passkey Enabled" }), _jsx("option", { value: "CONSENT_REQUIRED", children: "Consent Required" }), _jsx("option", { value: "USER_HAS_MFA_ENABLED", children: "User Has MFA Enabled" }), _jsx("option", { value: "CLIENT_PROTOCOL_IS_OIDC", children: "Client Protocol Is OIDC" }), _jsx("option", { value: "CLIENT_PROTOCOL_IS_SAML", children: "Client Protocol Is SAML" })] })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Priority" }), _jsx("input", { value: executionForm.priority, onChange: (event) => setExecutionForm((current) => ({ ...current, priority: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSavingExecution || !executionForm.displayName.trim(), className: "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900", children: executionForm.id ? 'Update Execution' : 'Create Execution' }), _jsx("button", { type: "button", onClick: () => setExecutionForm(emptyExecutionForm()), className: "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300", children: "Reset" })] })] })] })) : (_jsx("div", { className: "rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No flow selected for this realm yet." })) })] }), _jsxs("div", { className: "space-y-6", children: [_jsx(Section, { title: "Realm Bindings", description: "Choose which top-level flow the realm uses for browser login, direct grants, and account-console interactions.", children: _jsxs("form", { className: "space-y-4", onSubmit: handleRealmBindingsSubmit, children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Browser Flow" }), _jsx("select", { value: realmBindingForm.browserFlowId, onChange: (event) => setRealmBindingForm((current) => ({ ...current, browserFlowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: topLevelBrowserFlows.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id))) })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Direct Grant Flow" }), _jsx("select", { value: realmBindingForm.directGrantFlowId, onChange: (event) => setRealmBindingForm((current) => ({ ...current, directGrantFlowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: topLevelDirectGrantFlows.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id))) })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Account Console Flow" }), _jsx("select", { value: realmBindingForm.accountConsoleFlowId, onChange: (event) => setRealmBindingForm((current) => ({ ...current, accountConsoleFlowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: topLevelAccountFlows.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id))) })] }), _jsx("button", { type: "submit", disabled: !canManage || isSavingBindings || !realmBinding, className: "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900", children: "Update Realm Bindings" })] }) }), _jsxs(Section, { title: "Client Overrides", description: "Override the realm defaults for specific clients when a browser or grant flow needs distinct orchestration.", children: [_jsx("div", { className: "mb-4 space-y-2", children: clientBindings.map((binding) => {
                                            const client = clients.find((candidate) => candidate.id === binding.client_id);
                                            return (_jsxs("button", { type: "button", onClick: () => setSelectedClientBindingId(binding.id), className: `w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${selectedClientBindingId === binding.id
                                                    ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
                                                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'}`, children: [_jsx("div", { className: "font-semibold text-slate-900 dark:text-white", children: client?.name ?? binding.client_id }), _jsxs("div", { className: "mt-1 text-xs uppercase tracking-[0.18em] text-slate-500", children: ["Browser ", binding.browser_flow_id ?? 'inherit', " \u00B7 Direct ", binding.direct_grant_flow_id ?? 'inherit', " \u00B7 Account ", binding.account_console_flow_id ?? 'inherit'] })] }, binding.id));
                                        }) }), _jsxs("form", { className: "space-y-4", onSubmit: handleClientBindingsSubmit, children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Client" }), _jsxs("select", { value: clientBindingForm.clientId, onChange: (event) => setClientBindingForm((current) => ({ ...current, clientId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "", children: "Select client" }), clients.map((client) => (_jsxs("option", { value: client.id, children: [client.name, " (", client.client_id, ")"] }, client.id)))] })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Browser Flow Override" }), _jsxs("select", { value: clientBindingForm.browserFlowId, onChange: (event) => setClientBindingForm((current) => ({ ...current, browserFlowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "", children: "Inherit realm default" }), topLevelBrowserFlows.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id)))] })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Direct Grant Override" }), _jsxs("select", { value: clientBindingForm.directGrantFlowId, onChange: (event) => setClientBindingForm((current) => ({ ...current, directGrantFlowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "", children: "Inherit realm default" }), topLevelDirectGrantFlows.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id)))] })] }), _jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Account Console Override" }), _jsxs("select", { value: clientBindingForm.accountConsoleFlowId, onChange: (event) => setClientBindingForm((current) => ({ ...current, accountConsoleFlowId: event.target.value })), className: "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", disabled: !canManage, children: [_jsx("option", { value: "", children: "Inherit realm default" }), topLevelAccountFlows.map((flow) => (_jsx("option", { value: flow.id, children: flow.name }, flow.id)))] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSavingBindings || !clientBindingForm.clientId, className: "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900", children: "Save Client Override" }), _jsx("button", { type: "button", onClick: () => {
                                                            setSelectedClientBindingId('');
                                                            setClientBindingForm({
                                                                clientId: '',
                                                                browserFlowId: '',
                                                                directGrantFlowId: '',
                                                                accountConsoleFlowId: '',
                                                            });
                                                        }, className: "rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300", children: "Reset" })] })] })] })] })] })] }));
}
