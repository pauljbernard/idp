import type { StoredIamIssuedToken } from '../../iamProtocolRuntime';

export interface AsyncIssuedTokenStoreAdapter {
  getById(realmId: string, tokenId: string): Promise<StoredIamIssuedToken | null>;
  getByAccessHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null>;
  getByRefreshHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null>;
  listActiveIdsBySubject(realmId: string, subjectKind: string, subjectId: string): Promise<string[]>;
  listActiveIdsByBrowserSession(realmId: string, browserSessionId: string): Promise<string[]>;
  put(token: StoredIamIssuedToken): Promise<void>;
}
