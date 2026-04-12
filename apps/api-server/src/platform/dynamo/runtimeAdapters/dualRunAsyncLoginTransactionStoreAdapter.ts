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
    await this.legacy.put(transaction);
    if (this.mode.dualWrite || this.mode.readV2) {
      await this.v2.put(transaction);
    }
  }
}
