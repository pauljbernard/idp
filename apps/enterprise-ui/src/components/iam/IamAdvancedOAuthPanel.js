import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, KeyRound, Plus, Smartphone, Waypoints } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../../services/standaloneApi';
function emptyPolicyForm() {
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
    };
}
function buildPolicyForm(policy) {
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
    };
}
function emptyInitialAccessTokenForm() {
    return {
        policyId: '',
        label: 'Phase B Dynamic Registration',
        maxUses: '10',
        expiresInHours: '24',
    };
}
function emptyDynamicRegistrationForm() {
    return {
        clientName: 'Phase B Validation Client',
        clientId: '',
        redirectUri: 'http://localhost:3004/oidc/callback',
        grantTypes: 'authorization_code refresh_token',
        tokenEndpointAuthMethod: 'none',
        scope: 'openid profile email',
    };
}
function emptyProtocolHarness() {
    return {
        clientId: 'training-portal-demo',
        clientSecret: '',
        redirectUri: 'http://localhost:3004/training/callback',
        scope: 'openid profile email',
        subjectToken: '',
        audience: 'admin-console-demo',
    };
}
function parseCsv(value) {
    return value
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function toggleItem(list, id) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}
function MetricCard({ label, value, detail, icon, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: icon })] }), _jsx("div", { className: "mt-3 text-2xl font-semibold text-slate-900 dark:text-white", children: value }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
function Section({ title, description, children, }) {
    return (_jsxs("section", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), children] }));
}
export function IamAdvancedOAuthPanel({ selectedRealmId, canManage, }) {
    const [clients, setClients] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [initialAccessTokens, setInitialAccessTokens] = useState([]);
    const [parRequests, setParRequests] = useState([]);
    const [deviceAuthorizations, setDeviceAuthorizations] = useState([]);
    const [tokenExchanges, setTokenExchanges] = useState([]);
    const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
    const [initialAccessTokenForm, setInitialAccessTokenForm] = useState(emptyInitialAccessTokenForm);
    const [dynamicRegistrationForm, setDynamicRegistrationForm] = useState(emptyDynamicRegistrationForm);
    const [protocolHarness, setProtocolHarness] = useState(emptyProtocolHarness);
    const [latestInitialAccessToken, setLatestInitialAccessToken] = useState('');
    const [lastRegistration, setLastRegistration] = useState(null);
    const [parResult, setParResult] = useState(null);
    const [deviceResult, setDeviceResult] = useState(null);
    const [tokenExchangeResult, setTokenExchangeResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const [isIssuingInitialAccessToken, setIsIssuingInitialAccessToken] = useState(false);
    const [isRegisteringClient, setIsRegisteringClient] = useState(false);
    const [isRunningPar, setIsRunningPar] = useState(false);
    const [isRunningDeviceAuth, setIsRunningDeviceAuth] = useState(false);
    const [isRunningTokenExchange, setIsRunningTokenExchange] = useState(false);
    const loadRuntime = async () => {
        if (!selectedRealmId) {
            setClients([]);
            setPolicies([]);
            setInitialAccessTokens([]);
            setParRequests([]);
            setDeviceAuthorizations([]);
            setTokenExchanges([]);
            return;
        }
        setIsLoading(true);
        try {
            const [clientResponse, policyResponse, tokenResponse, parResponse, deviceResponse, tokenExchangeResponse,] = await Promise.all([
                idpApi.listIamClients({ realmId: selectedRealmId, protocol: 'OIDC' }),
                idpApi.listIamClientPolicies({ realmId: selectedRealmId }),
                idpApi.listIamInitialAccessTokens({ realmId: selectedRealmId }),
                idpApi.listIamPushedAuthorizationRequests({ realmId: selectedRealmId }),
                idpApi.listIamDeviceAuthorizations({ realmId: selectedRealmId }),
                idpApi.listIamTokenExchanges({ realmId: selectedRealmId }),
            ]);
            setClients(clientResponse.clients);
            setPolicies(policyResponse.client_policies);
            setInitialAccessTokens(tokenResponse.tokens);
            setParRequests(parResponse.requests);
            setDeviceAuthorizations(deviceResponse.device_authorizations);
            setTokenExchanges(tokenExchangeResponse.token_exchanges);
            if (!initialAccessTokenForm.policyId && policyResponse.client_policies[0]) {
                setInitialAccessTokenForm((current) => ({ ...current, policyId: policyResponse.client_policies[0].id }));
            }
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to load advanced OAuth runtime');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadRuntime();
    }, [selectedRealmId]);
    const selectedClientOptions = useMemo(() => clients.map((client) => ({ id: client.id, label: `${client.name} (${client.client_id})`, client })), [clients]);
    const handlePolicySubmit = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setIsSavingPolicy(true);
        try {
            const payload = {
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
            };
            if (policyForm.id) {
                await idpApi.updateIamClientPolicy(policyForm.id, payload);
                toast.success('Client policy updated');
            }
            else {
                await idpApi.createIamClientPolicy(payload);
                toast.success('Client policy created');
            }
            setPolicyForm(emptyPolicyForm());
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to save client policy');
        }
        finally {
            setIsSavingPolicy(false);
        }
    };
    const handleIssueInitialAccessToken = async (event) => {
        event.preventDefault();
        if (!selectedRealmId)
            return;
        setIsIssuingInitialAccessToken(true);
        try {
            const request = {
                realm_id: selectedRealmId,
                policy_id: initialAccessTokenForm.policyId,
                label: initialAccessTokenForm.label,
                max_uses: initialAccessTokenForm.maxUses ? Number(initialAccessTokenForm.maxUses) : null,
                expires_in_hours: initialAccessTokenForm.expiresInHours ? Number(initialAccessTokenForm.expiresInHours) : null,
            };
            const response = await idpApi.issueIamInitialAccessToken(request);
            setLatestInitialAccessToken(response.issued_token);
            toast.success('Initial access token issued');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to issue initial access token');
        }
        finally {
            setIsIssuingInitialAccessToken(false);
        }
    };
    const handleDynamicRegistration = async (event) => {
        event.preventDefault();
        if (!selectedRealmId || !latestInitialAccessToken) {
            toast.error('Issue an initial access token first');
            return;
        }
        setIsRegisteringClient(true);
        try {
            const response = await idpApi.dynamicallyRegisterIamClient(selectedRealmId, {
                client_name: dynamicRegistrationForm.clientName,
                client_id: dynamicRegistrationForm.clientId || undefined,
                redirect_uris: [dynamicRegistrationForm.redirectUri],
                grant_types: parseCsv(dynamicRegistrationForm.grantTypes),
                token_endpoint_auth_method: dynamicRegistrationForm.tokenEndpointAuthMethod,
                scope: dynamicRegistrationForm.scope,
                policy_id: initialAccessTokenForm.policyId || undefined,
            }, latestInitialAccessToken);
            setLastRegistration(response);
            if (response.client_secret) {
                setProtocolHarness((current) => ({
                    ...current,
                    clientId: response.client.client_id,
                    clientSecret: response.client_secret ?? '',
                    redirectUri: response.client.redirect_uris[0] ?? current.redirectUri,
                }));
            }
            else {
                setProtocolHarness((current) => ({
                    ...current,
                    clientId: response.client.client_id,
                    clientSecret: '',
                    redirectUri: response.client.redirect_uris[0] ?? current.redirectUri,
                }));
            }
            toast.success('Dynamic client registered');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to dynamically register client');
        }
        finally {
            setIsRegisteringClient(false);
        }
    };
    const handleCreatePar = async () => {
        if (!selectedRealmId || !protocolHarness.clientId)
            return;
        setIsRunningPar(true);
        try {
            const response = await idpApi.createIamPushedAuthorizationRequest(selectedRealmId, {
                client_id: protocolHarness.clientId,
                redirect_uri: protocolHarness.redirectUri,
                response_type: 'code',
                scope: protocolHarness.scope,
                state: 'phase-b-par-smoke',
                code_challenge: 'p1XWnEncNBsT8eo4fnD_7Ww-sTinlz5m50FMCOIdNbQ',
                code_challenge_method: 'S256',
            }, protocolHarness.clientSecret
                ? { basicClientAuth: { clientId: protocolHarness.clientId, clientSecret: protocolHarness.clientSecret } }
                : undefined);
            setParResult(response.request_uri);
            toast.success('PAR created');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to create PAR');
        }
        finally {
            setIsRunningPar(false);
        }
    };
    const handleCreateDeviceAuthorization = async () => {
        if (!selectedRealmId || !protocolHarness.clientId)
            return;
        setIsRunningDeviceAuth(true);
        try {
            const response = await idpApi.createIamDeviceAuthorization(selectedRealmId, {
                client_id: protocolHarness.clientId,
                scope: protocolHarness.scope,
            }, protocolHarness.clientSecret
                ? { basicClientAuth: { clientId: protocolHarness.clientId, clientSecret: protocolHarness.clientSecret } }
                : undefined);
            setDeviceResult(`${response.user_code} -> ${response.verification_uri_complete}`);
            toast.success('Device authorization created');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to create device authorization');
        }
        finally {
            setIsRunningDeviceAuth(false);
        }
    };
    const handleTokenExchange = async () => {
        if (!selectedRealmId || !protocolHarness.clientId || !protocolHarness.subjectToken)
            return;
        setIsRunningTokenExchange(true);
        try {
            const response = await idpApi.issueIamToken(selectedRealmId, {
                grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                client_id: protocolHarness.clientId,
                subject_token: protocolHarness.subjectToken,
                audience: protocolHarness.audience,
                scope: protocolHarness.scope,
            }, protocolHarness.clientSecret
                ? { basicClientAuth: { clientId: protocolHarness.clientId, clientSecret: protocolHarness.clientSecret } }
                : undefined);
            setTokenExchangeResult(response.access_token);
            toast.success('Token exchange completed');
            await loadRuntime();
        }
        catch (error) {
            console.error(error);
            toast.error('Failed to exchange token');
        }
        finally {
            setIsRunningTokenExchange(false);
        }
    };
    if (!selectedRealmId) {
        return (_jsx("div", { className: "rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", children: "Select a realm to manage advanced OAuth governance." }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-5", children: [_jsx(MetricCard, { label: "Policies", value: String(policies.length), detail: "Realm governance controls", icon: _jsx(KeyRound, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "Initial Tokens", value: String(initialAccessTokens.filter((token) => token.status === 'ACTIVE').length), detail: `${initialAccessTokens.length} issued`, icon: _jsx(Plus, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "PAR", value: String(parRequests.length), detail: "Pushed authorization requests", icon: _jsx(Waypoints, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "Device", value: String(deviceAuthorizations.length), detail: "Device authorization requests", icon: _jsx(Smartphone, { className: "h-5 w-5" }) }), _jsx(MetricCard, { label: "Exchanges", value: String(tokenExchanges.length), detail: "Token exchange ledger", icon: _jsx(ArrowRightLeft, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-[1.08fr_0.92fr]", children: [_jsx(Section, { title: "Client Policies", description: "Phase B introduces explicit realm-level client governance over dynamic registration, PAR, device flow, token exchange, and redirect posture.", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "space-y-2", children: policies.map((policy) => (_jsxs("button", { type: "button", onClick: () => setPolicyForm(buildPolicyForm(policy)), className: "flex w-full items-start justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: policy.name }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: policy.description || 'No description provided.' })] }), _jsx("span", { className: "rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 dark:bg-slate-800 dark:text-slate-300", children: policy.status })] }, policy.id))) }), _jsxs("form", { onSubmit: handlePolicySubmit, className: "grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Policy Name" }), _jsx("input", { value: policyForm.name, onChange: (event) => setPolicyForm((current) => ({ ...current, name: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Assigned Clients" }), _jsx("div", { className: "rounded-lg border border-slate-300 p-3 dark:border-slate-700", children: _jsx("div", { className: "grid gap-2", children: selectedClientOptions.map(({ id, label }) => (_jsxs("label", { className: "flex items-center justify-between gap-3 text-sm text-slate-700 dark:text-slate-200", children: [_jsx("span", { children: label }), _jsx("input", { type: "checkbox", checked: policyForm.assignedClientIds.includes(id), onChange: () => setPolicyForm((current) => ({ ...current, assignedClientIds: toggleItem(current.assignedClientIds, id) })) })] }, id))) }) })] })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Description" }), _jsx("textarea", { value: policyForm.description, onChange: (event) => setPolicyForm((current) => ({ ...current, description: event.target.value })), rows: 3, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: [
                                                ['allowDynamicRegistration', 'Dynamic registration'],
                                                ['allowDeviceAuthorization', 'Device authorization'],
                                                ['allowTokenExchange', 'Token exchange'],
                                                ['allowPushedAuthorizationRequests', 'PAR'],
                                                ['requireParForPublicClients', 'Require PAR for public clients'],
                                                ['requirePkceForPublicClients', 'Require PKCE for public clients'],
                                                ['allowWildcardRedirectUris', 'Allow wildcard redirects'],
                                            ].map(([key, label]) => (_jsxs("label", { className: "flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800", children: [_jsx("span", { className: "text-slate-700 dark:text-slate-200", children: label }), _jsx("input", { type: "checkbox", checked: policyForm[key], onChange: () => setPolicyForm((current) => ({ ...current, [key]: !current[key] })) })] }, key))) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSavingPolicy, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSavingPolicy ? 'Saving…' : policyForm.id ? 'Update Policy' : 'Create Policy' }), _jsx("button", { type: "button", onClick: () => setPolicyForm(emptyPolicyForm()), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" })] })] })] }) }), _jsx(Section, { title: "Registration and Advanced Flows", description: "Issue initial access tokens, dynamically register OIDC clients, and exercise the advanced OAuth lanes without leaving the IAM workspace.", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("form", { onSubmit: handleIssueInitialAccessToken, className: "grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Client Policy" }), _jsxs("select", { value: initialAccessTokenForm.policyId, onChange: (event) => setInitialAccessTokenForm((current) => ({ ...current, policyId: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", children: [_jsx("option", { value: "", children: "Select a policy" }), policies.map((policy) => (_jsx("option", { value: policy.id, children: policy.name }, policy.id)))] })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Label" }), _jsx("input", { value: initialAccessTokenForm.label, onChange: (event) => setInitialAccessTokenForm((current) => ({ ...current, label: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Max Uses" }), _jsx("input", { value: initialAccessTokenForm.maxUses, onChange: (event) => setInitialAccessTokenForm((current) => ({ ...current, maxUses: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Expires In (Hours)" }), _jsx("input", { value: initialAccessTokenForm.expiresInHours, onChange: (event) => setInitialAccessTokenForm((current) => ({ ...current, expiresInHours: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] })] }), _jsx("button", { type: "submit", disabled: !canManage || isIssuingInitialAccessToken, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isIssuingInitialAccessToken ? 'Issuing…' : 'Issue Initial Access Token' }), latestInitialAccessToken && (_jsxs("div", { className: "rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200", children: ["Latest token: ", _jsx("code", { className: "break-all", children: latestInitialAccessToken })] }))] }), _jsxs("form", { onSubmit: handleDynamicRegistration, className: "grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Client Name" }), _jsx("input", { value: dynamicRegistrationForm.clientName, onChange: (event) => setDynamicRegistrationForm((current) => ({ ...current, clientName: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Client ID" }), _jsx("input", { value: dynamicRegistrationForm.clientId, onChange: (event) => setDynamicRegistrationForm((current) => ({ ...current, clientId: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Redirect URI" }), _jsx("input", { value: dynamicRegistrationForm.redirectUri, onChange: (event) => setDynamicRegistrationForm((current) => ({ ...current, redirectUri: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Grant Types" }), _jsx("input", { value: dynamicRegistrationForm.grantTypes, onChange: (event) => setDynamicRegistrationForm((current) => ({ ...current, grantTypes: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Token Auth Method" }), _jsxs("select", { value: dynamicRegistrationForm.tokenEndpointAuthMethod, onChange: (event) => setDynamicRegistrationForm((current) => ({ ...current, tokenEndpointAuthMethod: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950", children: [_jsx("option", { value: "none", children: "Public (none)" }), _jsx("option", { value: "client_secret_basic", children: "client_secret_basic" }), _jsx("option", { value: "client_secret_post", children: "client_secret_post" })] })] })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Scopes" }), _jsx("input", { value: dynamicRegistrationForm.scope, onChange: (event) => setDynamicRegistrationForm((current) => ({ ...current, scope: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsx("button", { type: "submit", disabled: isRegisteringClient || !latestInitialAccessToken, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isRegisteringClient ? 'Registering…' : 'Dynamically Register Client' }), lastRegistration && (_jsxs("div", { className: "rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", children: [_jsxs("div", { children: [_jsx("strong", { children: "Client:" }), " ", lastRegistration.client.client_id] }), _jsxs("div", { children: [_jsx("strong", { children: "Registration URI:" }), " ", _jsx("code", { className: "break-all", children: lastRegistration.registration_client_uri })] }), _jsxs("div", { children: [_jsx("strong", { children: "Registration Token:" }), " ", _jsx("code", { className: "break-all", children: lastRegistration.registration_access_token })] }), lastRegistration.client_secret && _jsxs("div", { children: [_jsx("strong", { children: "Client Secret:" }), " ", _jsx("code", { className: "break-all", children: lastRegistration.client_secret })] })] }))] }), _jsxs("div", { className: "grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsx("div", { className: "text-sm font-medium text-slate-900 dark:text-white", children: "Protocol Harness" }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Client ID" }), _jsx("input", { value: protocolHarness.clientId, onChange: (event) => setProtocolHarness((current) => ({ ...current, clientId: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Client Secret" }), _jsx("input", { value: protocolHarness.clientSecret, onChange: (event) => setProtocolHarness((current) => ({ ...current, clientSecret: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Redirect URI" }), _jsx("input", { value: protocolHarness.redirectUri, onChange: (event) => setProtocolHarness((current) => ({ ...current, redirectUri: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Scope" }), _jsx("input", { value: protocolHarness.scope, onChange: (event) => setProtocolHarness((current) => ({ ...current, scope: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] })] }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsx("button", { type: "button", onClick: handleCreatePar, disabled: isRunningPar, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isRunningPar ? 'Running…' : 'Create PAR' }), _jsx("button", { type: "button", onClick: handleCreateDeviceAuthorization, disabled: isRunningDeviceAuth, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isRunningDeviceAuth ? 'Running…' : 'Create Device Flow' }), _jsx("button", { type: "button", onClick: handleTokenExchange, disabled: isRunningTokenExchange || !protocolHarness.subjectToken, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isRunningTokenExchange ? 'Running…' : 'Run Token Exchange' })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Subject Token" }), _jsx("textarea", { value: protocolHarness.subjectToken, onChange: (event) => setProtocolHarness((current) => ({ ...current, subjectToken: event.target.value })), rows: 3, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] }), _jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: "Audience Client" }), _jsx("input", { value: protocolHarness.audience, onChange: (event) => setProtocolHarness((current) => ({ ...current, audience: event.target.value })), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" })] })] }), parResult && _jsxs("div", { className: "rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", children: [_jsx("strong", { children: "PAR:" }), " ", parResult] }), deviceResult && _jsxs("div", { className: "rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", children: [_jsx("strong", { children: "Device:" }), " ", deviceResult] }), tokenExchangeResult && _jsxs("div", { className: "rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-700 dark:bg-slate-950/40 dark:text-slate-300", children: [_jsx("strong", { children: "Exchanged Token:" }), " ", _jsx("code", { className: "break-all", children: tokenExchangeResult })] })] })] }) })] }), _jsxs("div", { className: "grid gap-6 xl:grid-cols-3", children: [_jsx(Section, { title: "Initial Access Tokens", description: "Admin-issued bootstrap tokens for dynamic client registration.", children: _jsxs("div", { className: "space-y-3 text-sm", children: [initialAccessTokens.map((token) => (_jsxs("div", { className: "rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: token.label }), _jsx("div", { className: "mt-1 text-xs text-slate-500", children: token.policy_id }), _jsxs("div", { className: "mt-2 text-xs text-slate-600 dark:text-slate-400", children: [token.status, " \u2022 uses: ", token.remaining_uses ?? 'unlimited', " \u2022 expires: ", token.expires_at ?? 'never'] })] }, token.id))), !isLoading && initialAccessTokens.length === 0 && _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: "No initial access tokens issued yet." })] }) }), _jsx(Section, { title: "Pushed Authorization Requests", description: "Recent PAR records for this realm.", children: _jsxs("div", { className: "space-y-3 text-sm", children: [parRequests.map((request) => (_jsxs("div", { className: "rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: request.client_id }), _jsx("div", { className: "mt-1 break-all text-xs text-slate-500", children: request.request_uri }), _jsxs("div", { className: "mt-2 text-xs text-slate-600 dark:text-slate-400", children: [request.status, " \u2022 expires ", request.expires_at] })] }, request.id))), !isLoading && parRequests.length === 0 && _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: "No PAR records yet." })] }) }), _jsx(Section, { title: "Device and Token Exchange Ledgers", description: "Current device authorization and token exchange activity for validation.", children: _jsxs("div", { className: "space-y-4 text-sm", children: [_jsxs("div", { children: [_jsx("div", { className: "mb-2 font-medium text-slate-900 dark:text-white", children: "Device Authorizations" }), _jsxs("div", { className: "space-y-2", children: [deviceAuthorizations.slice(0, 5).map((record) => (_jsxs("div", { className: "rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: record.client_id }), _jsx("div", { className: "mt-1 text-xs text-slate-500", children: record.user_code }), _jsxs("div", { className: "mt-2 text-xs text-slate-600 dark:text-slate-400", children: [record.status, " \u2022 expires ", record.expires_at] })] }, record.id))), !isLoading && deviceAuthorizations.length === 0 && _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: "No device authorization records yet." })] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 font-medium text-slate-900 dark:text-white", children: "Token Exchanges" }), _jsxs("div", { className: "space-y-2", children: [tokenExchanges.slice(0, 5).map((record) => (_jsxs("div", { className: "rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800", children: [_jsxs("div", { className: "font-medium text-slate-900 dark:text-white", children: [record.requesting_client_id, " \u2192 ", record.audience_client_id] }), _jsxs("div", { className: "mt-1 text-xs text-slate-500", children: [record.subject_kind, " ", record.subject_id] }), _jsxs("div", { className: "mt-2 text-xs text-slate-600 dark:text-slate-400", children: [record.status, " \u2022 ", record.created_at] })] }, record.id))), !isLoading && tokenExchanges.length === 0 && _jsx("div", { className: "text-slate-500 dark:text-slate-400", children: "No token exchange records yet." })] })] })] }) })] })] }));
}
