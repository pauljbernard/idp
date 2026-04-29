import type { StoredIamIssuedToken } from '../../iamProtocolRuntime';
import type { TokenRepository } from '../repositories/tokenRepository';
import type { AsyncIssuedTokenStoreAdapter } from './asyncIssuedTokenStoreAdapter';

export class DynamoAsyncIssuedTokenStoreAdapter implements AsyncIssuedTokenStoreAdapter {
  constructor(private readonly repository: TokenRepository) {}

  getById(realmId: string, tokenId: string): Promise<StoredIamIssuedToken | null> {
    return this.repository.getById(realmId, tokenId);
  }

  getByAccessHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    return this.repository.getByAccessHash(realmId, tokenHash);
  }

  getByRefreshHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    return this.repository.getByRefreshHash(realmId, tokenHash);
  }

  listActiveIdsBySubject(realmId: string, subjectKind: string, subjectId: string): Promise<string[]> {
    return this.repository.listActiveIdsBySubject(realmId, subjectKind, subjectId);
  }

  listActiveIdsByBrowserSession(realmId: string, browserSessionId: string): Promise<string[]> {
    return this.repository.listActiveIdsByBrowserSession(realmId, browserSessionId);
  }

  put(token: StoredIamIssuedToken): Promise<void> {
    return this.repository.put(token);
  }
}
