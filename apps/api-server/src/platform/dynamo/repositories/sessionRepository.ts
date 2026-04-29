import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';

export interface SessionRepository {
  getById(realmId: string, sessionId: string): Promise<StoredIamAccountSession | null>;
  listByUser(realmId: string, userId: string, limit?: number, cursor?: string | null): Promise<{
    items: StoredIamAccountSession[];
    nextCursor: string | null;
  }>;
  put(session: StoredIamAccountSession): Promise<void>;
}
