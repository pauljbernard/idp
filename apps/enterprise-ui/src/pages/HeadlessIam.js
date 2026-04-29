import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, ChevronLeft, ChevronRight, Download, Globe2, KeyRound, Link2, Search, Shield, ShieldCheck, Sparkles, Users, UserSquare2, Waypoints } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { idpApi, } from '../services/standaloneApi';
const IamExperiencePanel = lazy(() => import('../components/iam/IamExperiencePanel').then((module) => ({ default: module.IamExperiencePanel })));
const IamProtocolRuntimePanel = lazy(() => import('../components/iam/IamProtocolRuntimePanel').then((module) => ({ default: module.IamProtocolRuntimePanel })));
const IamAdvancedOAuthPanel = lazy(() => import('../components/iam/IamAdvancedOAuthPanel').then((module) => ({ default: module.IamAdvancedOAuthPanel })));
const IamAdminAuthorizationPanel = lazy(() => import('../components/iam/IamAdminAuthorizationPanel').then((module) => ({ default: module.IamAdminAuthorizationPanel })));
const IamAuthorizationServicesPanel = lazy(() => import('../components/iam/IamAuthorizationServicesPanel').then((module) => ({ default: module.IamAuthorizationServicesPanel })));
const IamAuthFlowsPanel = lazy(() => import('../components/iam/IamAuthFlowsPanel').then((module) => ({ default: module.IamAuthFlowsPanel })));
const IamExtensionsPanel = lazy(() => import('../components/iam/IamExtensionsPanel').then((module) => ({ default: module.IamExtensionsPanel })));
const IamOrganizationsPanel = lazy(() => import('../components/iam/IamOrganizationsPanel').then((module) => ({ default: module.IamOrganizationsPanel })));
const IamFederationPanel = lazy(() => import('../components/iam/IamFederationPanel').then((module) => ({ default: module.IamFederationPanel })));
const IamOperationsPanel = lazy(() => import('../components/iam/IamOperationsPanel').then((module) => ({ default: module.IamOperationsPanel })));
const IamSecurityOperationsPanel = lazy(() => import('../components/iam/IamSecurityOperationsPanel').then((module) => ({ default: module.IamSecurityOperationsPanel })));
const IamWebAuthnPanel = lazy(() => import('../components/iam/IamWebAuthnPanel').then((module) => ({ default: module.IamWebAuthnPanel })));
const IAM_TAB_IDS = [
    'realms',
    'access',
    'protocols',
    'flows',
    'admin',
    'authz',
    'extensions',
    'organizations',
    'federation',
    'experience',
    'operations',
    'security',
];
const IAM_TAB_GROUPS = [
    {
        label: 'Foundations',
        description: 'Realm topology and organization model.',
        tabIds: ['realms', 'organizations'],
    },
    {
        label: 'Identity and Access',
        description: 'Identity lifecycle, auth runtime, and admin control.',
        tabIds: ['access', 'protocols', 'flows', 'admin', 'authz', 'federation'],
    },
    {
        label: 'Experience and Extension',
        description: 'Branding, account UX, and provider activation.',
        tabIds: ['experience', 'extensions'],
    },
    {
        label: 'Operate',
        description: 'Security posture, runtime operations, and hardening.',
        tabIds: ['security', 'operations'],
    },
];
const MANAGED_TABLE_DEFAULT_PAGE_SIZE = 25;
const IAM_LIST_MODE_TABS = ['realms', 'access', 'protocols', 'flows', 'admin', 'authz', 'extensions', 'organizations', 'federation'];
const IAM_TAB_DEFAULT_ENTITY = {
    realms: 'realms',
    access: 'users',
    protocols: 'clients',
    flows: 'auth-flows',
    admin: 'permissions',
    authz: 'resource-servers',
    extensions: 'extension-packages',
    organizations: 'organizations',
    federation: 'identity-providers',
    experience: 'experience',
    operations: 'operations',
    security: 'security',
};
const IAM_TAB_ENTITY_OPTIONS = {
    realms: ['realms', 'bindings', 'exports'],
    access: ['users', 'groups', 'roles', 'delegated-admins'],
    protocols: ['clients', 'client-scopes', 'protocol-mappers'],
    flows: ['auth-flows', 'auth-executions', 'flow-bindings'],
    admin: ['permissions', 'policies', 'evaluations'],
    authz: ['resource-servers', 'protected-scopes', 'protected-resources', 'policies', 'permissions'],
    extensions: ['interfaces', 'extension-packages', 'providers', 'bindings'],
    organizations: ['organizations', 'memberships', 'invitations'],
    federation: ['identity-providers', 'user-federation', 'sync-jobs'],
};
function resolveIamTab(tab) {
    if (tab && IAM_TAB_IDS.includes(tab)) {
        return tab;
    }
    return 'realms';
}
function resolveIamWorkspaceMode(tab, mode) {
    if (!IAM_LIST_MODE_TABS.includes(tab)) {
        return 'manage';
    }
    return mode === 'manage' ? 'manage' : 'list';
}
function resolveIamTabEntity(tab, entity) {
    const allowedEntities = IAM_TAB_ENTITY_OPTIONS[tab];
    if (!allowedEntities || allowedEntities.length === 0) {
        return IAM_TAB_DEFAULT_ENTITY[tab];
    }
    if (entity && allowedEntities.includes(entity)) {
        return entity;
    }
    return allowedEntities[0];
}
function compareTableValues(left, right) {
    if (left === right) {
        return 0;
    }
    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }
    const leftText = left === null || left === undefined ? '' : String(left);
    const rightText = right === null || right === undefined ? '' : String(right);
    return leftText.localeCompare(rightText, undefined, { sensitivity: 'base', numeric: true });
}
function applyManagedTable({ records, controls, searchText, sortResolvers, }) {
    const normalizedSearch = controls.search.trim().toLowerCase();
    const filtered = normalizedSearch.length === 0
        ? records
        : records.filter((record) => searchText(record).toLowerCase().includes(normalizedSearch));
    const sortResolver = sortResolvers[controls.sortBy] ?? (() => '');
    const sorted = [...filtered].sort((left, right) => {
        const comparison = compareTableValues(sortResolver(left), sortResolver(right));
        return controls.sortDirection === 'asc' ? comparison : comparison * -1;
    });
    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / controls.pageSize));
    const page = Math.min(Math.max(controls.page, 1), totalPages);
    const start = (page - 1) * controls.pageSize;
    const rows = sorted.slice(start, start + controls.pageSize);
    const pageStart = totalCount === 0 ? 0 : start + 1;
    const pageEnd = totalCount === 0 ? 0 : start + rows.length;
    return {
        rows,
        totalCount,
        totalPages,
        page,
        pageStart,
        pageEnd,
    };
}
function parseList(value) {
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}
function formatList(values) {
    return values.join(', ');
}
function LazyPanelFallback({ label }) {
    return (_jsx("div", { className: "rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: label }));
}
function emptyRealmForm() {
    return {
        id: null,
        name: '',
        summary: '',
        scopeKind: 'STANDALONE_VALIDATION',
        status: 'READY_FOR_FOUNDATION_PHASE',
        templateId: '',
        ownerTenantId: '',
        cloneFromRealmId: '',
        tenantRealmRole: 'PRIMARY',
        exceptionReason: '',
        exceptionPurpose: '',
        intendedConsumers: '',
        supportedProtocols: ['OIDC', 'OAUTH2'],
    };
}
function emptyBindingForm() {
    return {
        id: null,
        targetKind: null,
        bindingMode: 'DEFAULT',
        realmId: '',
        overrideReason: '',
        overridePurpose: '',
        notes: '',
    };
}
function emptyUserForm(realmId = '') {
    return {
        id: null,
        realmId,
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        status: 'STAGED',
        requiredActions: '',
        roleIds: [],
        groupIds: [],
    };
}
function emptyGroupForm(realmId = '') {
    return {
        id: null,
        realmId,
        name: '',
        summary: '',
        status: 'ACTIVE',
        parentGroupId: '',
        roleIds: [],
        memberUserIds: [],
    };
}
function emptyRoleForm(realmId = '') {
    return {
        id: null,
        realmId,
        name: '',
        summary: '',
        kind: 'REALM_ROLE',
        status: 'ACTIVE',
        clientId: '',
        compositeRoleIds: [],
    };
}
function emptyDelegatedAdminForm(realmId = '') {
    return {
        id: null,
        realmId,
        principalKind: 'USER',
        principalId: '',
        principalLabel: '',
        status: 'ACTIVE',
        managedRoleIds: [],
        managedGroupIds: [],
        managedClientIds: '',
        notes: '',
    };
}
function buildRealmForm(realm) {
    return {
        id: realm.id,
        name: realm.name,
        summary: realm.summary,
        scopeKind: realm.scope_kind,
        status: realm.status,
        templateId: realm.template_id ?? '',
        ownerTenantId: realm.owner_tenant_id ?? '',
        cloneFromRealmId: '',
        tenantRealmRole: realm.tenant_realm_role ?? 'PRIMARY',
        exceptionReason: realm.exception_reason ?? '',
        exceptionPurpose: realm.exception_purpose ?? '',
        intendedConsumers: formatList(realm.intended_consumers),
        supportedProtocols: realm.supported_protocols,
    };
}
function buildBindingForm(binding) {
    return {
        id: binding.id,
        targetKind: binding.binding_target_kind,
        bindingMode: binding.binding_mode,
        realmId: binding.realm_id,
        overrideReason: binding.override_reason ?? '',
        overridePurpose: binding.override_purpose ?? '',
        notes: formatList(binding.notes),
    };
}
function buildUserForm(user) {
    return {
        id: user.id,
        realmId: user.realm_id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        requiredActions: formatList(user.required_actions),
        roleIds: user.role_ids,
        groupIds: user.group_ids,
    };
}
function buildGroupForm(group) {
    return {
        id: group.id,
        realmId: group.realm_id,
        name: group.name,
        summary: group.summary,
        status: group.status,
        parentGroupId: group.parent_group_id ?? '',
        roleIds: group.role_ids,
        memberUserIds: group.member_user_ids,
    };
}
function buildRoleForm(role) {
    return {
        id: role.id,
        realmId: role.realm_id,
        name: role.name,
        summary: role.summary,
        kind: role.kind,
        status: role.status,
        clientId: role.client_id ?? '',
        compositeRoleIds: role.composite_role_ids,
    };
}
function buildDelegatedAdminForm(record) {
    return {
        id: record.id,
        realmId: record.realm_id,
        principalKind: record.principal_kind,
        principalId: record.principal_id,
        principalLabel: record.principal_label,
        status: record.status,
        managedRoleIds: record.managed_role_ids,
        managedGroupIds: record.managed_group_ids,
        managedClientIds: formatList(record.managed_client_ids),
        notes: formatList(record.notes),
    };
}
export function HeadlessIam() {
    const [searchParams, setSearchParams] = useSearchParams();
    const canManageIam = true;
    const selectedTab = resolveIamTab(searchParams.get('tab'));
    const selectedMode = resolveIamWorkspaceMode(selectedTab, searchParams.get('mode'));
    const selectedEntity = resolveIamTabEntity(selectedTab, searchParams.get('entity'));
    const [summary, setSummary] = useState(null);
    const [realms, setRealms] = useState([]);
    const [realmTemplates, setRealmTemplates] = useState([]);
    const [realmBindings, setRealmBindings] = useState([]);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [roles, setRoles] = useState([]);
    const [delegatedAdmins, setDelegatedAdmins] = useState([]);
    const [realmExports, setRealmExports] = useState([]);
    const [clients, setClients] = useState([]);
    const [clientScopes, setClientScopes] = useState([]);
    const [protocolMappers, setProtocolMappers] = useState([]);
    const [authFlows, setAuthFlows] = useState([]);
    const [authExecutions, setAuthExecutions] = useState([]);
    const [realmAuthFlowBindings, setRealmAuthFlowBindings] = useState([]);
    const [clientAuthFlowBindings, setClientAuthFlowBindings] = useState([]);
    const [adminPermissions, setAdminPermissions] = useState([]);
    const [adminPolicies, setAdminPolicies] = useState([]);
    const [adminEvaluations, setAdminEvaluations] = useState([]);
    const [resourceServers, setResourceServers] = useState([]);
    const [protectedScopes, setProtectedScopes] = useState([]);
    const [protectedResources, setProtectedResources] = useState([]);
    const [authorizationPolicies, setAuthorizationPolicies] = useState([]);
    const [authorizationPermissions, setAuthorizationPermissions] = useState([]);
    const [providerInterfaces, setProviderInterfaces] = useState([]);
    const [extensionPackages, setExtensionPackages] = useState([]);
    const [extensionProviders, setExtensionProviders] = useState([]);
    const [extensionBindings, setExtensionBindings] = useState([]);
    const [identityProviders, setIdentityProviders] = useState([]);
    const [userFederationProviders, setUserFederationProviders] = useState([]);
    const [federationSyncJobs, setFederationSyncJobs] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [organizationMemberships, setOrganizationMemberships] = useState([]);
    const [organizationInvitations, setOrganizationInvitations] = useState([]);
    const [selectedRealmId, setSelectedRealmId] = useState('');
    const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
    const [selectedBindingId, setSelectedBindingId] = useState('');
    const [selectedBindingTargetKind, setSelectedBindingTargetKind] = useState('ALL');
    const [realmForm, setRealmForm] = useState(emptyRealmForm);
    const [bindingForm, setBindingForm] = useState(emptyBindingForm);
    const [userForm, setUserForm] = useState(emptyUserForm());
    const [groupForm, setGroupForm] = useState(emptyGroupForm());
    const [roleForm, setRoleForm] = useState(emptyRoleForm());
    const [delegatedAdminForm, setDelegatedAdminForm] = useState(emptyDelegatedAdminForm());
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingRealm, setIsSavingRealm] = useState(false);
    const [isSavingBinding, setIsSavingBinding] = useState(false);
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    const [isSavingRole, setIsSavingRole] = useState(false);
    const [isSavingDelegatedAdmin, setIsSavingDelegatedAdmin] = useState(false);
    const [isExportingRealm, setIsExportingRealm] = useState(false);
    const [error, setError] = useState(null);
    const [managedTableStateByKey, setManagedTableStateByKey] = useState({});
    const setManagedTableState = (key, updater) => {
        setManagedTableStateByKey((current) => {
            const existing = current[key] ?? {
                search: '',
                sortBy: '',
                sortDirection: 'asc',
                page: 1,
                pageSize: MANAGED_TABLE_DEFAULT_PAGE_SIZE,
            };
            return {
                ...current,
                [key]: updater(existing),
            };
        });
    };
    const getManagedTableState = (key, defaultSortBy, defaultSortDirection = 'asc') => {
        const existing = managedTableStateByKey[key];
        if (existing) {
            return existing;
        }
        return {
            search: '',
            sortBy: defaultSortBy,
            sortDirection: defaultSortDirection,
            page: 1,
            pageSize: MANAGED_TABLE_DEFAULT_PAGE_SIZE,
        };
    };
    const updateTabRouteState = ({ tab, mode, entity, }) => {
        const nextSearchParams = new URLSearchParams(searchParams);
        nextSearchParams.set('tab', tab);
        const nextEntity = entity ?? resolveIamTabEntity(tab, nextSearchParams.get('entity'));
        nextSearchParams.set('entity', nextEntity);
        const nextMode = mode ?? resolveIamWorkspaceMode(tab, nextSearchParams.get('mode'));
        if (nextMode === 'list') {
            nextSearchParams.set('mode', 'list');
        }
        else {
            nextSearchParams.set('mode', 'manage');
        }
        setSearchParams(nextSearchParams);
    };
    const loadIam = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [summaryResponse, realmsResponse, templatesResponse, bindingsResponse, usersResponse, groupsResponse, rolesResponse, delegatedAdminsResponse, exportsResponse, clientsResponse, clientScopesResponse, protocolMappersResponse, authFlowsResponse, authExecutionsResponse, authFlowBindingsResponse, adminPermissionsResponse, adminPoliciesResponse, adminEvaluationsResponse, resourceServersResponse, protectedScopesResponse, protectedResourcesResponse, authorizationPoliciesResponse, authorizationPermissionsResponse, providerInterfacesResponse, extensionPackagesResponse, extensionProvidersResponse, extensionBindingsResponse, identityProvidersResponse, userFederationProvidersResponse, federationSyncJobsResponse, organizationsResponse, membershipsResponse, invitationsResponse,] = await Promise.all([
                idpApi.getIamSummary(),
                idpApi.listIamRealms(),
                idpApi.listIamRealmTemplates(),
                idpApi.listIamRealmBindings(),
                idpApi.listIamUsers(),
                idpApi.listIamGroups(),
                idpApi.listIamRoles(),
                idpApi.listIamDelegatedAdmins(),
                idpApi.listIamRealmExports(),
                idpApi.listIamClients(),
                idpApi.listIamClientScopes(),
                idpApi.listIamProtocolMappers(),
                idpApi.listIamAuthFlows(),
                idpApi.listIamAuthExecutions(),
                idpApi.listIamAuthFlowBindings(),
                idpApi.listIamAdminPermissions(),
                idpApi.listIamAdminPolicies(),
                idpApi.listIamAdminEvaluations(),
                idpApi.listIamResourceServers(),
                idpApi.listIamProtectedScopes(),
                idpApi.listIamProtectedResources(),
                idpApi.listIamAuthorizationPolicies(),
                idpApi.listIamAuthorizationPermissions(),
                idpApi.listIamProviderInterfaces(),
                idpApi.listIamExtensions(),
                idpApi.listIamExtensionProviders(),
                idpApi.listIamExtensionBindings(),
                idpApi.listIamIdentityProviders(),
                idpApi.listIamUserFederationProviders(),
                idpApi.listIamFederationSyncJobs(),
                idpApi.listIamOrganizations({ realmId: selectedRealmId || undefined }),
                idpApi.listIamOrganizationMemberships({ realmId: selectedRealmId || undefined }),
                idpApi.listIamOrganizationInvitations({ realmId: selectedRealmId || undefined }),
            ]);
            setSummary(summaryResponse);
            setRealms(realmsResponse.realms);
            setRealmTemplates(templatesResponse.realm_templates);
            setRealmBindings(bindingsResponse.realm_bindings);
            setUsers(usersResponse.users);
            setGroups(groupsResponse.groups);
            setRoles(rolesResponse.roles);
            setDelegatedAdmins(delegatedAdminsResponse.delegated_admins);
            setRealmExports(exportsResponse.realm_exports);
            setClients(clientsResponse.clients);
            setClientScopes(clientScopesResponse.client_scopes);
            setProtocolMappers(protocolMappersResponse.protocol_mappers);
            setAuthFlows(authFlowsResponse.flows);
            setAuthExecutions(authExecutionsResponse.executions);
            setRealmAuthFlowBindings(authFlowBindingsResponse.realm_bindings);
            setClientAuthFlowBindings(authFlowBindingsResponse.client_bindings);
            setAdminPermissions(adminPermissionsResponse.permissions);
            setAdminPolicies(adminPoliciesResponse.policies);
            setAdminEvaluations(adminEvaluationsResponse.evaluations);
            setResourceServers(resourceServersResponse.resource_servers);
            setProtectedScopes(protectedScopesResponse.scopes);
            setProtectedResources(protectedResourcesResponse.resources);
            setAuthorizationPolicies(authorizationPoliciesResponse.policies);
            setAuthorizationPermissions(authorizationPermissionsResponse.permissions);
            setProviderInterfaces(providerInterfacesResponse.interfaces);
            setExtensionPackages(extensionPackagesResponse.extensions);
            setExtensionProviders(extensionProvidersResponse.providers);
            setExtensionBindings(extensionBindingsResponse.bindings);
            setIdentityProviders(identityProvidersResponse.identity_providers);
            setUserFederationProviders(userFederationProvidersResponse.user_federation_providers);
            setFederationSyncJobs(federationSyncJobsResponse.sync_jobs);
            setOrganizations(organizationsResponse.organizations);
            setOrganizationMemberships(membershipsResponse.memberships);
            setOrganizationInvitations(invitationsResponse.invitations);
            const nextRealmId = selectedRealmId && realmsResponse.realms.some((realm) => realm.id === selectedRealmId)
                ? selectedRealmId
                : realmsResponse.realms[0]?.id ?? '';
            const nextSelectedOrganizationId = selectedOrganizationId && organizationsResponse.organizations.some((organization) => organization.realm_id === nextRealmId && organization.id === selectedOrganizationId)
                ? selectedOrganizationId
                : '';
            setSelectedRealmId(nextRealmId);
            setSelectedOrganizationId(nextSelectedOrganizationId);
            if (!selectedBindingId && bindingsResponse.realm_bindings[0]) {
                setSelectedBindingId(bindingsResponse.realm_bindings[0].id);
            }
        }
        catch (loadError) {
            console.error('Failed to load standalone IAM surface', loadError);
            setError('Unable to load the standalone IAM administration surface.');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        void loadIam();
    }, []);
    useEffect(() => {
        const requestedTab = resolveIamTab(searchParams.get('tab'));
        const requestedEntity = resolveIamTabEntity(requestedTab, searchParams.get('entity'));
        const requestedMode = resolveIamWorkspaceMode(requestedTab, searchParams.get('mode'));
        const nextSearchParams = new URLSearchParams(searchParams);
        let shouldReplace = false;
        if (nextSearchParams.get('tab') !== requestedTab) {
            nextSearchParams.set('tab', requestedTab);
            shouldReplace = true;
        }
        if (nextSearchParams.get('entity') !== requestedEntity) {
            nextSearchParams.set('entity', requestedEntity);
            shouldReplace = true;
        }
        const modeParam = requestedMode === 'list' ? 'list' : 'manage';
        if (nextSearchParams.get('mode') !== modeParam) {
            nextSearchParams.set('mode', modeParam);
            shouldReplace = true;
        }
        if (shouldReplace) {
            setSearchParams(nextSearchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);
    useEffect(() => {
        if (!userForm.id && selectedRealmId) {
            setUserForm((current) => ({ ...current, realmId: selectedRealmId }));
        }
        if (!groupForm.id && selectedRealmId) {
            setGroupForm((current) => ({ ...current, realmId: selectedRealmId }));
        }
        if (!roleForm.id && selectedRealmId) {
            setRoleForm((current) => ({ ...current, realmId: selectedRealmId }));
        }
        if (!delegatedAdminForm.id && selectedRealmId) {
            setDelegatedAdminForm((current) => ({ ...current, realmId: selectedRealmId }));
        }
    }, [selectedRealmId, userForm.id, groupForm.id, roleForm.id, delegatedAdminForm.id]);
    useEffect(() => {
        if (!selectedRealmId) {
            if (selectedOrganizationId) {
                setSelectedOrganizationId('');
            }
            return;
        }
        if (selectedOrganizationId
            && !organizations.some((organization) => organization.realm_id === selectedRealmId && organization.id === selectedOrganizationId)) {
            setSelectedOrganizationId('');
        }
    }, [organizations, selectedRealmId, selectedOrganizationId]);
    useEffect(() => {
        if (!selectedBindingId) {
            setBindingForm(emptyBindingForm());
            return;
        }
        const binding = realmBindings.find((candidate) => candidate.id === selectedBindingId);
        if (binding) {
            setBindingForm(buildBindingForm(binding));
        }
    }, [selectedBindingId, realmBindings]);
    const filteredBindings = useMemo(() => selectedBindingTargetKind === 'ALL'
        ? realmBindings
        : realmBindings.filter((binding) => binding.binding_target_kind === selectedBindingTargetKind), [realmBindings, selectedBindingTargetKind]);
    const isTenantSpaceBindingForm = bindingForm.targetKind === 'TENANT_SPACE';
    const requiresBindingOverrideApproval = isTenantSpaceBindingForm && bindingForm.bindingMode === 'OVERRIDE';
    const bindingModeOptions = isTenantSpaceBindingForm
        ? [
            { value: 'DEFAULT', label: 'Default' },
            { value: 'OVERRIDE', label: 'Override' },
        ]
        : [
            { value: 'DIRECT', label: 'Direct' },
            { value: 'DEFAULT', label: 'Default' },
            { value: 'OVERRIDE', label: 'Override' },
        ];
    const selectedRealm = realms.find((realm) => realm.id === selectedRealmId) ?? null;
    const realmUsers = users.filter((user) => user.realm_id === selectedRealmId);
    const realmGroups = groups.filter((group) => group.realm_id === selectedRealmId);
    const realmRoles = roles.filter((role) => role.realm_id === selectedRealmId);
    const realmDelegatedAdmins = delegatedAdmins.filter((record) => record.realm_id === selectedRealmId);
    const selectedRealmExports = realmExports.filter((record) => record.realm_id === selectedRealmId);
    const realmScopedOrganizations = selectedRealmId
        ? organizations.filter((organization) => organization.realm_id === selectedRealmId)
        : organizations;
    const selectedOrganization = realmScopedOrganizations.find((organization) => organization.id === selectedOrganizationId) ?? null;
    const scopedOrganizations = selectedOrganizationId
        ? realmScopedOrganizations.filter((organization) => organization.id === selectedOrganizationId)
        : realmScopedOrganizations;
    const realmScopedOrganizationMemberships = selectedRealmId
        ? organizationMemberships.filter((membership) => membership.realm_id === selectedRealmId)
        : organizationMemberships;
    const scopedOrganizationMemberships = selectedOrganizationId
        ? realmScopedOrganizationMemberships.filter((membership) => membership.organization_id === selectedOrganizationId)
        : realmScopedOrganizationMemberships;
    const realmScopedOrganizationInvitations = selectedRealmId
        ? organizationInvitations.filter((invitation) => invitation.realm_id === selectedRealmId)
        : organizationInvitations;
    const scopedOrganizationInvitations = selectedOrganizationId
        ? realmScopedOrganizationInvitations.filter((invitation) => invitation.organization_id === selectedOrganizationId)
        : realmScopedOrganizationInvitations;
    const scopedClients = selectedRealmId
        ? clients.filter((client) => client.realm_id === selectedRealmId)
        : clients;
    const scopedClientScopes = selectedRealmId
        ? clientScopes.filter((scope) => scope.realm_id === selectedRealmId)
        : clientScopes;
    const scopedProtocolMappers = selectedRealmId
        ? protocolMappers.filter((mapper) => mapper.realm_id === selectedRealmId)
        : protocolMappers;
    const scopedAuthFlows = selectedRealmId
        ? authFlows.filter((flow) => flow.realm_id === selectedRealmId)
        : authFlows;
    const scopedAuthExecutions = selectedRealmId
        ? authExecutions.filter((execution) => execution.realm_id === selectedRealmId)
        : authExecutions;
    const scopedRealmAuthFlowBindings = selectedRealmId
        ? realmAuthFlowBindings.filter((binding) => binding.realm_id === selectedRealmId)
        : realmAuthFlowBindings;
    const scopedClientAuthFlowBindings = selectedRealmId
        ? clientAuthFlowBindings.filter((binding) => binding.realm_id === selectedRealmId)
        : clientAuthFlowBindings;
    const scopedAdminPermissions = selectedRealmId
        ? adminPermissions.filter((permission) => permission.realm_id === selectedRealmId)
        : adminPermissions;
    const scopedAdminPolicies = selectedRealmId
        ? adminPolicies.filter((policy) => policy.realm_id === selectedRealmId)
        : adminPolicies;
    const scopedAdminEvaluations = selectedRealmId
        ? adminEvaluations.filter((evaluation) => evaluation.realm_id === selectedRealmId)
        : adminEvaluations;
    const scopedResourceServers = selectedRealmId
        ? resourceServers.filter((server) => server.realm_id === selectedRealmId)
        : resourceServers;
    const scopedProtectedScopes = selectedRealmId
        ? protectedScopes.filter((scope) => scope.realm_id === selectedRealmId)
        : protectedScopes;
    const scopedProtectedResources = selectedRealmId
        ? protectedResources.filter((resource) => resource.realm_id === selectedRealmId)
        : protectedResources;
    const scopedAuthorizationPolicies = selectedRealmId
        ? authorizationPolicies.filter((policy) => policy.realm_id === selectedRealmId)
        : authorizationPolicies;
    const scopedAuthorizationPermissions = selectedRealmId
        ? authorizationPermissions.filter((permission) => permission.realm_id === selectedRealmId)
        : authorizationPermissions;
    const scopedExtensionBindings = selectedRealmId
        ? extensionBindings.filter((binding) => binding.realm_id === selectedRealmId)
        : extensionBindings;
    const scopedIdentityProviders = selectedRealmId
        ? identityProviders.filter((provider) => provider.realm_id === selectedRealmId)
        : identityProviders;
    const scopedUserFederationProviders = selectedRealmId
        ? userFederationProviders.filter((provider) => provider.realm_id === selectedRealmId)
        : userFederationProviders;
    const scopedFederationSyncJobs = selectedRealmId
        ? federationSyncJobs.filter((job) => job.realm_id === selectedRealmId)
        : federationSyncJobs;
    const realmRoleOptions = realmRoles;
    const realmGroupOptions = realmGroups;
    const realmUserOptions = realmUsers;
    const resetRealmForm = () => setRealmForm(emptyRealmForm());
    const resetUserForm = () => setUserForm(emptyUserForm(selectedRealmId));
    const resetGroupForm = () => setGroupForm(emptyGroupForm(selectedRealmId));
    const resetRoleForm = () => setRoleForm(emptyRoleForm(selectedRealmId));
    const resetDelegatedAdminForm = () => setDelegatedAdminForm(emptyDelegatedAdminForm(selectedRealmId));
    const authFlowNameById = useMemo(() => new Map(scopedAuthFlows.map((flow) => [flow.id, flow.name])), [scopedAuthFlows]);
    const resourceServerNameById = useMemo(() => new Map(scopedResourceServers.map((server) => [server.id, server.name])), [scopedResourceServers]);
    const extensionPackageNameById = useMemo(() => new Map(extensionPackages.map((pkg) => [pkg.id, pkg.name])), [extensionPackages]);
    const extensionProviderNameById = useMemo(() => new Map(extensionProviders.map((provider) => [provider.id, provider.name])), [extensionProviders]);
    const flowBindingsRows = useMemo(() => [
        ...scopedRealmAuthFlowBindings.map((binding) => ({
            id: `realm-${binding.realm_id}`,
            binding_kind: 'REALM',
            scope_label: binding.realm_id,
            browser_flow_id: binding.browser_flow_id,
            direct_grant_flow_id: binding.direct_grant_flow_id,
            account_console_flow_id: binding.account_console_flow_id,
            updated_at: binding.updated_at,
        })),
        ...scopedClientAuthFlowBindings.map((binding) => ({
            id: binding.id,
            binding_kind: 'CLIENT',
            scope_label: binding.client_id,
            browser_flow_id: binding.browser_flow_id ?? '',
            direct_grant_flow_id: binding.direct_grant_flow_id ?? '',
            account_console_flow_id: binding.account_console_flow_id ?? '',
            updated_at: binding.updated_at,
        })),
    ], [scopedRealmAuthFlowBindings, scopedClientAuthFlowBindings]);
    const realmsTableState = getManagedTableState('realms', 'name');
    const realmsTable = applyManagedTable({
        records: realms,
        controls: realmsTableState,
        searchText: (realm) => `${realm.name} ${realm.summary} ${realm.scope_kind} ${realm.status} ${realm.supported_protocols.join(' ')} ${realm.owner_tenant_id ?? ''} ${realm.tenant_realm_role ?? ''} ${realm.exception_reason ?? ''} ${realm.exception_purpose ?? ''}`,
        sortResolvers: {
            name: (realm) => realm.name,
            scope: (realm) => realm.scope_kind,
            status: (realm) => realm.status,
            protocol_count: (realm) => realm.supported_protocols.length,
        },
    });
    const bindingsTableState = getManagedTableState('realm-bindings', 'binding_target_name');
    const bindingsTable = applyManagedTable({
        records: filteredBindings,
        controls: bindingsTableState,
        searchText: (binding) => `${binding.binding_target_name} ${binding.binding_target_kind} ${binding.binding_mode} ${binding.realm_name} ${binding.binding_target_tenant_id ?? ''} ${binding.override_reason ?? ''} ${binding.override_purpose ?? ''} ${binding.notes.join(' ')}`,
        sortResolvers: {
            target: (binding) => binding.binding_target_name,
            kind: (binding) => binding.binding_target_kind,
            mode: (binding) => binding.binding_mode,
            realm: (binding) => binding.realm_name,
        },
    });
    const exportsTableState = getManagedTableState('realm-exports', 'exported_at', 'desc');
    const exportsTable = applyManagedTable({
        records: selectedRealmExports,
        controls: exportsTableState,
        searchText: (record) => `${record.realm_name} ${record.object_key} ${record.status} ${record.exported_at}`,
        sortResolvers: {
            exported_at: (record) => record.exported_at,
            status: (record) => record.status,
            users: (record) => record.summary.user_count,
        },
    });
    const accessUsersTableState = getManagedTableState('access-users', 'username');
    const accessUsersTable = applyManagedTable({
        records: realmUsers,
        controls: accessUsersTableState,
        searchText: (user) => `${user.username} ${user.email} ${user.first_name} ${user.last_name} ${user.status}`,
        sortResolvers: {
            username: (user) => user.username,
            email: (user) => user.email,
            status: (user) => user.status,
            role_count: (user) => user.role_ids.length,
            group_count: (user) => user.group_ids.length,
        },
    });
    const accessGroupsTableState = getManagedTableState('access-groups', 'name');
    const accessGroupsTable = applyManagedTable({
        records: realmGroups,
        controls: accessGroupsTableState,
        searchText: (group) => `${group.name} ${group.summary} ${group.status} ${group.parent_group_id ?? ''}`,
        sortResolvers: {
            name: (group) => group.name,
            status: (group) => group.status,
            member_count: (group) => group.member_user_ids.length,
            role_count: (group) => group.role_ids.length,
        },
    });
    const accessRolesTableState = getManagedTableState('access-roles', 'name');
    const accessRolesTable = applyManagedTable({
        records: realmRoles,
        controls: accessRolesTableState,
        searchText: (role) => `${role.name} ${role.summary} ${role.kind} ${role.status} ${role.client_id ?? ''}`,
        sortResolvers: {
            name: (role) => role.name,
            kind: (role) => role.kind,
            status: (role) => role.status,
            composite_count: (role) => role.composite_role_ids.length,
        },
    });
    const accessDelegatedAdminsTableState = getManagedTableState('access-delegated-admins', 'principal_label');
    const accessDelegatedAdminsTable = applyManagedTable({
        records: realmDelegatedAdmins,
        controls: accessDelegatedAdminsTableState,
        searchText: (record) => `${record.principal_label} ${record.principal_kind} ${record.status} ${record.principal_id}`,
        sortResolvers: {
            principal_label: (record) => record.principal_label,
            kind: (record) => record.principal_kind,
            status: (record) => record.status,
            role_count: (record) => record.managed_role_ids.length,
            group_count: (record) => record.managed_group_ids.length,
        },
    });
    const organizationsTableState = getManagedTableState('organizations', 'name');
    const organizationsTable = applyManagedTable({
        records: scopedOrganizations,
        controls: organizationsTableState,
        searchText: (organization) => `${organization.name} ${organization.summary} ${organization.kind} ${organization.status} ${organization.domain_hint ?? ''}`,
        sortResolvers: {
            name: (organization) => organization.name,
            kind: (organization) => organization.kind,
            status: (organization) => organization.status,
            updated_at: (organization) => organization.updated_at,
        },
    });
    const membershipsTableState = getManagedTableState('organization-memberships', 'organization_name');
    const membershipsTable = applyManagedTable({
        records: scopedOrganizationMemberships,
        controls: membershipsTableState,
        searchText: (membership) => `${membership.organization_name} ${membership.username} ${membership.email} ${membership.role} ${membership.status}`,
        sortResolvers: {
            organization: (membership) => membership.organization_name,
            user: (membership) => membership.username,
            role: (membership) => membership.role,
            status: (membership) => membership.status,
        },
    });
    const invitationsTableState = getManagedTableState('organization-invitations', 'created_at', 'desc');
    const invitationsTable = applyManagedTable({
        records: scopedOrganizationInvitations,
        controls: invitationsTableState,
        searchText: (invitation) => `${invitation.email} ${invitation.organization_name} ${invitation.role} ${invitation.status}`,
        sortResolvers: {
            email: (invitation) => invitation.email,
            organization: (invitation) => invitation.organization_name,
            role: (invitation) => invitation.role,
            status: (invitation) => invitation.status,
            created_at: (invitation) => invitation.created_at,
        },
    });
    const protocolClientsTableState = getManagedTableState('protocol-clients', 'client_id');
    const protocolClientsTable = applyManagedTable({
        records: scopedClients,
        controls: protocolClientsTableState,
        searchText: (client) => `${client.client_id} ${client.name} ${client.summary} ${client.protocol} ${client.access_type} ${client.status}`,
        sortResolvers: {
            client_id: (client) => client.client_id,
            name: (client) => client.name,
            protocol: (client) => client.protocol,
            access: (client) => client.access_type,
            status: (client) => client.status,
            updated_at: (client) => client.updated_at,
        },
    });
    const protocolClientScopesTableState = getManagedTableState('protocol-client-scopes', 'name');
    const protocolClientScopesTable = applyManagedTable({
        records: scopedClientScopes,
        controls: protocolClientScopesTableState,
        searchText: (scope) => `${scope.name} ${scope.description} ${scope.protocol} ${scope.assignment_type} ${scope.status}`,
        sortResolvers: {
            name: (scope) => scope.name,
            protocol: (scope) => scope.protocol,
            assignment: (scope) => scope.assignment_type,
            status: (scope) => scope.status,
            updated_at: (scope) => scope.updated_at,
        },
    });
    const protocolMappersTableState = getManagedTableState('protocol-mappers', 'name');
    const protocolMappersTable = applyManagedTable({
        records: scopedProtocolMappers,
        controls: protocolMappersTableState,
        searchText: (mapper) => `${mapper.name} ${mapper.protocol} ${mapper.target_kind} ${mapper.target_id} ${mapper.claim_name} ${mapper.status}`,
        sortResolvers: {
            name: (mapper) => mapper.name,
            protocol: (mapper) => mapper.protocol,
            target_kind: (mapper) => mapper.target_kind,
            claim_name: (mapper) => mapper.claim_name,
            status: (mapper) => mapper.status,
            updated_at: (mapper) => mapper.updated_at,
        },
    });
    const authFlowsTableState = getManagedTableState('auth-flows', 'name');
    const authFlowsTable = applyManagedTable({
        records: scopedAuthFlows,
        controls: authFlowsTableState,
        searchText: (flow) => `${flow.name} ${flow.description} ${flow.kind} ${flow.status}`,
        sortResolvers: {
            name: (flow) => flow.name,
            kind: (flow) => flow.kind,
            status: (flow) => flow.status,
            execution_count: (flow) => flow.execution_ids.length,
            updated_at: (flow) => flow.updated_at,
        },
    });
    const authExecutionsTableState = getManagedTableState('auth-executions', 'display_name');
    const authExecutionsTable = applyManagedTable({
        records: scopedAuthExecutions,
        controls: authExecutionsTableState,
        searchText: (execution) => `${execution.display_name} ${execution.execution_kind} ${execution.requirement} ${execution.condition_kind} ${authFlowNameById.get(execution.flow_id) ?? execution.flow_id}`,
        sortResolvers: {
            display_name: (execution) => execution.display_name,
            kind: (execution) => execution.execution_kind,
            requirement: (execution) => execution.requirement,
            flow: (execution) => authFlowNameById.get(execution.flow_id) ?? execution.flow_id,
            priority: (execution) => execution.priority,
            updated_at: (execution) => execution.updated_at,
        },
    });
    const flowBindingsTableState = getManagedTableState('auth-flow-bindings', 'updated_at', 'desc');
    const flowBindingsTable = applyManagedTable({
        records: flowBindingsRows,
        controls: flowBindingsTableState,
        searchText: (binding) => `${binding.binding_kind} ${binding.scope_label} ${authFlowNameById.get(binding.browser_flow_id) ?? binding.browser_flow_id} ${authFlowNameById.get(binding.direct_grant_flow_id) ?? binding.direct_grant_flow_id} ${authFlowNameById.get(binding.account_console_flow_id) ?? binding.account_console_flow_id}`,
        sortResolvers: {
            kind: (binding) => binding.binding_kind,
            scope: (binding) => binding.scope_label,
            browser: (binding) => authFlowNameById.get(binding.browser_flow_id) ?? binding.browser_flow_id,
            direct_grant: (binding) => authFlowNameById.get(binding.direct_grant_flow_id) ?? binding.direct_grant_flow_id,
            account_console: (binding) => authFlowNameById.get(binding.account_console_flow_id) ?? binding.account_console_flow_id,
            updated_at: (binding) => binding.updated_at,
        },
    });
    const adminPermissionsTableState = getManagedTableState('admin-permissions', 'name');
    const adminPermissionsTable = applyManagedTable({
        records: scopedAdminPermissions,
        controls: adminPermissionsTableState,
        searchText: (permission) => `${permission.name} ${permission.summary} ${permission.domain} ${permission.scope_kind} ${permission.actions.join(' ')}`,
        sortResolvers: {
            name: (permission) => permission.name,
            domain: (permission) => permission.domain,
            scope_kind: (permission) => permission.scope_kind,
            action_count: (permission) => permission.actions.length,
            updated_at: (permission) => permission.updated_at,
        },
    });
    const adminPoliciesTableState = getManagedTableState('admin-policies', 'name');
    const adminPoliciesTable = applyManagedTable({
        records: scopedAdminPolicies,
        controls: adminPoliciesTableState,
        searchText: (policy) => `${policy.name} ${policy.summary} ${policy.principal_kind} ${policy.principal_label} ${policy.status}`,
        sortResolvers: {
            name: (policy) => policy.name,
            principal_kind: (policy) => policy.principal_kind,
            principal_label: (policy) => policy.principal_label,
            status: (policy) => policy.status,
            permission_count: (policy) => policy.permission_ids.length,
            updated_at: (policy) => policy.updated_at,
        },
    });
    const adminEvaluationsTableState = getManagedTableState('admin-evaluations', 'created_at', 'desc');
    const adminEvaluationsTable = applyManagedTable({
        records: scopedAdminEvaluations,
        controls: adminEvaluationsTableState,
        searchText: (evaluation) => `${evaluation.actor_username} ${evaluation.domain} ${evaluation.action} ${evaluation.route} ${evaluation.method} ${evaluation.reason} ${evaluation.target_resource_label ?? ''}`,
        sortResolvers: {
            actor: (evaluation) => evaluation.actor_username,
            domain: (evaluation) => evaluation.domain,
            action: (evaluation) => evaluation.action,
            allowed: (evaluation) => (evaluation.allowed ? 1 : 0),
            route: (evaluation) => evaluation.route,
            created_at: (evaluation) => evaluation.created_at,
        },
    });
    const resourceServersTableState = getManagedTableState('authz-resource-servers', 'name');
    const resourceServersTable = applyManagedTable({
        records: scopedResourceServers,
        controls: resourceServersTableState,
        searchText: (server) => `${server.name} ${server.summary} ${server.client_id} ${server.enforcement_mode} ${server.status}`,
        sortResolvers: {
            name: (server) => server.name,
            client_id: (server) => server.client_id,
            enforcement: (server) => server.enforcement_mode,
            decision: (server) => server.decision_strategy,
            status: (server) => server.status,
            updated_at: (server) => server.updated_at,
        },
    });
    const protectedScopesTableState = getManagedTableState('authz-protected-scopes', 'name');
    const protectedScopesTable = applyManagedTable({
        records: scopedProtectedScopes,
        controls: protectedScopesTableState,
        searchText: (scope) => `${scope.name} ${scope.summary} ${scope.status} ${resourceServerNameById.get(scope.resource_server_id) ?? scope.resource_server_id}`,
        sortResolvers: {
            name: (scope) => scope.name,
            resource_server: (scope) => resourceServerNameById.get(scope.resource_server_id) ?? scope.resource_server_id,
            status: (scope) => scope.status,
            updated_at: (scope) => scope.updated_at,
        },
    });
    const protectedResourcesTableState = getManagedTableState('authz-protected-resources', 'name');
    const protectedResourcesTable = applyManagedTable({
        records: scopedProtectedResources,
        controls: protectedResourcesTableState,
        searchText: (resource) => `${resource.name} ${resource.summary} ${resource.uri ?? ''} ${resource.type_label ?? ''} ${resource.status} ${resourceServerNameById.get(resource.resource_server_id) ?? resource.resource_server_id}`,
        sortResolvers: {
            name: (resource) => resource.name,
            resource_server: (resource) => resourceServerNameById.get(resource.resource_server_id) ?? resource.resource_server_id,
            status: (resource) => resource.status,
            scope_count: (resource) => resource.scope_ids.length,
            owner_count: (resource) => resource.owner_user_ids.length,
            updated_at: (resource) => resource.updated_at,
        },
    });
    const authorizationPoliciesTableState = getManagedTableState('authz-policies', 'name');
    const authorizationPoliciesTable = applyManagedTable({
        records: scopedAuthorizationPolicies,
        controls: authorizationPoliciesTableState,
        searchText: (policy) => `${policy.name} ${policy.summary} ${policy.kind} ${policy.status} ${resourceServerNameById.get(policy.resource_server_id) ?? policy.resource_server_id}`,
        sortResolvers: {
            name: (policy) => policy.name,
            kind: (policy) => policy.kind,
            resource_server: (policy) => resourceServerNameById.get(policy.resource_server_id) ?? policy.resource_server_id,
            status: (policy) => policy.status,
            principal_count: (policy) => policy.principal_user_ids.length + policy.principal_group_ids.length + policy.principal_role_ids.length + policy.principal_client_ids.length,
            updated_at: (policy) => policy.updated_at,
        },
    });
    const authorizationPermissionsTableState = getManagedTableState('authz-permissions', 'name');
    const authorizationPermissionsTable = applyManagedTable({
        records: scopedAuthorizationPermissions,
        controls: authorizationPermissionsTableState,
        searchText: (permission) => `${permission.name} ${permission.summary} ${permission.status} ${permission.decision_strategy} ${resourceServerNameById.get(permission.resource_server_id) ?? permission.resource_server_id}`,
        sortResolvers: {
            name: (permission) => permission.name,
            resource_server: (permission) => resourceServerNameById.get(permission.resource_server_id) ?? permission.resource_server_id,
            status: (permission) => permission.status,
            decision: (permission) => permission.decision_strategy,
            policy_count: (permission) => permission.policy_ids.length,
            updated_at: (permission) => permission.updated_at,
        },
    });
    const extensionInterfacesTableState = getManagedTableState('extension-interfaces', 'name');
    const extensionInterfacesTable = applyManagedTable({
        records: providerInterfaces,
        controls: extensionInterfacesTableState,
        searchText: (interfaceRecord) => `${interfaceRecord.name} ${interfaceRecord.summary} ${interfaceRecord.kind} ${interfaceRecord.contract_version} ${interfaceRecord.binding_slots.join(' ')}`,
        sortResolvers: {
            name: (interfaceRecord) => interfaceRecord.name,
            kind: (interfaceRecord) => interfaceRecord.kind,
            contract_version: (interfaceRecord) => interfaceRecord.contract_version,
            binding_slots: (interfaceRecord) => interfaceRecord.binding_slots.length,
            configuration_fields: (interfaceRecord) => interfaceRecord.configuration_fields.length,
        },
    });
    const extensionPackagesTableState = getManagedTableState('extension-packages', 'name');
    const extensionPackagesTable = applyManagedTable({
        records: extensionPackages,
        controls: extensionPackagesTableState,
        searchText: (pkg) => `${pkg.name} ${pkg.key} ${pkg.publisher} ${pkg.version} ${pkg.status} ${pkg.source_type} ${pkg.delivery_model} ${pkg.interface_kinds.join(' ')}`,
        sortResolvers: {
            name: (pkg) => pkg.name,
            key: (pkg) => pkg.key,
            publisher: (pkg) => pkg.publisher,
            status: (pkg) => pkg.status,
            interface_count: (pkg) => pkg.interface_kinds.length,
            updated_at: (pkg) => pkg.updated_at,
        },
    });
    const extensionProvidersTableState = getManagedTableState('extension-providers', 'name');
    const extensionProvidersTable = applyManagedTable({
        records: extensionProviders,
        controls: extensionProvidersTableState,
        searchText: (provider) => `${provider.name} ${provider.key} ${provider.summary} ${provider.interface_kind} ${provider.status} ${extensionPackageNameById.get(provider.extension_id) ?? provider.extension_id}`,
        sortResolvers: {
            name: (provider) => provider.name,
            interface_kind: (provider) => provider.interface_kind,
            status: (provider) => provider.status,
            package: (provider) => extensionPackageNameById.get(provider.extension_id) ?? provider.extension_id,
            binding_slots: (provider) => provider.binding_slots.length,
            updated_at: (provider) => provider.updated_at,
        },
    });
    const extensionBindingsTableState = getManagedTableState('extension-bindings', 'updated_at', 'desc');
    const extensionBindingsTable = applyManagedTable({
        records: scopedExtensionBindings,
        controls: extensionBindingsTableState,
        searchText: (binding) => `${extensionProviderNameById.get(binding.provider_id) ?? binding.provider_id} ${binding.interface_kind} ${binding.binding_slot} ${binding.realm_id} ${binding.status}`,
        sortResolvers: {
            provider: (binding) => extensionProviderNameById.get(binding.provider_id) ?? binding.provider_id,
            interface_kind: (binding) => binding.interface_kind,
            binding_slot: (binding) => binding.binding_slot,
            realm: (binding) => binding.realm_id,
            status: (binding) => binding.status,
            priority: (binding) => binding.priority,
            updated_at: (binding) => binding.updated_at,
        },
    });
    const identityProvidersTableState = getManagedTableState('federation-identity-providers', 'name');
    const identityProvidersTable = applyManagedTable({
        records: scopedIdentityProviders,
        controls: identityProvidersTableState,
        searchText: (provider) => `${provider.alias} ${provider.name} ${provider.summary} ${provider.protocol} ${provider.status} ${provider.login_mode}`,
        sortResolvers: {
            alias: (provider) => provider.alias,
            name: (provider) => provider.name,
            protocol: (provider) => provider.protocol,
            status: (provider) => provider.status,
            login_mode: (provider) => provider.login_mode,
            updated_at: (provider) => provider.updated_at,
        },
    });
    const userFederationProvidersTableState = getManagedTableState('federation-user-providers', 'name');
    const userFederationProvidersTable = applyManagedTable({
        records: scopedUserFederationProviders,
        controls: userFederationProvidersTableState,
        searchText: (provider) => `${provider.name} ${provider.summary} ${provider.kind} ${provider.status} ${provider.import_strategy} ${provider.connection_label}`,
        sortResolvers: {
            name: (provider) => provider.name,
            kind: (provider) => provider.kind,
            status: (provider) => provider.status,
            import_strategy: (provider) => provider.import_strategy,
            updated_at: (provider) => provider.updated_at,
        },
    });
    const federationSyncJobsTableState = getManagedTableState('federation-sync-jobs', 'started_at', 'desc');
    const federationSyncJobsTable = applyManagedTable({
        records: scopedFederationSyncJobs,
        controls: federationSyncJobsTableState,
        searchText: (job) => `${job.provider_name} ${job.status} ${job.started_at} ${job.completed_at} ${job.error_message ?? ''}`,
        sortResolvers: {
            provider: (job) => job.provider_name,
            status: (job) => job.status,
            started_at: (job) => job.started_at,
            imported_count: (job) => job.imported_count,
            linked_count: (job) => job.linked_count,
            updated_count: (job) => job.updated_count,
        },
    });
    const tabs = [
        {
            id: 'realms',
            name: 'Realms',
            description: 'Realm registry, templates, bindings, and export rehearsal.',
            icon: Shield,
        },
        {
            id: 'access',
            name: 'Access Control',
            description: 'Users, groups, roles, and delegated administration.',
            icon: Users,
        },
        {
            id: 'protocols',
            name: 'Protocols',
            description: 'OIDC, OAuth, SAML, clients, scopes, and runtime tokens.',
            icon: KeyRound,
        },
        {
            id: 'flows',
            name: 'Auth Flows',
            description: 'Configurable login graphs, subflows, and realm/client bindings.',
            icon: Waypoints,
        },
        {
            id: 'admin',
            name: 'Admin Authz',
            description: 'Fine-grained admin permissions, policies, and evaluation audit.',
            icon: UserSquare2,
        },
        {
            id: 'authz',
            name: 'Authorization',
            description: 'Resource servers, protected resources, policies, permissions, and UMA tickets.',
            icon: Shield,
        },
        {
            id: 'extensions',
            name: 'Extensions',
            description: 'Provider interfaces, extension packages, registered providers, and realm-bound activation.',
            icon: Sparkles,
        },
        {
            id: 'organizations',
            name: 'Organizations',
            description: 'B2B organizations, invitations, memberships, and profile schemas.',
            icon: Building2,
        },
        {
            id: 'federation',
            name: 'Federation',
            description: 'Identity brokering, user federation, and sync posture.',
            icon: Link2,
        },
        {
            id: 'experience',
            name: 'Experience',
            description: 'Branding, localization, notifications, and account UX.',
            icon: Globe2,
        },
        {
            id: 'operations',
            name: 'Operations',
            description: 'Backups, restore, key rotation, diagnostics, health, and resilience telemetry.',
            icon: Download,
        },
        {
            id: 'security',
            name: 'Security Ops',
            description: 'Lockout, session control, and request audit controls.',
            icon: ShieldCheck,
        },
    ];
    const setSelectedTab = (tabId) => {
        updateTabRouteState({
            tab: tabId,
            entity: IAM_TAB_DEFAULT_ENTITY[tabId],
            mode: IAM_LIST_MODE_TABS.includes(tabId) ? 'list' : 'manage',
        });
    };
    const handleProtocolToggle = (protocol) => {
        setRealmForm((current) => ({
            ...current,
            supportedProtocols: current.supportedProtocols.includes(protocol)
                ? current.supportedProtocols.filter((value) => value !== protocol)
                : [...current.supportedProtocols, protocol],
        }));
    };
    const handleRealmSubmit = async (event) => {
        event.preventDefault();
        setIsSavingRealm(true);
        try {
            const ownerTenantId = realmForm.ownerTenantId.trim() || null;
            const tenantRealmRole = ownerTenantId ? realmForm.tenantRealmRole : undefined;
            const exceptionReason = ownerTenantId && tenantRealmRole === 'EXCEPTION'
                ? realmForm.exceptionReason.trim() || null
                : null;
            const exceptionPurpose = ownerTenantId && tenantRealmRole === 'EXCEPTION'
                ? realmForm.exceptionPurpose.trim() || null
                : null;
            if (ownerTenantId && tenantRealmRole === 'EXCEPTION' && (!exceptionReason || !exceptionPurpose)) {
                toast.error('Exception reason and purpose are required for additional tenant realms.');
                return;
            }
            if (realmForm.id) {
                const payload = {
                    name: realmForm.name.trim(),
                    summary: realmForm.summary.trim(),
                    status: realmForm.status,
                    intended_consumers: parseList(realmForm.intendedConsumers),
                    supported_protocols: realmForm.supportedProtocols,
                    owner_tenant_id: ownerTenantId,
                    tenant_realm_role: tenantRealmRole,
                    exception_reason: exceptionReason,
                    exception_purpose: exceptionPurpose,
                };
                await idpApi.updateIamRealm(realmForm.id, payload);
                toast.success('IAM realm updated');
            }
            else {
                const payload = {
                    name: realmForm.name.trim(),
                    summary: realmForm.summary.trim(),
                    scope_kind: realmForm.scopeKind,
                    status: realmForm.status,
                    template_id: realmForm.templateId || null,
                    owner_tenant_id: ownerTenantId,
                    tenant_realm_role: tenantRealmRole,
                    exception_reason: exceptionReason,
                    exception_purpose: exceptionPurpose,
                    clone_from_realm_id: realmForm.cloneFromRealmId || null,
                    intended_consumers: parseList(realmForm.intendedConsumers),
                    supported_protocols: realmForm.supportedProtocols,
                };
                await idpApi.createIamRealm(payload);
                toast.success('IAM realm created');
            }
            resetRealmForm();
            await loadIam();
        }
        catch (saveError) {
            console.error('Failed to save IAM realm', saveError);
            toast.error('Failed to save IAM realm');
        }
        finally {
            setIsSavingRealm(false);
        }
    };
    const handleBindingSubmit = async (event) => {
        event.preventDefault();
        if (!bindingForm.id) {
            toast.error('Select a binding to manage');
            return;
        }
        setIsSavingBinding(true);
        try {
            const overrideReason = requiresBindingOverrideApproval
                ? bindingForm.overrideReason.trim() || null
                : null;
            const overridePurpose = requiresBindingOverrideApproval
                ? bindingForm.overridePurpose.trim() || null
                : null;
            if (requiresBindingOverrideApproval && (!overrideReason || !overridePurpose)) {
                toast.error('Override reason and purpose are required for tenant-space override bindings.');
                return;
            }
            const payload = {
                binding_mode: bindingForm.bindingMode,
                realm_id: bindingForm.realmId,
                override_reason: overrideReason,
                override_purpose: overridePurpose,
                notes: parseList(bindingForm.notes),
            };
            await idpApi.updateIamRealmBinding(bindingForm.id, payload);
            toast.success('IAM binding updated');
            await loadIam();
        }
        catch (saveError) {
            console.error('Failed to update IAM binding', saveError);
            toast.error('Failed to update IAM binding');
        }
        finally {
            setIsSavingBinding(false);
        }
    };
    const handleUserSubmit = async (event) => {
        event.preventDefault();
        setIsSavingUser(true);
        try {
            if (userForm.id) {
                const payload = {
                    email: userForm.email.trim(),
                    first_name: userForm.firstName.trim(),
                    last_name: userForm.lastName.trim(),
                    status: userForm.status,
                    required_actions: parseList(userForm.requiredActions),
                    role_ids: userForm.roleIds,
                    group_ids: userForm.groupIds,
                };
                await idpApi.updateIamUser(userForm.id, payload);
                toast.success('IAM user updated');
            }
            else {
                const payload = {
                    realm_id: userForm.realmId,
                    username: userForm.username.trim(),
                    email: userForm.email.trim(),
                    first_name: userForm.firstName.trim(),
                    last_name: userForm.lastName.trim(),
                    status: userForm.status,
                    required_actions: parseList(userForm.requiredActions),
                    role_ids: userForm.roleIds,
                    group_ids: userForm.groupIds,
                };
                await idpApi.createIamUser(payload);
                toast.success('IAM user created');
            }
            resetUserForm();
            await loadIam();
        }
        catch (saveError) {
            console.error('Failed to save IAM user', saveError);
            toast.error('Failed to save IAM user');
        }
        finally {
            setIsSavingUser(false);
        }
    };
    const handleGroupSubmit = async (event) => {
        event.preventDefault();
        setIsSavingGroup(true);
        try {
            if (groupForm.id) {
                const payload = {
                    name: groupForm.name.trim(),
                    summary: groupForm.summary.trim(),
                    status: groupForm.status,
                    parent_group_id: groupForm.parentGroupId || null,
                    role_ids: groupForm.roleIds,
                    member_user_ids: groupForm.memberUserIds,
                };
                await idpApi.updateIamGroup(groupForm.id, payload);
                toast.success('IAM group updated');
            }
            else {
                const payload = {
                    realm_id: groupForm.realmId,
                    name: groupForm.name.trim(),
                    summary: groupForm.summary.trim(),
                    status: groupForm.status,
                    parent_group_id: groupForm.parentGroupId || null,
                    role_ids: groupForm.roleIds,
                    member_user_ids: groupForm.memberUserIds,
                };
                await idpApi.createIamGroup(payload);
                toast.success('IAM group created');
            }
            resetGroupForm();
            await loadIam();
        }
        catch (saveError) {
            console.error('Failed to save IAM group', saveError);
            toast.error('Failed to save IAM group');
        }
        finally {
            setIsSavingGroup(false);
        }
    };
    const handleRoleSubmit = async (event) => {
        event.preventDefault();
        setIsSavingRole(true);
        try {
            if (roleForm.id) {
                const payload = {
                    name: roleForm.name.trim(),
                    summary: roleForm.summary.trim(),
                    status: roleForm.status,
                    client_id: roleForm.kind === 'CLIENT_ROLE' ? (roleForm.clientId.trim() || null) : undefined,
                    composite_role_ids: roleForm.kind === 'COMPOSITE_ROLE' ? roleForm.compositeRoleIds : undefined,
                };
                await idpApi.updateIamRole(roleForm.id, payload);
                toast.success('IAM role updated');
            }
            else {
                const payload = {
                    realm_id: roleForm.realmId,
                    name: roleForm.name.trim(),
                    summary: roleForm.summary.trim(),
                    kind: roleForm.kind,
                    status: roleForm.status,
                    client_id: roleForm.kind === 'CLIENT_ROLE' ? roleForm.clientId.trim() || null : null,
                    composite_role_ids: roleForm.kind === 'COMPOSITE_ROLE' ? roleForm.compositeRoleIds : [],
                };
                await idpApi.createIamRole(payload);
                toast.success('IAM role created');
            }
            resetRoleForm();
            await loadIam();
        }
        catch (saveError) {
            console.error('Failed to save IAM role', saveError);
            toast.error('Failed to save IAM role');
        }
        finally {
            setIsSavingRole(false);
        }
    };
    const handleDelegatedAdminSubmit = async (event) => {
        event.preventDefault();
        setIsSavingDelegatedAdmin(true);
        try {
            if (delegatedAdminForm.id) {
                const payload = {
                    principal_label: delegatedAdminForm.principalLabel.trim(),
                    status: delegatedAdminForm.status,
                    managed_role_ids: delegatedAdminForm.managedRoleIds,
                    managed_group_ids: delegatedAdminForm.managedGroupIds,
                    managed_client_ids: parseList(delegatedAdminForm.managedClientIds),
                    notes: parseList(delegatedAdminForm.notes),
                };
                await idpApi.updateIamDelegatedAdmin(delegatedAdminForm.id, payload);
                toast.success('Delegated admin updated');
            }
            else {
                const payload = {
                    realm_id: delegatedAdminForm.realmId,
                    principal_kind: delegatedAdminForm.principalKind,
                    principal_id: delegatedAdminForm.principalId,
                    principal_label: delegatedAdminForm.principalLabel.trim(),
                    status: delegatedAdminForm.status,
                    managed_role_ids: delegatedAdminForm.managedRoleIds,
                    managed_group_ids: delegatedAdminForm.managedGroupIds,
                    managed_client_ids: parseList(delegatedAdminForm.managedClientIds),
                    notes: parseList(delegatedAdminForm.notes),
                };
                await idpApi.createIamDelegatedAdmin(payload);
                toast.success('Delegated admin assignment created');
            }
            resetDelegatedAdminForm();
            await loadIam();
        }
        catch (saveError) {
            console.error('Failed to save delegated admin', saveError);
            toast.error('Failed to save delegated admin');
        }
        finally {
            setIsSavingDelegatedAdmin(false);
        }
    };
    const handleExportRealm = async () => {
        if (!selectedRealmId) {
            toast.error('Select a realm first');
            return;
        }
        setIsExportingRealm(true);
        try {
            await idpApi.exportIamRealm(selectedRealmId);
            toast.success('Realm export created');
            await loadIam();
        }
        catch (exportError) {
            console.error('Failed to export IAM realm', exportError);
            toast.error('Failed to export IAM realm');
        }
        finally {
            setIsExportingRealm(false);
        }
    };
    const openCurrentTabListMode = (entity) => {
        updateTabRouteState({
            tab: selectedTab,
            entity: entity ?? selectedEntity,
            mode: 'list',
        });
    };
    const openCurrentTabManageMode = (entity) => {
        updateTabRouteState({
            tab: selectedTab,
            entity: entity ?? selectedEntity,
            mode: 'manage',
        });
    };
    return (_jsxs("div", { className: "space-y-8 p-4 lg:p-8", children: [_jsx("section", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: _jsxs("div", { className: "flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between", children: [_jsxs("div", { className: "max-w-4xl", children: [_jsxs("div", { className: "inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:bg-slate-800 dark:text-slate-300", children: [_jsx(Shield, { className: "h-3.5 w-3.5" }), "Identity Platform Administration"] }), _jsx("h1", { className: "mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white", children: "Identify Access" }), _jsx("p", { className: "mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400", children: "This workspace validates the reusable identity platform as a standalone product. OIDC, advanced OAuth, SAML, passkeys, organizations, fine-grained admin authorization, authorization services, and the extension registry are all exercised here before any downstream adoption is approved." }), _jsx("p", { className: "mt-3 text-xs font-medium uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300", children: "Active user: Standalone Administrator" })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx(Link, { to: "/iam/login", className: "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Standalone Login" }), _jsx(Link, { to: "/iam/account", className: "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Account Console" }), _jsx(Link, { to: "/iam", className: "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Identity Workspace" }), _jsxs(Link, { to: "/iam", className: "inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: ["Refresh Workspace", _jsx(ArrowRight, { className: "h-4 w-4" })] })] })] }) }), !canManageIam && (_jsxs("div", { className: "rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100", children: ["The IAM subsystem is restricted to the global ", _jsx("strong", { children: "Super Administrator" }), " role for mutation. Read-only visibility remains available."] })), error && (_jsx("div", { className: "rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200", children: error })), isLoading ? (_jsx("div", { className: "rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400", children: "Loading IAM administration posture\u2026" })) : (_jsx(_Fragment, { children: _jsxs("section", { className: "grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]", children: [_jsx("aside", { className: "space-y-5 xl:sticky xl:top-24 xl:self-start", children: _jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "IAM Workspace" }), _jsx("div", { className: "mt-4 space-y-4", children: IAM_TAB_GROUPS.map((group) => (_jsxs("div", { children: [_jsx("div", { className: "px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500", children: group.label }), _jsx("div", { className: "mt-1 px-1 text-xs text-slate-500 dark:text-slate-400", children: group.description }), _jsx("div", { className: "mt-2 space-y-2", children: tabs.filter((tab) => group.tabIds.includes(tab.id)).map((tab) => {
                                                        const Icon = tab.icon;
                                                        const isActive = selectedTab === tab.id;
                                                        return (_jsx("button", { type: "button", onClick: () => setSelectedTab(tab.id), className: `w-full rounded-2xl border px-4 py-3 text-left transition-colors ${isActive
                                                                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`, children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Icon, { className: `mt-0.5 h-4 w-4 ${isActive ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}` }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-semibold", children: tab.name }), _jsx("div", { className: `mt-1 text-xs leading-5 ${isActive ? 'text-slate-200 dark:text-slate-700' : 'text-slate-500 dark:text-slate-400'}`, children: tab.description })] })] }) }, tab.id));
                                                    }) })] }, group.label))) })] }) }), _jsxs("div", { className: "min-w-0 space-y-6", children: [_jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Global Realm Context" }), _jsx("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: "This realm selection applies across every IAM subpage, including Admin Authz, protocol runtime, auth flows, authorization services, federation, and extensions." })] }), _jsx("div", { className: "w-full max-w-sm", children: _jsxs("select", { value: selectedRealmId, onChange: (event) => setSelectedRealmId(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "Select a realm" }), realms.map((realm) => (_jsx("option", { value: realm.id, children: realm.name }, realm.id)))] }) })] }), selectedRealm ? (_jsxs("div", { className: "mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: selectedRealm.name }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: selectedRealm.summary }), _jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: selectedRealm.supported_protocols.map((protocol) => (_jsx("span", { className: "rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300", children: protocol }, protocol))) })] })) : (_jsx("p", { className: "mt-4 text-sm text-slate-500 dark:text-slate-400", children: "Select a realm to scope all IAM datasets and management workflows." })), selectedTab === 'organizations' && (_jsxs("div", { className: "mt-4 border-t border-slate-200 pt-4 dark:border-slate-800", children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: "Organization Context" }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: "Apply an organization context when browsing membership and invitation workflows." }), _jsx("div", { className: "mt-3 w-full max-w-sm", children: _jsxs("select", { value: selectedOrganizationId, onChange: (event) => setSelectedOrganizationId(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "All organizations in realm" }), realmScopedOrganizations.map((organization) => (_jsx("option", { value: organization.id, children: organization.name }, organization.id)))] }) }), selectedOrganization ? (_jsxs("div", { className: "mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: selectedOrganization.name }), _jsx("div", { className: "mt-1 text-sm text-slate-600 dark:text-slate-300", children: selectedOrganization.summary })] })) : (_jsx("div", { className: "mt-3 text-sm text-slate-500 dark:text-slate-400", children: "No organization context selected. Showing all organizations in the active realm." }))] }))] }), selectedTab === 'realms' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Realms and Bindings Registry", description: "Select a dataset, then use filter, sort, paging, and row actions to navigate detail workflows. Creation and updates are handled on separate management pages.", icon: _jsx(ShieldCheck, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Dataset" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'realms', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "realms", children: "Realms" }), _jsx("option", { value: "bindings", children: "Realm Bindings" }), _jsx("option", { value: "exports", children: "Realm Exports" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [selectedEntity === 'realms' && (_jsx("button", { type: "button", onClick: () => {
                                                                resetRealmForm();
                                                                openCurrentTabManageMode('realms');
                                                            }, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New Realm" })), selectedEntity === 'bindings' && (_jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('bindings'), className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Manage Bindings" })), selectedEntity === 'exports' && (_jsx("button", { type: "button", onClick: handleExportRealm, disabled: !canManageIam || !selectedRealmId || isExportingRealm, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: isExportingRealm ? 'Exporting…' : 'Export Selected Realm' }))] })] }), selectedEntity === 'realms' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: realmsTableState.search, onSearchChange: (value) => setManagedTableState('realms', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search realms", sortBy: realmsTableState.sortBy, onSortByChange: (value) => setManagedTableState('realms', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'scope', label: 'Scope' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'protocol_count', label: 'Protocol Count' },
                                                    ], sortDirection: realmsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('realms', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: realmsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('realms', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Realm', 'Scope', 'Protocols', 'Status', 'Actions'], rows: realmsTable.rows.map((realm) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: realm.name }), _jsx("div", { className: "text-xs text-slate-500", children: realm.id })] }, realm.id),
                                                        realm.scope_kind,
                                                        realm.supported_protocols.join(', '),
                                                        realm.status,
                                                        _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                                        setSelectedRealmId(realm.id);
                                                                        setRealmForm(buildRealmForm(realm));
                                                                        openCurrentTabManageMode('realms');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View" }), canManageIam && (_jsx("button", { type: "button", onClick: () => {
                                                                        setSelectedRealmId(realm.id);
                                                                        setRealmForm(buildRealmForm(realm));
                                                                        openCurrentTabManageMode('realms');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }, `${realm.id}-actions`),
                                                    ]), emptyLabel: "No realm records available." }), _jsx(ManagedPagination, { page: realmsTable.page, totalPages: realmsTable.totalPages, pageStart: realmsTable.pageStart, pageEnd: realmsTable.pageEnd, totalCount: realmsTable.totalCount, onPageChange: (page) => setManagedTableState('realms', (current) => ({ ...current, page })) })] })), selectedEntity === 'bindings' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: bindingsTableState.search, onSearchChange: (value) => setManagedTableState('realm-bindings', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search bindings", sortBy: bindingsTableState.sortBy, onSortByChange: (value) => setManagedTableState('realm-bindings', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'target', label: 'Target' },
                                                        { value: 'kind', label: 'Target Kind' },
                                                        { value: 'mode', label: 'Binding Mode' },
                                                        { value: 'realm', label: 'Realm' },
                                                    ], sortDirection: bindingsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('realm-bindings', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: bindingsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('realm-bindings', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Target', 'Kind', 'Mode', 'Realm', 'Actions'], rows: bindingsTable.rows.map((binding) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: binding.binding_target_name }), _jsx("div", { className: "text-xs text-slate-500", children: binding.binding_target_id })] }, binding.id),
                                                        binding.binding_target_kind,
                                                        binding.binding_mode,
                                                        binding.realm_name,
                                                        _jsx("button", { type: "button", onClick: () => {
                                                                setSelectedBindingId(binding.id);
                                                                setBindingForm(buildBindingForm(binding));
                                                                openCurrentTabManageMode('bindings');
                                                            }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }, `${binding.id}-manage`),
                                                    ]), emptyLabel: "No realm bindings available." }), _jsx(ManagedPagination, { page: bindingsTable.page, totalPages: bindingsTable.totalPages, pageStart: bindingsTable.pageStart, pageEnd: bindingsTable.pageEnd, totalCount: bindingsTable.totalCount, onPageChange: (page) => setManagedTableState('realm-bindings', (current) => ({ ...current, page })) })] })), selectedEntity === 'exports' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: exportsTableState.search, onSearchChange: (value) => setManagedTableState('realm-exports', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search realm exports", sortBy: exportsTableState.sortBy, onSortByChange: (value) => setManagedTableState('realm-exports', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'exported_at', label: 'Exported At' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'users', label: 'User Count' },
                                                    ], sortDirection: exportsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('realm-exports', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: exportsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('realm-exports', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Exported', 'Status', 'Summary', 'Object Key'], rows: exportsTable.rows.map((record) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: record.exported_at }), _jsx("div", { className: "text-xs text-slate-500", children: record.id })] }, record.id),
                                                        record.status,
                                                        `${record.summary.user_count} users · ${record.summary.group_count} groups · ${record.summary.role_count} roles`,
                                                        _jsx("span", { className: "break-all text-xs text-slate-500 dark:text-slate-400", children: record.object_key }, `${record.id}-key`),
                                                    ]), emptyLabel: "No export artifacts available." }), _jsx(ManagedPagination, { page: exportsTable.page, totalPages: exportsTable.totalPages, pageStart: exportsTable.pageStart, pageEnd: exportsTable.pageEnd, totalCount: exportsTable.totalCount, onPageChange: (page) => setManagedTableState('realm-exports', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Realm Management", description: "You are in management mode for realm and binding mutation workflows.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-[1.08fr_0.92fr]", children: [_jsxs("div", { className: "space-y-6", children: [_jsx(Panel, { title: "Realm Registry", description: "Standalone realms and template-aware clones are the authority foundation for later protocol runtime.", icon: _jsx(ShieldCheck, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: [_jsx("th", { className: "pb-3", children: "Realm" }), _jsx("th", { className: "pb-3", children: "Scope" }), _jsx("th", { className: "pb-3", children: "Protocols" }), _jsx("th", { className: "pb-3", children: "Status" }), _jsx("th", { className: "pb-3" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: realms.map((realm) => (_jsxs("tr", { children: [_jsxs("td", { className: "py-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: realm.name }), _jsx("div", { className: "text-xs text-slate-500", children: realm.id })] }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: realm.scope_kind }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: realm.supported_protocols.join(', ') }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: realm.status }), _jsx("td", { className: "py-3 text-right", children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => setSelectedRealmId(realm.id), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Focus" }), canManageIam && (_jsx("button", { type: "button", onClick: () => setRealmForm(buildRealmForm(realm)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }) })] }, realm.id))) })] }) }) }), _jsx(Panel, { title: "Realm Bindings", description: "Applications and tenant spaces can be rebound to default or override realms without coupling the consumers to the identity store.", icon: _jsx(Link2, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("select", { value: selectedBindingTargetKind, onChange: (event) => setSelectedBindingTargetKind(event.target.value), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "ALL", children: "All bindings" }), _jsx("option", { value: "APPLICATION", children: "Applications" }), _jsx("option", { value: "TENANT_SPACE", children: "Tenant spaces" })] }), _jsxs("select", { value: selectedBindingId, onChange: (event) => setSelectedBindingId(event.target.value), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "Select a binding" }), filteredBindings.map((binding) => (_jsxs("option", { value: binding.id, children: [binding.binding_target_name, " \u00B7 ", binding.binding_mode] }, binding.id)))] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: [_jsx("th", { className: "pb-3", children: "Target" }), _jsx("th", { className: "pb-3", children: "Mode" }), _jsx("th", { className: "pb-3", children: "Realm" }), _jsx("th", { className: "pb-3", children: "Notes" })] }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: filteredBindings.map((binding) => (_jsxs("tr", { children: [_jsxs("td", { className: "py-3", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: binding.binding_target_name }), _jsxs("div", { className: "text-xs text-slate-500", children: [binding.binding_target_kind, " \u00B7 ", binding.binding_target_id] })] }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: binding.binding_mode }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: binding.realm_name }), _jsx("td", { className: "py-3 text-slate-600 dark:text-slate-300", children: binding.notes.join(' ') })] }, binding.id))) })] }) }), _jsxs("form", { onSubmit: handleBindingSubmit, className: "grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 md:grid-cols-3", children: [_jsx(LabeledSelect, { label: "Binding Mode", value: bindingForm.bindingMode, onChange: (value) => setBindingForm((current) => ({ ...current, bindingMode: value })), options: bindingModeOptions }), _jsx(LabeledSelect, { label: "Bound Realm", value: bindingForm.realmId, onChange: (value) => setBindingForm((current) => ({ ...current, realmId: value })), options: [
                                                                                    { value: '', label: 'Select realm' },
                                                                                    ...realms.map((realm) => ({ value: realm.id, label: realm.name })),
                                                                                ] }), _jsx(LabeledInput, { label: "Notes", value: bindingForm.notes, onChange: (value) => setBindingForm((current) => ({ ...current, notes: value })) }), requiresBindingOverrideApproval && (_jsxs(_Fragment, { children: [_jsx(LabeledInput, { label: "Override Reason", value: bindingForm.overrideReason, onChange: (value) => setBindingForm((current) => ({ ...current, overrideReason: value })) }), _jsx(LabeledInput, { label: "Override Purpose", value: bindingForm.overridePurpose, onChange: (value) => setBindingForm((current) => ({ ...current, overridePurpose: value })) })] })), _jsx("div", { className: "md:col-span-3 flex gap-3", children: _jsx("button", { type: "submit", disabled: !canManageIam || isSavingBinding || !bindingForm.id, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSavingBinding ? 'Saving…' : 'Save Binding' }) })] })] }) })] }), _jsx("div", { className: "space-y-6", children: _jsx(FormCard, { title: realmForm.id ? 'Edit Realm' : 'Create Realm', description: "Create standalone validation realms or clone an existing realm into a downstream tenant override.", icon: Building2, children: _jsxs("form", { onSubmit: handleRealmSubmit, className: "space-y-4", children: [_jsx(LabeledInput, { label: "Realm Name", value: realmForm.name, onChange: (value) => setRealmForm((current) => ({ ...current, name: value })) }), _jsx(LabeledTextarea, { label: "Summary", value: realmForm.summary, onChange: (value) => setRealmForm((current) => ({ ...current, summary: value })), rows: 3 }), _jsx(LabeledInput, { label: "Intended Consumers", value: realmForm.intendedConsumers, onChange: (value) => setRealmForm((current) => ({ ...current, intendedConsumers: value })) }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Scope", value: realmForm.scopeKind, onChange: (value) => setRealmForm((current) => ({ ...current, scopeKind: value })), options: [
                                                                                { value: 'STANDALONE_VALIDATION', label: 'Standalone Validation' },
                                                                                { value: 'TENANT_OVERRIDE', label: 'Tenant Override' },
                                                                                { value: 'PLATFORM_DEFAULT', label: 'Platform Default' },
                                                                            ] }), _jsx(LabeledSelect, { label: "Status", value: realmForm.status, onChange: (value) => setRealmForm((current) => ({ ...current, status: value })), options: [
                                                                                { value: 'READY_FOR_FOUNDATION_PHASE', label: 'Ready For Foundation Phase' },
                                                                                { value: 'ACTIVE', label: 'Active' },
                                                                                { value: 'STANDALONE_VALIDATION', label: 'Standalone Validation' },
                                                                                { value: 'ARCHIVED', label: 'Archived' },
                                                                            ] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Template", value: realmForm.templateId, onChange: (value) => setRealmForm((current) => ({ ...current, templateId: value })), options: [
                                                                                { value: '', label: 'No template' },
                                                                                ...realmTemplates.map((template) => ({ value: template.id, label: template.name })),
                                                                            ] }), _jsx(LabeledSelect, { label: "Clone From", value: realmForm.cloneFromRealmId, onChange: (value) => setRealmForm((current) => ({ ...current, cloneFromRealmId: value })), options: [
                                                                                { value: '', label: 'New realm foundation' },
                                                                                ...realms.map((realm) => ({ value: realm.id, label: realm.name })),
                                                                            ] })] }), _jsx(LabeledInput, { label: "Owner Tenant", value: realmForm.ownerTenantId, onChange: (value) => setRealmForm((current) => ({ ...current, ownerTenantId: value })) }), realmForm.ownerTenantId.trim() && (_jsxs("div", { className: "space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsx(LabeledSelect, { label: "Tenant Realm Role", value: realmForm.tenantRealmRole, onChange: (value) => setRealmForm((current) => ({ ...current, tenantRealmRole: value })), options: [
                                                                                { value: 'PRIMARY', label: 'Primary' },
                                                                                { value: 'EXCEPTION', label: 'Exception' },
                                                                            ] }), realmForm.tenantRealmRole === 'EXCEPTION' && (_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledInput, { label: "Exception Reason", value: realmForm.exceptionReason, onChange: (value) => setRealmForm((current) => ({ ...current, exceptionReason: value })) }), _jsx(LabeledInput, { label: "Exception Purpose", value: realmForm.exceptionPurpose, onChange: (value) => setRealmForm((current) => ({ ...current, exceptionPurpose: value })) })] }))] })), _jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "text-sm font-medium text-slate-900 dark:text-white", children: "Supported Protocols" }), _jsx("div", { className: "grid gap-2 sm:grid-cols-3", children: ['OIDC', 'OAUTH2', 'SAML'].map((protocol) => (_jsxs("label", { className: "flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800", children: [_jsx("span", { className: "text-slate-700 dark:text-slate-200", children: protocol }), _jsx("input", { type: "checkbox", checked: realmForm.supportedProtocols.includes(protocol), onChange: () => handleProtocolToggle(protocol) })] }, protocol))) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: !canManageIam || isSavingRealm, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSavingRealm ? 'Saving…' : realmForm.id ? 'Update Realm' : 'Create Realm' }), _jsx("button", { type: "button", onClick: resetRealmForm, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" })] })] }) }) })] }), _jsxs(Panel, { title: "Realm Exports", description: "Export artifacts prove that realm state can be captured cleanly for backup, rehearsal, and later migration workflows.", icon: _jsx(Download, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsx("div", { className: "mb-4 flex justify-end", children: _jsxs("button", { type: "button", onClick: handleExportRealm, disabled: !canManageIam || !selectedRealmId || isExportingRealm, className: "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: [_jsx(Download, { className: "h-4 w-4" }), isExportingRealm ? 'Exporting…' : 'Export Selected Realm'] }) }), _jsx(DataTable, { headers: ['Export', 'Realm', 'Summary', 'Object Key'], rows: selectedRealmExports.map((record) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: record.exported_at }), _jsx("div", { className: "text-xs text-slate-500", children: record.id })] }, record.id),
                                                        record.realm_name,
                                                        `${record.summary.user_count} users · ${record.summary.group_count} groups · ${record.summary.role_count} roles`,
                                                        _jsx("span", { className: "break-all text-xs text-slate-500 dark:text-slate-400", children: record.object_key }, `${record.id}-object`),
                                                    ]), emptyLabel: "No export artifacts for the selected realm." })] })] }))), selectedTab === 'access' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Access Control Registry", description: "Each identity entity now has its own table-first page with filtering, sorting, paging, row actions, and dedicated create/update navigation.", icon: _jsx(Users, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'access', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "users", children: "Users" }), _jsx("option", { value: "groups", children: "Groups" }), _jsx("option", { value: "roles", children: "Roles" }), _jsx("option", { value: "delegated-admins", children: "Delegated Admins" })] })] }), selectedEntity === 'users' && (_jsx("button", { type: "button", onClick: () => {
                                                        resetUserForm();
                                                        openCurrentTabManageMode('users');
                                                    }, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New User" })), selectedEntity === 'groups' && (_jsx("button", { type: "button", onClick: () => {
                                                        resetGroupForm();
                                                        openCurrentTabManageMode('groups');
                                                    }, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New Group" })), selectedEntity === 'roles' && (_jsx("button", { type: "button", onClick: () => {
                                                        resetRoleForm();
                                                        openCurrentTabManageMode('roles');
                                                    }, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New Role" })), selectedEntity === 'delegated-admins' && (_jsx("button", { type: "button", onClick: () => {
                                                        resetDelegatedAdminForm();
                                                        openCurrentTabManageMode('delegated-admins');
                                                    }, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New Delegated Admin" }))] }), selectedEntity === 'users' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: accessUsersTableState.search, onSearchChange: (value) => setManagedTableState('access-users', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search users", sortBy: accessUsersTableState.sortBy, onSortByChange: (value) => setManagedTableState('access-users', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'username', label: 'Username' },
                                                        { value: 'email', label: 'Email' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'role_count', label: 'Role Count' },
                                                        { value: 'group_count', label: 'Group Count' },
                                                    ], sortDirection: accessUsersTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('access-users', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: accessUsersTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('access-users', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['User', 'Status', 'Roles', 'Groups', 'Actions'], rows: accessUsersTable.rows.map((user) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: user.username }), _jsx("div", { className: "text-xs text-slate-500", children: user.email })] }, user.id),
                                                        user.status,
                                                        String(user.role_ids.length),
                                                        String(user.group_ids.length),
                                                        _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                                        setUserForm(buildUserForm(user));
                                                                        openCurrentTabManageMode('users');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View" }), canManageIam && (_jsx("button", { type: "button", onClick: () => {
                                                                        setUserForm(buildUserForm(user));
                                                                        openCurrentTabManageMode('users');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }, `${user.id}-actions`),
                                                    ]), emptyLabel: "No users in this realm." }), _jsx(ManagedPagination, { page: accessUsersTable.page, totalPages: accessUsersTable.totalPages, pageStart: accessUsersTable.pageStart, pageEnd: accessUsersTable.pageEnd, totalCount: accessUsersTable.totalCount, onPageChange: (page) => setManagedTableState('access-users', (current) => ({ ...current, page })) })] })), selectedEntity === 'groups' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: accessGroupsTableState.search, onSearchChange: (value) => setManagedTableState('access-groups', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search groups", sortBy: accessGroupsTableState.sortBy, onSortByChange: (value) => setManagedTableState('access-groups', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'member_count', label: 'Member Count' },
                                                        { value: 'role_count', label: 'Role Count' },
                                                    ], sortDirection: accessGroupsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('access-groups', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: accessGroupsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('access-groups', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Group', 'Status', 'Members', 'Roles', 'Actions'], rows: accessGroupsTable.rows.map((group) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: group.name }), _jsx("div", { className: "text-xs text-slate-500", children: group.parent_group_id ?? 'Root group' })] }, group.id),
                                                        group.status,
                                                        String(group.member_user_ids.length),
                                                        String(group.role_ids.length),
                                                        _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                                        setGroupForm(buildGroupForm(group));
                                                                        openCurrentTabManageMode('groups');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View" }), canManageIam && (_jsx("button", { type: "button", onClick: () => {
                                                                        setGroupForm(buildGroupForm(group));
                                                                        openCurrentTabManageMode('groups');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }, `${group.id}-actions`),
                                                    ]), emptyLabel: "No groups in this realm." }), _jsx(ManagedPagination, { page: accessGroupsTable.page, totalPages: accessGroupsTable.totalPages, pageStart: accessGroupsTable.pageStart, pageEnd: accessGroupsTable.pageEnd, totalCount: accessGroupsTable.totalCount, onPageChange: (page) => setManagedTableState('access-groups', (current) => ({ ...current, page })) })] })), selectedEntity === 'roles' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: accessRolesTableState.search, onSearchChange: (value) => setManagedTableState('access-roles', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search roles", sortBy: accessRolesTableState.sortBy, onSortByChange: (value) => setManagedTableState('access-roles', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'composite_count', label: 'Composite Count' },
                                                    ], sortDirection: accessRolesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('access-roles', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: accessRolesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('access-roles', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Role', 'Kind', 'Status', 'Composite Members', 'Actions'], rows: accessRolesTable.rows.map((role) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: role.name }), _jsx("div", { className: "text-xs text-slate-500", children: role.client_id ?? 'Realm scoped' })] }, role.id),
                                                        role.kind,
                                                        role.status,
                                                        String(role.composite_role_ids.length),
                                                        _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                                        setRoleForm(buildRoleForm(role));
                                                                        openCurrentTabManageMode('roles');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View" }), canManageIam && (_jsx("button", { type: "button", onClick: () => {
                                                                        setRoleForm(buildRoleForm(role));
                                                                        openCurrentTabManageMode('roles');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }, `${role.id}-actions`),
                                                    ]), emptyLabel: "No roles in this realm." }), _jsx(ManagedPagination, { page: accessRolesTable.page, totalPages: accessRolesTable.totalPages, pageStart: accessRolesTable.pageStart, pageEnd: accessRolesTable.pageEnd, totalCount: accessRolesTable.totalCount, onPageChange: (page) => setManagedTableState('access-roles', (current) => ({ ...current, page })) })] })), selectedEntity === 'delegated-admins' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: accessDelegatedAdminsTableState.search, onSearchChange: (value) => setManagedTableState('access-delegated-admins', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search delegated admins", sortBy: accessDelegatedAdminsTableState.sortBy, onSortByChange: (value) => setManagedTableState('access-delegated-admins', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'principal_label', label: 'Principal' },
                                                        { value: 'kind', label: 'Principal Kind' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'role_count', label: 'Role Coverage' },
                                                        { value: 'group_count', label: 'Group Coverage' },
                                                    ], sortDirection: accessDelegatedAdminsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('access-delegated-admins', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: accessDelegatedAdminsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('access-delegated-admins', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Principal', 'Kind', 'Status', 'Coverage', 'Actions'], rows: accessDelegatedAdminsTable.rows.map((assignment) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: assignment.principal_label }), _jsx("div", { className: "text-xs text-slate-500", children: assignment.principal_id })] }, assignment.id),
                                                        assignment.principal_kind,
                                                        assignment.status,
                                                        `${assignment.managed_role_ids.length} roles · ${assignment.managed_group_ids.length} groups`,
                                                        _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                                                        setDelegatedAdminForm(buildDelegatedAdminForm(assignment));
                                                                        openCurrentTabManageMode('delegated-admins');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View" }), canManageIam && (_jsx("button", { type: "button", onClick: () => {
                                                                        setDelegatedAdminForm(buildDelegatedAdminForm(assignment));
                                                                        openCurrentTabManageMode('delegated-admins');
                                                                    }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" }))] }, `${assignment.id}-actions`),
                                                    ]), emptyLabel: "No delegated admin assignments in this realm." }), _jsx(ManagedPagination, { page: accessDelegatedAdminsTable.page, totalPages: accessDelegatedAdminsTable.totalPages, pageStart: accessDelegatedAdminsTable.pageStart, pageEnd: accessDelegatedAdminsTable.pageEnd, totalCount: accessDelegatedAdminsTable.totalCount, onPageChange: (page) => setManagedTableState('access-delegated-admins', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Access Control Management", description: "Management mode for user, group, role, and delegated admin mutation workflows.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsxs("section", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500", children: [_jsx(UserSquare2, { className: "h-4 w-4 text-indigo-600" }), "Realm Workspace"] }), _jsx("p", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: "Manage users, groups, roles, and delegated administration inside the selected identity realm." })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs(Panel, { title: "Users", description: "Per-realm principals with required actions, memberships, and direct role assignments.", icon: _jsx(Users, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsx(DataTable, { headers: ['User', 'Status', 'Roles', 'Groups', ''], rows: realmUsers.map((user) => [
                                                                _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: user.username }), _jsx("div", { className: "text-xs text-slate-500", children: user.email })] }, user.id),
                                                                user.status,
                                                                String(user.role_ids.length),
                                                                String(user.group_ids.length),
                                                                canManageIam ? (_jsx("button", { type: "button", onClick: () => setUserForm(buildUserForm(user)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })) : '—',
                                                            ]), emptyLabel: "No users in this realm." }), _jsxs("form", { onSubmit: handleUserSubmit, className: "mt-5 space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Realm", value: userForm.realmId, onChange: (value) => setUserForm((current) => ({ ...current, realmId: value })), options: realms.map((realm) => ({ value: realm.id, label: realm.name })) }), _jsx(LabeledSelect, { label: "Status", value: userForm.status, onChange: (value) => setUserForm((current) => ({ ...current, status: value })), options: [
                                                                                { value: 'STAGED', label: 'Staged' },
                                                                                { value: 'ACTIVE', label: 'Active' },
                                                                                { value: 'DISABLED', label: 'Disabled' },
                                                                            ] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledInput, { label: "Username", value: userForm.username, onChange: (value) => setUserForm((current) => ({ ...current, username: value })), disabled: Boolean(userForm.id) }), _jsx(LabeledInput, { label: "Email", value: userForm.email, onChange: (value) => setUserForm((current) => ({ ...current, email: value })) })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledInput, { label: "First Name", value: userForm.firstName, onChange: (value) => setUserForm((current) => ({ ...current, firstName: value })) }), _jsx(LabeledInput, { label: "Last Name", value: userForm.lastName, onChange: (value) => setUserForm((current) => ({ ...current, lastName: value })) })] }), _jsx(LabeledInput, { label: "Required Actions", value: userForm.requiredActions, onChange: (value) => setUserForm((current) => ({ ...current, requiredActions: value })) }), _jsx(CheckboxList, { label: "Assigned Roles", items: realmRoleOptions.map((role) => ({ id: role.id, label: `${role.name} (${role.kind})` })), selectedIds: userForm.roleIds, onToggle: (id) => setUserForm((current) => ({ ...current, roleIds: toggleId(current.roleIds, id) })) }), _jsx(CheckboxList, { label: "Group Memberships", items: realmGroupOptions.map((group) => ({ id: group.id, label: group.name })), selectedIds: userForm.groupIds, onToggle: (id) => setUserForm((current) => ({ ...current, groupIds: toggleId(current.groupIds, id) })) }), _jsx(FormActions, { canManage: canManageIam, isSaving: isSavingUser, saveLabel: userForm.id ? 'Update User' : 'Create User', onReset: resetUserForm })] })] }), _jsxs(Panel, { title: "Groups", description: "Hierarchical groups with user memberships and role attachments.", icon: _jsx(Building2, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsx(DataTable, { headers: ['Group', 'Status', 'Members', 'Roles', ''], rows: realmGroups.map((group) => [
                                                                _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: group.name }), _jsx("div", { className: "text-xs text-slate-500", children: group.parent_group_id ?? 'Root group' })] }, group.id),
                                                                group.status,
                                                                String(group.member_user_ids.length),
                                                                String(group.role_ids.length),
                                                                canManageIam ? (_jsx("button", { type: "button", onClick: () => setGroupForm(buildGroupForm(group)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })) : '—',
                                                            ]), emptyLabel: "No groups in this realm." }), _jsxs("form", { onSubmit: handleGroupSubmit, className: "mt-5 space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Realm", value: groupForm.realmId, onChange: (value) => setGroupForm((current) => ({ ...current, realmId: value })), options: realms.map((realm) => ({ value: realm.id, label: realm.name })) }), _jsx(LabeledSelect, { label: "Status", value: groupForm.status, onChange: (value) => setGroupForm((current) => ({ ...current, status: value })), options: [
                                                                                { value: 'ACTIVE', label: 'Active' },
                                                                                { value: 'ARCHIVED', label: 'Archived' },
                                                                            ] })] }), _jsx(LabeledInput, { label: "Group Name", value: groupForm.name, onChange: (value) => setGroupForm((current) => ({ ...current, name: value })) }), _jsx(LabeledTextarea, { label: "Summary", value: groupForm.summary, onChange: (value) => setGroupForm((current) => ({ ...current, summary: value })), rows: 3 }), _jsx(LabeledSelect, { label: "Parent Group", value: groupForm.parentGroupId, onChange: (value) => setGroupForm((current) => ({ ...current, parentGroupId: value })), options: [
                                                                        { value: '', label: 'No parent group' },
                                                                        ...realmGroupOptions
                                                                            .filter((group) => group.id !== groupForm.id)
                                                                            .map((group) => ({ value: group.id, label: group.name })),
                                                                    ] }), _jsx(CheckboxList, { label: "Assigned Roles", items: realmRoleOptions.map((role) => ({ id: role.id, label: `${role.name} (${role.kind})` })), selectedIds: groupForm.roleIds, onToggle: (id) => setGroupForm((current) => ({ ...current, roleIds: toggleId(current.roleIds, id) })) }), _jsx(CheckboxList, { label: "Members", items: realmUserOptions.map((user) => ({ id: user.id, label: `${user.username} (${user.email})` })), selectedIds: groupForm.memberUserIds, onToggle: (id) => setGroupForm((current) => ({ ...current, memberUserIds: toggleId(current.memberUserIds, id) })) }), _jsx(FormActions, { canManage: canManageIam, isSaving: isSavingGroup, saveLabel: groupForm.id ? 'Update Group' : 'Create Group', onReset: resetGroupForm })] })] })] }), _jsxs("section", { className: "grid gap-6 xl:grid-cols-2", children: [_jsxs(Panel, { title: "Roles", description: "Realm roles, client roles, and composite roles define the RBAC authority model.", icon: _jsx(KeyRound, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsx(DataTable, { headers: ['Role', 'Kind', 'Status', 'Members', ''], rows: realmRoles.map((role) => [
                                                                _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: role.name }), _jsx("div", { className: "text-xs text-slate-500", children: role.client_id ?? 'Realm-scoped' })] }, role.id),
                                                                role.kind,
                                                                role.status,
                                                                role.kind === 'COMPOSITE_ROLE' ? String(role.composite_role_ids.length) : '—',
                                                                canManageIam ? (_jsx("button", { type: "button", onClick: () => setRoleForm(buildRoleForm(role)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })) : '—',
                                                            ]), emptyLabel: "No roles in this realm." }), _jsxs("form", { onSubmit: handleRoleSubmit, className: "mt-5 space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Realm", value: roleForm.realmId, onChange: (value) => setRoleForm((current) => ({ ...current, realmId: value })), options: realms.map((realm) => ({ value: realm.id, label: realm.name })) }), _jsx(LabeledSelect, { label: "Status", value: roleForm.status, onChange: (value) => setRoleForm((current) => ({ ...current, status: value })), options: [
                                                                                { value: 'ACTIVE', label: 'Active' },
                                                                                { value: 'ARCHIVED', label: 'Archived' },
                                                                            ] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledInput, { label: "Role Name", value: roleForm.name, onChange: (value) => setRoleForm((current) => ({ ...current, name: value })) }), _jsx(LabeledSelect, { label: "Role Kind", value: roleForm.kind, onChange: (value) => setRoleForm((current) => ({ ...current, kind: value })), options: [
                                                                                { value: 'REALM_ROLE', label: 'Realm Role' },
                                                                                { value: 'CLIENT_ROLE', label: 'Client Role' },
                                                                                { value: 'COMPOSITE_ROLE', label: 'Composite Role' },
                                                                            ] })] }), _jsx(LabeledTextarea, { label: "Summary", value: roleForm.summary, onChange: (value) => setRoleForm((current) => ({ ...current, summary: value })), rows: 3 }), roleForm.kind === 'CLIENT_ROLE' && (_jsx(LabeledInput, { label: "Client ID", value: roleForm.clientId, onChange: (value) => setRoleForm((current) => ({ ...current, clientId: value })) })), roleForm.kind === 'COMPOSITE_ROLE' && (_jsx(CheckboxList, { label: "Composite Members", items: realmRoleOptions.filter((role) => role.id !== roleForm.id).map((role) => ({ id: role.id, label: `${role.name} (${role.kind})` })), selectedIds: roleForm.compositeRoleIds, onToggle: (id) => setRoleForm((current) => ({ ...current, compositeRoleIds: toggleId(current.compositeRoleIds, id) })) })), _jsx(FormActions, { canManage: canManageIam, isSaving: isSavingRole, saveLabel: roleForm.id ? 'Update Role' : 'Create Role', onReset: resetRoleForm })] })] }), _jsxs(Panel, { title: "Delegated Administration", description: "Scope constrained administrative coverage to specific principals instead of making them full realm admins.", icon: _jsx(ShieldCheck, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsx(DataTable, { headers: ['Principal', 'Kind', 'Status', 'Coverage', ''], rows: realmDelegatedAdmins.map((assignment) => [
                                                                _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: assignment.principal_label }), _jsx("div", { className: "text-xs text-slate-500", children: assignment.principal_id })] }, assignment.id),
                                                                assignment.principal_kind,
                                                                assignment.status,
                                                                `${assignment.managed_role_ids.length} roles · ${assignment.managed_group_ids.length} groups`,
                                                                canManageIam ? (_jsx("button", { type: "button", onClick: () => setDelegatedAdminForm(buildDelegatedAdminForm(assignment)), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Edit" })) : '—',
                                                            ]), emptyLabel: "No delegated admin assignments in this realm." }), _jsxs("form", { onSubmit: handleDelegatedAdminSubmit, className: "mt-5 space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800", children: [_jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Realm", value: delegatedAdminForm.realmId, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, realmId: value })), options: realms.map((realm) => ({ value: realm.id, label: realm.name })) }), _jsx(LabeledSelect, { label: "Status", value: delegatedAdminForm.status, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, status: value })), options: [
                                                                                { value: 'ACTIVE', label: 'Active' },
                                                                                { value: 'DISABLED', label: 'Disabled' },
                                                                            ] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsx(LabeledSelect, { label: "Principal Kind", value: delegatedAdminForm.principalKind, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, principalKind: value, principalId: '' })), options: [
                                                                                { value: 'USER', label: 'User' },
                                                                                { value: 'GROUP', label: 'Group' },
                                                                            ] }), _jsx(LabeledSelect, { label: "Principal", value: delegatedAdminForm.principalId, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, principalId: value })), options: [
                                                                                { value: '', label: 'Select principal' },
                                                                                ...(delegatedAdminForm.principalKind === 'USER'
                                                                                    ? realmUserOptions.map((user) => ({ value: user.id, label: `${user.username} (${user.email})` }))
                                                                                    : realmGroupOptions.map((group) => ({ value: group.id, label: group.name }))),
                                                                            ] })] }), _jsx(LabeledInput, { label: "Principal Label", value: delegatedAdminForm.principalLabel, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, principalLabel: value })) }), _jsx(LabeledInput, { label: "Managed Client IDs", value: delegatedAdminForm.managedClientIds, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, managedClientIds: value })) }), _jsx(LabeledInput, { label: "Notes", value: delegatedAdminForm.notes, onChange: (value) => setDelegatedAdminForm((current) => ({ ...current, notes: value })) }), _jsx(CheckboxList, { label: "Managed Roles", items: realmRoleOptions.map((role) => ({ id: role.id, label: `${role.name} (${role.kind})` })), selectedIds: delegatedAdminForm.managedRoleIds, onToggle: (id) => setDelegatedAdminForm((current) => ({ ...current, managedRoleIds: toggleId(current.managedRoleIds, id) })) }), _jsx(CheckboxList, { label: "Managed Groups", items: realmGroupOptions.map((group) => ({ id: group.id, label: group.name })), selectedIds: delegatedAdminForm.managedGroupIds, onToggle: (id) => setDelegatedAdminForm((current) => ({ ...current, managedGroupIds: toggleId(current.managedGroupIds, id) })) }), _jsx(FormActions, { canManage: canManageIam, isSaving: isSavingDelegatedAdmin, saveLabel: delegatedAdminForm.id ? 'Update Delegated Admin' : 'Create Delegated Admin', onReset: resetDelegatedAdminForm })] })] })] })] }))), selectedTab === 'protocols' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Protocol Runtime Registry", description: "Protocol entities are split into dedicated datasets with table-first controls for filtering, sorting, and paging.", icon: _jsx(KeyRound, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'protocols', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "clients", children: "Clients" }), _jsx("option", { value: "client-scopes", children: "Client Scopes" }), _jsx("option", { value: "protocol-mappers", children: "Protocol Mappers" })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'clients' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: protocolClientsTableState.search, onSearchChange: (value) => setManagedTableState('protocol-clients', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search clients", sortBy: protocolClientsTableState.sortBy, onSortByChange: (value) => setManagedTableState('protocol-clients', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'client_id', label: 'Client ID' },
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'protocol', label: 'Protocol' },
                                                        { value: 'access', label: 'Access Type' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: protocolClientsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('protocol-clients', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: protocolClientsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('protocol-clients', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Client', 'Protocol', 'Access', 'Status', 'Actions'], rows: protocolClientsTable.rows.map((client) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: client.client_id }), _jsx("div", { className: "text-xs text-slate-500", children: client.name })] }, client.id),
                                                        client.protocol,
                                                        client.access_type,
                                                        client.status,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('clients'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${client.id}-manage`),
                                                    ]), emptyLabel: "No clients available." }), _jsx(ManagedPagination, { page: protocolClientsTable.page, totalPages: protocolClientsTable.totalPages, pageStart: protocolClientsTable.pageStart, pageEnd: protocolClientsTable.pageEnd, totalCount: protocolClientsTable.totalCount, onPageChange: (page) => setManagedTableState('protocol-clients', (current) => ({ ...current, page })) })] })), selectedEntity === 'client-scopes' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: protocolClientScopesTableState.search, onSearchChange: (value) => setManagedTableState('protocol-client-scopes', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search client scopes", sortBy: protocolClientScopesTableState.sortBy, onSortByChange: (value) => setManagedTableState('protocol-client-scopes', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'protocol', label: 'Protocol' },
                                                        { value: 'assignment', label: 'Assignment Type' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: protocolClientScopesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('protocol-client-scopes', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: protocolClientScopesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('protocol-client-scopes', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Scope', 'Protocol', 'Assignment', 'Status', 'Actions'], rows: protocolClientScopesTable.rows.map((scope) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: scope.name }), _jsx("div", { className: "text-xs text-slate-500", children: scope.description })] }, scope.id),
                                                        scope.protocol,
                                                        scope.assignment_type,
                                                        scope.status,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('client-scopes'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${scope.id}-manage`),
                                                    ]), emptyLabel: "No client scopes available." }), _jsx(ManagedPagination, { page: protocolClientScopesTable.page, totalPages: protocolClientScopesTable.totalPages, pageStart: protocolClientScopesTable.pageStart, pageEnd: protocolClientScopesTable.pageEnd, totalCount: protocolClientScopesTable.totalCount, onPageChange: (page) => setManagedTableState('protocol-client-scopes', (current) => ({ ...current, page })) })] })), selectedEntity === 'protocol-mappers' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: protocolMappersTableState.search, onSearchChange: (value) => setManagedTableState('protocol-mappers', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search protocol mappers", sortBy: protocolMappersTableState.sortBy, onSortByChange: (value) => setManagedTableState('protocol-mappers', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'protocol', label: 'Protocol' },
                                                        { value: 'target_kind', label: 'Target Kind' },
                                                        { value: 'claim_name', label: 'Claim' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: protocolMappersTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('protocol-mappers', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: protocolMappersTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('protocol-mappers', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Mapper', 'Target', 'Claim', 'Status', 'Actions'], rows: protocolMappersTable.rows.map((mapper) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: mapper.name }), _jsx("div", { className: "text-xs text-slate-500", children: mapper.protocol })] }, mapper.id),
                                                        `${mapper.target_kind} · ${mapper.target_id}`,
                                                        mapper.claim_name,
                                                        mapper.status,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('protocol-mappers'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${mapper.id}-manage`),
                                                    ]), emptyLabel: "No protocol mappers available." }), _jsx(ManagedPagination, { page: protocolMappersTable.page, totalPages: protocolMappersTable.totalPages, pageStart: protocolMappersTable.pageStart, pageEnd: protocolMappersTable.pageEnd, totalCount: protocolMappersTable.totalCount, onPageChange: (page) => setManagedTableState('protocol-mappers', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Protocol Runtime Management", description: "Protocol runtime mutation workflows are isolated from dataset browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading protocol runtime\u2026" }), children: _jsxs("div", { className: "space-y-6", children: [_jsx(IamProtocolRuntimePanel, { selectedRealmId: selectedRealmId, canManage: canManageIam }), _jsx(IamAdvancedOAuthPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam })] }) })] }))), selectedTab === 'flows' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Authentication Flow Registry", description: "Authentication flow entities are separated into focused datasets with table controls and explicit management navigation.", icon: _jsx(Waypoints, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'flows', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "auth-flows", children: "Auth Flows" }), _jsx("option", { value: "auth-executions", children: "Executions" }), _jsx("option", { value: "flow-bindings", children: "Flow Bindings" })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'auth-flows' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: authFlowsTableState.search, onSearchChange: (value) => setManagedTableState('auth-flows', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search auth flows", sortBy: authFlowsTableState.sortBy, onSortByChange: (value) => setManagedTableState('auth-flows', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'execution_count', label: 'Execution Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: authFlowsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('auth-flows', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: authFlowsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('auth-flows', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Flow', 'Kind', 'Status', 'Executions', 'Actions'], rows: authFlowsTable.rows.map((flow) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: flow.name }), _jsx("div", { className: "text-xs text-slate-500", children: flow.description })] }, flow.id),
                                                        flow.kind,
                                                        flow.status,
                                                        String(flow.execution_ids.length),
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('auth-flows'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${flow.id}-manage`),
                                                    ]), emptyLabel: "No authentication flows available." }), _jsx(ManagedPagination, { page: authFlowsTable.page, totalPages: authFlowsTable.totalPages, pageStart: authFlowsTable.pageStart, pageEnd: authFlowsTable.pageEnd, totalCount: authFlowsTable.totalCount, onPageChange: (page) => setManagedTableState('auth-flows', (current) => ({ ...current, page })) })] })), selectedEntity === 'auth-executions' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: authExecutionsTableState.search, onSearchChange: (value) => setManagedTableState('auth-executions', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search auth executions", sortBy: authExecutionsTableState.sortBy, onSortByChange: (value) => setManagedTableState('auth-executions', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'display_name', label: 'Display Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'requirement', label: 'Requirement' },
                                                        { value: 'flow', label: 'Flow' },
                                                        { value: 'priority', label: 'Priority' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: authExecutionsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('auth-executions', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: authExecutionsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('auth-executions', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Execution', 'Kind', 'Requirement', 'Flow', 'Priority', 'Actions'], rows: authExecutionsTable.rows.map((execution) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: execution.display_name }), _jsx("div", { className: "text-xs text-slate-500", children: execution.condition_kind })] }, execution.id),
                                                        execution.execution_kind,
                                                        execution.requirement,
                                                        authFlowNameById.get(execution.flow_id) ?? execution.flow_id,
                                                        String(execution.priority),
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('auth-executions'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${execution.id}-manage`),
                                                    ]), emptyLabel: "No authentication executions available." }), _jsx(ManagedPagination, { page: authExecutionsTable.page, totalPages: authExecutionsTable.totalPages, pageStart: authExecutionsTable.pageStart, pageEnd: authExecutionsTable.pageEnd, totalCount: authExecutionsTable.totalCount, onPageChange: (page) => setManagedTableState('auth-executions', (current) => ({ ...current, page })) })] })), selectedEntity === 'flow-bindings' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: flowBindingsTableState.search, onSearchChange: (value) => setManagedTableState('auth-flow-bindings', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search flow bindings", sortBy: flowBindingsTableState.sortBy, onSortByChange: (value) => setManagedTableState('auth-flow-bindings', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'updated_at', label: 'Updated' },
                                                        { value: 'kind', label: 'Binding Kind' },
                                                        { value: 'scope', label: 'Scope' },
                                                        { value: 'browser', label: 'Browser Flow' },
                                                        { value: 'direct_grant', label: 'Direct Grant Flow' },
                                                        { value: 'account_console', label: 'Account Console Flow' },
                                                    ], sortDirection: flowBindingsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('auth-flow-bindings', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: flowBindingsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('auth-flow-bindings', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Binding', 'Scope', 'Browser', 'Direct Grant', 'Account Console', 'Actions'], rows: flowBindingsTable.rows.map((binding) => [
                                                        binding.binding_kind,
                                                        binding.scope_label,
                                                        authFlowNameById.get(binding.browser_flow_id) ?? '—',
                                                        authFlowNameById.get(binding.direct_grant_flow_id) ?? '—',
                                                        authFlowNameById.get(binding.account_console_flow_id) ?? '—',
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('flow-bindings'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${binding.id}-manage`),
                                                    ]), emptyLabel: "No flow binding records available." }), _jsx(ManagedPagination, { page: flowBindingsTable.page, totalPages: flowBindingsTable.totalPages, pageStart: flowBindingsTable.pageStart, pageEnd: flowBindingsTable.pageEnd, totalCount: flowBindingsTable.totalCount, onPageChange: (page) => setManagedTableState('auth-flow-bindings', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Authentication Flow Management", description: "Auth flow mutation workflows are isolated from list browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading authentication flows\u2026" }), children: _jsx(IamAuthFlowsPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam }) })] }))), selectedTab === 'admin' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Admin Authorization Registry", description: "Admin authorization entities are split into dedicated datasets for permissions, policies, and evaluations with table-first navigation.", icon: _jsx(UserSquare2, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'admin', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "permissions", children: "Permissions" }), _jsx("option", { value: "policies", children: "Policies" }), _jsx("option", { value: "evaluations", children: "Evaluations" })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'permissions' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: adminPermissionsTableState.search, onSearchChange: (value) => setManagedTableState('admin-permissions', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search admin permissions", sortBy: adminPermissionsTableState.sortBy, onSortByChange: (value) => setManagedTableState('admin-permissions', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'domain', label: 'Domain' },
                                                        { value: 'scope_kind', label: 'Scope Kind' },
                                                        { value: 'action_count', label: 'Action Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: adminPermissionsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('admin-permissions', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: adminPermissionsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('admin-permissions', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Permission', 'Domain', 'Scope', 'Actions', 'Updated', 'Action'], rows: adminPermissionsTable.rows.map((permission) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: permission.name }), _jsx("div", { className: "text-xs text-slate-500", children: permission.summary })] }, permission.id),
                                                        permission.domain,
                                                        permission.scope_kind,
                                                        permission.actions.join(', '),
                                                        permission.updated_at,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('permissions'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${permission.id}-manage`),
                                                    ]), emptyLabel: "No admin permissions available." }), _jsx(ManagedPagination, { page: adminPermissionsTable.page, totalPages: adminPermissionsTable.totalPages, pageStart: adminPermissionsTable.pageStart, pageEnd: adminPermissionsTable.pageEnd, totalCount: adminPermissionsTable.totalCount, onPageChange: (page) => setManagedTableState('admin-permissions', (current) => ({ ...current, page })) })] })), selectedEntity === 'policies' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: adminPoliciesTableState.search, onSearchChange: (value) => setManagedTableState('admin-policies', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search admin policies", sortBy: adminPoliciesTableState.sortBy, onSortByChange: (value) => setManagedTableState('admin-policies', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'principal_kind', label: 'Principal Kind' },
                                                        { value: 'principal_label', label: 'Principal' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'permission_count', label: 'Permission Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: adminPoliciesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('admin-policies', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: adminPoliciesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('admin-policies', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Policy', 'Principal', 'Status', 'Permissions', 'Updated', 'Action'], rows: adminPoliciesTable.rows.map((policy) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: policy.name }), _jsx("div", { className: "text-xs text-slate-500", children: policy.summary })] }, policy.id),
                                                        `${policy.principal_kind} · ${policy.principal_label}`,
                                                        policy.status,
                                                        String(policy.permission_ids.length),
                                                        policy.updated_at,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('policies'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${policy.id}-manage`),
                                                    ]), emptyLabel: "No admin policies available." }), _jsx(ManagedPagination, { page: adminPoliciesTable.page, totalPages: adminPoliciesTable.totalPages, pageStart: adminPoliciesTable.pageStart, pageEnd: adminPoliciesTable.pageEnd, totalCount: adminPoliciesTable.totalCount, onPageChange: (page) => setManagedTableState('admin-policies', (current) => ({ ...current, page })) })] })), selectedEntity === 'evaluations' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: adminEvaluationsTableState.search, onSearchChange: (value) => setManagedTableState('admin-evaluations', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search admin evaluations", sortBy: adminEvaluationsTableState.sortBy, onSortByChange: (value) => setManagedTableState('admin-evaluations', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'created_at', label: 'Created At' },
                                                        { value: 'actor', label: 'Actor' },
                                                        { value: 'domain', label: 'Domain' },
                                                        { value: 'action', label: 'Action' },
                                                        { value: 'allowed', label: 'Allowed' },
                                                        { value: 'route', label: 'Route' },
                                                    ], sortDirection: adminEvaluationsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('admin-evaluations', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: adminEvaluationsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('admin-evaluations', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Actor', 'Domain', 'Action', 'Allowed', 'Route', 'When'], rows: adminEvaluationsTable.rows.map((evaluation) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: evaluation.actor_username }), _jsx("div", { className: "text-xs text-slate-500", children: evaluation.target_resource_label ?? evaluation.target_resource_id ?? 'No explicit target' })] }, evaluation.id),
                                                        evaluation.domain,
                                                        evaluation.action,
                                                        evaluation.allowed ? 'Allowed' : 'Denied',
                                                        `${evaluation.method} ${evaluation.route}`,
                                                        evaluation.created_at,
                                                    ]), emptyLabel: "No admin evaluations available." }), _jsx(ManagedPagination, { page: adminEvaluationsTable.page, totalPages: adminEvaluationsTable.totalPages, pageStart: adminEvaluationsTable.pageStart, pageEnd: adminEvaluationsTable.pageEnd, totalCount: adminEvaluationsTable.totalCount, onPageChange: (page) => setManagedTableState('admin-evaluations', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Admin Authorization Management", description: "Admin authorization mutation workflows are isolated from table browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading admin authorization\u2026" }), children: _jsx(IamAdminAuthorizationPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam, users: users, groups: groups, roles: roles }) })] }))), selectedTab === 'authz' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Authorization Services Registry", description: "Authorization entities are split into dedicated datasets with table-first browsing and separate mutation workflows.", icon: _jsx(Shield, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'authz', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "resource-servers", children: "Resource Servers" }), _jsx("option", { value: "protected-scopes", children: "Protected Scopes" }), _jsx("option", { value: "protected-resources", children: "Protected Resources" }), _jsx("option", { value: "policies", children: "Policies" }), _jsx("option", { value: "permissions", children: "Permissions" })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'resource-servers' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: resourceServersTableState.search, onSearchChange: (value) => setManagedTableState('authz-resource-servers', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search resource servers", sortBy: resourceServersTableState.sortBy, onSortByChange: (value) => setManagedTableState('authz-resource-servers', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'client_id', label: 'Client ID' },
                                                        { value: 'enforcement', label: 'Enforcement' },
                                                        { value: 'decision', label: 'Decision Strategy' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: resourceServersTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('authz-resource-servers', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: resourceServersTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('authz-resource-servers', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Resource Server', 'Client', 'Enforcement', 'Status', 'Actions'], rows: resourceServersTable.rows.map((server) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: server.name }), _jsx("div", { className: "text-xs text-slate-500", children: server.summary })] }, server.id),
                                                        server.client_id,
                                                        `${server.enforcement_mode} · ${server.decision_strategy}`,
                                                        server.status,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('resource-servers'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${server.id}-manage`),
                                                    ]), emptyLabel: "No resource servers available." }), _jsx(ManagedPagination, { page: resourceServersTable.page, totalPages: resourceServersTable.totalPages, pageStart: resourceServersTable.pageStart, pageEnd: resourceServersTable.pageEnd, totalCount: resourceServersTable.totalCount, onPageChange: (page) => setManagedTableState('authz-resource-servers', (current) => ({ ...current, page })) })] })), selectedEntity === 'protected-scopes' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: protectedScopesTableState.search, onSearchChange: (value) => setManagedTableState('authz-protected-scopes', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search protected scopes", sortBy: protectedScopesTableState.sortBy, onSortByChange: (value) => setManagedTableState('authz-protected-scopes', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'resource_server', label: 'Resource Server' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: protectedScopesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('authz-protected-scopes', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: protectedScopesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('authz-protected-scopes', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Scope', 'Resource Server', 'Status', 'Actions'], rows: protectedScopesTable.rows.map((scope) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: scope.name }), _jsx("div", { className: "text-xs text-slate-500", children: scope.summary })] }, scope.id),
                                                        resourceServerNameById.get(scope.resource_server_id) ?? scope.resource_server_id,
                                                        scope.status,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('protected-scopes'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${scope.id}-manage`),
                                                    ]), emptyLabel: "No protected scopes available." }), _jsx(ManagedPagination, { page: protectedScopesTable.page, totalPages: protectedScopesTable.totalPages, pageStart: protectedScopesTable.pageStart, pageEnd: protectedScopesTable.pageEnd, totalCount: protectedScopesTable.totalCount, onPageChange: (page) => setManagedTableState('authz-protected-scopes', (current) => ({ ...current, page })) })] })), selectedEntity === 'protected-resources' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: protectedResourcesTableState.search, onSearchChange: (value) => setManagedTableState('authz-protected-resources', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search protected resources", sortBy: protectedResourcesTableState.sortBy, onSortByChange: (value) => setManagedTableState('authz-protected-resources', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'resource_server', label: 'Resource Server' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'scope_count', label: 'Scope Count' },
                                                        { value: 'owner_count', label: 'Owner Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: protectedResourcesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('authz-protected-resources', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: protectedResourcesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('authz-protected-resources', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Resource', 'Resource Server', 'Status', 'Scopes', 'Actions'], rows: protectedResourcesTable.rows.map((resource) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: resource.name }), _jsx("div", { className: "text-xs text-slate-500", children: resource.uri ?? resource.type_label ?? 'No URI/type' })] }, resource.id),
                                                        resourceServerNameById.get(resource.resource_server_id) ?? resource.resource_server_id,
                                                        resource.status,
                                                        String(resource.scope_ids.length),
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('protected-resources'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${resource.id}-manage`),
                                                    ]), emptyLabel: "No protected resources available." }), _jsx(ManagedPagination, { page: protectedResourcesTable.page, totalPages: protectedResourcesTable.totalPages, pageStart: protectedResourcesTable.pageStart, pageEnd: protectedResourcesTable.pageEnd, totalCount: protectedResourcesTable.totalCount, onPageChange: (page) => setManagedTableState('authz-protected-resources', (current) => ({ ...current, page })) })] })), selectedEntity === 'policies' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: authorizationPoliciesTableState.search, onSearchChange: (value) => setManagedTableState('authz-policies', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search authorization policies", sortBy: authorizationPoliciesTableState.sortBy, onSortByChange: (value) => setManagedTableState('authz-policies', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'resource_server', label: 'Resource Server' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'principal_count', label: 'Principal Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: authorizationPoliciesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('authz-policies', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: authorizationPoliciesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('authz-policies', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Policy', 'Kind', 'Resource Server', 'Status', 'Actions'], rows: authorizationPoliciesTable.rows.map((policy) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: policy.name }), _jsx("div", { className: "text-xs text-slate-500", children: policy.summary })] }, policy.id),
                                                        policy.kind,
                                                        resourceServerNameById.get(policy.resource_server_id) ?? policy.resource_server_id,
                                                        policy.status,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('policies'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${policy.id}-manage`),
                                                    ]), emptyLabel: "No authorization policies available." }), _jsx(ManagedPagination, { page: authorizationPoliciesTable.page, totalPages: authorizationPoliciesTable.totalPages, pageStart: authorizationPoliciesTable.pageStart, pageEnd: authorizationPoliciesTable.pageEnd, totalCount: authorizationPoliciesTable.totalCount, onPageChange: (page) => setManagedTableState('authz-policies', (current) => ({ ...current, page })) })] })), selectedEntity === 'permissions' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: authorizationPermissionsTableState.search, onSearchChange: (value) => setManagedTableState('authz-permissions', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search authorization permissions", sortBy: authorizationPermissionsTableState.sortBy, onSortByChange: (value) => setManagedTableState('authz-permissions', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'resource_server', label: 'Resource Server' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'decision', label: 'Decision Strategy' },
                                                        { value: 'policy_count', label: 'Policy Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: authorizationPermissionsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('authz-permissions', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: authorizationPermissionsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('authz-permissions', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Permission', 'Resource Server', 'Status', 'Decision', 'Actions'], rows: authorizationPermissionsTable.rows.map((permission) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: permission.name }), _jsx("div", { className: "text-xs text-slate-500", children: permission.summary })] }, permission.id),
                                                        resourceServerNameById.get(permission.resource_server_id) ?? permission.resource_server_id,
                                                        permission.status,
                                                        permission.decision_strategy,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('permissions'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${permission.id}-manage`),
                                                    ]), emptyLabel: "No authorization permissions available." }), _jsx(ManagedPagination, { page: authorizationPermissionsTable.page, totalPages: authorizationPermissionsTable.totalPages, pageStart: authorizationPermissionsTable.pageStart, pageEnd: authorizationPermissionsTable.pageEnd, totalCount: authorizationPermissionsTable.totalCount, onPageChange: (page) => setManagedTableState('authz-permissions', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Authorization Services Management", description: "Authorization mutation workflows are isolated from table browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading authorization services\u2026" }), children: _jsx(IamAuthorizationServicesPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam, users: users, groups: groups, roles: roles }) })] }))), selectedTab === 'extensions' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Extension Registry", description: "Extension entities are split into interface, package, provider, and binding datasets with table-first navigation.", icon: _jsx(Sparkles, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'extensions', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "interfaces", children: "Provider Interfaces" }), _jsx("option", { value: "extension-packages", children: "Extension Packages" }), _jsx("option", { value: "providers", children: "Providers" }), _jsx("option", { value: "bindings", children: "Bindings" })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'interfaces' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: extensionInterfacesTableState.search, onSearchChange: (value) => setManagedTableState('extension-interfaces', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search provider interfaces", sortBy: extensionInterfacesTableState.sortBy, onSortByChange: (value) => setManagedTableState('extension-interfaces', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'contract_version', label: 'Contract Version' },
                                                        { value: 'binding_slots', label: 'Binding Slots' },
                                                        { value: 'configuration_fields', label: 'Config Fields' },
                                                    ], sortDirection: extensionInterfacesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('extension-interfaces', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: extensionInterfacesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('extension-interfaces', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Interface', 'Kind', 'Contract', 'Slots', 'Config Fields'], rows: extensionInterfacesTable.rows.map((interfaceRecord) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: interfaceRecord.name }), _jsx("div", { className: "text-xs text-slate-500", children: interfaceRecord.summary })] }, interfaceRecord.id),
                                                        interfaceRecord.kind,
                                                        interfaceRecord.contract_version,
                                                        String(interfaceRecord.binding_slots.length),
                                                        String(interfaceRecord.configuration_fields.length),
                                                    ]), emptyLabel: "No provider interfaces available." }), _jsx(ManagedPagination, { page: extensionInterfacesTable.page, totalPages: extensionInterfacesTable.totalPages, pageStart: extensionInterfacesTable.pageStart, pageEnd: extensionInterfacesTable.pageEnd, totalCount: extensionInterfacesTable.totalCount, onPageChange: (page) => setManagedTableState('extension-interfaces', (current) => ({ ...current, page })) })] })), selectedEntity === 'extension-packages' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: extensionPackagesTableState.search, onSearchChange: (value) => setManagedTableState('extension-packages', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search extension packages", sortBy: extensionPackagesTableState.sortBy, onSortByChange: (value) => setManagedTableState('extension-packages', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'key', label: 'Key' },
                                                        { value: 'publisher', label: 'Publisher' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'interface_count', label: 'Interface Count' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: extensionPackagesTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('extension-packages', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: extensionPackagesTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('extension-packages', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Package', 'Publisher', 'Version', 'Status', 'Interfaces', 'Action'], rows: extensionPackagesTable.rows.map((pkg) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: pkg.name }), _jsx("div", { className: "text-xs text-slate-500", children: pkg.key })] }, pkg.id),
                                                        pkg.publisher,
                                                        pkg.version,
                                                        pkg.status,
                                                        String(pkg.interface_kinds.length),
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('extension-packages'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${pkg.id}-manage`),
                                                    ]), emptyLabel: "No extension packages available." }), _jsx(ManagedPagination, { page: extensionPackagesTable.page, totalPages: extensionPackagesTable.totalPages, pageStart: extensionPackagesTable.pageStart, pageEnd: extensionPackagesTable.pageEnd, totalCount: extensionPackagesTable.totalCount, onPageChange: (page) => setManagedTableState('extension-packages', (current) => ({ ...current, page })) })] })), selectedEntity === 'providers' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: extensionProvidersTableState.search, onSearchChange: (value) => setManagedTableState('extension-providers', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search extension providers", sortBy: extensionProvidersTableState.sortBy, onSortByChange: (value) => setManagedTableState('extension-providers', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'interface_kind', label: 'Interface Kind' },
                                                        { value: 'package', label: 'Package' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'binding_slots', label: 'Binding Slots' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: extensionProvidersTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('extension-providers', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: extensionProvidersTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('extension-providers', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Provider', 'Package', 'Interface', 'Status', 'Binding Slots', 'Action'], rows: extensionProvidersTable.rows.map((provider) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: provider.name }), _jsx("div", { className: "text-xs text-slate-500", children: provider.key })] }, provider.id),
                                                        extensionPackageNameById.get(provider.extension_id) ?? provider.extension_id,
                                                        provider.interface_kind,
                                                        provider.status,
                                                        String(provider.binding_slots.length),
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('providers'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${provider.id}-manage`),
                                                    ]), emptyLabel: "No extension providers available." }), _jsx(ManagedPagination, { page: extensionProvidersTable.page, totalPages: extensionProvidersTable.totalPages, pageStart: extensionProvidersTable.pageStart, pageEnd: extensionProvidersTable.pageEnd, totalCount: extensionProvidersTable.totalCount, onPageChange: (page) => setManagedTableState('extension-providers', (current) => ({ ...current, page })) })] })), selectedEntity === 'bindings' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: extensionBindingsTableState.search, onSearchChange: (value) => setManagedTableState('extension-bindings', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search extension bindings", sortBy: extensionBindingsTableState.sortBy, onSortByChange: (value) => setManagedTableState('extension-bindings', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'updated_at', label: 'Updated' },
                                                        { value: 'provider', label: 'Provider' },
                                                        { value: 'interface_kind', label: 'Interface Kind' },
                                                        { value: 'binding_slot', label: 'Binding Slot' },
                                                        { value: 'realm', label: 'Realm' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'priority', label: 'Priority' },
                                                    ], sortDirection: extensionBindingsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('extension-bindings', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: extensionBindingsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('extension-bindings', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Provider', 'Interface', 'Slot', 'Realm', 'Status', 'Priority', 'Action'], rows: extensionBindingsTable.rows.map((binding) => [
                                                        extensionProviderNameById.get(binding.provider_id) ?? binding.provider_id,
                                                        binding.interface_kind,
                                                        binding.binding_slot,
                                                        binding.realm_id,
                                                        binding.status,
                                                        String(binding.priority),
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('bindings'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${binding.id}-manage`),
                                                    ]), emptyLabel: "No extension bindings available." }), _jsx(ManagedPagination, { page: extensionBindingsTable.page, totalPages: extensionBindingsTable.totalPages, pageStart: extensionBindingsTable.pageStart, pageEnd: extensionBindingsTable.pageEnd, totalCount: extensionBindingsTable.totalCount, onPageChange: (page) => setManagedTableState('extension-bindings', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Extension Registry Management", description: "Extension mutation workflows are isolated from table browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading extension registry\u2026" }), children: _jsx(IamExtensionsPanel, { selectedRealmId: selectedRealmId, realms: realms }) })] }))), selectedTab === 'organizations' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Organization Registry", description: "Organization entities are separated into dedicated datasets with filter, sort, and paging controls. Mutation is handled in a separate management page.", icon: _jsx(Building2, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'organizations', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "organizations", children: "Organizations" }), _jsx("option", { value: "memberships", children: "Memberships" }), _jsx("option", { value: "invitations", children: "Invitations" })] })] }), _jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Organization Context" }), _jsxs("select", { value: selectedOrganizationId, onChange: (event) => setSelectedOrganizationId(event.target.value), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "", children: "All organizations in realm" }), realmScopedOrganizations.map((organization) => (_jsx("option", { value: organization.id, children: organization.name }, organization.id)))] })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'organizations' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: organizationsTableState.search, onSearchChange: (value) => setManagedTableState('organizations', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search organizations", sortBy: organizationsTableState.sortBy, onSortByChange: (value) => setManagedTableState('organizations', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: organizationsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('organizations', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: organizationsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('organizations', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Organization', 'Kind', 'Status', 'Domain', 'Actions'], rows: organizationsTable.rows.map((organization) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: organization.name }), _jsx("div", { className: "text-xs text-slate-500", children: organization.summary })] }, organization.id),
                                                        organization.kind,
                                                        organization.status,
                                                        organization.domain_hint ?? '—',
                                                        _jsx("button", { type: "button", onClick: () => {
                                                                setSelectedOrganizationId(organization.id);
                                                                openCurrentTabManageMode('organizations');
                                                            }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${organization.id}-manage`),
                                                    ]), emptyLabel: "No organizations available." }), _jsx(ManagedPagination, { page: organizationsTable.page, totalPages: organizationsTable.totalPages, pageStart: organizationsTable.pageStart, pageEnd: organizationsTable.pageEnd, totalCount: organizationsTable.totalCount, onPageChange: (page) => setManagedTableState('organizations', (current) => ({ ...current, page })) })] })), selectedEntity === 'memberships' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: membershipsTableState.search, onSearchChange: (value) => setManagedTableState('organization-memberships', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search memberships", sortBy: membershipsTableState.sortBy, onSortByChange: (value) => setManagedTableState('organization-memberships', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'organization', label: 'Organization' },
                                                        { value: 'user', label: 'User' },
                                                        { value: 'role', label: 'Role' },
                                                        { value: 'status', label: 'Status' },
                                                    ], sortDirection: membershipsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('organization-memberships', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: membershipsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('organization-memberships', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Organization', 'User', 'Role', 'Status', 'Actions'], rows: membershipsTable.rows.map((membership) => [
                                                        membership.organization_name,
                                                        `${membership.username} (${membership.email})`,
                                                        membership.role,
                                                        membership.status,
                                                        _jsx("button", { type: "button", onClick: () => {
                                                                setSelectedOrganizationId(membership.organization_id);
                                                                openCurrentTabManageMode('memberships');
                                                            }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${membership.id}-manage`),
                                                    ]), emptyLabel: "No memberships available." }), _jsx(ManagedPagination, { page: membershipsTable.page, totalPages: membershipsTable.totalPages, pageStart: membershipsTable.pageStart, pageEnd: membershipsTable.pageEnd, totalCount: membershipsTable.totalCount, onPageChange: (page) => setManagedTableState('organization-memberships', (current) => ({ ...current, page })) })] })), selectedEntity === 'invitations' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: invitationsTableState.search, onSearchChange: (value) => setManagedTableState('organization-invitations', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search invitations", sortBy: invitationsTableState.sortBy, onSortByChange: (value) => setManagedTableState('organization-invitations', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'created_at', label: 'Created At' },
                                                        { value: 'email', label: 'Email' },
                                                        { value: 'organization', label: 'Organization' },
                                                        { value: 'status', label: 'Status' },
                                                    ], sortDirection: invitationsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('organization-invitations', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: invitationsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('organization-invitations', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Email', 'Organization', 'Role', 'Status', 'Actions'], rows: invitationsTable.rows.map((invitation) => [
                                                        invitation.email,
                                                        invitation.organization_name,
                                                        invitation.role,
                                                        invitation.status,
                                                        _jsx("button", { type: "button", onClick: () => {
                                                                setSelectedOrganizationId(invitation.organization_id);
                                                                openCurrentTabManageMode('invitations');
                                                            }, className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${invitation.id}-manage`),
                                                    ]), emptyLabel: "No invitations available." }), _jsx(ManagedPagination, { page: invitationsTable.page, totalPages: invitationsTable.totalPages, pageStart: invitationsTable.pageStart, pageEnd: invitationsTable.pageEnd, totalCount: invitationsTable.totalCount, onPageChange: (page) => setManagedTableState('organization-invitations', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Organization Management", description: "Organization schema, membership, and invitation mutation workflows are isolated from list browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading organizations\u2026" }), children: _jsx(IamOrganizationsPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam, selectedOrganizationId: selectedOrganizationId, onSelectedOrganizationChange: setSelectedOrganizationId }) })] }))), selectedTab === 'federation' && (selectedMode === 'list' ? (_jsxs(Panel, { title: "Federation Registry", description: "Federation entities are split into focused datasets with robust table controls and separate management workflows.", icon: _jsx(Link2, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), children: [_jsxs("div", { className: "mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-center", children: [_jsx("label", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: "Entity" }), _jsxs("select", { value: selectedEntity, onChange: (event) => updateTabRouteState({ tab: 'federation', entity: event.target.value, mode: 'list' }), className: "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "identity-providers", children: "Identity Providers" }), _jsx("option", { value: "user-federation", children: "User Federation Providers" }), _jsx("option", { value: "sync-jobs", children: "Sync Jobs" })] })] }), _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode(selectedEntity), className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: "New" })] }), selectedEntity === 'identity-providers' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: identityProvidersTableState.search, onSearchChange: (value) => setManagedTableState('federation-identity-providers', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search identity providers", sortBy: identityProvidersTableState.sortBy, onSortByChange: (value) => setManagedTableState('federation-identity-providers', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'alias', label: 'Alias' },
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'protocol', label: 'Protocol' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'login_mode', label: 'Login Mode' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: identityProvidersTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('federation-identity-providers', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: identityProvidersTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('federation-identity-providers', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Provider', 'Protocol', 'Status', 'Login Mode', 'Actions'], rows: identityProvidersTable.rows.map((provider) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: provider.name }), _jsx("div", { className: "text-xs text-slate-500", children: provider.alias })] }, provider.id),
                                                        provider.protocol,
                                                        provider.status,
                                                        provider.login_mode,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('identity-providers'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${provider.id}-manage`),
                                                    ]), emptyLabel: "No identity providers available." }), _jsx(ManagedPagination, { page: identityProvidersTable.page, totalPages: identityProvidersTable.totalPages, pageStart: identityProvidersTable.pageStart, pageEnd: identityProvidersTable.pageEnd, totalCount: identityProvidersTable.totalCount, onPageChange: (page) => setManagedTableState('federation-identity-providers', (current) => ({ ...current, page })) })] })), selectedEntity === 'user-federation' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: userFederationProvidersTableState.search, onSearchChange: (value) => setManagedTableState('federation-user-providers', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search user federation providers", sortBy: userFederationProvidersTableState.sortBy, onSortByChange: (value) => setManagedTableState('federation-user-providers', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'name', label: 'Name' },
                                                        { value: 'kind', label: 'Kind' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'import_strategy', label: 'Import Strategy' },
                                                        { value: 'updated_at', label: 'Updated' },
                                                    ], sortDirection: userFederationProvidersTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('federation-user-providers', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: userFederationProvidersTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('federation-user-providers', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Provider', 'Kind', 'Status', 'Import Strategy', 'Actions'], rows: userFederationProvidersTable.rows.map((provider) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: provider.name }), _jsx("div", { className: "text-xs text-slate-500", children: provider.connection_label })] }, provider.id),
                                                        provider.kind,
                                                        provider.status,
                                                        provider.import_strategy,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('user-federation'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View / Edit" }, `${provider.id}-manage`),
                                                    ]), emptyLabel: "No user federation providers available." }), _jsx(ManagedPagination, { page: userFederationProvidersTable.page, totalPages: userFederationProvidersTable.totalPages, pageStart: userFederationProvidersTable.pageStart, pageEnd: userFederationProvidersTable.pageEnd, totalCount: userFederationProvidersTable.totalCount, onPageChange: (page) => setManagedTableState('federation-user-providers', (current) => ({ ...current, page })) })] })), selectedEntity === 'sync-jobs' && (_jsxs(_Fragment, { children: [_jsx(ManagedTableControls, { searchValue: federationSyncJobsTableState.search, onSearchChange: (value) => setManagedTableState('federation-sync-jobs', (current) => ({ ...current, search: value, page: 1 })), searchPlaceholder: "Search sync jobs", sortBy: federationSyncJobsTableState.sortBy, onSortByChange: (value) => setManagedTableState('federation-sync-jobs', (current) => ({ ...current, sortBy: value, page: 1 })), sortOptions: [
                                                        { value: 'started_at', label: 'Started At' },
                                                        { value: 'provider', label: 'Provider' },
                                                        { value: 'status', label: 'Status' },
                                                        { value: 'imported_count', label: 'Imported' },
                                                        { value: 'linked_count', label: 'Linked' },
                                                        { value: 'updated_count', label: 'Updated Users' },
                                                    ], sortDirection: federationSyncJobsTableState.sortDirection, onSortDirectionChange: (value) => setManagedTableState('federation-sync-jobs', (current) => ({ ...current, sortDirection: value, page: 1 })), pageSize: federationSyncJobsTableState.pageSize, onPageSizeChange: (value) => setManagedTableState('federation-sync-jobs', (current) => ({ ...current, pageSize: value, page: 1 })) }), _jsx(DataTable, { headers: ['Provider', 'Status', 'Started', 'Imported/Linked/Updated', 'Actions'], rows: federationSyncJobsTable.rows.map((job) => [
                                                        _jsxs("div", { children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: job.provider_name }), _jsx("div", { className: "text-xs text-slate-500", children: job.provider_id })] }, job.id),
                                                        job.status,
                                                        job.started_at,
                                                        `${job.imported_count} / ${job.linked_count} / ${job.updated_count}`,
                                                        _jsx("button", { type: "button", onClick: () => openCurrentTabManageMode('sync-jobs'), className: "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "View" }, `${job.id}-manage`),
                                                    ]), emptyLabel: "No federation sync jobs available." }), _jsx(ManagedPagination, { page: federationSyncJobsTable.page, totalPages: federationSyncJobsTable.totalPages, pageStart: federationSyncJobsTable.pageStart, pageEnd: federationSyncJobsTable.pageEnd, totalCount: federationSyncJobsTable.totalCount, onPageChange: (page) => setManagedTableState('federation-sync-jobs', (current) => ({ ...current, page })) })] }))] })) : (_jsxs(_Fragment, { children: [_jsx(WorkspaceModeHeader, { title: "Federation Management", description: "Federation mutation workflows are isolated from table browsing.", onBack: () => openCurrentTabListMode(selectedEntity) }), _jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading federation\u2026" }), children: _jsx(IamFederationPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam }) })] }))), selectedTab === 'experience' && (_jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading experience controls\u2026" }), children: _jsx(IamExperiencePanel, { selectedRealmId: selectedRealmId, canManage: canManageIam }) })), selectedTab === 'operations' && (_jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading operations data\u2026" }), children: _jsx(IamOperationsPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam }) })), selectedTab === 'security' && (_jsx(Suspense, { fallback: _jsx(LazyPanelFallback, { label: "Loading security operations\u2026" }), children: _jsxs("div", { className: "space-y-6", children: [_jsx(IamWebAuthnPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam }), _jsx(IamSecurityOperationsPanel, { selectedRealmId: selectedRealmId, canManage: canManageIam })] }) }))] })] }) }))] }));
}
function toggleId(values, id) {
    return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}
function WorkspaceModeHeader({ title, description, onBack, }) {
    return (_jsx("div", { className: "rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "mt-1 text-sm text-slate-600 dark:text-slate-400", children: description })] }), _jsxs("button", { type: "button", onClick: onBack, className: "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: [_jsx(ChevronLeft, { className: "h-4 w-4" }), "Back to Table"] })] }) }));
}
function ManagedTableControls({ searchValue, onSearchChange, searchPlaceholder, sortBy, onSortByChange, sortOptions, sortDirection, onSortDirectionChange, pageSize, onPageSizeChange, }) {
    return (_jsxs("div", { className: "mb-4 grid gap-3 md:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]", children: [_jsxs("label", { className: "space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: ["Search", _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }), _jsx("input", { value: searchValue, onChange: (event) => onSearchChange(event.target.value), placeholder: searchPlaceholder, className: "w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] })] }), _jsxs("label", { className: "space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: ["Sort", _jsx("select", { value: sortBy, onChange: (event) => onSortByChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: sortOptions.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("label", { className: "space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: ["Direction", _jsxs("select", { value: sortDirection, onChange: (event) => onSortDirectionChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "asc", children: "Ascending" }), _jsx("option", { value: "desc", children: "Descending" })] })] }), _jsxs("label", { className: "space-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: ["Page Size", _jsxs("select", { value: String(pageSize), onChange: (event) => onPageSizeChange(Number(event.target.value)), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: [_jsx("option", { value: "10", children: "10" }), _jsx("option", { value: "25", children: "25" }), _jsx("option", { value: "50", children: "50" }), _jsx("option", { value: "100", children: "100" })] })] })] }));
}
function ManagedPagination({ page, totalPages, pageStart, pageEnd, totalCount, onPageChange, }) {
    return (_jsxs("div", { className: "mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [_jsxs("div", { className: "text-xs uppercase tracking-[0.16em] text-slate-500", children: [pageStart, "-", pageEnd, " of ", totalCount] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => onPageChange(Math.max(1, page - 1)), disabled: page <= 1, className: "inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: [_jsx(ChevronLeft, { className: "h-3.5 w-3.5" }), "Prev"] }), _jsxs("span", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500", children: ["Page ", page, " / ", totalPages] }), _jsxs("button", { type: "button", onClick: () => onPageChange(Math.min(totalPages, page + 1)), disabled: page >= totalPages, className: "inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: ["Next", _jsx(ChevronRight, { className: "h-3.5 w-3.5" })] })] })] }));
}
function Panel({ title, description, icon, children, }) {
    return (_jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center gap-3", children: [icon, _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: description })] })] }), _jsx("div", { className: "mt-5", children: children })] }));
}
function FormCard({ title, description, icon: Icon, children, }) {
    return (_jsxs("div", { className: "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Icon, { className: "h-5 w-5 text-slate-700 dark:text-slate-200" }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-slate-900 dark:text-white", children: title }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: description })] })] }), _jsx("div", { className: "mt-5", children: children })] }));
}
function MetricCard({ label, value, detail, icon: Icon, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500", children: label }), _jsx("div", { className: "mt-2 text-2xl font-semibold text-slate-900 dark:text-white", children: value })] }), _jsx(Icon, { className: "h-5 w-5 text-slate-500 dark:text-slate-400" })] }), _jsx("div", { className: "mt-2 text-sm text-slate-600 dark:text-slate-400", children: detail })] }));
}
function DataTable({ headers, rows, emptyLabel, }) {
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800", children: [_jsx("thead", { children: _jsx("tr", { className: "text-left text-xs uppercase tracking-[0.18em] text-slate-500", children: headers.map((header) => (_jsx("th", { className: "pb-3", children: header }, header))) }) }), _jsx("tbody", { className: "divide-y divide-slate-100 dark:divide-slate-800", children: rows.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: headers.length, className: "py-6 text-center text-sm text-slate-500 dark:text-slate-400", children: emptyLabel }) })) : rows.map((row, index) => (_jsx("tr", { children: row.map((cell, cellIndex) => (_jsx("td", { className: "py-3 pr-4 text-slate-600 dark:text-slate-300", children: cell }, `cell-${index}-${cellIndex}`))) }, `row-${index}`))) })] }) }));
}
function LabeledInput({ label, value, onChange, disabled = false, }) {
    return (_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: label }), _jsx("input", { value: value, onChange: (event) => onChange(event.target.value), disabled: disabled, className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] }));
}
function LabeledTextarea({ label, value, onChange, rows = 4, }) {
    return (_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: label }), _jsx("textarea", { value: value, rows: rows, onChange: (event) => onChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" })] }));
}
function LabeledSelect({ label, value, onChange, options, }) {
    return (_jsxs("label", { className: "space-y-2 text-sm", children: [_jsx("span", { className: "font-medium text-slate-900 dark:text-white", children: label }), _jsx("select", { value: value, onChange: (event) => onChange(event.target.value), className: "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200", children: options.map((option) => (_jsx("option", { value: option.value, children: option.label }, `${label}-${option.value}`))) })] }));
}
function CheckboxList({ label, items, selectedIds, onToggle, }) {
    return (_jsxs("div", { className: "space-y-2 text-sm", children: [_jsx("div", { className: "font-medium text-slate-900 dark:text-white", children: label }), _jsx("div", { className: "max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-slate-800", children: items.length === 0 ? (_jsx("div", { className: "text-sm text-slate-500 dark:text-slate-400", children: "No options available." })) : items.map((item) => (_jsxs("label", { className: "flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800", children: [_jsx("span", { className: "text-slate-700 dark:text-slate-200", children: item.label }), _jsx("input", { type: "checkbox", checked: selectedIds.includes(item.id), onChange: () => onToggle(item.id) })] }, item.id))) })] }));
}
function FormActions({ canManage, isSaving, saveLabel, onReset, }) {
    return (_jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "submit", disabled: !canManage || isSaving, className: "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100", children: isSaving ? 'Saving…' : saveLabel }), _jsx("button", { type: "button", onClick: onReset, className: "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800", children: "Reset" })] }));
}
