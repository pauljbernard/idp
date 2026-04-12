import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';
import type { AsyncSessionStoreAdapter } from './asyncSessionStoreAdapter';

interface LegacyAsyncSessionStoreAdapterOptions {
  load: () => Promise<StoredIamAccountSession[]>;
  save: (nextState: StoredIamAccountSession[]) => Promise<void>;
}

export class LegacyAsyncSessionStoreAdapter implements AsyncSessionStoreAdapter {
  constructor(private readonly options: LegacyAsyncSessionStoreAdapterOptions) {}

  async getById(realmId: string, sessionId: string): Promise<StoredIamAccountSession | null> {
    const state = await this.options.load();
    return state.find((candidate) => candidate.realm_id === realmId && candidate.id === sessionId) ?? null;
  }

  async listByUser(realmId: string, userId: string): Promise<StoredIamAccountSession[]> {
    const state = await this.options.load();
    return state
      .filter((candidate) => candidate.realm_id === realmId && candidate.user_id === userId && !candidate.revoked_at)
      .sort((leftItem, rightItem) => rightItem.authenticated_at.localeCompare(leftItem.authenticated_at));
  }

  async put(session: StoredIamAccountSession): Promise<void> {
    const nextState = await this.options.load();
    const index = nextState.findIndex(
      (candidate) => candidate.realm_id === session.realm_id && candidate.id === session.id,
    );
    if (index >= 0) {
      nextState[index] = session;
    } else {
      nextState.push(session);
    }
    await this.options.save(nextState);
  }
}
