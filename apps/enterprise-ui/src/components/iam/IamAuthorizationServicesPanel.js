import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function emptyResourceServerForm() {
    return {
        id: null,
        clientId: '',
        name: '',
        summary: '',
        status: 'ACTIVE',
        enforcementMode: 'ENFORCING',
        decisionStrategy: 'AFFIRMATIVE',
    };
}
function emptyScopeForm(resourceServerId = '') {
    return {
        id: null,
        resourceServerId,
        name: '',
        summary: '',
        status: 'ACTIVE',
    };
}
function emptyResourceForm(resourceServerId = '') {
    return {
        id: null,
        resourceServerId,
        name: '',
        summary: '',
        uri: '',
        typeLabel: '',
        status: 'ACTIVE',
        ownerUserIds: [],
        scopeIds: [],
    };
}
function emptyPolicyForm(resourceServerId = '') {
    return {
        id: null,
        resourceServerId,
        name: '',
        summary: '',
        kind: 'ROLE',
        status: 'ACTIVE',
        principalUserIds: [],
        principalGroupIds: [],
        principalRoleIds: [],
        principalClientIds: [],
    };
}
function emptyPermissionForm(resourceServerId = '') {
    return {
        id: null,
        resourceServerId,
        name: '',
        summary: '',
        status: 'ACTIVE',
        resourceIds: [],
        scopeIds: [],
        policyIds: [],
        decisionStrategy: 'AFFIRMATIVE',
    };
}
function emptyEvaluationForm(resourceServerId = '') {
    return {
        resourceServerId,
        subjectKind: 'USER',
        subjectId: '',
        requesterClientId: '',
        resourceId: '',
        requestedScopeNames: [],
    };
}
function buildResourceServerForm(record) {
    return {
        id: record.id,
        clientId: record.client_id,
        name: record.name,
        summary: record.summary,
        status: record.status,
        enforcementMode: record.enforcement_mode,
        decisionStrategy: record.decision_strategy,
    };
}
function buildScopeForm(record) {
    return {
        id: record.id,
        resourceServerId: record.resource_server_id,
        name: record.name,
        summary: record.summary,
        status: record.status,
    };
}
function buildResourceForm(record) {
    return {
        id: record.id,
        resourceServerId: record.resource_server_id,
        name: record.name,
        summary: record.summary,
        uri: record.uri ?? '',
        typeLabel: record.type_label ?? '',
        status: record.status,
        ownerUserIds: record.owner_user_ids,
        scopeIds: record.scope_ids,
    };
}
function buildPolicyForm(record) {
    return {
        id: record.id,
        resourceServerId: record.resource_server_id,
        name: record.name,
        summary: record.summary,
        kind: record.kind,
        status: record.status,
        principalUserIds: record.principal_user_ids,
        principalGroupIds: record.principal_group_ids,
        principalRoleIds: record.principal_role_ids,
        principalClientIds: record.principal_client_ids,
    };
}
function buildPermissionForm(record) {
    return {
        id: record.id,
        resourceServerId: record.resource_server_id,
        name: record.name,
        summary: record.summary,
        status: record.status,
        resourceIds: record.resource_ids,
        scopeIds: record.scope_ids,
        policyIds: record.policy_ids,
        decisionStrategy: record.decision_strategy,
    };
}
function readSelectedValues(event) {
    return Array.from(event.target.selectedOptions).map((option) => option.value);
}
function AuthorizationMetric({ label, value, detail }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "mt-3 text-2xl font-semibold text-slate-900 dark:text-white", children: value }), _jsx("div", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: detail })] }));
}
function SectionCard({ title, description, children, }) {
    return (_jsxs("section", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-5", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), children] }));
}
export function IamAuthorizationServicesPanel({ selectedRealmId, canManage, users, groups, roles }) {
    const [clients, setClients] = useState([]);
    const [resourceServers, setResourceServers] = useState([]);
    const [scopes, setScopes] = useState([]);
    const [resources, setResources] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [permissionTickets, setPermissionTickets] = useState([]);
    const [selectedResourceServerId, setSelectedResourceServerId] = useState('');
    const [resourceServerForm, setResourceServerForm] = useState(emptyResourceServerForm);
    const [scopeForm, setScopeForm] = useState(emptyScopeForm());
    const [resourceForm, setResourceForm] = useState(emptyResourceForm());
    const [policyForm, setPolicyForm] = useState(emptyPolicyForm());
    const [permissionForm, setPermissionForm] = useState(emptyPermissionForm());
    const [evaluationForm, setEvaluationForm] = useState(emptyEvaluationForm());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(null);
    const [evaluationResult, setEvaluationResult] = useState(null);
    const realmUsers = useMemo(() => users.filter((user) => user.realm_id === selectedRealmId), [users, selectedRealmId]);
    const realmGroups = useMemo(() => groups.filter((group) => group.realm_id === selectedRealmId), [groups, selectedRealmId]);
    const realmRoles = useMemo(() => roles.filter((role) => role.realm_id === selectedRealmId), [roles, selectedRealmId]);
    const filteredScopes = useMemo(() => scopes.filter((scope) => !selectedResourceServerId || scope.resource_server_id === selectedResourceServerId), [scopes, selectedResourceServerId]);
    const filteredResources = useMemo(() => resources.filter((resource) => !selectedResourceServerId || resource.resource_server_id === selectedResourceServerId), [resources, selectedResourceServerId]);
    const filteredPolicies = useMemo(() => policies.filter((policy) => !selectedResourceServerId || policy.resource_server_id === selectedResourceServerId), [policies, selectedResourceServerId]);
    const filteredPermissions = useMemo(() => permissions.filter((permission) => !selectedResourceServerId || permission.resource_server_id === selectedResourceServerId), [permissions, selectedResourceServerId]);
    const filteredEvaluations = useMemo(() => evaluations.filter((evaluation) => !selectedResourceServerId || evaluation.resource_server_id === selectedResourceServerId), [evaluations, selectedResourceServerId]);
    const filteredPermissionTickets = useMemo(() => permissionTickets.filter((ticket) => !selectedResourceServerId || ticket.resource_server_id === selectedResourceServerId), [permissionTickets, selectedResourceServerId]);
    const loadPanel = async () => {
        if (!selectedRealmId) {
            setClients([]);
            setResourceServers([]);
            setScopes([]);
            setResources([]);
            setPolicies([]);
            setPermissions([]);
            setEvaluations([]);
            setPermissionTickets([]);
            setSelectedResourceServerId('');
            setEvaluationResult(null);
            return;
        }
        setIsLoading(true);
        try {
            const [clientsResponse, resourceServersResponse, scopesResponse, resourcesResponse, policiesResponse, permissionsResponse, evaluationsResponse, permissionTicketsResponse,] = await Promise.all([
                idpApi.listIamClients({ realmId: selectedRealmId }),
                idpApi.listIamResourceServers({ realmId: selectedRealmId }),
                idpApi.listIamProtectedScopes({ realmId: selectedRealmId }),
                idpApi.listIamProtectedResources({ realmId: selectedRealmId }),
                idpApi.listIamAuthorizationPolicies({ realmId: selectedRealmId }),
                idpApi.listIamAuthorizationPermissions({ realmId: selectedRealmId }),
                idpApi.listIamAuthorizationEvaluations({ realmId: selectedRealmId }),
                idpApi.listIamPermissionTickets({ realmId: selectedRealmId }),
            ]);
            setClients(clientsResponse.clients);
            setResourceServers(resourceServersResponse.resource_servers);
            setScopes(scopesResponse.scopes);
            setResources(resourcesResponse.resources);
            setPolicies(policiesResponse.policies);
            setPermissions(permissionsResponse.permissions);
            setEvaluations(evaluationsResponse.evaluations);
            setPermissionTickets(permissionTicketsResponse.permission_tickets);
            setSelectedResourceServerId((current) => {
                if (current && resourceServersResponse.resource_servers.some((record) => record.id === current)) {
                    return current;
                }
                return resourceServersResponse.resource_servers[0]?.id ?? '';
            });
        }
        catch (error) {
            console.error('Failed to load IAM authorization services panel', error);
            toast.error('Unable to load IAM authorization services data.');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadPanel();
    }, [selectedRealmId]);
    useEffect(() => {
        if (!resourceServerForm.id && !resourceServerForm.clientId && clients[0]) {
            setResourceServerForm((current) => ({ ...current, clientId: clients[0]?.client_id ?? '' }));
        }
    }, [clients, resourceServerForm.clientId, resourceServerForm.id]);
    useEffect(() => {
        if (!scopeForm.id) {
            setScopeForm((current) => ({ ...current, resourceServerId: current.resourceServerId || selectedResourceServerId }));
        }
        if (!resourceForm.id) {
            setResourceForm((current) => ({ ...current, resourceServerId: current.resourceServerId || selectedResourceServerId }));
        }
        if (!policyForm.id) {
            setPolicyForm((current) => ({ ...current, resourceServerId: current.resourceServerId || selectedResourceServerId }));
        }
        if (!permissionForm.id) {
            setPermissionForm((current) => ({ ...current, resourceServerId: current.resourceServerId || selectedResourceServerId }));
        }
        setEvaluationForm((current) => ({
            ...current,
            resourceServerId: current.resourceServerId || selectedResourceServerId,
        }));
    }, [selectedResourceServerId, scopeForm.id, resourceForm.id, policyForm.id, permissionForm.id]);
    const saveResourceServer = async () => {
        if (!selectedRealmId || !resourceServerForm.clientId || !resourceServerForm.name.trim() || !resourceServerForm.summary.trim()) {
            toast.error('Client, name, and summary are required for a resource server.');
            return;
        }
        setIsSaving('resource-server');
        try {
            if (resourceServerForm.id) {
                const request = {
                    name: resourceServerForm.name,
                    summary: resourceServerForm.summary,
                    status: resourceServerForm.status,
                    enforcement_mode: resourceServerForm.enforcementMode,
                    decision_strategy: resourceServerForm.decisionStrategy,
                };
                await idpApi.updateIamResourceServer(resourceServerForm.id, request);
                toast.success('Resource server updated.');
            }
            else {
                const request = {
                    realm_id: selectedRealmId,
                    client_id: resourceServerForm.clientId,
                    name: resourceServerForm.name,
                    summary: resourceServerForm.summary,
                    status: resourceServerForm.status,
                    enforcement_mode: resourceServerForm.enforcementMode,
                    decision_strategy: resourceServerForm.decisionStrategy,
                };
                await idpApi.createIamResourceServer(request);
                toast.success('Resource server created.');
            }
            setResourceServerForm(emptyResourceServerForm());
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM resource server', error);
            toast.error('Unable to save the resource server.');
        }
        finally {
            setIsSaving(null);
        }
    };
    const saveScope = async () => {
        if (!selectedRealmId || !scopeForm.resourceServerId || !scopeForm.name.trim() || !scopeForm.summary.trim()) {
            toast.error('Resource server, name, and summary are required for a protected scope.');
            return;
        }
        setIsSaving('scope');
        try {
            if (scopeForm.id) {
                const request = {
                    name: scopeForm.name,
                    summary: scopeForm.summary,
                    status: scopeForm.status,
                };
                await idpApi.updateIamProtectedScope(scopeForm.id, request);
                toast.success('Protected scope updated.');
            }
            else {
                const request = {
                    realm_id: selectedRealmId,
                    resource_server_id: scopeForm.resourceServerId,
                    name: scopeForm.name,
                    summary: scopeForm.summary,
                    status: scopeForm.status,
                };
                await idpApi.createIamProtectedScope(request);
                toast.success('Protected scope created.');
            }
            setScopeForm(emptyScopeForm(selectedResourceServerId));
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM protected scope', error);
            toast.error('Unable to save the protected scope.');
        }
        finally {
            setIsSaving(null);
        }
    };
    const saveResource = async () => {
        if (!selectedRealmId || !resourceForm.resourceServerId || !resourceForm.name.trim() || !resourceForm.summary.trim()) {
            toast.error('Resource server, name, and summary are required for a protected resource.');
            return;
        }
        setIsSaving('resource');
        try {
            if (resourceForm.id) {
                const request = {
                    name: resourceForm.name,
                    summary: resourceForm.summary,
                    uri: resourceForm.uri || null,
                    type_label: resourceForm.typeLabel || null,
                    status: resourceForm.status,
                    owner_user_ids: resourceForm.ownerUserIds,
                    scope_ids: resourceForm.scopeIds,
                };
                await idpApi.updateIamProtectedResource(resourceForm.id, request);
                toast.success('Protected resource updated.');
            }
            else {
                const request = {
                    realm_id: selectedRealmId,
                    resource_server_id: resourceForm.resourceServerId,
                    name: resourceForm.name,
                    summary: resourceForm.summary,
                    uri: resourceForm.uri || null,
                    type_label: resourceForm.typeLabel || null,
                    status: resourceForm.status,
                    owner_user_ids: resourceForm.ownerUserIds,
                    scope_ids: resourceForm.scopeIds,
                };
                await idpApi.createIamProtectedResource(request);
                toast.success('Protected resource created.');
            }
            setResourceForm(emptyResourceForm(selectedResourceServerId));
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM protected resource', error);
            toast.error('Unable to save the protected resource.');
        }
        finally {
            setIsSaving(null);
        }
    };
    const savePolicy = async () => {
        if (!selectedRealmId || !policyForm.resourceServerId || !policyForm.name.trim() || !policyForm.summary.trim()) {
            toast.error('Resource server, name, and summary are required for an authorization policy.');
            return;
        }
        setIsSaving('policy');
        try {
            if (policyForm.id) {
                const request = {
                    name: policyForm.name,
                    summary: policyForm.summary,
                    status: policyForm.status,
                    principal_user_ids: policyForm.principalUserIds,
                    principal_group_ids: policyForm.principalGroupIds,
                    principal_role_ids: policyForm.principalRoleIds,
                    principal_client_ids: policyForm.principalClientIds,
                };
                await idpApi.updateIamAuthorizationPolicy(policyForm.id, request);
                toast.success('Authorization policy updated.');
            }
            else {
                const request = {
                    realm_id: selectedRealmId,
                    resource_server_id: policyForm.resourceServerId,
                    name: policyForm.name,
                    summary: policyForm.summary,
                    kind: policyForm.kind,
                    status: policyForm.status,
                    principal_user_ids: policyForm.principalUserIds,
                    principal_group_ids: policyForm.principalGroupIds,
                    principal_role_ids: policyForm.principalRoleIds,
                    principal_client_ids: policyForm.principalClientIds,
                };
                await idpApi.createIamAuthorizationPolicy(request);
                toast.success('Authorization policy created.');
            }
            setPolicyForm(emptyPolicyForm(selectedResourceServerId));
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM authorization policy', error);
            toast.error('Unable to save the authorization policy.');
        }
        finally {
            setIsSaving(null);
        }
    };
    const savePermission = async () => {
        if (!selectedRealmId || !permissionForm.resourceServerId || !permissionForm.name.trim() || !permissionForm.summary.trim() || permissionForm.resourceIds.length === 0 || permissionForm.scopeIds.length === 0 || permissionForm.policyIds.length === 0) {
            toast.error('Resource server, name, summary, resources, scopes, and policies are required for an authorization permission.');
            return;
        }
        setIsSaving('permission');
        try {
            if (permissionForm.id) {
                const request = {
                    name: permissionForm.name,
                    summary: permissionForm.summary,
                    status: permissionForm.status,
                    resource_ids: permissionForm.resourceIds,
                    scope_ids: permissionForm.scopeIds,
                    policy_ids: permissionForm.policyIds,
                    decision_strategy: permissionForm.decisionStrategy,
                };
                await idpApi.updateIamAuthorizationPermission(permissionForm.id, request);
                toast.success('Authorization permission updated.');
            }
            else {
                const request = {
                    realm_id: selectedRealmId,
                    resource_server_id: permissionForm.resourceServerId,
                    name: permissionForm.name,
                    summary: permissionForm.summary,
                    status: permissionForm.status,
                    resource_ids: permissionForm.resourceIds,
                    scope_ids: permissionForm.scopeIds,
                    policy_ids: permissionForm.policyIds,
                    decision_strategy: permissionForm.decisionStrategy,
                };
                await idpApi.createIamAuthorizationPermission(request);
                toast.success('Authorization permission created.');
            }
            setPermissionForm(emptyPermissionForm(selectedResourceServerId));
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM authorization permission', error);
            toast.error('Unable to save the authorization permission.');
        }
        finally {
            setIsSaving(null);
        }
    };
    const runEvaluation = async () => {
        if (!selectedRealmId || !evaluationForm.resourceServerId || !evaluationForm.subjectId.trim() || !evaluationForm.resourceId || evaluationForm.requestedScopeNames.length === 0) {
            toast.error('Resource server, subject, resource, and scopes are required for evaluation.');
            return;
        }
        setIsSaving('evaluation');
        try {
            const request = {
                realm_id: selectedRealmId,
                resource_server_id: evaluationForm.resourceServerId,
                subject_kind: evaluationForm.subjectKind,
                subject_id: evaluationForm.subjectId.trim(),
                requester_client_id: evaluationForm.requesterClientId.trim() || null,
                resource_id: evaluationForm.resourceId,
                requested_scope_names: evaluationForm.requestedScopeNames,
            };
            const response = await idpApi.evaluateIamAuthorization(request);
            setEvaluationResult(response.evaluation);
            toast.success(response.allowed ? 'Authorization granted.' : 'Authorization denied.');
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to evaluate IAM authorization request', error);
            toast.error('Unable to evaluate the authorization request.');
        }
        finally {
            setIsSaving(null);
        }
    };
    if (!selectedRealmId) {
        return (_jsx("div", { className: "rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: "Select a realm to manage authorization services and UMA." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("section", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(AuthorizationMetric, { label: "Resource Servers", value: String(resourceServers.length), detail: `${filteredResources.length} resources in view` }), _jsx(AuthorizationMetric, { label: "Policies", value: String(policies.length), detail: `${permissions.length} permissions` }), _jsx(AuthorizationMetric, { label: "Evaluations", value: String(evaluations.length), detail: `${permissionTickets.length} permission tickets` }), _jsx(AuthorizationMetric, { label: "Focused Server", value: selectedResourceServerId ? '1' : '0', detail: selectedResourceServerId || 'No resource server selected' })] }), _jsx(SectionCard, { title: "Authorization Scope", description: "Filter the authorization-services plane to a resource server so resources, policies, permissions, and tickets stay navigable.", children: _jsxs("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", children: [_jsxs("label", { className: "space-y-2", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Resource Server Focus" }), _jsxs("select", { value: selectedResourceServerId, onChange: (event) => setSelectedResourceServerId(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "All resource servers" }), resourceServers.map((record) => (_jsxs("option", { value: record.id, children: [record.name, " \u00B7 ", record.client_id] }, record.id)))] })] }), _jsx("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300", children: "Resource servers are the root of the authorization-services plane. Policies, protected resources, permissions, evaluations, and UMA tickets all resolve under that boundary." })] }) }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]", children: [_jsx(SectionCard, { title: "Resource Servers", description: "Attach authorization services to standalone IAM clients and define enforcement posture.", children: isLoading ? (_jsx("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Loading resource servers\u2026" })) : (_jsxs("div", { className: "space-y-3", children: [resourceServers.map((record) => (_jsx("button", { type: "button", onClick: () => {
                                        setSelectedResourceServerId(record.id);
                                        setResourceServerForm(buildResourceServerForm(record));
                                    }, className: `w-full rounded-2xl border px-4 py-3 text-left ${selectedResourceServerId === record.id
                                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'}`, children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: record.name }), _jsxs("div", { className: `mt-1 text-xs ${selectedResourceServerId === record.id ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`, children: [record.client_id, " \u00B7 ", record.enforcement_mode, " \u00B7 ", record.decision_strategy] })] }), _jsx("span", { className: "rounded-full border border-current/20 px-2 py-1 text-[11px] uppercase tracking-[0.16em]", children: record.status })] }) }, record.id))), resourceServers.length === 0 && (_jsx("div", { className: "rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No authorization resource servers are registered for this realm yet." }))] })) }), _jsx(SectionCard, { title: resourceServerForm.id ? 'Edit Resource Server' : 'Create Resource Server', description: "A resource server anchors protected resources, scopes, permissions, and UMA tickets.", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Client" }), _jsxs("select", { value: resourceServerForm.clientId, onChange: (event) => setResourceServerForm((current) => ({ ...current, clientId: event.target.value })), disabled: !canManage || !!resourceServerForm.id, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "Select client" }), clients.map((client) => (_jsxs("option", { value: client.client_id, children: [client.name, " \u00B7 ", client.client_id] }, client.id)))] })] }), _jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Name" }), _jsx("input", { value: resourceServerForm.name, onChange: (event) => setResourceServerForm((current) => ({ ...current, name: event.target.value })), disabled: !canManage, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] }), _jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: "Summary" }), _jsx("textarea", { value: resourceServerForm.summary, onChange: (event) => setResourceServerForm((current) => ({ ...current, summary: event.target.value })), disabled: !canManage, rows: 3, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(SelectField, { label: "Status", value: resourceServerForm.status, disabled: !canManage, onChange: (value) => setResourceServerForm((current) => ({ ...current, status: value })), options: ['ACTIVE', 'ARCHIVED'] }), _jsx(SelectField, { label: "Enforcement", value: resourceServerForm.enforcementMode, disabled: !canManage, onChange: (value) => setResourceServerForm((current) => ({ ...current, enforcementMode: value })), options: ['ENFORCING', 'PERMISSIVE', 'DISABLED'] }), _jsx(SelectField, { label: "Decision", value: resourceServerForm.decisionStrategy, disabled: !canManage, onChange: (value) => setResourceServerForm((current) => ({ ...current, decisionStrategy: value })), options: ['AFFIRMATIVE', 'UNANIMOUS'] })] }), _jsx(FormActions, { canManage: canManage, isSaving: isSaving === 'resource-server', saveLabel: resourceServerForm.id ? 'Update Resource Server' : 'Create Resource Server', onSave: saveResourceServer, onReset: () => setResourceServerForm(emptyResourceServerForm()) })] }) })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(SectionCard, { title: "Protected Scopes", description: "Scopes define the precise actions that can be granted through permissions and UMA.", children: _jsxs("div", { className: "space-y-4", children: [_jsx(CompactRecordList, { records: filteredScopes, renderTitle: (record) => record.name, renderDetail: (record) => `${record.summary} · ${record.status}`, onEdit: (record) => setScopeForm(buildScopeForm(record)) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(SelectField, { label: "Resource Server", value: scopeForm.resourceServerId, disabled: !canManage, onChange: (value) => setScopeForm((current) => ({ ...current, resourceServerId: value })), options: resourceServers.map((record) => ({ value: record.id, label: record.name })), placeholder: "Select resource server" }), _jsx(SelectField, { label: "Status", value: scopeForm.status, disabled: !canManage, onChange: (value) => setScopeForm((current) => ({ ...current, status: value })), options: ['ACTIVE', 'DISABLED'] })] }), _jsx(TextField, { label: "Name", value: scopeForm.name, disabled: !canManage, onChange: (value) => setScopeForm((current) => ({ ...current, name: value })) }), _jsx(TextareaField, { label: "Summary", value: scopeForm.summary, disabled: !canManage, onChange: (value) => setScopeForm((current) => ({ ...current, summary: value })) }), _jsx(FormActions, { canManage: canManage, isSaving: isSaving === 'scope', saveLabel: scopeForm.id ? 'Update Scope' : 'Create Scope', onSave: saveScope, onReset: () => setScopeForm(emptyScopeForm(selectedResourceServerId)) })] }) }), _jsx(SectionCard, { title: "Protected Resources", description: "Resources carry ownership, scope attachment, and typed metadata that policies and permissions act on.", children: _jsxs("div", { className: "space-y-4", children: [_jsx(CompactRecordList, { records: filteredResources, renderTitle: (record) => record.name, renderDetail: (record) => `${record.summary} · ${record.status}`, onEdit: (record) => setResourceForm(buildResourceForm(record)) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(SelectField, { label: "Resource Server", value: resourceForm.resourceServerId, disabled: !canManage, onChange: (value) => setResourceForm((current) => ({ ...current, resourceServerId: value })), options: resourceServers.map((record) => ({ value: record.id, label: record.name })), placeholder: "Select resource server" }), _jsx(SelectField, { label: "Status", value: resourceForm.status, disabled: !canManage, onChange: (value) => setResourceForm((current) => ({ ...current, status: value })), options: ['ACTIVE', 'DISABLED'] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(TextField, { label: "Name", value: resourceForm.name, disabled: !canManage, onChange: (value) => setResourceForm((current) => ({ ...current, name: value })) }), _jsx(TextField, { label: "Type", value: resourceForm.typeLabel, disabled: !canManage, onChange: (value) => setResourceForm((current) => ({ ...current, typeLabel: value })) })] }), _jsx(TextareaField, { label: "Summary", value: resourceForm.summary, disabled: !canManage, onChange: (value) => setResourceForm((current) => ({ ...current, summary: value })) }), _jsx(TextField, { label: "URI", value: resourceForm.uri, disabled: !canManage, onChange: (value) => setResourceForm((current) => ({ ...current, uri: value })) }), _jsx(MultiSelectField, { label: "Owner Users", disabled: !canManage, value: resourceForm.ownerUserIds, options: realmUsers.map((user) => ({ value: user.id, label: `${user.username} · ${user.email}` })), onChange: (values) => setResourceForm((current) => ({ ...current, ownerUserIds: values })) }), _jsx(MultiSelectField, { label: "Scopes", disabled: !canManage, value: resourceForm.scopeIds, options: scopes.filter((scope) => scope.resource_server_id === resourceForm.resourceServerId).map((scope) => ({ value: scope.id, label: scope.name })), onChange: (values) => setResourceForm((current) => ({ ...current, scopeIds: values })) }), _jsx(FormActions, { canManage: canManage, isSaving: isSaving === 'resource', saveLabel: resourceForm.id ? 'Update Resource' : 'Create Resource', onSave: saveResource, onReset: () => setResourceForm(emptyResourceForm(selectedResourceServerId)) })] }) })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(SectionCard, { title: "Authorization Policies", description: "Policies resolve which principals can receive a grant for a protected resource and scope.", children: _jsxs("div", { className: "space-y-4", children: [_jsx(CompactRecordList, { records: filteredPolicies, renderTitle: (record) => record.name, renderDetail: (record) => `${record.kind} · ${record.status}`, onEdit: (record) => setPolicyForm(buildPolicyForm(record)) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(SelectField, { label: "Resource Server", value: policyForm.resourceServerId, disabled: !canManage, onChange: (value) => setPolicyForm((current) => ({ ...current, resourceServerId: value })), options: resourceServers.map((record) => ({ value: record.id, label: record.name })), placeholder: "Select resource server" }), _jsx(SelectField, { label: "Kind", value: policyForm.kind, disabled: !canManage, onChange: (value) => setPolicyForm((current) => ({ ...current, kind: value })), options: ['ANY', 'USER', 'GROUP', 'ROLE', 'CLIENT', 'OWNER'] }), _jsx(SelectField, { label: "Status", value: policyForm.status, disabled: !canManage, onChange: (value) => setPolicyForm((current) => ({ ...current, status: value })), options: ['ACTIVE', 'DISABLED'] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(TextField, { label: "Name", value: policyForm.name, disabled: !canManage, onChange: (value) => setPolicyForm((current) => ({ ...current, name: value })) }), _jsx(TextareaField, { label: "Summary", value: policyForm.summary, disabled: !canManage, onChange: (value) => setPolicyForm((current) => ({ ...current, summary: value })), rows: 2 })] }), _jsx(MultiSelectField, { label: "Users", disabled: !canManage, value: policyForm.principalUserIds, options: realmUsers.map((user) => ({ value: user.id, label: `${user.username} · ${user.email}` })), onChange: (values) => setPolicyForm((current) => ({ ...current, principalUserIds: values })) }), _jsx(MultiSelectField, { label: "Groups", disabled: !canManage, value: policyForm.principalGroupIds, options: realmGroups.map((group) => ({ value: group.id, label: group.name })), onChange: (values) => setPolicyForm((current) => ({ ...current, principalGroupIds: values })) }), _jsx(MultiSelectField, { label: "Roles", disabled: !canManage, value: policyForm.principalRoleIds, options: realmRoles.map((role) => ({ value: role.id, label: `${role.name} · ${role.kind}` })), onChange: (values) => setPolicyForm((current) => ({ ...current, principalRoleIds: values })) }), _jsx(MultiSelectField, { label: "Clients", disabled: !canManage, value: policyForm.principalClientIds, options: clients.map((client) => ({ value: client.client_id, label: `${client.name} · ${client.client_id}` })), onChange: (values) => setPolicyForm((current) => ({ ...current, principalClientIds: values })) }), _jsx(FormActions, { canManage: canManage, isSaving: isSaving === 'policy', saveLabel: policyForm.id ? 'Update Policy' : 'Create Policy', onSave: savePolicy, onReset: () => setPolicyForm(emptyPolicyForm(selectedResourceServerId)) })] }) }), _jsx(SectionCard, { title: "Authorization Permissions", description: "Permissions bind resources, scopes, and policies into grantable decisions.", children: _jsxs("div", { className: "space-y-4", children: [_jsx(CompactRecordList, { records: filteredPermissions, renderTitle: (record) => record.name, renderDetail: (record) => `${record.status} · ${record.decision_strategy}`, onEdit: (record) => setPermissionForm(buildPermissionForm(record)) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-3", children: [_jsx(SelectField, { label: "Resource Server", value: permissionForm.resourceServerId, disabled: !canManage, onChange: (value) => setPermissionForm((current) => ({ ...current, resourceServerId: value })), options: resourceServers.map((record) => ({ value: record.id, label: record.name })), placeholder: "Select resource server" }), _jsx(SelectField, { label: "Status", value: permissionForm.status, disabled: !canManage, onChange: (value) => setPermissionForm((current) => ({ ...current, status: value })), options: ['ACTIVE', 'DISABLED'] }), _jsx(SelectField, { label: "Decision", value: permissionForm.decisionStrategy, disabled: !canManage, onChange: (value) => setPermissionForm((current) => ({ ...current, decisionStrategy: value })), options: ['AFFIRMATIVE', 'UNANIMOUS'] })] }), _jsx(TextField, { label: "Name", value: permissionForm.name, disabled: !canManage, onChange: (value) => setPermissionForm((current) => ({ ...current, name: value })) }), _jsx(TextareaField, { label: "Summary", value: permissionForm.summary, disabled: !canManage, onChange: (value) => setPermissionForm((current) => ({ ...current, summary: value })) }), _jsx(MultiSelectField, { label: "Resources", disabled: !canManage, value: permissionForm.resourceIds, options: resources.filter((resource) => resource.resource_server_id === permissionForm.resourceServerId).map((resource) => ({ value: resource.id, label: resource.name })), onChange: (values) => setPermissionForm((current) => ({ ...current, resourceIds: values })) }), _jsx(MultiSelectField, { label: "Scopes", disabled: !canManage, value: permissionForm.scopeIds, options: scopes.filter((scope) => scope.resource_server_id === permissionForm.resourceServerId).map((scope) => ({ value: scope.id, label: scope.name })), onChange: (values) => setPermissionForm((current) => ({ ...current, scopeIds: values })) }), _jsx(MultiSelectField, { label: "Policies", disabled: !canManage, value: permissionForm.policyIds, options: policies.filter((policy) => policy.resource_server_id === permissionForm.resourceServerId).map((policy) => ({ value: policy.id, label: policy.name })), onChange: (values) => setPermissionForm((current) => ({ ...current, policyIds: values })) }), _jsx(FormActions, { canManage: canManage, isSaving: isSaving === 'permission', saveLabel: permissionForm.id ? 'Update Permission' : 'Create Permission', onSave: savePermission, onReset: () => setPermissionForm(emptyPermissionForm(selectedResourceServerId)) })] }) })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]", children: [_jsx(SectionCard, { title: "Evaluation", description: "Evaluate the current authorization model before issuing permission tickets or RPTs.", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(SelectField, { label: "Resource Server", value: evaluationForm.resourceServerId, disabled: !canManage, onChange: (value) => setEvaluationForm((current) => ({ ...current, resourceServerId: value, resourceId: '', requestedScopeNames: [] })), options: resourceServers.map((record) => ({ value: record.id, label: record.name })), placeholder: "Select resource server" }), _jsx(SelectField, { label: "Subject Kind", value: evaluationForm.subjectKind, disabled: !canManage, onChange: (value) => setEvaluationForm((current) => ({ ...current, subjectKind: value, subjectId: '' })), options: ['USER', 'SERVICE_ACCOUNT'] })] }), evaluationForm.subjectKind === 'USER' ? (_jsx(SelectField, { label: "User Subject", value: evaluationForm.subjectId, disabled: !canManage, onChange: (value) => setEvaluationForm((current) => ({ ...current, subjectId: value })), options: realmUsers.map((user) => ({ value: user.id, label: `${user.username} · ${user.email}` })), placeholder: "Select user" })) : (_jsx(TextField, { label: "Service Account Subject ID", value: evaluationForm.subjectId, disabled: !canManage, onChange: (value) => setEvaluationForm((current) => ({ ...current, subjectId: value })) })), _jsx(SelectField, { label: "Requester Client", value: evaluationForm.requesterClientId, disabled: !canManage, onChange: (value) => setEvaluationForm((current) => ({ ...current, requesterClientId: value })), options: clients.map((client) => ({ value: client.client_id, label: `${client.name} · ${client.client_id}` })), placeholder: "Optional client context" }), _jsx(SelectField, { label: "Resource", value: evaluationForm.resourceId, disabled: !canManage, onChange: (value) => setEvaluationForm((current) => ({ ...current, resourceId: value })), options: resources.filter((resource) => resource.resource_server_id === evaluationForm.resourceServerId).map((resource) => ({ value: resource.id, label: resource.name })), placeholder: "Select resource" }), _jsx(MultiSelectField, { label: "Requested Scopes", disabled: !canManage, value: evaluationForm.requestedScopeNames, options: scopes.filter((scope) => scope.resource_server_id === evaluationForm.resourceServerId).map((scope) => ({ value: scope.name, label: scope.name })), onChange: (values) => setEvaluationForm((current) => ({ ...current, requestedScopeNames: values })) }), _jsx(FormActions, { canManage: canManage, isSaving: isSaving === 'evaluation', saveLabel: "Run Evaluation", onSave: runEvaluation, onReset: () => {
                                        setEvaluationForm(emptyEvaluationForm(selectedResourceServerId));
                                        setEvaluationResult(null);
                                    } }), evaluationResult && (_jsxs("div", { className: `rounded-2xl border px-4 py-3 text-sm ${evaluationResult.allowed
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100'
                                        : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100'}`, children: [_jsx("div", { className: "font-semibold", children: evaluationResult.allowed ? 'Granted' : 'Denied' }), _jsx("div", { className: "mt-1", children: evaluationResult.reason }), _jsxs("div", { className: "mt-2 text-xs uppercase tracking-[0.16em]", children: ["Granted Scopes: ", evaluationResult.granted_scope_names.join(', ') || 'none'] })] }))] }) }), _jsx(SectionCard, { title: "Evaluations and UMA Tickets", description: "Review live authorization decisions and ticket lifecycle without leaving the standalone IAM workspace.", children: _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Recent Evaluations" }), _jsx(CompactRecordList, { records: filteredEvaluations.slice(0, 8), renderTitle: (record) => `${record.subject_kind}:${record.subject_id}`, renderDetail: (record) => `${record.reason} · ${record.granted_scope_names.join(', ') || 'none'}` })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: "Permission Tickets" }), _jsx(CompactRecordList, { records: filteredPermissionTickets.slice(0, 8), renderTitle: (record) => `${record.status} · ${record.resource_name ?? record.resource_id}`, renderDetail: (record) => `${record.reason} · ${record.granted_scope_names.join(', ') || 'none'}` })] })] }) })] })] }));
}
function TextField({ label, value, disabled, onChange, }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: label }), _jsx("input", { value: value, onChange: (event) => onChange(event.target.value), disabled: disabled, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] }));
}
function TextareaField({ label, value, disabled, onChange, rows = 3, }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: label }), _jsx("textarea", { value: value, onChange: (event) => onChange(event.target.value), disabled: disabled, rows: rows, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] }));
}
function SelectField({ label, value, disabled, onChange, options, placeholder, }) {
    const normalizedOptions = options.map((option) => typeof option === 'string' ? { value: option, label: option } : option);
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: label }), _jsxs("select", { value: value, onChange: (event) => onChange(event.target.value), disabled: disabled, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [placeholder && _jsx("option", { value: "", children: placeholder }), normalizedOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value)))] })] }));
}
function MultiSelectField({ label, value, disabled, onChange, options, }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-700 dark:text-slate-300", children: label }), _jsx("select", { multiple: true, value: value, onChange: (event) => onChange(readSelectedValues(event)), disabled: disabled, className: "min-h-[124px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }));
}
function FormActions({ canManage, isSaving, saveLabel, onSave, onReset, }) {
    return (_jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { type: "button", onClick: onSave, disabled: !canManage || isSaving, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving ? 'Saving…' : saveLabel }), _jsx("button", { type: "button", onClick: onReset, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" })] }));
}
function CompactRecordList({ records, renderTitle, renderDetail, onEdit, }) {
    if (records.length === 0) {
        return (_jsx("div", { className: "rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400", children: "No records yet." }));
    }
    return (_jsx("div", { className: "space-y-2", children: records.map((record, index) => (_jsxs("button", { type: "button", onClick: () => onEdit?.(record), className: "w-full rounded-2xl border border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: renderTitle(record) }), _jsx("div", { className: "mt-1 text-sm text-slate-500 dark:text-slate-400", children: renderDetail(record) })] }, index))) }));
}
