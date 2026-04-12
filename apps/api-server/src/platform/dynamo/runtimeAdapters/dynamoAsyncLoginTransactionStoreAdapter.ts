import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';
import type { LoginTransactionRepository } from '../repositories/loginTransactionRepository';
import type { AsyncLoginTransactionStoreAdapter } from './asyncLoginTransactionStoreAdapter';

export class DynamoAsyncLoginTransactionStoreAdapter implements AsyncLoginTransactionStoreAdapter {
  constructor(private readonly repository: LoginTransactionRepository) {}

  getById(realmId: string, transactionId: string): Promise<StoredIamLoginTransaction | null> {
    return this.repository.getById(realmId, transactionId);
  }

  put(transaction: StoredIamLoginTransaction): Promise<void> {
    return this.repository.put(transaction);
  }
}
