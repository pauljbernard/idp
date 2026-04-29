function readFirstConfiguredEnv(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
}

export function resolveRuntimeTableName(): string {
  const tableName = readFirstConfiguredEnv([
    'IDP_IAM_RUNTIME_DDB_TABLE',
    'IDP_RUNTIME_DYNAMODB_TABLE',
  ]);
  if (!tableName) {
    throw new Error(
      'Missing IDP_IAM_RUNTIME_DDB_TABLE. Configure a DynamoDB table before enabling runtime entity storage.',
    );
  }
  return tableName;
}
