import { api } from './iamHttpClient'
import { legacyIamFederationApi } from './legacyIamFederationApi'
import { legacyIamManagementApi } from './legacyIamManagementApi'
import { legacyIamPublicApi } from './legacyIamPublicApi'

// Internal IAM compatibility slab extracted from the legacy client surface.
// Methods remain generic here because the standalone app consumes these through narrower boundaries.
export interface LegacyIamApi {
  getIamExtensionSummary: (...args: any[]) => Promise<any>
  listIamProviderInterfaces: (...args: any[]) => Promise<any>
  listIamRealms: (...args: any[]) => Promise<any>
  listIamRealmAttributes: (...args: any[]) => Promise<any>
  listIamRealmTemplates: (...args: any[]) => Promise<any>
  listIamRealmBindings: (...args: any[]) => Promise<any>
  listIamValidationDomains: (...args: any[]) => Promise<any>
  createIamRealm: (...args: any[]) => Promise<any>
  createIamRealmAttribute: (...args: any[]) => Promise<any>
  updateIamRealm: (...args: any[]) => Promise<any>
  updateIamRealmAttribute: (...args: any[]) => Promise<any>
  deleteIamRealmAttribute: (...args: any[]) => Promise<any>
  updateIamRealmBinding: (...args: any[]) => Promise<any>
  listIamAuthFlows: (...args: any[]) => Promise<any>
  createIamAuthFlow: (...args: any[]) => Promise<any>
  updateIamAuthFlow: (...args: any[]) => Promise<any>
  listIamAuthExecutions: (...args: any[]) => Promise<any>
  createIamAuthExecution: (...args: any[]) => Promise<any>
  updateIamAuthExecution: (...args: any[]) => Promise<any>
  listIamAuthFlowBindings: (...args: any[]) => Promise<any>
  updateIamRealmAuthFlowBindings: (...args: any[]) => Promise<any>
  updateIamClientAuthFlowBindings: (...args: any[]) => Promise<any>
  listIamUsers: (...args: any[]) => Promise<any>
  createIamUser: (...args: any[]) => Promise<any>
  updateIamUser: (...args: any[]) => Promise<any>
  listIamUserProfileSchemas: (...args: any[]) => Promise<any>
  updateIamUserProfileSchema: (...args: any[]) => Promise<any>
  getIamUserProfile: (...args: any[]) => Promise<any>
  updateIamUserProfile: (...args: any[]) => Promise<any>
  getIamSecuritySummary: (...args: any[]) => Promise<any>
  getIamOperationsSummary: (...args: any[]) => Promise<any>
  getIamOperationsDiagnostics: (...args: any[]) => Promise<any>
  listIamBackups: (...args: any[]) => Promise<any>
  createIamBackup: (...args: any[]) => Promise<any>
  listIamRestoreRecords: (...args: any[]) => Promise<any>
  restoreIamBackup: (...args: any[]) => Promise<any>
  listIamSigningKeys: (...args: any[]) => Promise<any>
  rotateIamSigningKey: (...args: any[]) => Promise<any>
  listIamResilienceRuns: (...args: any[]) => Promise<any>
  runIamResilienceSuite: (...args: any[]) => Promise<any>
  getIamReadinessReview: (...args: any[]) => Promise<any>
  recordIamReadinessReview: (...args: any[]) => Promise<any>
  getIamDeploymentProfile: (...args: any[]) => Promise<any>
  updateIamDeploymentProfile: (...args: any[]) => Promise<any>
  getIamBootstrapPackage: (...args: any[]) => Promise<any>
  regenerateIamBootstrapPackage: (...args: any[]) => Promise<any>
  getIamHealthSummary: (...args: any[]) => Promise<any>
  getIamBenchmarkCatalog: (...args: any[]) => Promise<any>
  runIamBenchmarkSuite: (...args: any[]) => Promise<any>
  getIamRecoveryProfile: (...args: any[]) => Promise<any>
  runIamRecoveryDrill: (...args: any[]) => Promise<any>
  getIamReviewSummary: (...args: any[]) => Promise<any>
  getIamStandardsMatrix: (...args: any[]) => Promise<any>
  getIamInteroperabilityReview: (...args: any[]) => Promise<any>
  getIamDifferentiationReview: (...args: any[]) => Promise<any>
  getIamFormalReview: (...args: any[]) => Promise<any>
  recordIamFormalReview: (...args: any[]) => Promise<any>
  listIamSecurityEvents: (...args: any[]) => Promise<any>
  getIamValidationSummary: (...args: any[]) => Promise<any>
  getIamUserSecuritySummary: (...args: any[]) => Promise<any>
  getIamUserLoginHistory: (...args: any[]) => Promise<any>
  resetIamUserPassword: (...args: any[]) => Promise<any>
  revokeIamUserSessions: (...args: any[]) => Promise<any>
  clearIamUserLockout: (...args: any[]) => Promise<any>
  impersonateIamUser: (...args: any[]) => Promise<any>
  listIamGroups: (...args: any[]) => Promise<any>
  createIamGroup: (...args: any[]) => Promise<any>
  updateIamGroup: (...args: any[]) => Promise<any>
  listIamRoles: (...args: any[]) => Promise<any>
  createIamRole: (...args: any[]) => Promise<any>
  updateIamRole: (...args: any[]) => Promise<any>
  listIamAdminPermissions: (...args: any[]) => Promise<any>
  createIamAdminPermission: (...args: any[]) => Promise<any>
  updateIamAdminPermission: (...args: any[]) => Promise<any>
  listIamAdminPolicies: (...args: any[]) => Promise<any>
  createIamAdminPolicy: (...args: any[]) => Promise<any>
  updateIamAdminPolicy: (...args: any[]) => Promise<any>
  listIamAdminEvaluations: (...args: any[]) => Promise<any>
  listIamExtensions: (...args: any[]) => Promise<any>
  createIamExtension: (...args: any[]) => Promise<any>
  updateIamExtension: (...args: any[]) => Promise<any>
  listIamExtensionProviders: (...args: any[]) => Promise<any>
  createIamExtensionProvider: (...args: any[]) => Promise<any>
  updateIamExtensionProvider: (...args: any[]) => Promise<any>
  listIamExtensionBindings: (...args: any[]) => Promise<any>
  createIamExtensionBinding: (...args: any[]) => Promise<any>
  updateIamExtensionBinding: (...args: any[]) => Promise<any>
  listIamResourceServers: (...args: any[]) => Promise<any>
  createIamResourceServer: (...args: any[]) => Promise<any>
  updateIamResourceServer: (...args: any[]) => Promise<any>
  listIamProtectedScopes: (...args: any[]) => Promise<any>
  createIamProtectedScope: (...args: any[]) => Promise<any>
  updateIamProtectedScope: (...args: any[]) => Promise<any>
  listIamProtectedResources: (...args: any[]) => Promise<any>
  createIamProtectedResource: (...args: any[]) => Promise<any>
  updateIamProtectedResource: (...args: any[]) => Promise<any>
  listIamAuthorizationPolicies: (...args: any[]) => Promise<any>
  createIamAuthorizationPolicy: (...args: any[]) => Promise<any>
  updateIamAuthorizationPolicy: (...args: any[]) => Promise<any>
  listIamAuthorizationPermissions: (...args: any[]) => Promise<any>
  createIamAuthorizationPermission: (...args: any[]) => Promise<any>
  updateIamAuthorizationPermission: (...args: any[]) => Promise<any>
  listIamAuthorizationEvaluations: (...args: any[]) => Promise<any>
  evaluateIamAuthorization: (...args: any[]) => Promise<any>
  listIamPermissionTickets: (...args: any[]) => Promise<any>
  createIamPermissionTicket: (...args: any[]) => Promise<any>
  listIamDelegatedAdmins: (...args: any[]) => Promise<any>
  createIamDelegatedAdmin: (...args: any[]) => Promise<any>
  updateIamDelegatedAdmin: (...args: any[]) => Promise<any>
  listIamOrganizations: (...args: any[]) => Promise<any>
  createIamOrganization: (...args: any[]) => Promise<any>
  updateIamOrganization: (...args: any[]) => Promise<any>
  listIamOrganizationMemberships: (...args: any[]) => Promise<any>
  createIamOrganizationMembership: (...args: any[]) => Promise<any>
  updateIamOrganizationMembership: (...args: any[]) => Promise<any>
  listIamOrganizationInvitations: (...args: any[]) => Promise<any>
  createIamOrganizationInvitation: (...args: any[]) => Promise<any>
  revokeIamOrganizationInvitation: (...args: any[]) => Promise<any>
  listIamRealmExports: (...args: any[]) => Promise<any>
  exportIamRealm: (...args: any[]) => Promise<any>
  listIamClients: (...args: any[]) => Promise<any>
  createIamClient: (...args: any[]) => Promise<any>
  updateIamClient: (...args: any[]) => Promise<any>
  listIamClientPolicies: (...args: any[]) => Promise<any>
  createIamClientPolicy: (...args: any[]) => Promise<any>
  updateIamClientPolicy: (...args: any[]) => Promise<any>
  listIamInitialAccessTokens: (...args: any[]) => Promise<any>
  issueIamInitialAccessToken: (...args: any[]) => Promise<any>
  listIamPushedAuthorizationRequests: (...args: any[]) => Promise<any>
  listIamDeviceAuthorizations: (...args: any[]) => Promise<any>
  listIamTokenExchanges: (...args: any[]) => Promise<any>
  rotateIamClientSecret: (...args: any[]) => Promise<any>
  listIamClientScopes: (...args: any[]) => Promise<any>
  createIamClientScope: (...args: any[]) => Promise<any>
  updateIamClientScope: (...args: any[]) => Promise<any>
  listIamProtocolMappers: (...args: any[]) => Promise<any>
  createIamProtocolMapper: (...args: any[]) => Promise<any>
  updateIamProtocolMapper: (...args: any[]) => Promise<any>
  listIamServiceAccounts: (...args: any[]) => Promise<any>
  listIamIssuedTokens: (...args: any[]) => Promise<any>
  getIamOidcDiscovery: (...args: any[]) => Promise<any>
  getIamAuthorizationRequest: (...args: any[]) => Promise<any>
  continueIamAuthorizationRequest: (...args: any[]) => Promise<any>
  getIamJwks: (...args: any[]) => Promise<any>
  dynamicallyRegisterIamClient: (...args: any[]) => Promise<any>
  getDynamicallyRegisteredIamClient: (...args: any[]) => Promise<any>
  updateDynamicallyRegisteredIamClient: (...args: any[]) => Promise<any>
  archiveDynamicallyRegisteredIamClient: (...args: any[]) => Promise<any>
  createIamPushedAuthorizationRequest: (...args: any[]) => Promise<any>
  createIamDeviceAuthorization: (...args: any[]) => Promise<any>
  verifyIamDeviceAuthorization: (...args: any[]) => Promise<any>
  issueIamToken: (...args: any[]) => Promise<any>
  introspectIamToken: (...args: any[]) => Promise<any>
  revokeIamToken: (...args: any[]) => Promise<any>
  getIamUserInfo: (...args: any[]) => Promise<any>
  getIamSamlMetadata: (...args: any[]) => Promise<any>
  getIamSamlAuthRequest: (...args: any[]) => Promise<any>
  continueIamSamlAuthRequest: (...args: any[]) => Promise<any>
  loginIamSaml: (...args: any[]) => Promise<any>
  logoutIamSaml: (...args: any[]) => Promise<any>
  listIamSamlSessions: (...args: any[]) => Promise<any>
  getIamPublicCatalog: (...args: any[]) => Promise<any>
  getIamRealmExperience: (...args: any[]) => Promise<any>
  listIamRealmBrokers: (...args: any[]) => Promise<any>
  loginIamBroker: (...args: any[]) => Promise<any>
  loginIamBrowser: (...args: any[]) => Promise<any>
  beginIamPasskeyLogin: (...args: any[]) => Promise<any>
  completeIamPasskeyLogin: (...args: any[]) => Promise<any>
  completeIamRequiredActions: (...args: any[]) => Promise<any>
  grantIamConsent: (...args: any[]) => Promise<any>
  verifyIamLoginMfa: (...args: any[]) => Promise<any>
  requestIamPasswordReset: (...args: any[]) => Promise<any>
  confirmIamPasswordReset: (...args: any[]) => Promise<any>
  requestIamEmailVerification: (...args: any[]) => Promise<any>
  confirmIamEmailVerification: (...args: any[]) => Promise<any>
  logoutIamAccount: (...args: any[]) => Promise<any>
  getIamAccountSession: (...args: any[]) => Promise<any>
  getIamAccountProfile: (...args: any[]) => Promise<any>
  updateIamAccountProfile: (...args: any[]) => Promise<any>
  listIamAccountOrganizations: (...args: any[]) => Promise<any>
  acceptIamAccountOrganizationInvitation: (...args: any[]) => Promise<any>
  getIamAccountSecurity: (...args: any[]) => Promise<any>
  beginIamWebAuthnRegistration: (...args: any[]) => Promise<any>
  completeIamWebAuthnRegistration: (...args: any[]) => Promise<any>
  listIamAccountWebAuthnCredentials: (...args: any[]) => Promise<any>
  revokeIamAccountWebAuthnCredential: (...args: any[]) => Promise<any>
  changeIamAccountPassword: (...args: any[]) => Promise<any>
  beginIamMfaEnrollment: (...args: any[]) => Promise<any>
  verifyIamMfaEnrollment: (...args: any[]) => Promise<any>
  disableIamMfa: (...args: any[]) => Promise<any>
  listIamAccountSessions: (...args: any[]) => Promise<any>
  revokeIamAccountSession: (...args: any[]) => Promise<any>
  revokeOtherIamAccountSessions: (...args: any[]) => Promise<any>
  listIamAccountConsents: (...args: any[]) => Promise<any>
  listIamAccountDelegatedRelationships: (...args: any[]) => Promise<any>
  listIamAccountDelegatedConsents: (...args: any[]) => Promise<any>
  grantIamAccountDelegatedConsent: (...args: any[]) => Promise<any>
  revokeIamAccountDelegatedConsent: (...args: any[]) => Promise<any>
  listIamAccountDelegatedConsentRequests: (...args: any[]) => Promise<any>
  requestIamAccountDelegatedConsent: (...args: any[]) => Promise<any>
  approveIamAccountDelegatedConsentRequest: (...args: any[]) => Promise<any>
  denyIamAccountDelegatedConsentRequest: (...args: any[]) => Promise<any>
  cancelIamAccountDelegatedConsentRequest: (...args: any[]) => Promise<any>
  listIamWebAuthnCredentials: (...args: any[]) => Promise<any>
  listIamAccountLinkedIdentities: (...args: any[]) => Promise<any>
  listIamIdentityProviders: (...args: any[]) => Promise<any>
  createIamIdentityProvider: (...args: any[]) => Promise<any>
  updateIamIdentityProvider: (...args: any[]) => Promise<any>
  listIamUserFederationProviders: (...args: any[]) => Promise<any>
  createIamUserFederationProvider: (...args: any[]) => Promise<any>
  updateIamUserFederationProvider: (...args: any[]) => Promise<any>
  syncIamUserFederationProvider: (...args: any[]) => Promise<any>
  listIamFederationSyncJobs: (...args: any[]) => Promise<any>
  listIamLinkedIdentities: (...args: any[]) => Promise<any>
  listIamFederationEvents: (...args: any[]) => Promise<any>
  updateIamRealmTheme: (...args: any[]) => Promise<any>
  updateIamRealmLocalization: (...args: any[]) => Promise<any>
  listIamNotificationTemplates: (...args: any[]) => Promise<any>
  updateIamNotificationTemplate: (...args: any[]) => Promise<any>
  previewIamNotificationTemplate: (...args: any[]) => Promise<any>
  sendIamTestNotification: (...args: any[]) => Promise<any>
  listIamNotificationDeliveries: (...args: any[]) => Promise<any>
}

export const legacyIamApi: LegacyIamApi = {
    async getIamExtensionSummary() {
        const response = await api.get('/iam/extensions/summary');
        return response.data;
    },
    async listIamProviderInterfaces() {
        const response = await api.get('/iam/extension-interfaces');
        return response.data;
    },
    async listIamRealms(filters) {
        const response = await api.get('/iam/realms', {
            params: {
                scope_kind: filters?.scopeKind,
                binding_target_kind: filters?.bindingTargetKind,
                binding_target_id: filters?.bindingTargetId,
            },
        });
        return response.data;
    },
    async listIamRealmAttributes(realmId) {
        const response = await api.get(`/iam/realms/${realmId}/attributes`);
        return response.data;
    },
    async listIamRealmTemplates() {
        const response = await api.get('/iam/realm-templates');
        return response.data;
    },
    async listIamRealmBindings(filters) {
        const response = await api.get('/iam/realm-bindings', {
            params: {
                binding_target_kind: filters?.bindingTargetKind,
            },
        });
        return response.data;
    },
    async listIamValidationDomains() {
        const response = await api.get('/iam/validation-domains');
        return response.data;
    },
    async createIamRealm(request) {
        const response = await api.post('/iam/realms', request);
        return response.data;
    },
    async createIamRealmAttribute(realmId, request) {
        const response = await api.post(`/iam/realms/${realmId}/attributes`, request);
        return response.data;
    },
    async updateIamRealm(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}`, request);
        return response.data;
    },
    async updateIamRealmAttribute(realmId, attributeKey, request) {
        const response = await api.put(`/iam/realms/${realmId}/attributes/${encodeURIComponent(attributeKey)}`, request);
        return response.data;
    },
    async deleteIamRealmAttribute(realmId, attributeKey) {
        const response = await api.delete(`/iam/realms/${realmId}/attributes/${encodeURIComponent(attributeKey)}`);
        return response.data;
    },
    async updateIamRealmBinding(bindingId, request) {
        const response = await api.put(`/iam/realm-bindings/${bindingId}`, request);
        return response.data;
    },
    async listIamAuthFlows(filters) {
        const response = await api.get('/iam/auth-flows', {
            params: {
                realm_id: filters?.realmId,
                kind: filters?.kind,
            },
        });
        return response.data;
    },
    async createIamAuthFlow(request) {
        const response = await api.post('/iam/auth-flows', request);
        return response.data;
    },
    async updateIamAuthFlow(flowId, request) {
        const response = await api.put(`/iam/auth-flows/${flowId}`, request);
        return response.data;
    },
    async listIamAuthExecutions(filters) {
        const response = await api.get('/iam/auth-executions', {
            params: {
                flow_id: filters?.flowId,
            },
        });
        return response.data;
    },
    async createIamAuthExecution(request) {
        const response = await api.post('/iam/auth-executions', request);
        return response.data;
    },
    async updateIamAuthExecution(executionId, request) {
        const response = await api.put(`/iam/auth-executions/${executionId}`, request);
        return response.data;
    },
    async listIamAuthFlowBindings(filters) {
        const response = await api.get('/iam/auth-flow-bindings', {
            params: {
                realm_id: filters?.realmId,
                client_id: filters?.clientId,
            },
        });
        return response.data;
    },
    async updateIamRealmAuthFlowBindings(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}/auth-flow-bindings`, request);
        return response.data;
    },
    async updateIamClientAuthFlowBindings(clientId, request) {
        const response = await api.put(`/iam/clients/${clientId}/auth-flow-bindings`, request);
        return response.data;
    },
    async listIamUsers(filters) {
        const response = await api.get('/iam/users', {
            params: {
                realm_id: filters?.realmId,
                search: filters?.search,
            },
        });
        return response.data;
    },
    async createIamUser(request) {
        const response = await api.post('/iam/users', request);
        return response.data;
    },
    async updateIamUser(userId, request) {
        const response = await api.put(`/iam/users/${userId}`, request);
        return response.data;
    },
    async listIamUserProfileSchemas(filters) {
        const response = await api.get('/iam/profile-schemas', {
            params: {
                realm_id: filters?.realmId,
            },
        });
        return response.data;
    },
    async updateIamUserProfileSchema(realmId, request) {
        const response = await api.put(`/iam/realms/${realmId}/profile-schema`, request);
        return response.data;
    },
    async getIamUserProfile(userId) {
        const response = await api.get(`/iam/users/${userId}/profile`);
        return response.data;
    },
    async updateIamUserProfile(userId, request) {
        const response = await api.put(`/iam/users/${userId}/profile`, request);
        return response.data;
    },
    ...legacyIamManagementApi,
    ...legacyIamPublicApi,
    ...legacyIamFederationApi,
}
