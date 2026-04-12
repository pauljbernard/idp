export const IAM_PLATFORM_SCOPE_ID = 'idp-platform';
export const IAM_DEFAULT_REALM_ID = 'realm-idp-default';
export const IAM_SYSTEM_USER_ID = 'idp-super-admin';
export const IAM_SUPER_ADMIN_USER_ID = 'iam-user-idp-super-admin';

export function normalizeIamIdentifier(value: string): string {
  return value;
}

export function rewriteIamIdentifiers<T>(value: T): T {
  return value;
}

export function normalizeRealmScopeKind(value: unknown): 'PLATFORM_DEFAULT' | null {
  return value === 'PLATFORM_DEFAULT' ? 'PLATFORM_DEFAULT' : null;
}

export function normalizeBindingTargetKind(value: unknown): 'TENANT_SPACE' | null {
  return value === 'TENANT_SPACE' ? 'TENANT_SPACE' : null;
}
