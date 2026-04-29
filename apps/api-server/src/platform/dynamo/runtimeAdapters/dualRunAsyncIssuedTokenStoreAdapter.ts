import type { StoredIamIssuedToken } from '../../iamProtocolRuntime';
import type { RuntimeRepositoryMode } from '../runtimeRepositoryMode';
import type { AsyncIssuedTokenStoreAdapter } from './asyncIssuedTokenStoreAdapter';

export class DualRunAsyncIssuedTokenStoreAdapter implements AsyncIssuedTokenStoreAdapter {
  constructor(
    private readonly legacy: AsyncIssuedTokenStoreAdapter,
    private readonly v2: AsyncIssuedTokenStoreAdapter,
    private readonly mode: RuntimeRepositoryMode,
  ) {}

  async getById(realmId: string, tokenId: string): Promise<StoredIamIssuedToken | null> {
    if (this.mode.readV2) {
      return this.v2.getById(realmId, tokenId);
    }
    return this.legacy.getById(realmId, tokenId);
  }

  async getByAccessHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    if (this.mode.readV2) {
      return this.v2.getByAccessHash(realmId, tokenHash);
    }
    return this.legacy.getByAccessHash(realmId, tokenHash);
  }

  async getByRefreshHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    if (this.mode.readV2) {
      return this.v2.getByRefreshHash(realmId, tokenHash);
    }
    return this.legacy.getByRefreshHash(realmId, tokenHash);
  }

  async listActiveIdsBySubject(realmId: string, subjectKind: string, subjectId: string): Promise<string[]> {
    if (this.mode.readV2) {
      return this.v2.listActiveIdsBySubject(realmId, subjectKind, subjectId);
    }
    return this.legacy.listActiveIdsBySubject(realmId, subjectKind, subjectId);
  }

  async listActiveIdsByBrowserSession(realmId: string, browserSessionId: string): Promise<string[]> {
    if (this.mode.readV2) {
      return this.v2.listActiveIdsByBrowserSession(realmId, browserSessionId);
    }
    return this.legacy.listActiveIdsByBrowserSession(realmId, browserSessionId);
  }

  async put(token: StoredIamIssuedToken): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.put(token);
      await this.v2.put(token);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.put(token);
      return;
    }
    await this.legacy.put(token);
  }
}
