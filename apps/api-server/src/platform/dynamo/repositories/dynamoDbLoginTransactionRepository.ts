import { GetCommand, PutCommand, type DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { StoredIamLoginTransaction } from '../../iamAuthenticationRuntime';
import { fromLoginTransactionItem, toLoginTransactionItem } from '../runtimeMappers';
import type { LoginTransactionItem } from '../runtimeItems';
import { runtimeKeys } from '../runtimeKeys';
import type { LoginTransactionRepository } from './loginTransactionRepository';

export class DynamoDbLoginTransactionRepository implements LoginTransactionRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getById(realmId: string, transactionId: string): Promise<StoredIamLoginTransaction | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.loginTransaction(transactionId),
    }));
    const item = response.Item as LoginTransactionItem | undefined;
    if (!item || item.realm_id !== realmId) {
      return null;
    }
    return fromLoginTransactionItem(item);
  }

  async put(transaction: StoredIamLoginTransaction): Promise<void> {
    await this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: toLoginTransactionItem(transaction),
    }));
  }
}
