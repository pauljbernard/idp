import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';

export interface LoginTransactionStoreAdapter {
  getById(realmId: string, transactionId: string): StoredIamLoginTransaction | null;
  append(transaction: StoredIamLoginTransaction): void;
}
