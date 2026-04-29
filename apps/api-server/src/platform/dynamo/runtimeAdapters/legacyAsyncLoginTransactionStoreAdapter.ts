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
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const nextState = await this.options.load();
      const index = nextState.findIndex(
        (candidate) => candidate.id === transaction.id && candidate.realm_id === transaction.realm_id,
      );
      if (index >= 0) {
        nextState[index] = transaction;
      } else {
        nextState.push(transaction);
      }

      try {
        await this.options.save(nextState);
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (
          !message.includes('Refusing to overwrite newer persisted state')
          && !message.includes('Conditional write failed for dynamodb://')
          && !message.includes('persisted state changed concurrently')
        ) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
