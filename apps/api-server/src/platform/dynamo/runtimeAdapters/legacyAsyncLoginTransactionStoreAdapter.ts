import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';
import type { AsyncLoginTransactionStoreAdapter } from './asyncLoginTransactionStoreAdapter';

interface LegacyAsyncLoginTransactionStoreAdapterOptions {
  load: () => Promise<StoredIamLoginTransaction[]>;
  save: (nextState: StoredIamLoginTransaction[]) => Promise<void>;
}

export class LegacyAsyncLoginTransactionStoreAdapter implements AsyncLoginTransactionStoreAdapter {
  constructor(private readonly options: LegacyAsyncLoginTransactionStoreAdapterOptions) {}

  async getById(realmId: string, transactionId: string): Promise<StoredIamLoginTransaction | null> {
    const state = await this.options.load();
    return state.find((candidate) => candidate.id === transactionId && candidate.realm_id === realmId) ?? null;
  }

  async put(transaction: StoredIamLoginTransaction): Promise<void> {
    const nextState = await this.options.load();
    const index = nextState.findIndex(
      (candidate) => candidate.id === transaction.id && candidate.realm_id === transaction.realm_id,
    );
    if (index >= 0) {
      nextState[index] = transaction;
    } else {
      nextState.push(transaction);
    }
    await this.options.save(nextState);
  }
}
