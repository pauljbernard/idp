import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';

export interface AsyncSessionStoreAdapter {
  getById(realmId: string, sessionId: string): Promise<StoredIamAccountSession | null>;
  listByUser(realmId: string, userId: string): Promise<StoredIamAccountSession[]>;
  put(session: StoredIamAccountSession): Promise<void>;
}
