import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';
import type { SessionStoreAdapter } from './sessionStoreAdapter';

interface LegacySessionStoreAdapterOptions {
  list: () => StoredIamAccountSession[];
  getById: (realmId: string, sessionId: string) => StoredIamAccountSession | null;
  index: (session: StoredIamAccountSession) => void;
}

export class LegacySessionStoreAdapter implements SessionStoreAdapter {
  constructor(private readonly options: LegacySessionStoreAdapterOptions) {}

  getById(realmId: string, sessionId: string): StoredIamAccountSession | null {
    return this.options.getById(realmId, sessionId);
  }

  listByUser(realmId: string, userId: string): StoredIamAccountSession[] {
    return this.options.list()
      .filter((candidate) => candidate.realm_id === realmId && candidate.user_id === userId && !candidate.revoked_at)
      .sort((leftItem, rightItem) => rightItem.authenticated_at.localeCompare(leftItem.authenticated_at));
  }

  append(session: StoredIamAccountSession): void {
    this.options.list().push(session);
    this.options.index(session);
  }
}
