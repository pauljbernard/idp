export const IAM_SDK_NAME = '@idp/sdk-iam';
export const IAM_SDK_VERSION = '0.1.0';

export type IamHttpMethod = 'GET' | 'POST' | 'PUT';

export interface IamOperationDefinition {
  method: IamHttpMethod;
  path: string;
}

export const IAM_OPERATION_DEFINITIONS = {
  getSummary: { method: 'GET', path: '/api/v1/iam/summary' },
  listRealms: { method: 'GET', path: '/api/v1/iam/realms' },
  createRealm: { method: 'POST', path: '/api/v1/iam/realms' },
  updateRealm: { method: 'PUT', path: '/api/v1/iam/realms/{realmId}' },
  listUsers: { method: 'GET', path: '/api/v1/iam/users' },
  createUser: { method: 'POST', path: '/api/v1/iam/users' },
  updateUser: { method: 'PUT', path: '/api/v1/iam/users/{userId}' },
  listGroups: { method: 'GET', path: '/api/v1/iam/groups' },
  createGroup: { method: 'POST', path: '/api/v1/iam/groups' },
  updateGroup: { method: 'PUT', path: '/api/v1/iam/groups/{groupId}' },
  listRoles: { method: 'GET', path: '/api/v1/iam/roles' },
  createRole: { method: 'POST', path: '/api/v1/iam/roles' },
  updateRole: { method: 'PUT', path: '/api/v1/iam/roles/{roleId}' },
  getAuthSession: { method: 'GET', path: '/api/v1/auth/session' },
  switchAuthSessionTenant: { method: 'POST', path: '/api/v1/auth/session/tenant' },
  getSecurityContext: { method: 'GET', path: '/api/v1/security/context' },
  listSecuritySessions: { method: 'GET', path: '/api/v1/security/sessions' },
  revokeSecuritySession: { method: 'POST', path: '/api/v1/security/sessions/{sessionId}/revoke' },
  revokeOtherSecuritySessions: { method: 'POST', path: '/api/v1/security/sessions/revoke-others' },
  getAccountProfile: { method: 'GET', path: '/api/v1/iam/realms/{realmId}/account/profile' },
  updateAccountProfile: { method: 'PUT', path: '/api/v1/iam/realms/{realmId}/account/profile' },
  getAccountSession: { method: 'GET', path: '/api/v1/iam/realms/{realmId}/account/session' },
  listDelegatedConsents: { method: 'GET', path: '/api/v1/iam/delegated-consents' },
  createDelegatedConsent: { method: 'POST', path: '/api/v1/iam/delegated-consents' },
  updateDelegatedConsent: { method: 'PUT', path: '/api/v1/iam/delegated-consents/{consentId}' },
  listRealmPosturePresets: { method: 'GET', path: '/api/v1/iam/realm-posture-presets' },
  listIdentityPrivacyPolicies: { method: 'GET', path: '/api/v1/iam/identity-privacy-policies' },
} as const satisfies Record<string, IamOperationDefinition>;

export type IamSdkOperation = keyof typeof IAM_OPERATION_DEFINITIONS;
