import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';

export interface LoginTransactionRepository {
  getById(realmId: string, transactionId: string): Promise<StoredIamLoginTransaction | null>;
  put(transaction: StoredIamLoginTransaction): Promise<void>;
}
