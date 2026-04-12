import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function emptyPermissionForm() {
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
    };
}
function emptyPolicyForm() {
    return {
        id: null,
        name: '',
        summary: '',
        principalKind: 'GROUP',
        principalId: '',
        principalLabel: '',
        permissionIds: [],
        status: 'ACTIVE',
    };
}
function buildPermissionForm(record) {
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
    };
}
function buildPolicyForm(record) {
    return {
        id: record.id,
        name: record.name,
        summary: record.summary,
        principalKind: record.principal_kind,
        principalId: record.principal_id,
        principalLabel: record.principal_label,
        permissionIds: record.permission_ids,
        status: record.status,
    };
}
export function IamAdminAuthorizationPanel({ selectedRealmId, canManage, users, groups, roles }) {
    const [permissions, setPermissions] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [clients, setClients] = useState([]);
    const [permissionForm, setPermissionForm] = useState(emptyPermissionForm);
    const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingPermission, setIsSavingPermission] = useState(false);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const realmUsers = useMemo(() => users.filter((user) => user.realm_id === selectedRealmId), [users, selectedRealmId]);
    const realmGroups = useMemo(() => groups.filter((group) => group.realm_id === selectedRealmId), [groups, selectedRealmId]);
    const realmRoles = useMemo(() => roles.filter((role) => role.realm_id === selectedRealmId), [roles, selectedRealmId]);
    const loadPanel = async () => {
        if (!selectedRealmId) {
            setPermissions([]);
            setPolicies([]);
            setEvaluations([]);
            setClients([]);
            return;
        }
        setIsLoading(true);
        try {
            const [permissionsResponse, policiesResponse, evaluationsResponse, clientsResponse] = await Promise.all([
                idpApi.listIamAdminPermissions({ realmId: selectedRealmId }),
                idpApi.listIamAdminPolicies({ realmId: selectedRealmId }),
                idpApi.listIamAdminEvaluations({ realmId: selectedRealmId }),
                idpApi.listIamClients({ realmId: selectedRealmId }),
            ]);
            setPermissions(permissionsResponse.permissions);
            setPolicies(policiesResponse.policies);
            setEvaluations(evaluationsResponse.evaluations);
            setClients(clientsResponse.clients);
        }
        catch (error) {
            console.error('Failed to load IAM admin authorization panel', error);
            toast.error('Unable to load IAM admin authorization data.');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadPanel();
    }, [selectedRealmId]);
    useEffect(() => {
        if (!policyForm.id && !policyForm.principalId && realmGroups[0]) {
            setPolicyForm((current) => ({
                ...current,
                principalKind: 'GROUP',
                principalId: realmGroups[0]?.id ?? '',
                principalLabel: realmGroups[0]?.name ?? '',
            }));
        }
    }, [realmGroups, policyForm.id, policyForm.principalId]);
    const handleToggleAction = (action) => {
        setPermissionForm((current) => ({
            ...current,
            actions: current.actions.includes(action)
                ? current.actions.filter((value) => value !== action)
                : [...current.actions, action],
        }));
    };
    const handlePermissionSave = async () => {
        if (!selectedRealmId) {
            toast.error('Select a realm first.');
            return;
        }
        if (!permissionForm.name.trim() || !permissionForm.summary.trim() || permissionForm.actions.length === 0) {
            toast.error('Permission name, summary, and at least one action are required.');
            return;
        }
        setIsSavingPermission(true);
        try {
            if (permissionForm.id) {
                const request = {
                    name: permissionForm.name,
                    summary: permissionForm.summary,
                    actions: permissionForm.actions,
                    scope_kind: permissionForm.scopeKind,
                    managed_user_ids: permissionForm.managedUserIds,
                    managed_group_ids: permissionForm.managedGroupIds,
                    managed_role_ids: permissionForm.managedRoleIds,
                    managed_client_ids: permissionForm.managedClientIds,
                };
                await idpApi.updateIamAdminPermission(permissionForm.id, request);
                toast.success('Admin permission updated.');
            }
            else {
                const request = {
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
                };
                await idpApi.createIamAdminPermission(request);
                toast.success('Admin permission created.');
            }
            setPermissionForm(emptyPermissionForm());
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM admin permission', error);
            toast.error('Unable to save the IAM admin permission.');
        }
        finally {
            setIsSavingPermission(false);
        }
    };
    const handlePolicySave = async () => {
        if (!selectedRealmId) {
            toast.error('Select a realm first.');
            return;
        }
        if (!policyForm.name.trim() || !policyForm.summary.trim() || !policyForm.principalId || !policyForm.principalLabel.trim() || policyForm.permissionIds.length === 0) {
            toast.error('Policy name, summary, principal, and permissions are required.');
            return;
        }
        setIsSavingPolicy(true);
        try {
            if (policyForm.id) {
                const request = {
                    name: policyForm.name,
                    summary: policyForm.summary,
                    principal_label: policyForm.principalLabel,
                    permission_ids: policyForm.permissionIds,
                    status: policyForm.status,
                };
                await idpApi.updateIamAdminPolicy(policyForm.id, request);
                toast.success('Admin policy updated.');
            }
            else {
                const request = {
                    realm_id: selectedRealmId,
                    name: policyForm.name,
                    summary: policyForm.summary,
                    principal_kind: policyForm.principalKind,
                    principal_id: policyForm.principalId,
                    principal_label: policyForm.principalLabel,
                    permission_ids: policyForm.permissionIds,
                    status: policyForm.status,
                };
                await idpApi.createIamAdminPolicy(request);
                toast.success('Admin policy created.');
            }
            setPolicyForm(emptyPolicyForm());
            await loadPanel();
        }
        catch (error) {
            console.error('Failed to save IAM admin policy', error);
            toast.error('Unable to save the IAM admin policy.');
        }
        finally {
            setIsSavingPolicy(false);
        }
    };
    const principalOptions = policyForm.principalKind === 'USER'
        ? realmUsers.map((user) => ({ id: user.id, label: `${user.username} (${user.email})` }))
        : policyForm.principalKind === 'GROUP'
            ? realmGroups.map((group) => ({ id: group.id, label: group.name }))
            : realmRoles.map((role) => ({ id: role.id, label: role.name }));
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300", children: "Admin Authorization" }), _jsx("h3", { className: "mt-2 text-2xl font-semibold text-slate-900 dark:text-white", children: "Fine-grained admin governance" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300", children: "Permission objects and policy bindings define what restricted administrators can read, manage, or impersonate inside a realm." })] }), _jsx("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: selectedRealmId ? `Realm: ${selectedRealmId}` : 'Select a realm' })] }) }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.1fr_1fr]", children: [_jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("h4", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Permission Objects" }), _jsxs("div", { className: "mt-4 grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Name", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.name, onChange: (event) => setPermissionForm((current) => ({ ...current, name: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Domain", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.domain, onChange: (event) => setPermissionForm((current) => ({ ...current, domain: event.target.value })), disabled: !canManage || !!permissionForm.id, children: [_jsx("option", { value: "USERS", children: "Users" }), _jsx("option", { value: "GROUPS", children: "Groups" }), _jsx("option", { value: "ROLES", children: "Roles" }), _jsx("option", { value: "CLIENTS", children: "Clients" })] })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200 md:col-span-2", children: ["Summary", _jsx("textarea", { className: "mt-1 min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.summary, onChange: (event) => setPermissionForm((current) => ({ ...current, summary: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Scope", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.scopeKind, onChange: (event) => setPermissionForm((current) => ({ ...current, scopeKind: event.target.value })), disabled: !canManage, children: [_jsx("option", { value: "SCOPED", children: "Scoped" }), _jsx("option", { value: "REALM", children: "Realm-wide" })] })] }), _jsxs("div", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Actions", _jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: ['READ', 'MANAGE', 'IMPERSONATE'].map((action) => (_jsx("button", { type: "button", className: `rounded-full border px-3 py-1 text-xs font-medium ${permissionForm.actions.includes(action)
                                                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-500/10 dark:text-cyan-200'
                                                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`, onClick: () => handleToggleAction(action), disabled: !canManage, children: action }, action))) })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Managed Users", _jsx("select", { multiple: true, className: "mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.managedUserIds, onChange: (event) => setPermissionForm((current) => ({
                                                    ...current,
                                                    managedUserIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                                                })), disabled: !canManage || permissionForm.scopeKind === 'REALM', children: realmUsers.map((user) => (_jsx("option", { value: user.id, children: user.username }, user.id))) })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Managed Groups", _jsx("select", { multiple: true, className: "mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.managedGroupIds, onChange: (event) => setPermissionForm((current) => ({
                                                    ...current,
                                                    managedGroupIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                                                })), disabled: !canManage || permissionForm.scopeKind === 'REALM', children: realmGroups.map((group) => (_jsx("option", { value: group.id, children: group.name }, group.id))) })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Managed Roles", _jsx("select", { multiple: true, className: "mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.managedRoleIds, onChange: (event) => setPermissionForm((current) => ({
                                                    ...current,
                                                    managedRoleIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                                                })), disabled: !canManage || permissionForm.scopeKind === 'REALM', children: realmRoles.map((role) => (_jsx("option", { value: role.id, children: role.name }, role.id))) })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Managed Clients", _jsx("select", { multiple: true, className: "mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: permissionForm.managedClientIds, onChange: (event) => setPermissionForm((current) => ({
                                                    ...current,
                                                    managedClientIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                                                })), disabled: !canManage || permissionForm.scopeKind === 'REALM', children: clients.map((client) => (_jsx("option", { value: client.id, children: client.client_id }, client.id))) })] })] }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { type: "button", className: "rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60", onClick: () => void handlePermissionSave(), disabled: !canManage || isSavingPermission || !selectedRealmId, children: permissionForm.id ? 'Update Permission' : 'Create Permission' }), _jsx("button", { type: "button", className: "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200", onClick: () => setPermissionForm(emptyPermissionForm()), children: "Reset" })] }), _jsxs("div", { className: "mt-6 space-y-3", children: [permissions.map((permission) => (_jsx("button", { type: "button", className: "w-full rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800", onClick: () => setPermissionForm(buildPermissionForm(permission)), children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-slate-900 dark:text-white", children: permission.name }), _jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: permission.summary })] }), _jsxs("div", { className: "text-right text-xs text-slate-500 dark:text-slate-400", children: [_jsx("div", { children: permission.domain }), _jsx("div", { children: permission.actions.join(', ') })] })] }) }, permission.id))), !permissions.length && !isLoading && (_jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "No admin permissions defined for this realm yet." }))] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("h4", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Policy Bindings" }), _jsxs("div", { className: "mt-4 grid gap-4", children: [_jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Name", _jsx("input", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: policyForm.name, onChange: (event) => setPolicyForm((current) => ({ ...current, name: event.target.value })), disabled: !canManage })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Summary", _jsx("textarea", { className: "mt-1 min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: policyForm.summary, onChange: (event) => setPolicyForm((current) => ({ ...current, summary: event.target.value })), disabled: !canManage })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Principal Type", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: policyForm.principalKind, onChange: (event) => setPolicyForm((current) => ({
                                                                    ...current,
                                                                    principalKind: event.target.value,
                                                                    principalId: '',
                                                                    principalLabel: '',
                                                                })), disabled: !canManage || !!policyForm.id, children: [_jsx("option", { value: "USER", children: "User" }), _jsx("option", { value: "GROUP", children: "Group" }), _jsx("option", { value: "ROLE", children: "Role" })] })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Status", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: policyForm.status, onChange: (event) => setPolicyForm((current) => ({ ...current, status: event.target.value })), disabled: !canManage, children: [_jsx("option", { value: "ACTIVE", children: "Active" }), _jsx("option", { value: "DISABLED", children: "Disabled" })] })] })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Principal", _jsxs("select", { className: "mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: policyForm.principalId, onChange: (event) => {
                                                            const option = principalOptions.find((candidate) => candidate.id === event.target.value);
                                                            setPolicyForm((current) => ({
                                                                ...current,
                                                                principalId: event.target.value,
                                                                principalLabel: option?.label ?? '',
                                                            }));
                                                        }, disabled: !canManage || !!policyForm.id, children: [_jsx("option", { value: "", children: "Select principal" }), principalOptions.map((option) => (_jsx("option", { value: option.id, children: option.label }, option.id)))] })] }), _jsxs("label", { className: "text-sm text-slate-700 dark:text-slate-200", children: ["Permission Bindings", _jsx("select", { multiple: true, className: "mt-1 h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white", value: policyForm.permissionIds, onChange: (event) => setPolicyForm((current) => ({
                                                            ...current,
                                                            permissionIds: Array.from(event.target.selectedOptions).map((option) => option.value),
                                                        })), disabled: !canManage, children: permissions.map((permission) => (_jsxs("option", { value: permission.id, children: [permission.name, " (", permission.domain, ")"] }, permission.id))) })] })] }), _jsxs("div", { className: "mt-4 flex gap-3", children: [_jsx("button", { type: "button", className: "rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60", onClick: () => void handlePolicySave(), disabled: !canManage || isSavingPolicy || !selectedRealmId, children: policyForm.id ? 'Update Policy' : 'Create Policy' }), _jsx("button", { type: "button", className: "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200", onClick: () => setPolicyForm(emptyPolicyForm()), children: "Reset" })] }), _jsx("div", { className: "mt-6 space-y-3", children: policies.map((policy) => (_jsx("button", { type: "button", className: "w-full rounded-2xl border border-slate-200 px-4 py-3 text-left dark:border-slate-800", onClick: () => setPolicyForm(buildPolicyForm(policy)), children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-slate-900 dark:text-white", children: policy.name }), _jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: policy.principal_label })] }), _jsxs("div", { className: "text-right text-xs text-slate-500 dark:text-slate-400", children: [_jsx("div", { children: policy.principal_kind }), _jsx("div", { children: policy.status })] })] }) }, policy.id))) })] }), _jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("h4", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: "Evaluation Audit" }), _jsxs("div", { className: "mt-4 space-y-3", children: [evaluations.slice(0, 12).map((evaluation) => (_jsxs("div", { className: "rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-medium text-slate-900 dark:text-white", children: [evaluation.actor_username, " ", evaluation.allowed ? 'allowed' : 'denied', " ", evaluation.action.toLowerCase(), " on ", evaluation.domain.toLowerCase()] }), _jsx("p", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: evaluation.reason })] }), _jsx("div", { className: `rounded-full px-3 py-1 text-xs font-semibold ${evaluation.allowed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`, children: evaluation.allowed ? 'Allowed' : 'Denied' })] }), _jsxs("p", { className: "mt-2 text-xs text-slate-400", children: [evaluation.method, " ", evaluation.route, " ", evaluation.target_resource_label ? `• ${evaluation.target_resource_label}` : ''] })] }, evaluation.id))), !evaluations.length && !isLoading && (_jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "No admin authorization evaluations have been recorded for this realm yet." }))] })] })] })] })] }));
}
