import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck, Waypoints } from 'lucide-react';
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
function emptyClientForm() {
    return {
        id: null,
        clientId: '',
        name: '',
        summary: '',
        protocol: 'OIDC',
        accessType: 'CONFIDENTIAL',
        redirectUris: '',
        baseUrl: '',
        rootUrl: '',
        defaultScopeIds: [],
        optionalScopeIds: [],
        directMapperIds: [],
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
        serviceAccountEnabled: false,
    };
}
function emptyScopeForm() {
    return {
        id: null,
        name: '',
        description: '',
        protocol: 'OIDC',
        assignmentType: 'DEFAULT',
        status: 'ACTIVE',
        protocolMapperIds: [],
        assignedClientIds: [],
    };
}
function emptyMapperForm() {
    return {
        id: null,
        name: '',
        protocol: 'OIDC',
        targetKind: 'CLIENT_SCOPE',
        targetId: '',
        sourceKind: 'USERNAME',
        claimName: '',
        userProperty: '',
        staticValue: '',
        multivalued: false,
        includeInAccessToken: true,
        includeInIdToken: true,
        includeInUserinfo: false,
        status: 'ACTIVE',
    };
}
function emptyTokenTest() {
    return {
        clientId: '',
        clientSecret: '',
        grantType: 'client_credentials',
        username: '',
        password: '',
        scope: 'openid profile email roles',
        accessToken: '',
        refreshToken: '',
        samlClientId: '',
        samlUsername: '',
        samlPassword: '',
    };
}
function buildClientForm(client) {
    return {
        id: client.id,
        clientId: client.client_id,
        name: client.name,
        summary: client.summary,
        protocol: client.protocol,
        accessType: client.access_type,
        redirectUris: formatList(client.redirect_uris),
        baseUrl: client.base_url ?? '',
        rootUrl: client.root_url ?? '',
        defaultScopeIds: client.default_scope_ids,
        optionalScopeIds: client.optional_scope_ids,
        directMapperIds: client.direct_protocol_mapper_ids,
        standardFlowEnabled: client.standard_flow_enabled,
        directAccessGrantsEnabled: client.direct_access_grants_enabled,
        serviceAccountEnabled: client.service_account_enabled,
    };
}
function buildScopeForm(scope) {
    return {
        id: scope.id,
        name: scope.name,
        description: scope.description,
        protocol: scope.protocol,
        assignmentType: scope.assignment_type,
        status: scope.status,
        protocolMapperIds: scope.protocol_mapper_ids,
        assignedClientIds: scope.assigned_client_ids,
    };
}
function buildMapperForm(mapper) {
    return {
        id: mapper.id,
        name: mapper.name,
        protocol: mapper.protocol,
        targetKind: mapper.target_kind,
        targetId: mapper.target_id,
        sourceKind: mapper.source_kind,
        claimName: mapper.claim_name,
        userProperty: mapper.user_property ?? '',
        staticValue: mapper.static_value ?? '',
        multivalued: mapper.multivalued,
        includeInAccessToken: mapper.include_in_access_token,
        includeInIdToken: mapper.include_in_id_token,
        includeInUserinfo: mapper.include_in_userinfo,
        status: mapper.status,
    };
}
export function IamProtocolRuntimePanel({ selectedRealmId, canManage, }) {
    const [clients, setClients] = useState([]);
    const [clientScopes, setClientScopes] = useState([]);
    const [protocolMappers, setProtocolMappers] = useState([]);
    const [serviceAccounts, setServiceAccounts] = useState([]);
    const [issuedTokens, setIssuedTokens] = useState([]);
    const [samlSessions, setSamlSessions] = useState([]);
    const [discoveryIssuer, setDiscoveryIssuer] = useState(null);
    const [clientForm, setClientForm] = useState(emptyClientForm);
    const [scopeForm, setScopeForm] = useState(emptyScopeForm);
    const [mapperForm, setMapperForm] = useState(emptyMapperForm);
    const [tokenTest, setTokenTest] = useState(emptyTokenTest);
    const [lastIssuedSecret, setLastIssuedSecret] = useState(null);
    const [tokenResponse, setTokenResponse] = useState(null);
    const [introspectionSummary, setIntrospectionSummary] = useState(null);
    const [samlSummary, setSamlSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingClient, setIsSavingClient] = useState(false);
    const [isSavingScope, setIsSavingScope] = useState(false);
    const [isSavingMapper, setIsSavingMapper] = useState(false);
    const [isRunningTokenTest, setIsRunningTokenTest] = useState(false);
    const loadRuntime = async () => {
        if (!selectedRealmId) {
            setClients([]);
            setClientScopes([]);
            setProtocolMappers([]);
            setServiceAccounts([]);
            setIssuedTokens([]);
            setSamlSessions([]);
            setDiscoveryIssuer(null);
            return;
        }
        setIsLoading(true);
        try {
            const [clientResponse, scopeResponse, mapperResponse, serviceAccountResponse, tokenResponse, samlSessionResponse, discovery] = await Promise.all([
                idpApi.listIamClients({ realmId: selectedRealmId }),
                idpApi.listIamClientScopes({ realmId: selectedRealmId }),
                idpApi.listIamProtocolMappers({ realmId: selectedRealmId }),
                idpApi.listIamServiceAccounts({ realmId: selectedRealmId }),
                idpApi.listIamIssuedTokens({ realmId: selectedRealmId }),
                idpApi.listIamSamlSessions(selectedRealmId),
                idpApi.getIamOidcDiscovery(selectedRealmId).catch(() => null),
            ]);
            setClients(clientResponse.clients);
            setClientScopes(scopeResponse.client_scopes);
            setProtocolMappers(mapperResponse.protocol_mappers);
            setServiceAccounts(serviceAccountResponse.service_accounts);
            setIssuedTokens(tokenResponse.issued_tokens);
            setSamlSessions(samlSessionResponse.sessions);
            setDiscoveryIssuer(discovery?.issuer ?? null);
            setTokenTest((current) => ({
                ...current,
                clientId: current.clientId || clientResponse.clients[0]?.client_id || '',
                samlClientId: current.samlClientId || clientResponse.clients.find((client) => client.protocol === 'SAML')?.client_id || '',
            }));
        }
        catch (error) {
            console.error('Failed to load IAM protocol runtime', error);
            toast.error('Failed to load IAM protocol runtime');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadRuntime();
    }, [selectedRealmId]);
    const clientOptions = useMemo(() => clients.map((client) => ({ value: client.id, label: `${client.client_id} · ${client.protocol}` })), [clients]);
    const scopeOptions = useMemo(() => clientScopes.map((scope) => ({ value: scope.id, label: `${scope.name} · ${scope.protocol}` })), [clientScopes]);
    const mapperOptions = useMemo(() => protocolMappers.map((mapper) => ({ value: mapper.id, label: `${mapper.name} · ${mapper.claim_name}` })), [protocolMappers]);
    const handleClientSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsSavingClient(true);
        try {
            if (clientForm.id) {
                const payload = {
                    name: clientForm.name.trim(),
                    summary: clientForm.summary.trim(),
                    redirect_uris: parseList(clientForm.redirectUris),
                    base_url: clientForm.baseUrl || null,
                    root_url: clientForm.rootUrl || null,
                    default_scope_ids: clientForm.defaultScopeIds,
                    optional_scope_ids: clientForm.optionalScopeIds,
                    direct_protocol_mapper_ids: clientForm.directMapperIds,
                    standard_flow_enabled: clientForm.standardFlowEnabled,
                    direct_access_grants_enabled: clientForm.directAccessGrantsEnabled,
                    service_account_enabled: clientForm.serviceAccountEnabled,
                };
                await idpApi.updateIamClient(clientForm.id, payload);
                toast.success('IAM client updated');
            }
            else {
                const payload = {
                    realm_id: selectedRealmId,
                    client_id: clientForm.clientId.trim(),
                    name: clientForm.name.trim(),
                    summary: clientForm.summary.trim(),
                    protocol: clientForm.protocol,
                    access_type: clientForm.accessType,
                    redirect_uris: parseList(clientForm.redirectUris),
                    base_url: clientForm.baseUrl || null,
                    root_url: clientForm.rootUrl || null,
                    default_scope_ids: clientForm.defaultScopeIds,
                    optional_scope_ids: clientForm.optionalScopeIds,
                    direct_protocol_mapper_ids: clientForm.directMapperIds,
                    standard_flow_enabled: clientForm.standardFlowEnabled,
                    direct_access_grants_enabled: clientForm.directAccessGrantsEnabled,
                    service_account_enabled: clientForm.serviceAccountEnabled,
                };
                const result = await idpApi.createIamClient(payload);
                setLastIssuedSecret(result.issued_client_secret);
                toast.success('IAM client created');
            }
            setClientForm(emptyClientForm());
            await loadRuntime();
        }
        catch (error) {
            console.error('Failed to save IAM client', error);
            toast.error('Failed to save IAM client');
        }
        finally {
            setIsSavingClient(false);
        }
    };
    const handleScopeSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsSavingScope(true);
        try {
            if (scopeForm.id) {
                const payload = {
                    description: scopeForm.description.trim(),
                    status: scopeForm.status,
                    protocol_mapper_ids: scopeForm.protocolMapperIds,
                    assigned_client_ids: scopeForm.assignedClientIds,
                };
                await idpApi.updateIamClientScope(scopeForm.id, payload);
                toast.success('IAM client scope updated');
            }
            else {
                const payload = {
                    realm_id: selectedRealmId,
                    name: scopeForm.name.trim(),
                    description: scopeForm.description.trim(),
                    protocol: scopeForm.protocol,
                    assignment_type: scopeForm.assignmentType,
                    status: scopeForm.status,
                    protocol_mapper_ids: scopeForm.protocolMapperIds,
                    assigned_client_ids: scopeForm.assignedClientIds,
                };
                await idpApi.createIamClientScope(payload);
                toast.success('IAM client scope created');
            }
            setScopeForm(emptyScopeForm());
            await loadRuntime();
        }
        catch (error) {
            console.error('Failed to save IAM client scope', error);
            toast.error('Failed to save IAM client scope');
        }
        finally {
            setIsSavingScope(false);
        }
    };
    const handleMapperSubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsSavingMapper(true);
        try {
            if (mapperForm.id) {
                const payload = {
                    name: mapperForm.name.trim(),
                    claim_name: mapperForm.claimName.trim(),
                    user_property: mapperForm.userProperty || null,
                    static_value: mapperForm.staticValue || null,
                    multivalued: mapperForm.multivalued,
                    include_in_access_token: mapperForm.includeInAccessToken,
                    include_in_id_token: mapperForm.includeInIdToken,
                    include_in_userinfo: mapperForm.includeInUserinfo,
                    status: mapperForm.status,
                };
                await idpApi.updateIamProtocolMapper(mapperForm.id, payload);
                toast.success('IAM protocol mapper updated');
            }
            else {
                const payload = {
                    realm_id: selectedRealmId,
                    name: mapperForm.name.trim(),
                    protocol: mapperForm.protocol,
                    target_kind: mapperForm.targetKind,
                    target_id: mapperForm.targetId,
                    source_kind: mapperForm.sourceKind,
                    claim_name: mapperForm.claimName.trim(),
                    user_property: mapperForm.userProperty || null,
                    static_value: mapperForm.staticValue || null,
                    multivalued: mapperForm.multivalued,
                    include_in_access_token: mapperForm.includeInAccessToken,
                    include_in_id_token: mapperForm.includeInIdToken,
                    include_in_userinfo: mapperForm.includeInUserinfo,
                    status: mapperForm.status,
                };
                await idpApi.createIamProtocolMapper(payload);
                toast.success('IAM protocol mapper created');
            }
            setMapperForm(emptyMapperForm());
            await loadRuntime();
        }
        catch (error) {
            console.error('Failed to save IAM protocol mapper', error);
            toast.error('Failed to save IAM protocol mapper');
        }
        finally {
            setIsSavingMapper(false);
        }
    };
    const handleRotateSecret = async (clientId) => {
        try {
            const result = await idpApi.rotateIamClientSecret(clientId);
            setLastIssuedSecret(result.issued_client_secret);
            toast.success('Client secret rotated');
            await loadRuntime();
        }
        catch (error) {
            console.error('Failed to rotate IAM client secret', error);
            toast.error('Failed to rotate IAM client secret');
        }
    };
    const handleTokenIssue = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsRunningTokenTest(true);
        try {
            const request = {
                grant_type: tokenTest.grantType,
                scope: tokenTest.scope,
            };
            let basicClientAuth;
            if (tokenTest.clientId) {
                request.client_id = tokenTest.clientId;
            }
            if (tokenTest.clientSecret) {
                request.client_secret = tokenTest.clientSecret;
                basicClientAuth = {
                    clientId: tokenTest.clientId,
                    clientSecret: tokenTest.clientSecret,
                };
            }
            if (tokenTest.grantType === 'password') {
                request.username = tokenTest.username;
                request.password = tokenTest.password;
            }
            const response = await idpApi.issueIamToken(selectedRealmId, request, basicClientAuth ? { basicClientAuth } : undefined);
            const introspection = await idpApi.introspectIamToken(selectedRealmId, { token: response.access_token, client_id: tokenTest.clientId, client_secret: tokenTest.clientSecret }, basicClientAuth ? { basicClientAuth } : undefined);
            setTokenResponse(response);
            setIntrospectionSummary(introspection);
            toast.success('Protocol validation token issued');
            await loadRuntime();
        }
        catch (error) {
            console.error('Failed to issue IAM token', error);
            toast.error('Failed to issue IAM token');
        }
        finally {
            setIsRunningTokenTest(false);
        }
    };
    const handleSamlLogin = async (event) => {
        event.preventDefault();
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsRunningTokenTest(true);
        try {
            const response = await idpApi.loginIamSaml(selectedRealmId, {
                client_id: tokenTest.samlClientId,
                username: tokenTest.samlUsername,
                password: tokenTest.samlPassword,
            });
            setSamlSummary({
                client_id: response.client_id,
                acs_url: response.acs_url,
                session_index: response.session_index,
                relay_state: response.relay_state,
                saml_response_preview: `${response.saml_response.slice(0, 80)}…`,
            });
            toast.success('Synthetic SAML login succeeded');
        }
        catch (error) {
            console.error('Failed to perform SAML login', error);
            toast.error('Failed to perform SAML login');
        }
        finally {
            setIsRunningTokenTest(false);
        }
    };
    if (!selectedRealmId) {
        return null;
    }
    return (_jsxs("section", { className: "space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-950/40 dark:text-sky-200", children: [_jsx(Waypoints, { className: "h-3.5 w-3.5" }), "Phase 2-3 Client and Protocol Runtime"] }), _jsx("h2", { className: "mt-3 text-xl font-semibold text-slate-900 dark:text-white", children: "Clients, Scopes, Mappers, and Standards Runtime" }), _jsx("p", { className: "mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400", children: "This phase adds standalone application clients, scope catalogs, mapper-driven claims, service accounts, OIDC discovery, JWKS, token issuance, introspection, revocation, SP-initiated SAML browser handoff, SAML session tracking, logout lifecycle, and a retained synthetic SAML diagnostic flow for direct validation." }), discoveryIssuer && (_jsxs("p", { className: "mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400", children: ["Issuer: ", discoveryIssuer] }))] }), lastIssuedSecret && (_jsxs("div", { className: "max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100", children: [_jsx("div", { className: "font-semibold uppercase tracking-[0.16em]", children: "Newest client secret" }), _jsx("div", { className: "mt-2 break-all font-mono", children: lastIssuedSecret })] }))] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: [_jsx(RuntimeMetric, { label: "Clients", value: String(clients.length), icon: Waypoints }), _jsx(RuntimeMetric, { label: "Scopes", value: String(clientScopes.length), icon: ShieldCheck }), _jsx(RuntimeMetric, { label: "Mappers", value: String(protocolMappers.length), icon: KeyRound }), _jsx(RuntimeMetric, { label: "Tokens", value: String(issuedTokens.length), icon: LockKeyhole }), _jsx(RuntimeMetric, { label: "SAML Sessions", value: String(samlSessions.length), icon: ShieldCheck })] }), isLoading ? (_jsx("div", { className: "rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400", children: "Loading protocol runtime\u2026" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.1fr_0.9fr]", children: [_jsxs("div", { className: "space-y-6", children: [_jsx(RuntimeTable, { title: "Clients", rows: clients.map((client) => ({
                                            key: client.id,
                                            primary: client.client_id,
                                            secondary: `${client.protocol} · ${client.access_type}`,
                                            detail: `${client.default_scope_ids.length} default scopes · ${client.optional_scope_ids.length} optional scopes`,
                                            actions: (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setClientForm(buildClientForm(client)), className: "rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }), canManage && client.access_type === 'CONFIDENTIAL' && (_jsx("button", { type: "button", onClick: () => void handleRotateSecret(client.id), className: "rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Rotate Secret" }))] })),
                                        })) }), _jsx(RuntimeTable, { title: "Client Scopes", rows: clientScopes.map((scope) => ({
                                            key: scope.id,
                                            primary: scope.name,
                                            secondary: `${scope.protocol} · ${scope.assignment_type}`,
                                            detail: `${scope.protocol_mapper_ids.length} mappers · ${scope.assigned_client_ids.length} clients`,
                                            actions: (_jsx("button", { type: "button", onClick: () => setScopeForm(buildScopeForm(scope)), className: "rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })),
                                        })) }), _jsx(RuntimeTable, { title: "Protocol Mappers", rows: protocolMappers.map((mapper) => ({
                                            key: mapper.id,
                                            primary: mapper.name,
                                            secondary: `${mapper.protocol} · ${mapper.target_kind} · ${mapper.claim_name}`,
                                            detail: `${mapper.source_kind}${mapper.multivalued ? ' · multivalued' : ''}`,
                                            actions: (_jsx("button", { type: "button", onClick: () => setMapperForm(buildMapperForm(mapper)), className: "rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })),
                                        })) })] }), _jsxs("div", { className: "space-y-6", children: [_jsx(FormPanel, { title: clientForm.id ? 'Edit Client' : 'Create Client', children: _jsxs("form", { className: "space-y-4", onSubmit: handleClientSubmit, children: [!clientForm.id && _jsx(Field, { label: "Client ID", value: clientForm.clientId, onChange: (value) => setClientForm((current) => ({ ...current, clientId: value })) }), _jsx(Field, { label: "Name", value: clientForm.name, onChange: (value) => setClientForm((current) => ({ ...current, name: value })) }), _jsx(Field, { label: "Summary", value: clientForm.summary, onChange: (value) => setClientForm((current) => ({ ...current, summary: value })) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(SelectField, { label: "Protocol", value: clientForm.protocol, onChange: (value) => setClientForm((current) => ({ ...current, protocol: value })), options: ['OIDC', 'SAML'] }), !clientForm.id && (_jsx(SelectField, { label: "Access Type", value: clientForm.accessType, onChange: (value) => setClientForm((current) => ({ ...current, accessType: value })), options: ['CONFIDENTIAL', 'PUBLIC', 'BEARER_ONLY'] }))] }), _jsx(Field, { label: "Redirect URIs", value: clientForm.redirectUris, onChange: (value) => setClientForm((current) => ({ ...current, redirectUris: value })), placeholder: "Comma-separated" }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "Base URL", value: clientForm.baseUrl, onChange: (value) => setClientForm((current) => ({ ...current, baseUrl: value })) }), _jsx(Field, { label: "Root URL", value: clientForm.rootUrl, onChange: (value) => setClientForm((current) => ({ ...current, rootUrl: value })) })] }), _jsx(MultiSelectField, { label: "Default Scopes", value: clientForm.defaultScopeIds, onChange: (value) => setClientForm((current) => ({ ...current, defaultScopeIds: value })), options: scopeOptions }), _jsx(MultiSelectField, { label: "Optional Scopes", value: clientForm.optionalScopeIds, onChange: (value) => setClientForm((current) => ({ ...current, optionalScopeIds: value })), options: scopeOptions }), _jsx(MultiSelectField, { label: "Direct Mappers", value: clientForm.directMapperIds, onChange: (value) => setClientForm((current) => ({ ...current, directMapperIds: value })), options: mapperOptions }), _jsx(ToggleRow, { label: "Standard Flow Enabled", checked: clientForm.standardFlowEnabled, onChange: (checked) => setClientForm((current) => ({ ...current, standardFlowEnabled: checked })) }), _jsx(ToggleRow, { label: "Direct Access Grants Enabled", checked: clientForm.directAccessGrantsEnabled, onChange: (checked) => setClientForm((current) => ({ ...current, directAccessGrantsEnabled: checked })) }), _jsx(ToggleRow, { label: "Service Account Enabled", checked: clientForm.serviceAccountEnabled, onChange: (checked) => setClientForm((current) => ({ ...current, serviceAccountEnabled: checked })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { disabled: !canManage || isSavingClient, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900", children: isSavingClient ? 'Saving…' : clientForm.id ? 'Update Client' : 'Create Client' }), _jsx("button", { type: "button", onClick: () => setClientForm(emptyClientForm()), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Reset" })] })] }) }), _jsx(FormPanel, { title: scopeForm.id ? 'Edit Client Scope' : 'Create Client Scope', children: _jsxs("form", { className: "space-y-4", onSubmit: handleScopeSubmit, children: [!scopeForm.id && _jsx(Field, { label: "Name", value: scopeForm.name, onChange: (value) => setScopeForm((current) => ({ ...current, name: value })) }), _jsx(Field, { label: "Description", value: scopeForm.description, onChange: (value) => setScopeForm((current) => ({ ...current, description: value })) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [!scopeForm.id && (_jsx(SelectField, { label: "Protocol", value: scopeForm.protocol, onChange: (value) => setScopeForm((current) => ({ ...current, protocol: value })), options: ['OIDC', 'SAML'] })), _jsx(SelectField, { label: "Assignment", value: scopeForm.assignmentType, onChange: (value) => setScopeForm((current) => ({ ...current, assignmentType: value })), options: ['DEFAULT', 'OPTIONAL'] })] }), _jsx(MultiSelectField, { label: "Protocol Mappers", value: scopeForm.protocolMapperIds, onChange: (value) => setScopeForm((current) => ({ ...current, protocolMapperIds: value })), options: mapperOptions }), _jsx(MultiSelectField, { label: "Assigned Clients", value: scopeForm.assignedClientIds, onChange: (value) => setScopeForm((current) => ({ ...current, assignedClientIds: value })), options: clientOptions }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { disabled: !canManage || isSavingScope, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900", children: isSavingScope ? 'Saving…' : scopeForm.id ? 'Update Scope' : 'Create Scope' }), _jsx("button", { type: "button", onClick: () => setScopeForm(emptyScopeForm()), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Reset" })] })] }) }), _jsx(FormPanel, { title: mapperForm.id ? 'Edit Protocol Mapper' : 'Create Protocol Mapper', children: _jsxs("form", { className: "space-y-4", onSubmit: handleMapperSubmit, children: [_jsx(Field, { label: "Name", value: mapperForm.name, onChange: (value) => setMapperForm((current) => ({ ...current, name: value })) }), _jsx(Field, { label: "Claim Name", value: mapperForm.claimName, onChange: (value) => setMapperForm((current) => ({ ...current, claimName: value })) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(SelectField, { label: "Protocol", value: mapperForm.protocol, onChange: (value) => setMapperForm((current) => ({ ...current, protocol: value })), options: ['OIDC', 'SAML'] }), _jsx(SelectField, { label: "Target Kind", value: mapperForm.targetKind, onChange: (value) => setMapperForm((current) => ({ ...current, targetKind: value, targetId: '' })), options: ['CLIENT', 'CLIENT_SCOPE'] })] }), _jsx(SelectField, { label: "Target", value: mapperForm.targetId, onChange: (value) => setMapperForm((current) => ({ ...current, targetId: value })), options: (mapperForm.targetKind === 'CLIENT' ? clientOptions : scopeOptions).map((option) => option.value), labels: Object.fromEntries((mapperForm.targetKind === 'CLIENT' ? clientOptions : scopeOptions).map((option) => [option.value, option.label])) }), _jsx(SelectField, { label: "Source", value: mapperForm.sourceKind, onChange: (value) => setMapperForm((current) => ({ ...current, sourceKind: value })), options: ['USERNAME', 'USER_PROPERTY', 'SUBJECT_ID', 'REALM_ROLE_NAMES', 'GROUP_NAMES', 'STATIC_VALUE', 'CLIENT_ID', 'SERVICE_ACCOUNT'] }), mapperForm.sourceKind === 'USER_PROPERTY' && (_jsx(Field, { label: "User Property", value: mapperForm.userProperty, onChange: (value) => setMapperForm((current) => ({ ...current, userProperty: value })), placeholder: "email / first_name / last_name" })), mapperForm.sourceKind === 'STATIC_VALUE' && (_jsx(Field, { label: "Static Value", value: mapperForm.staticValue, onChange: (value) => setMapperForm((current) => ({ ...current, staticValue: value })) })), _jsx(ToggleRow, { label: "Multivalued", checked: mapperForm.multivalued, onChange: (checked) => setMapperForm((current) => ({ ...current, multivalued: checked })) }), _jsx(ToggleRow, { label: "Include in Access Token", checked: mapperForm.includeInAccessToken, onChange: (checked) => setMapperForm((current) => ({ ...current, includeInAccessToken: checked })) }), _jsx(ToggleRow, { label: "Include in ID Token", checked: mapperForm.includeInIdToken, onChange: (checked) => setMapperForm((current) => ({ ...current, includeInIdToken: checked })) }), _jsx(ToggleRow, { label: "Include in Userinfo", checked: mapperForm.includeInUserinfo, onChange: (checked) => setMapperForm((current) => ({ ...current, includeInUserinfo: checked })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { disabled: !canManage || isSavingMapper, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900", children: isSavingMapper ? 'Saving…' : mapperForm.id ? 'Update Mapper' : 'Create Mapper' }), _jsx("button", { type: "button", onClick: () => setMapperForm(emptyMapperForm()), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200", children: "Reset" })] })] }) })] })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[0.88fr_1.12fr]", children: [_jsx(FormPanel, { title: "Protocol Validation", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("form", { className: "space-y-4", onSubmit: handleTokenIssue, children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400", children: "OIDC / OAuth Token Test" }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "Client ID", value: tokenTest.clientId, onChange: (value) => setTokenTest((current) => ({ ...current, clientId: value })) }), _jsx(Field, { label: "Client Secret", value: tokenTest.clientSecret, onChange: (value) => setTokenTest((current) => ({ ...current, clientSecret: value })) })] }), _jsx(SelectField, { label: "Grant Type", value: tokenTest.grantType, onChange: (value) => setTokenTest((current) => ({ ...current, grantType: value })), options: ['client_credentials', 'password'] }), tokenTest.grantType === 'password' && (_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "Username", value: tokenTest.username, onChange: (value) => setTokenTest((current) => ({ ...current, username: value })) }), _jsx(Field, { label: "Password", value: tokenTest.password, onChange: (value) => setTokenTest((current) => ({ ...current, password: value })) })] })), _jsx(Field, { label: "Scope", value: tokenTest.scope, onChange: (value) => setTokenTest((current) => ({ ...current, scope: value })) }), _jsx("button", { disabled: isRunningTokenTest, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900", children: isRunningTokenTest ? 'Running…' : 'Issue and Introspect Token' })] }), _jsxs("form", { className: "space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800", onSubmit: handleSamlLogin, children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400", children: "SAML Diagnostic Login" }), _jsx(Field, { label: "SAML Client ID", value: tokenTest.samlClientId, onChange: (value) => setTokenTest((current) => ({ ...current, samlClientId: value })) }), _jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(Field, { label: "Username", value: tokenTest.samlUsername, onChange: (value) => setTokenTest((current) => ({ ...current, samlUsername: value })) }), _jsx(Field, { label: "Password", value: tokenTest.samlPassword, onChange: (value) => setTokenTest((current) => ({ ...current, samlPassword: value })) })] }), _jsx("button", { disabled: isRunningTokenTest, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200", children: "Run Diagnostic SAML Login" })] })] }) }), _jsxs("div", { className: "space-y-6", children: [_jsx(JsonPanel, { title: "Token Response", value: tokenResponse }), _jsx(JsonPanel, { title: "Introspection", value: introspectionSummary }), _jsx(JsonPanel, { title: "SAML Response", value: samlSummary })] })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-2", children: [_jsx(RuntimeTable, { title: "Service Accounts", rows: serviceAccounts.map((account) => ({
                                    key: account.id,
                                    primary: account.username,
                                    secondary: account.client_id,
                                    detail: `${account.role_ids.length} roles · ${account.status}`,
                                })) }), _jsx(RuntimeTable, { title: "Issued Tokens", rows: issuedTokens.slice(0, 8).map((token) => ({
                                    key: token.id,
                                    primary: token.client_id,
                                    secondary: `${token.grant_type} · ${token.subject_kind}`,
                                    detail: `${token.status} · expires ${new Date(token.expires_at).toLocaleString()}`,
                                })) }), _jsx(RuntimeTable, { title: "SAML Sessions", rows: samlSessions.slice(0, 8).map((session) => ({
                                    key: session.id,
                                    primary: session.client_id,
                                    secondary: `${session.status} · ${session.session_index}`,
                                    detail: `browser ${session.browser_session_id} · created ${new Date(session.created_at).toLocaleString()}`,
                                })) })] })] }))] }));
}
function RuntimeMetric({ label, value, icon: Icon }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400", children: label }), _jsx(Icon, { className: "h-4 w-4 text-slate-500 dark:text-slate-400" })] }), _jsx("div", { className: "mt-3 text-2xl font-semibold text-slate-900 dark:text-white", children: value })] }));
}
function RuntimeTable({ title, rows, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: title }), _jsx("div", { className: "mt-4 space-y-3", children: rows.length === 0 ? (_jsx("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: "No records yet." })) : rows.map((row) => (_jsx("div", { className: "rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900", children: _jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: row.primary }), _jsx("div", { className: "text-xs text-slate-500 dark:text-slate-400", children: row.secondary }), _jsx("div", { className: "mt-1 text-xs text-slate-600 dark:text-slate-300", children: row.detail })] }), row.actions] }) }, row.key))) })] }));
}
function FormPanel({ title, children }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: title }), _jsx("div", { className: "mt-4", children: children })] }));
}
function Field({ label, value, onChange, placeholder, }) {
    return (_jsxs("label", { className: "block text-sm", children: [_jsx("span", { className: "mb-2 block font-medium text-slate-700 dark:text-slate-200", children: label }), _jsx("input", { value: value, onChange: (event) => onChange(event.target.value), placeholder: placeholder, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" })] }));
}
function SelectField({ label, value, onChange, options, labels, }) {
    return (_jsxs("label", { className: "block text-sm", children: [_jsx("span", { className: "mb-2 block font-medium text-slate-700 dark:text-slate-200", children: label }), _jsxs("select", { value: value, onChange: (event) => onChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", children: [_jsx("option", { value: "", children: "Select\u2026" }), options.map((option) => (_jsx("option", { value: option, children: labels?.[option] ?? option }, option)))] })] }));
}
function MultiSelectField({ label, value, onChange, options, }) {
    return (_jsxs("label", { className: "block text-sm", children: [_jsx("span", { className: "mb-2 block font-medium text-slate-700 dark:text-slate-200", children: label }), _jsx("select", { multiple: true, value: value, onChange: (event) => onChange(Array.from(event.target.selectedOptions).map((option) => option.value)), className: "min-h-[7rem] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100", children: options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }));
}
function ToggleRow({ label, checked, onChange, }) {
    return (_jsxs("label", { className: "flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("span", { className: "font-medium text-slate-700 dark:text-slate-200", children: label }), _jsx("input", { type: "checkbox", checked: checked, onChange: (event) => onChange(event.target.checked) })] }));
}
function JsonPanel({ title, value }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950", children: [_jsx("div", { className: "text-sm font-semibold text-slate-900 dark:text-white", children: title }), _jsx("pre", { className: "mt-4 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200", children: JSON.stringify(value ?? { state: 'idle' }, null, 2) })] }));
}
