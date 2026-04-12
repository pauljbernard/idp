#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeMethod(value) {
  return String(value || '').trim().toLowerCase();
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const manifestPath = path.join(repoRoot, 'contracts', 'sdk-iam', 'contract-manifest.json');

  if (!fs.existsSync(manifestPath)) {
    fail(`Missing SDK IAM contract manifest file: ${manifestPath}`);
  }

  const manifest = readJson(manifestPath);
  const contracts = Array.isArray(manifest.openapi_contracts) ? manifest.openapi_contracts : [];
  const operations = Array.isArray(manifest.operations) ? manifest.operations : [];

  if (contracts.length === 0) {
    fail('IAM SDK manifest contains no openapi_contracts entries.');
  }
  if (operations.length === 0) {
    fail('IAM SDK manifest contains no operations.');
  }

  const openApiPaths = {};

  for (const relativePath of contracts) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      fail(`Missing OpenAPI contract file: ${absolutePath}`);
    }
    const document = readJson(absolutePath);
    const paths = document.paths || {};
    for (const [pathKey, pathValue] of Object.entries(paths)) {
      openApiPaths[pathKey] = Object.assign(openApiPaths[pathKey] || {}, pathValue || {});
    }
  }

  const missing = [];
  const validated = [];

  for (const operation of operations) {
    const operationId = operation.id || '<unnamed>';
    const method = normalizeMethod(operation.method);
    const operationPath = operation.path;
    if (!operationPath || !method) {
      missing.push({ id: operationId, reason: 'missing path or method in manifest' });
      continue;
    }

    const pathEntry = openApiPaths[operationPath];
    if (!pathEntry) {
      missing.push({ id: operationId, reason: `path not found in OpenAPI set: ${operationPath}` });
      continue;
    }

    if (!pathEntry[method]) {
      missing.push({
        id: operationId,
        reason: `method ${method.toUpperCase()} not found for path ${operationPath} in OpenAPI set`
      });
      continue;
    }

    validated.push({
      id: operationId,
      method: method.toUpperCase(),
      path: operationPath,
    });
  }

  if (missing.length > 0) {
    console.error('IAM SDK contract verification failed:');
    for (const issue of missing) {
      console.error(`- ${issue.id}: ${issue.reason}`);
    }
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        sdk_name: manifest.sdk_name || '@idp/sdk-iam',
        openapi_contracts: contracts,
        validated_operation_count: validated.length,
        validated_operations: validated,
        status: 'pass',
      },
      null,
      2,
    ),
  );
}

main();
