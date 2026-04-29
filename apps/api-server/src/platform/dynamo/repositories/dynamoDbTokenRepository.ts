import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import type { StoredIamIssuedToken } from '../../iamProtocolRuntime';
import { fromIssuedTokenItem, toIssuedTokenItem } from '../runtimeMappers';
import type { IssuedTokenItem, IssuedTokenLookupItem } from '../runtimeItems';
import { runtimeKeys, toEpochSeconds } from '../runtimeKeys';
import type { TokenRepository } from './tokenRepository';

export class DynamoDbTokenRepository implements TokenRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async getById(realmId: string, tokenId: string): Promise<StoredIamIssuedToken | null> {
    const response = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.token(tokenId),
    }));
    const item = response.Item as IssuedTokenItem | undefined;
    if (!item || item.realm_id !== realmId) {
      return null;
    }
    return fromIssuedTokenItem(item);
  }

  async getByAccessHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    return this.getByLookup(realmId, tokenHash, 'access_token');
  }

  async getByRefreshHash(realmId: string, tokenHash: string): Promise<StoredIamIssuedToken | null> {
    return this.getByLookup(realmId, tokenHash, 'refresh_token');
  }

  async listActiveIdsBySubject(
    realmId: string,
    subjectKind: string,
    subjectId: string,
  ): Promise<string[]> {
    return this.listActiveIdsByIndex('gsi1', 'gsi1pk', 'gsi1sk', `SUBJECT#${subjectKind}#${subjectId}`, realmId);
  }

  async listActiveIdsByBrowserSession(
    realmId: string,
    browserSessionId: string,
  ): Promise<string[]> {
    return this.listActiveIdsByIndex('gsi2', 'gsi2pk', 'gsi2sk', `BROWSERSESSION#${browserSessionId}`, realmId);
  }

  async put(token: StoredIamIssuedToken): Promise<void> {
    const writes = [
      {
        Put: {
          TableName: this.tableName,
          Item: toIssuedTokenItem(token),
        },
      },
      {
        Put: {
          TableName: this.tableName,
          Item: toIssuedTokenLookupItem(token, token.access_token_hash, 'access_token'),
        },
      },
    ];

    if (token.refresh_token_hash) {
      writes.push({
        Put: {
          TableName: this.tableName,
          Item: toIssuedTokenLookupItem(token, token.refresh_token_hash, 'refresh_token'),
        },
      });
    }

    await this.client.send(new TransactWriteCommand({
      TransactItems: writes,
    }));
  }

  private async getByLookup(
    realmId: string,
    tokenHash: string,
    tokenUse: 'access_token' | 'refresh_token',
  ): Promise<StoredIamIssuedToken | null> {
    const lookupResponse = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: runtimeKeys.tokenLookup(realmId, tokenHash, tokenUse),
    }));
    const lookupItem = lookupResponse.Item as IssuedTokenLookupItem | undefined;
    if (!lookupItem || lookupItem.realm_id !== realmId) {
      return null;
    }
    return this.getById(realmId, lookupItem.token_id);
  }

  private async listActiveIdsByIndex(
    indexName: 'gsi1' | 'gsi2',
    pkName: 'gsi1pk' | 'gsi2pk',
    skName: 'gsi1sk' | 'gsi2sk',
    pkValue: string,
    realmId: string,
  ): Promise<string[]> {
    const tokenIds: string[] = [];
    let cursor: Record<string, unknown> | undefined;

    do {
      const response = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: `${pkName} = :pk AND begins_with(${skName}, :prefix)`,
        ExpressionAttributeValues: {
          ':pk': pkValue,
          ':prefix': 'TOKEN#',
        },
        ExclusiveStartKey: cursor,
      }));

      for (const item of response.Items ?? []) {
        const token = item as IssuedTokenItem;
        if (token.realm_id === realmId && token.status === 'ACTIVE') {
          tokenIds.push(token.token_id);
        }
      }

      cursor = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (cursor);

    return tokenIds;
  }
}

function toIssuedTokenLookupItem(
  token: StoredIamIssuedToken,
  tokenHash: string,
  tokenUse: 'access_token' | 'refresh_token',
): IssuedTokenLookupItem {
  return {
    ...runtimeKeys.tokenLookup(token.realm_id, tokenHash, tokenUse),
    entity_type: 'ISSUED_TOKEN_LOOKUP',
    realm_id: token.realm_id,
    token_id: token.id,
    token_use: tokenUse,
    created_at: token.issued_at,
    updated_at: token.revoked_at ?? token.issued_at,
    version: 1,
    expires_at_epoch: toEpochSeconds(token.refresh_expires_at ?? token.expires_at),
  };
}
