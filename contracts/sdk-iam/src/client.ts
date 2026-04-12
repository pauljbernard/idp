import type { IamSdkOperation } from './contracts';
import type { IamSdkCallContext, IamSdkRequestInput, IamSdkTransport } from './types';

export class IamSdkClient {
  private readonly transport: IamSdkTransport;

  constructor(transport: IamSdkTransport) {
    this.transport = transport;
  }

  get adapter() {
    return this.transport.adapter;
  }

  async request<T = unknown>(operation: IamSdkOperation, input?: IamSdkRequestInput): Promise<T> {
    return this.transport.request<T>(operation, input);
  }

  async getSummary<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('getSummary', { context });
  }

  async listRealms<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listRealms', { context });
  }

  async createRealm<T = unknown>(body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('createRealm', { body, context });
  }

  async updateRealm<T = unknown>(realmId: string, body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('updateRealm', { pathParams: { realmId }, body, context });
  }

  async listUsers<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listUsers', { context });
  }

  async createUser<T = unknown>(body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('createUser', { body, context });
  }

  async updateUser<T = unknown>(userId: string, body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('updateUser', { pathParams: { userId }, body, context });
  }

  async listGroups<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listGroups', { context });
  }

  async createGroup<T = unknown>(body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('createGroup', { body, context });
  }

  async updateGroup<T = unknown>(groupId: string, body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('updateGroup', { pathParams: { groupId }, body, context });
  }

  async listRoles<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listRoles', { context });
  }

  async createRole<T = unknown>(body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('createRole', { body, context });
  }

  async updateRole<T = unknown>(roleId: string, body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('updateRole', { pathParams: { roleId }, body, context });
  }

  async getAuthSession<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('getAuthSession', { context });
  }

  async switchAuthSessionTenant<T = unknown>(body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('switchAuthSessionTenant', { body, context });
  }

  async getSecurityContext<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('getSecurityContext', { context });
  }

  async listSecuritySessions<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listSecuritySessions', { context });
  }

  async revokeSecuritySession<T = unknown>(sessionId: string, body: unknown = {}, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('revokeSecuritySession', { pathParams: { sessionId }, body, context });
  }

  async revokeOtherSecuritySessions<T = unknown>(body: unknown = {}, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('revokeOtherSecuritySessions', { body, context });
  }

  async getAccountProfile<T = unknown>(realmId: string, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('getAccountProfile', { pathParams: { realmId }, context });
  }

  async updateAccountProfile<T = unknown>(realmId: string, body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('updateAccountProfile', { pathParams: { realmId }, body, context });
  }

  async getAccountSession<T = unknown>(realmId: string, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('getAccountSession', { pathParams: { realmId }, context });
  }

  async listDelegatedConsents<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listDelegatedConsents', { context });
  }

  async createDelegatedConsent<T = unknown>(body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('createDelegatedConsent', { body, context });
  }

  async updateDelegatedConsent<T = unknown>(consentId: string, body: unknown, context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('updateDelegatedConsent', { pathParams: { consentId }, body, context });
  }

  async listRealmPosturePresets<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listRealmPosturePresets', { context });
  }

  async listIdentityPrivacyPolicies<T = unknown>(context?: IamSdkCallContext): Promise<T> {
    return this.request<T>('listIdentityPrivacyPolicies', { context });
  }
}
