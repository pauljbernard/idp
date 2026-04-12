import type { StoredIamIssuedToken } from '../../iamProtocolRuntime';
import type { AsyncIssuedTokenStoreAdapter } from './asyncIssuedTokenStoreAdapter';

interface LegacyAsyncIssuedTokenStoreAdapterOptions {
  load: () => Promise<StoredIamIssuedToken[]>;
  save: (nextState: StoredIamIssuedToken[]) => Promise<void>;
}

export class LegacyAsyncIssuedTokenStoreAdapter implements AsyncIssuedTokenStoreAdapter {
  constructor(private readonly options: LegacyAsyncIssuedTokenStoreAdapterOptions) {}

  async getById(realmId: string, tokenId: string): Promise<StoredIamIssuedToken | null> {
    const state = await this.options.load();
    return state.find((candidate) => candidate.id === tokenId && candidate.realm_id === realmId) ?? null;
  }

  async getByAccessHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    const state = await this.options.load();
    return state.find(
      (candidate) => candidate.realm_id === realmId && candidate.access_token_hash === tokenHash,
    ) ?? null;
  }

  async getByRefreshHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    const state = await this.options.load();
    return state.find(
      (candidate) => candidate.realm_id === realmId && candidate.refresh_token_hash === tokenHash,
    ) ?? null;
  }

  async listActiveIdsBySubject(realmId: string, subjectKind: string, subjectId: string): Promise<string[]> {
    const state = await this.options.load();
    return state
      .filter(
        (candidate) =>
          candidate.realm_id === realmId
          && candidate.subject_kind === subjectKind
          && candidate.subject_id === subjectId
          && candidate.status === 'ACTIVE',
      )
      .map((candidate) => candidate.id);
  }

  async listActiveIdsByBrowserSession(realmId: string, browserSessionId: string): Promise<string[]> {
    const state = await this.options.load();
    return state
      .filter(
        (candidate) =>
          candidate.realm_id === realmId
          && candidate.browser_session_id === browserSessionId
          && candidate.status === 'ACTIVE',
      )
      .map((candidate) => candidate.id);
  }

  async put(token: StoredIamIssuedToken): Promise<void> {
    const nextState = await this.options.load();
    const index = nextState.findIndex(
      (candidate) => candidate.id === token.id && candidate.realm_id === token.realm_id,
    );
    if (index >= 0) {
      nextState[index] = token;
    } else {
      nextState.push(token);
    }
    await this.options.save(nextState);
  }
}
