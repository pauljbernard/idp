import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';
import type { RuntimeRepositoryMode } from '../runtimeRepositoryMode';
import type { AsyncLoginTransactionStoreAdapter } from './asyncLoginTransactionStoreAdapter';

export class DualRunAsyncLoginTransactionStoreAdapter implements AsyncLoginTransactionStoreAdapter {
  constructor(
    private readonly legacy: AsyncLoginTransactionStoreAdapter,
    private readonly v2: AsyncLoginTransactionStoreAdapter,
    private readonly mode: RuntimeRepositoryMode,
  ) {}

  async getById(realmId: string, transactionId: string): Promise<StoredIamLoginTransaction | null> {
    if (this.mode.readV2) {
      return this.v2.getById(realmId, transactionId);
    }
    return this.legacy.getById(realmId, transactionId);
  }

  async put(transaction: StoredIamLoginTransaction): Promise<void> {
    if (this.mode.dualWrite) {
      await this.legacy.put(transaction);
      await this.v2.put(transaction);
      return;
    }
    if (this.mode.readV2) {
      await this.v2.put(transaction);
      return;
    }
    await this.legacy.put(transaction);
  }
}
