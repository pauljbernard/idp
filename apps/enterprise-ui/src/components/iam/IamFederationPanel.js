import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { GitBranch, Link2, Network, Rows3, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function parseList(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function formatList(values) {
    return values.join(', ');
}
function emptyIdentityProviderForm() {
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
    };
}
function emptyFederationProviderForm() {
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
    };
}
function buildIdentityProviderForm(provider) {
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
    };
}
function buildFederationProviderForm(provider) {
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
    };
}
export function IamFederationPanel({ selectedRealmId, canManage, }) {
    const [identityProviders, setIdentityProviders] = useState([]);
    const [federationProviders, setFederationProviders] = useState([]);
    const [linkedIdentities, setLinkedIdentities] = useState([]);
    const [syncJobs, setSyncJobs] = useState([]);
    const [events, setEvents] = useState([]);
    const [roles, setRoles] = useState([]);
    const [groups, setGroups] = useState([]);
    const [identityProviderForm, setIdentityProviderForm] = useState(emptyIdentityProviderForm);
    const [federationProviderForm, setFederationProviderForm] = useState(emptyFederationProviderForm);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingIdentityProvider, setIsSavingIdentityProvider] = useState(false);
    const [isSavingFederationProvider, setIsSavingFederationProvider] = useState(false);
    const [syncingProviderId, setSyncingProviderId] = useState(null);
    const loadFederation = async () => {
        if (!selectedRealmId) {
            setIdentityProviders([]);
            setFederationProviders([]);
            setLinkedIdentities([]);
            setSyncJobs([]);
            setEvents([]);
            setRoles([]);
            setGroups([]);
            return;
        }
        setIsLoading(true);
        try {
            const [identityProviderResponse, federationProviderResponse, linkedIdentityResponse, syncJobResponse, eventResponse, roleResponse, groupResponse,] = await Promise.all([
                idpApi.listIamIdentityProviders({ realmId: selectedRealmId }),
                idpApi.listIamUserFederationProviders({ realmId: selectedRealmId }),
                idpApi.listIamLinkedIdentities({ realmId: selectedRealmId }),
                idpApi.listIamFederationSyncJobs({ realmId: selectedRealmId }),
                idpApi.listIamFederationEvents({ realmId: selectedRealmId }),
                idpApi.listIamRoles({ realmId: selectedRealmId }),
                idpApi.listIamGroups({ realmId: selectedRealmId }),
            ]);
            setIdentityProviders(identityProviderResponse.identity_providers);
            setFederationProviders(federationProviderResponse.user_federation_providers);
            setLinkedIdentities(linkedIdentityResponse.linked_identities);
            setSyncJobs(syncJobResponse.sync_jobs);
            setEvents(eventResponse.events);
            setRoles(roleResponse.roles);
            setGroups(groupResponse.groups);
        }
        catch (error) {
            console.error('Failed to load IAM federation runtime', error);
            toast.error('Failed to load IAM federation runtime');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadFederation();
    }, [selectedRealmId]);
    useEffect(() => {
        setIdentityProviderForm(emptyIdentityProviderForm());
        setFederationProviderForm(emptyFederationProviderForm());
    }, [selectedRealmId]);
    const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: `${role.name} · ${role.kind}` })), [roles]);
    const groupOptions = useMemo(() => groups.map((group) => ({ value: group.id, label: group.name })), [groups]);
    const handleIdentityProviderSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsSavingIdentityProvider(true);
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
                });
                toast.success('Identity provider updated');
            }
            else {
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
                });
                toast.success('Identity provider created');
            }
            setIdentityProviderForm(emptyIdentityProviderForm());
            await loadFederation();
        }
        catch (error) {
            console.error('Failed to save IAM identity provider', error);
            toast.error('Failed to save identity provider');
        }
        finally {
            setIsSavingIdentityProvider(false);
        }
    };
    const handleFederationProviderSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsSavingFederationProvider(true);
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
                });
                toast.success('Federation provider updated');
            }
            else {
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
                });
                toast.success('Federation provider created');
            }
            setFederationProviderForm(emptyFederationProviderForm());
            await loadFederation();
        }
        catch (error) {
            console.error('Failed to save IAM federation provider', error);
            toast.error('Failed to save federation provider');
        }
        finally {
            setIsSavingFederationProvider(false);
        }
    };
    const handleRunSync = async (providerId) => {
        setSyncingProviderId(providerId);
        try {
            const job = await idpApi.syncIamUserFederationProvider(providerId);
            toast.success(`Federation sync completed: ${job.imported_count} imported`);
            await loadFederation();
        }
        catch (error) {
            console.error('Failed to run IAM federation sync', error);
            toast.error('Failed to run federation sync');
        }
        finally {
            setSyncingProviderId(null);
        }
    };
    return (_jsxs("section", { className: "space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300", children: [_jsx(Network, { className: "h-4 w-4" }), "Federation and Brokering"] }), _jsx("p", { className: "mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400", children: "Manage external OIDC and SAML brokers, directory federation providers, on-demand sync, linked identities, and federation event history for the selected standalone realm." })] }), _jsxs("div", { className: "flex flex-wrap gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400", children: [_jsxs("span", { children: [identityProviders.length, " brokers"] }), _jsxs("span", { children: [federationProviders.length, " federation providers"] }), _jsxs("span", { children: [linkedIdentities.length, " linked identities"] })] })] }), isLoading ? (_jsx("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: "Loading IAM federation posture\u2026" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(Panel, { title: "Identity Brokers", description: "Public-facing broker definitions for OIDC and SAML sign-in.", icon: _jsx(ShieldCheck, { className: "h-5 w-5" }), children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: [_jsx("th", { className: "pb-3", children: "Broker" }), _jsx("th", { className: "pb-3", children: "Policy" }), _jsx("th", { className: "pb-3", children: "Mapped identities" }), _jsx("th", { className: "pb-3" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: identityProviders.map((provider) => (_jsxs("tr", { children: [_jsxs("td", { className: "py-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: provider.name }), _jsxs("div", { className: "text-xs text-slate-500", children: [provider.alias, " \u00B7 ", provider.protocol] })] }), _jsxs("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: [provider.login_mode, " \u00B7 ", provider.link_policy] }), _jsxs("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: [provider.external_identities.length, " external profiles"] }), _jsx("td", { className: "py-3 text-right", children: canManage && (_jsx("button", { type: "button", onClick: () => setIdentityProviderForm(buildIdentityProviderForm(provider)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })) })] }, provider.id))) })] }) }) }), _jsx(Panel, { title: "Directory Federation", description: "On-demand directory adapters used to import or link external users.", icon: _jsx(GitBranch, { className: "h-5 w-5" }), children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: [_jsx("th", { className: "pb-3", children: "Provider" }), _jsx("th", { className: "pb-3", children: "Strategy" }), _jsx("th", { className: "pb-3", children: "Directory entries" }), _jsx("th", { className: "pb-3" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: federationProviders.map((provider) => (_jsxs("tr", { children: [_jsxs("td", { className: "py-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: provider.name }), _jsxs("div", { className: "text-xs text-slate-500", children: [provider.kind, " \u00B7 ", provider.connection_label || 'No connection label'] })] }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: provider.import_strategy }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: provider.external_identities.length }), _jsx("td", { className: "py-3 text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [canManage && (_jsx("button", { type: "button", onClick: () => void handleRunSync(provider.id), disabled: syncingProviderId === provider.id, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: syncingProviderId === provider.id ? 'Syncing…' : 'Run Sync' })), canManage && (_jsx("button", { type: "button", onClick: () => setFederationProviderForm(buildFederationProviderForm(provider)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }) })] }, provider.id))) })] }) }) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(FormCard, { title: identityProviderForm.id ? 'Edit Identity Broker' : 'Create Identity Broker', description: "Broker definitions drive the public broker-first login choices for the selected realm.", children: _jsxs("form", { onSubmit: handleIdentityProviderSubmit, className: "space-y-4", children: [_jsx(LabeledInput, { label: "Alias", value: identityProviderForm.alias, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, alias: value })) }), _jsx(LabeledInput, { label: "Name", value: identityProviderForm.name, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, name: value })) }), _jsx(LabeledTextarea, { label: "Summary", value: identityProviderForm.summary, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, summary: value })), rows: 3 }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Protocol", value: identityProviderForm.protocol, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, protocol: value })), options: [
                                                        { value: 'OIDC', label: 'OIDC' },
                                                        { value: 'SAML', label: 'SAML' },
                                                    ] }), _jsx(LabeledSelect, { label: "Status", value: identityProviderForm.status, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, status: value })), options: [
                                                        { value: 'ACTIVE', label: 'Active' },
                                                        { value: 'DISABLED', label: 'Disabled' },
                                                        { value: 'ARCHIVED', label: 'Archived' },
                                                    ] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Login Mode", value: identityProviderForm.loginMode, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, loginMode: value })), options: [
                                                        { value: 'OPTIONAL', label: 'Optional' },
                                                        { value: 'BROKER_ONLY', label: 'Broker Only' },
                                                    ] }), _jsx(LabeledSelect, { label: "Link Policy", value: identityProviderForm.linkPolicy, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, linkPolicy: value })), options: [
                                                        { value: 'AUTO_CREATE', label: 'Auto Create' },
                                                        { value: 'EMAIL_MATCH', label: 'Email Match' },
                                                        { value: 'MANUAL', label: 'Manual' },
                                                    ] })] }), _jsx(LabeledInput, { label: "Issuer URL", value: identityProviderForm.issuerUrl, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, issuerUrl: value })) }), _jsx(LabeledInput, { label: "Allowed Scopes", value: identityProviderForm.allowedScopes, onChange: (value) => setIdentityProviderForm((current) => ({ ...current, allowedScopes: value })) }), _jsx(LabeledMultiSelect, { label: "Default Roles", values: identityProviderForm.defaultRoleIds, options: roleOptions, onChange: (values) => setIdentityProviderForm((current) => ({ ...current, defaultRoleIds: values })) }), _jsx(LabeledMultiSelect, { label: "Default Groups", values: identityProviderForm.defaultGroupIds, options: groupOptions, onChange: (values) => setIdentityProviderForm((current) => ({ ...current, defaultGroupIds: values })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSavingIdentityProvider, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSavingIdentityProvider ? 'Saving…' : identityProviderForm.id ? 'Save Broker' : 'Create Broker' }), _jsx("button", { type: "button", onClick: () => setIdentityProviderForm(emptyIdentityProviderForm()), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" })] })] }) }), _jsx(FormCard, { title: federationProviderForm.id ? 'Edit Federation Provider' : 'Create Federation Provider', description: "Directory adapters remain synthetic in this phase, but the admin workflow should be operational.", children: _jsxs("form", { onSubmit: handleFederationProviderSubmit, className: "space-y-4", children: [_jsx(LabeledInput, { label: "Name", value: federationProviderForm.name, onChange: (value) => setFederationProviderForm((current) => ({ ...current, name: value })) }), _jsx(LabeledTextarea, { label: "Summary", value: federationProviderForm.summary, onChange: (value) => setFederationProviderForm((current) => ({ ...current, summary: value })), rows: 3 }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Kind", value: federationProviderForm.kind, onChange: (value) => setFederationProviderForm((current) => ({ ...current, kind: value })), options: [
                                                        { value: 'LDAP', label: 'LDAP' },
                                                        { value: 'SCIM', label: 'SCIM' },
                                                        { value: 'AWS_IDENTITY_CENTER', label: 'AWS Identity Center' },
                                                        { value: 'COGNITO_USER_POOL', label: 'Cognito User Pool' },
                                                    ] }), _jsx(LabeledSelect, { label: "Status", value: federationProviderForm.status, onChange: (value) => setFederationProviderForm((current) => ({ ...current, status: value })), options: [
                                                        { value: 'ACTIVE', label: 'Active' },
                                                        { value: 'DISABLED', label: 'Disabled' },
                                                        { value: 'ARCHIVED', label: 'Archived' },
                                                    ] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Import Strategy", value: federationProviderForm.importStrategy, onChange: (value) => setFederationProviderForm((current) => ({ ...current, importStrategy: value })), options: [
                                                        { value: 'IMPORT', label: 'Import' },
                                                        { value: 'READ_ONLY', label: 'Read Only' },
                                                    ] }), _jsx(LabeledInput, { label: "Connection Label", value: federationProviderForm.connectionLabel, onChange: (value) => setFederationProviderForm((current) => ({ ...current, connectionLabel: value })) })] }), _jsx(LabeledMultiSelect, { label: "Default Roles", values: federationProviderForm.defaultRoleIds, options: roleOptions, onChange: (values) => setFederationProviderForm((current) => ({ ...current, defaultRoleIds: values })) }), _jsx(LabeledMultiSelect, { label: "Default Groups", values: federationProviderForm.defaultGroupIds, options: groupOptions, onChange: (values) => setFederationProviderForm((current) => ({ ...current, defaultGroupIds: values })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSavingFederationProvider, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSavingFederationProvider ? 'Saving…' : federationProviderForm.id ? 'Save Provider' : 'Create Provider' }), _jsx("button", { type: "button", onClick: () => setFederationProviderForm(emptyFederationProviderForm()), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" })] })] }) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.05fr_0.95fr]", children: [_jsx(Panel, { title: "Linked Identities", description: "Every brokered login and directory import results in a local link record.", icon: _jsx(Link2, { className: "h-5 w-5" }), children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: [_jsx("th", { className: "pb-3", children: "Identity" }), _jsx("th", { className: "pb-3", children: "Source" }), _jsx("th", { className: "pb-3", children: "Linked" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: linkedIdentities.slice(0, 10).map((record) => (_jsxs("tr", { children: [_jsxs("td", { className: "py-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: record.external_username }), _jsx("div", { className: "text-xs text-slate-500", children: record.external_email })] }), _jsxs("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: [record.source_type, " \u00B7 ", record.provider_name] }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: new Date(record.linked_at).toLocaleString() })] }, record.id))) })] }) }) }), _jsx(Panel, { title: "Sync Jobs and Events", description: "Recent federation jobs and broker events for the selected realm.", icon: _jsx(Rows3, { className: "h-5 w-5" }), children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Recent Sync Jobs" }), _jsx("div", { className: "space-y-2", children: syncJobs.slice(0, 4).map((job) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: job.provider_name }), _jsxs("div", { className: "mt-1 text-slate-600 dark:text-slate-300", children: [job.status, " \u00B7 imported ", job.imported_count, " \u00B7 linked ", job.linked_count, " \u00B7 updated ", job.updated_count] })] }, job.id))) })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Recent Federation Events" }), _jsx("div", { className: "space-y-2", children: events.slice(0, 5).map((event) => (_jsxs("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: event.kind }), _jsx("div", { className: "mt-1 text-slate-600 dark:text-slate-300", children: event.summary })] }, event.id))) })] })] }) })] })] }))] }));
}
function Panel({ title, description, icon, children }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200", children: icon }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400", children: description })] })] }), _jsx("div", { className: "mt-5", children: children })] }));
}
function FormCard({ title, description, children }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 p-5 dark:border-slate-800", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400", children: description }), _jsx("div", { className: "mt-5", children: children })] }));
}
function LabeledInput({ label, value, onChange }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-900 dark:text-white", children: label }), _jsx("input", { value: value, onChange: (event) => onChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" })] }));
}
function LabeledTextarea({ label, value, onChange, rows }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-900 dark:text-white", children: label }), _jsx("textarea", { value: value, rows: rows ?? 4, onChange: (event) => onChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" })] }));
}
function LabeledSelect({ label, value, onChange, options, }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-900 dark:text-white", children: label }), _jsx("select", { value: value, onChange: (event) => onChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", children: options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }));
}
function LabeledMultiSelect({ label, values, onChange, options, }) {
    return (_jsxs("label", { className: "block space-y-2", children: [_jsx("span", { className: "text-sm font-medium text-slate-900 dark:text-white", children: label }), _jsx("select", { multiple: true, value: values, onChange: (event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value)), className: "min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", children: options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }));
}
