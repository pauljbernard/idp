import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';
import type { LoginTransactionStoreAdapter } from './loginTransactionStoreAdapter';

interface LegacyLoginTransactionStoreAdapterOptions {
  list: () => StoredIamLoginTransaction[];
  save: (nextState: StoredIamLoginTransaction[]) => void;
}

export class LegacyLoginTransactionStoreAdapter implements LoginTransactionStoreAdapter {
  constructor(private readonly options: LegacyLoginTransactionStoreAdapterOptions) {}

  getById(realmId: string, transactionId: string): StoredIamLoginTransaction | null {
    return this.options.list().find(
      (candidate) => candidate.id === transactionId && candidate.realm_id === realmId,
    ) ?? null;
  }

  append(transaction: StoredIamLoginTransaction): void {
    const nextState = this.options.list();
    nextState.push(transaction);
    this.options.save(nextState);
  }
}
