import type { StoredIamAccountSession } from '../../iamAuthenticationRuntime';
import type { RuntimeRepositoryMode } from '../runtimeRepositoryMode';
import type { AsyncSessionStoreAdapter } from './asyncSessionStoreAdapter';

export class DualRunAsyncSessionStoreAdapter implements AsyncSessionStoreAdapter {
  constructor(
    private readonly legacy: AsyncSessionStoreAdapter,
    private readonly v2: AsyncSessionStoreAdapter,
    private readonly mode: RuntimeRepositoryMode,
  ) {}

  async getById(realmId: string, sessionId: string): Promise<StoredIamAccountSession | null> {
    if (this.mode.readV2) {
      return this.v2.getById(realmId, sessionId);
    }
    return this.legacy.getById(realmId, sessionId);
  }

  async listByUser(realmId: string, userId: string): Promise<StoredIamAccountSession[]> {
    if (this.mode.readV2) {
      return this.v2.listByUser(realmId, userId);
    }
    return this.legacy.listByUser(realmId, userId);
  }

  async put(session: StoredIamAccountSession): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.put(session);
      await this.v2.put(session);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.put(session);
      return;
    }
    await this.legacy.put(session);
  }
}
