import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';
import type { SessionRepository } from '../repositories/sessionRepository';
import type { AsyncSessionStoreAdapter } from './asyncSessionStoreAdapter';

export class DynamoAsyncSessionStoreAdapter implements AsyncSessionStoreAdapter {
  constructor(private readonly repository: SessionRepository) {}

  getById(realmId: string, sessionId: string): Promise<StoredIamAccountSession | null> {
    return this.repository.getById(realmId, sessionId);
  }

  async listByUser(realmId: string, userId: string): Promise<StoredIamAccountSession[]> {
    const result = await this.repository.listByUser(realmId, userId);
    return result.items;
  }

  put(session: StoredIamAccountSession): Promise<void> {
    return this.repository.put(session);
  }
}
