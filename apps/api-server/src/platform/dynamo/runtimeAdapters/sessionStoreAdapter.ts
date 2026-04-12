import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';

export interface SessionStoreAdapter {
  getById(realmId: string, sessionId: string): StoredIamAccountSession | null;
  listByUser(realmId: string, userId: string): StoredIamAccountSession[];
  append(session: StoredIamAccountSession): void;
}
