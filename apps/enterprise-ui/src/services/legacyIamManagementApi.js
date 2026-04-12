import { api } from './iamHttpClient';
export const legacyIamManagementApi = {
    async getIamSecuritySummary() {
        const response = await api.get('/iam/security/summary');
        return response.data;
    },
    async getIamOperationsSummary() {
        const response = await api.get('/iam/operations/summary');
        return response.data;
    },
    async getIamOperationsDiagnostics() {
        const response = await api.get('/iam/operations/diagnostics');
        return response.data;
    },
    async listIamBackups() {
        const response = await api.get('/iam/operations/backups');
        return response.data;
    },
    async createIamBackup(request) {
        const response = await api.post('/iam/operations/backups', request ?? {});
        return response.data;
    },
    async listIamRestoreRecords() {
        const response = await api.get('/iam/operations/restores');
        return response.data;
    },
    async restoreIamBackup(request) {
        const response = await api.post('/iam/operations/restores', request);
        return response.data;
    },
    async listIamSigningKeys(realmId) {
        const response = await api.get('/iam/operations/keys', {
            params: {
                realm_id: realmId === null ? 'global' : realmId,
            },
        });
        return response.data;
    },
    async rotateIamSigningKey(request) {
        const response = await api.post('/iam/operations/keys/rotate', {
            realm_id: request?.realm_id === null ? 'global' : request?.realm_id,
        });
        return response.data;
    },
    async listIamResilienceRuns() {
        const response = await api.get('/iam/operations/resilience');
        return response.data;
    },
    async runIamResilienceSuite() {
        const response = await api.post('/iam/operations/resilience/run');
        return response.data;
    },
    async getIamReadinessReview() {
        const response = await api.get('/iam/operations/readiness-review');
        return response.data;
    },
    async recordIamReadinessReview(request) {
        const response = await api.post('/iam/operations/readiness-review', request ?? {});
        return response.data;
    },
    async getIamDeploymentProfile() {
        const response = await api.get('/iam/operations/deployment');
        return response.data;
    },
    async updateIamDeploymentProfile(request) {
        const response = await api.put('/iam/operations/deployment', request);
        return response.data;
    },
    async getIamBootstrapPackage() {
        const response = await api.get('/iam/operations/bootstrap');
        return response.data;
    },
    async regenerateIamBootstrapPackage() {
        const response = await api.post('/iam/operations/bootstrap/regenerate');
        return response.data;
    },
    async getIamHealthSummary() {
        const response = await api.get('/iam/operations/health');
        return response.data;
    },
    async getIamBenchmarkCatalog() {
        const response = await api.get('/iam/operations/benchmarks');
        return response.data;
    },
    async runIamBenchmarkSuite(request) {
        const response = await api.post('/iam/operations/benchmarks/run', request ?? {});
        return response.data;
    },
    async getIamRecoveryProfile() {
        const response = await api.get('/iam/operations/recovery');
        return response.data;
    },
    async runIamRecoveryDrill(request) {
        const response = await api.post('/iam/operations/recovery/drills', request ?? {});
        return response.data;
    },
    async getIamReviewSummary() {
        const response = await api.get('/iam/review/summary');
        return response.data;
    },
    async getIamStandardsMatrix() {
        const response = await api.get('/iam/review/standards-matrix');
        return response.data;
    },
    async getIamInteroperabilityReview() {
        const response = await api.get('/iam/review/interoperability');
        return response.data;
    },
    async getIamDifferentiationReview() {
        const response = await api.get('/iam/review/differentiation');
        return response.data;
    },
    async getIamFormalReview() {
        const response = await api.get('/iam/review/formal');
        return response.data;
    },
    async recordIamFormalReview(request) {
        const response = await api.post('/iam/review/formal', request ?? {});
        return response.data;
    },
    async listIamSecurityEvents(filters) {
        const response = await api.get('/iam/security/events', {
            params: {
                realm_id: filters?.realmId,
                outcome: filters?.outcome,
                limit: filters?.limit,
            },
        });
        return response.data;
    },
    async getIamValidationSummary() {
        const response = await api.get('/iam/security/validation');
        return response.data;
    },
    async getIamUserSecuritySummary(userId) {
        const response = await api.get(`/iam/users/${userId}/security`);
        return response.data;
    },
    async getIamUserLoginHistory(userId, limit) {
        const response = await api.get(`/iam/users/${userId}/login-history`, {
            params: {
                limit,
            },
        });
        return response.data;
    },
    async resetIamUserPassword(userId, request) {
        const response = await api.post(`/iam/users/${userId}/reset-password`, request);
        return response.data;
    },
    async revokeIamUserSessions(userId, request) {
        const response = await api.post(`/iam/users/${userId}/revoke-sessions`, request ?? {});
        return response.data;
    },
    async clearIamUserLockout(userId) {
        const response = await api.post(`/iam/users/${userId}/clear-lockout`);
        return response.data;
    },
    async impersonateIamUser(userId, request) {
        const response = await api.post(`/iam/users/${userId}/impersonate`, request ?? {});
        return response.data;
    },
    async listIamGroups(filters) {
        const response = await api.get('/iam/groups', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async createIamGroup(request) {
        const response = await api.post('/iam/groups', request);
        return response.data;
    },
    async updateIamGroup(groupId, request) {
        const response = await api.put(`/iam/groups/${groupId}`, request);
        return response.data;
    },
    async listIamRoles(filters) {
        const response = await api.get('/iam/roles', {
            params: {
                realm_id: filters?.realmId,
                kind: filters?.kind,
            },
        });
        return response.data;
    },
    async createIamRole(request) {
        const response = await api.post('/iam/roles', request);
        return response.data;
    },
    async updateIamRole(roleId, request) {
        const response = await api.put(`/iam/roles/${roleId}`, request);
        return response.data;
    },
    async listIamAdminPermissions(filters) {
        const response = await api.get('/iam/admin-permissions', {
            params: {
                realm_id: filters?.realmId,
                domain: filters?.domain,
            },
        });
        return response.data;
    },
    async createIamAdminPermission(request) {
        const response = await api.post('/iam/admin-permissions', request);
        return response.data;
    },
    async updateIamAdminPermission(permissionId, request) {
        const response = await api.put(`/iam/admin-permissions/${permissionId}`, request);
        return response.data;
    },
    async listIamAdminPolicies(filters) {
        const response = await api.get('/iam/admin-policies', {
            params: {
                realm_id: filters?.realmId,
                principal_id: filters?.principalId,
            },
        });
        return response.data;
    },
    async createIamAdminPolicy(request) {
        const response = await api.post('/iam/admin-policies', request);
        return response.data;
    },
    async updateIamAdminPolicy(policyId, request) {
        const response = await api.put(`/iam/admin-policies/${policyId}`, request);
        return response.data;
    },
    async listIamAdminEvaluations(filters) {
        const response = await api.get('/iam/admin-evaluations', {
            params: {
                realm_id: filters?.realmId,
                actor_user_id: filters?.actorUserId,
                allowed: filters?.allowed,
            },
        });
        return response.data;
    },
    async listIamExtensions(filters) {
        const response = await api.get('/iam/extensions', {
            params: {
                status: filters?.status,
                interface_kind: filters?.interfaceKind,
            },
        });
        return response.data;
    },
    async createIamExtension(request) {
        const response = await api.post('/iam/extensions', request);
        return response.data;
    },
    async updateIamExtension(extensionId, request) {
        const response = await api.put(`/iam/extensions/${extensionId}`, request);
        return response.data;
    },
    async listIamExtensionProviders(filters) {
        const response = await api.get('/iam/providers', {
            params: {
                interface_kind: filters?.interfaceKind,
                extension_id: filters?.extensionId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createIamExtensionProvider(request) {
        const response = await api.post('/iam/providers', request);
        return response.data;
    },
    async updateIamExtensionProvider(providerId, request) {
        const response = await api.put(`/iam/providers/${providerId}`, request);
        return response.data;
    },
    async listIamExtensionBindings(filters) {
        const response = await api.get('/iam/provider-bindings', {
            params: {
                realm_id: filters?.realmId,
                interface_kind: filters?.interfaceKind,
                provider_id: filters?.providerId,
                status: filters?.status,
            },
        });
        return response.data;
    },
    async createIamExtensionBinding(request) {
        const response = await api.post('/iam/provider-bindings', request);
        return response.data;
    },
    async updateIamExtensionBinding(bindingId, request) {
        const response = await api.put(`/iam/provider-bindings/${bindingId}`, request);
        return response.data;
    },
    async listIamResourceServers(filters) {
        const response = await api.get('/iam/resource-servers', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async createIamResourceServer(request) {
        const response = await api.post('/iam/resource-servers', request);
        return response.data;
    },
    async updateIamResourceServer(resourceServerId, request) {
        const response = await api.put(`/iam/resource-servers/${resourceServerId}`, request);
        return response.data;
    },
    async listIamProtectedScopes(filters) {
        const response = await api.get('/iam/authz/scopes', {
            params: {
                realm_id: filters?.realmId,
                resource_server_id: filters?.resourceServerId,
            },
        });
        return response.data;
    },
    async createIamProtectedScope(request) {
        const response = await api.post('/iam/authz/scopes', request);
        return response.data;
    },
    async updateIamProtectedScope(scopeId, request) {
        const response = await api.put(`/iam/authz/scopes/${scopeId}`, request);
        return response.data;
    },
    async listIamProtectedResources(filters) {
        const response = await api.get('/iam/authz/resources', {
            params: {
                realm_id: filters?.realmId,
                resource_server_id: filters?.resourceServerId,
            },
        });
        return response.data;
    },
    async createIamProtectedResource(request) {
        const response = await api.post('/iam/authz/resources', request);
        return response.data;
    },
    async updateIamProtectedResource(resourceId, request) {
        const response = await api.put(`/iam/authz/resources/${resourceId}`, request);
        return response.data;
    },
    async listIamAuthorizationPolicies(filters) {
        const response = await api.get('/iam/authz/policies', {
            params: {
                realm_id: filters?.realmId,
                resource_server_id: filters?.resourceServerId,
            },
        });
        return response.data;
    },
    async createIamAuthorizationPolicy(request) {
        const response = await api.post('/iam/authz/policies', request);
        return response.data;
    },
    async updateIamAuthorizationPolicy(policyId, request) {
        const response = await api.put(`/iam/authz/policies/${policyId}`, request);
        return response.data;
    },
    async listIamAuthorizationPermissions(filters) {
        const response = await api.get('/iam/authz/permissions', {
            params: {
                realm_id: filters?.realmId,
                resource_server_id: filters?.resourceServerId,
            },
        });
        return response.data;
    },
    async createIamAuthorizationPermission(request) {
        const response = await api.post('/iam/authz/permissions', request);
        return response.data;
    },
    async updateIamAuthorizationPermission(permissionId, request) {
        const response = await api.put(`/iam/authz/permissions/${permissionId}`, request);
        return response.data;
    },
    async listIamAuthorizationEvaluations(filters) {
        const response = await api.get('/iam/authz/evaluations', {
            params: {
                realm_id: filters?.realmId,
                resource_server_id: filters?.resourceServerId,
            },
        });
        return response.data;
    },
    async evaluateIamAuthorization(request) {
        const response = await api.post('/iam/authz/evaluate', request);
        return response.data;
    },
    async listIamPermissionTickets(filters) {
        const response = await api.get('/iam/permission-tickets', {
            params: {
                realm_id: filters?.realmId,
                resource_server_id: filters?.resourceServerId,
            },
        });
        return response.data;
    },
    async createIamPermissionTicket(realmId, request, authorization) {
        const response = await api.post(`/iam/realms/${realmId}/authz/permission-ticket`, request, {
            headers: authorization ? { Authorization: authorization } : undefined,
        });
        return response.data;
    },
    async listIamDelegatedAdmins(filters) {
        const response = await api.get('/iam/delegated-admin', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async createIamDelegatedAdmin(request) {
        const response = await api.post('/iam/delegated-admin', request);
        return response.data;
    },
    async updateIamDelegatedAdmin(assignmentId, request) {
        const response = await api.put(`/iam/delegated-admin/${assignmentId}`, request);
        return response.data;
    },
    async listIamOrganizations(filters) {
        const response = await api.get('/iam/organizations', {
            params: {
                realm_id: filters?.realmId,
                search: filters?.search,
            },
        });
        return response.data;
    },
    async createIamOrganization(request) {
        const response = await api.post('/iam/organizations', request);
        return response.data;
    },
    async updateIamOrganization(organizationId, request) {
        const response = await api.put(`/iam/organizations/${organizationId}`, request);
        return response.data;
    },
    async listIamOrganizationMemberships(filters) {
        const response = await api.get('/iam/organization-memberships', {
            params: {
                realm_id: filters?.realmId,
                organization_id: filters?.organizationId,
                user_id: filters?.userId,
            },
        });
        return response.data;
    },
    async createIamOrganizationMembership(request) {
        const response = await api.post('/iam/organization-memberships', request);
        return response.data;
    },
    async updateIamOrganizationMembership(membershipId, request) {
        const response = await api.put(`/iam/organization-memberships/${membershipId}`, request);
        return response.data;
    },
    async listIamOrganizationInvitations(filters) {
        const response = await api.get('/iam/organization-invitations', {
            params: {
                realm_id: filters?.realmId,
                organization_id: filters?.organizationId,
                email: filters?.email,
            },
        });
        return response.data;
    },
    async createIamOrganizationInvitation(request) {
        const response = await api.post('/iam/organization-invitations', request);
        return response.data;
    },
    async revokeIamOrganizationInvitation(invitationId) {
        const response = await api.post(`/iam/organization-invitations/${invitationId}/revoke`);
        return response.data;
    },
    async listIamRealmExports(filters) {
        const response = await api.get('/iam/realm-exports', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async exportIamRealm(realmId) {
        const response = await api.post(`/iam/realms/${realmId}/export`);
        return response.data;
    },
    async listIamClients(filters) {
        const response = await api.get('/iam/clients', {
            params: {
                realm_id: filters?.realmId,
                protocol: filters?.protocol,
            },
        });
        return response.data;
    },
    async createIamClient(request) {
        const response = await api.post('/iam/clients', request);
        return response.data;
    },
    async updateIamClient(clientId, request) {
        const response = await api.put(`/iam/clients/${clientId}`, request);
        return response.data;
    },
    async listIamClientPolicies(filters) {
        const response = await api.get('/iam/client-policies', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async createIamClientPolicy(request) {
        const response = await api.post('/iam/client-policies', request);
        return response.data;
    },
    async updateIamClientPolicy(policyId, request) {
        const response = await api.put(`/iam/client-policies/${policyId}`, request);
        return response.data;
    },
    async listIamInitialAccessTokens(filters) {
        const response = await api.get('/iam/initial-access-tokens', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async issueIamInitialAccessToken(request) {
        const response = await api.post('/iam/initial-access-tokens', request);
        return response.data;
    },
    async listIamPushedAuthorizationRequests(filters) {
        const response = await api.get('/iam/pushed-authorization-requests', {
            params: {
                realm_id: filters?.realmId,
                client_id: filters?.clientId,
            },
        });
        return response.data;
    },
    async listIamDeviceAuthorizations(filters) {
        const response = await api.get('/iam/device-authorizations', {
            params: {
                realm_id: filters?.realmId,
                client_id: filters?.clientId,
            },
        });
        return response.data;
    },
    async listIamTokenExchanges(filters) {
        const response = await api.get('/iam/token-exchanges', {
            params: {
                realm_id: filters?.realmId,
                client_id: filters?.clientId,
            },
        });
        return response.data;
    },
    async rotateIamClientSecret(clientId) {
        const response = await api.post(`/iam/clients/${clientId}/rotate-secret`);
        return response.data;
    },
    async listIamClientScopes(filters) {
        const response = await api.get('/iam/client-scopes', {
            params: {
                realm_id: filters?.realmId,
                protocol: filters?.protocol,
            },
        });
        return response.data;
    },
    async createIamClientScope(request) {
        const response = await api.post('/iam/client-scopes', request);
        return response.data;
    },
    async updateIamClientScope(scopeId, request) {
        const response = await api.put(`/iam/client-scopes/${scopeId}`, request);
        return response.data;
    },
    async listIamProtocolMappers(filters) {
        const response = await api.get('/iam/protocol-mappers', {
            params: {
                realm_id: filters?.realmId,
                target_kind: filters?.targetKind,
                target_id: filters?.targetId,
                protocol: filters?.protocol,
            },
        });
        return response.data;
    },
    async createIamProtocolMapper(request) {
        const response = await api.post('/iam/protocol-mappers', request);
        return response.data;
    },
    async updateIamProtocolMapper(mapperId, request) {
        const response = await api.put(`/iam/protocol-mappers/${mapperId}`, request);
        return response.data;
    },
    async listIamServiceAccounts(filters) {
        const response = await api.get('/iam/service-accounts', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async listIamIssuedTokens(filters) {
        const response = await api.get('/iam/issued-tokens', {
            params: {
                realm_id: filters?.realmId,
                client_id: filters?.clientId,
            },
        });
        return response.data;
    },
};
