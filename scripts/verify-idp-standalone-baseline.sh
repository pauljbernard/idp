#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

require_path() {
  local target="$1"
  if [[ ! -e "${target}" ]]; then
    echo "Missing required path: ${target}" >&2
    exit 1
  fi
}

echo "Verifying standalone IDP repo structure..."

require_path "${ROOT_DIR}/docs/spec/constitution.idp.md"
require_path "${ROOT_DIR}/docs/spec/requirements.idp.md"
require_path "${ROOT_DIR}/docs/spec/plans/Headless_IAM_Full_IDP_Implementation_Plan.md"
require_path "${ROOT_DIR}/contracts/api/iam-realms-api.json"
require_path "${ROOT_DIR}/contracts/api/security-api.json"
require_path "${ROOT_DIR}/contracts/sdk-iam/contract-manifest.json"
require_path "${ROOT_DIR}/apps/api-server/src/platform/iamFoundation.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/pages/HeadlessIam.tsx"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/api.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/api.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/compatApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/compatApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyApiTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAccessApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAccessApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAdapterApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAdapterApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAdapterTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAdminApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAdminApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyAdminTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCrmApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCrmApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCrmTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCommerceApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCommerceApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCommerceTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCmsApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCmsApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCommunicationsApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCommunicationsApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCommunicationsTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCutoverApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCutoverApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyCutoverTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyDeliveryApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyDeliveryApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyDeliveryTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamFederationApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamFederationApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamManagementApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamManagementApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamPublicApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyIamPublicApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyLearningApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyLearningApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyLearningTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyLmsApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyLmsApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyLmsTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyOperationsApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyOperationsApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyOperationsTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyProjectApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyProjectApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyProjectTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacySchedulingApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacySchedulingApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacySchedulingTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyWorkforceApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyWorkforceApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/legacyWorkforceTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamClientState.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamClientState.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamHttpClient.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamHttpClient.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamApiRuntime.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamApiRuntime.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamApiTypes.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamCompatApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/iamCompatApi.js"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/standaloneApi.ts"
require_path "${ROOT_DIR}/apps/enterprise-ui/src/services/standaloneApi.js"
require_path "${ROOT_DIR}/scripts/sync-idp-standalone.sh"
require_path "${ROOT_DIR}/scripts/prepare-idp-login-transaction-evidence.sh"
require_path "${ROOT_DIR}/scripts/prepare-idp-runtime-cutover-evidence.sh"
require_path "${ROOT_DIR}/scripts/prepare-idp-sequence-a-evidence.sh"
require_path "${ROOT_DIR}/scripts/render-idp-sequence-a-status-matrix.js"
require_path "${ROOT_DIR}/scripts/render-idp-runtime-cutover-preflight.js"
require_path "${ROOT_DIR}/scripts/scaffold-idp-issued-token-evidence.js"
require_path "${ROOT_DIR}/scripts/scaffold-idp-login-transaction-evidence.js"
require_path "${ROOT_DIR}/scripts/scaffold-idp-runtime-cutover-evidence.js"
require_path "${ROOT_DIR}/scripts/scaffold-idp-session-evidence.js"
require_path "${ROOT_DIR}/scripts/scaffold-idp-ticket-evidence.js"
require_path "${ROOT_DIR}/scripts/verify-governance.js"
require_path "${ROOT_DIR}/scripts/verify-idp-sequence-a-bundle.js"
require_path "${ROOT_DIR}/scripts/verify-sdk-iam-contract.js"
require_path "${ROOT_DIR}/scripts/verify-idp-runtime-cutover-readiness.js"
require_path "${ROOT_DIR}/scripts/verify-idp-runtime-cutover-readiness.sh"
require_path "${ROOT_DIR}/scripts/update-idp-sequence-a-bundle-status.js"
require_path "${ROOT_DIR}/scripts/compat/README.md"
require_path "${ROOT_DIR}/scripts/compat/lib/idp-auth.sh"

echo "Running SDK contract validation..."
node "${ROOT_DIR}/scripts/verify-sdk-iam-contract.js" >/dev/null

echo "Checking standalone script layout..."
ROOT_DIR="${ROOT_DIR}" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT_DIR;
const scriptsDir = path.join(root, 'scripts');
const rootScriptFiles = fs.readdirSync(scriptsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .sort();

const expectedRootScriptFiles = [
  'prepare-idp-login-transaction-evidence.sh',
  'prepare-idp-runtime-cutover-evidence.sh',
  'prepare-idp-sequence-a-evidence.sh',
  'render-idp-runtime-cutover-preflight.js',
  'render-idp-sequence-a-status-matrix.js',
  'scaffold-idp-issued-token-evidence.js',
  'scaffold-idp-login-transaction-evidence.js',
  'scaffold-idp-runtime-cutover-evidence.js',
  'scaffold-idp-session-evidence.js',
  'scaffold-idp-ticket-evidence.js',
  'sync-idp-standalone.sh',
  'update-idp-sequence-a-bundle-status.js',
  'verify-governance.js',
  'verify-idp-runtime-cutover-readiness.js',
  'verify-idp-runtime-cutover-readiness.sh',
  'verify-idp-sequence-a-bundle.js',
  'verify-idp-standalone-baseline.sh',
  'verify-sdk-iam-contract.js',
];

if (JSON.stringify(rootScriptFiles) !== JSON.stringify(expectedRootScriptFiles)) {
  console.error('Unexpected root scripts layout.');
  console.error(`Expected: ${expectedRootScriptFiles.join(', ')}`);
  console.error(`Actual: ${rootScriptFiles.join(', ')}`);
  process.exit(1);
}
NODE

echo "Checking standalone UI API boundary..."
ROOT_DIR="${ROOT_DIR}" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT_DIR;
const uiRoot = path.join(root, 'apps/enterprise-ui/src');
const allowedDirectImports = new Set([
  path.join(uiRoot, 'services/api.ts'),
  path.join(uiRoot, 'services/api.js'),
  path.join(uiRoot, 'services/compatApi.ts'),
  path.join(uiRoot, 'services/compatApi.js'),
  path.join(uiRoot, 'services/legacyApi.ts'),
  path.join(uiRoot, 'services/legacyApi.js'),
  path.join(uiRoot, 'services/legacyApiTypes.ts'),
  path.join(uiRoot, 'services/legacyAccessApi.ts'),
  path.join(uiRoot, 'services/legacyAccessApi.js'),
  path.join(uiRoot, 'services/legacyAdapterApi.ts'),
  path.join(uiRoot, 'services/legacyAdapterApi.js'),
  path.join(uiRoot, 'services/legacyAdapterTypes.ts'),
  path.join(uiRoot, 'services/legacyAdminApi.ts'),
  path.join(uiRoot, 'services/legacyAdminApi.js'),
  path.join(uiRoot, 'services/legacyAdminTypes.ts'),
  path.join(uiRoot, 'services/legacyCrmApi.ts'),
  path.join(uiRoot, 'services/legacyCrmApi.js'),
  path.join(uiRoot, 'services/legacyCrmTypes.ts'),
  path.join(uiRoot, 'services/legacyCommerceApi.ts'),
  path.join(uiRoot, 'services/legacyCommerceApi.js'),
  path.join(uiRoot, 'services/legacyCommerceTypes.ts'),
  path.join(uiRoot, 'services/legacyCmsApi.ts'),
  path.join(uiRoot, 'services/legacyCmsApi.js'),
  path.join(uiRoot, 'services/legacyCommunicationsApi.ts'),
  path.join(uiRoot, 'services/legacyCommunicationsApi.js'),
  path.join(uiRoot, 'services/legacyCommunicationsTypes.ts'),
  path.join(uiRoot, 'services/legacyCutoverApi.ts'),
  path.join(uiRoot, 'services/legacyCutoverApi.js'),
  path.join(uiRoot, 'services/legacyCutoverTypes.ts'),
  path.join(uiRoot, 'services/legacyDeliveryApi.ts'),
  path.join(uiRoot, 'services/legacyDeliveryApi.js'),
  path.join(uiRoot, 'services/legacyDeliveryTypes.ts'),
  path.join(uiRoot, 'services/legacyIamApi.ts'),
  path.join(uiRoot, 'services/legacyIamApi.js'),
  path.join(uiRoot, 'services/legacyIamFederationApi.ts'),
  path.join(uiRoot, 'services/legacyIamFederationApi.js'),
  path.join(uiRoot, 'services/legacyIamManagementApi.ts'),
  path.join(uiRoot, 'services/legacyIamManagementApi.js'),
  path.join(uiRoot, 'services/legacyIamPublicApi.ts'),
  path.join(uiRoot, 'services/legacyIamPublicApi.js'),
  path.join(uiRoot, 'services/legacyLearningApi.ts'),
  path.join(uiRoot, 'services/legacyLearningApi.js'),
  path.join(uiRoot, 'services/legacyLearningTypes.ts'),
  path.join(uiRoot, 'services/legacyLmsApi.ts'),
  path.join(uiRoot, 'services/legacyLmsApi.js'),
  path.join(uiRoot, 'services/legacyLmsTypes.ts'),
  path.join(uiRoot, 'services/legacyOperationsApi.ts'),
  path.join(uiRoot, 'services/legacyOperationsApi.js'),
  path.join(uiRoot, 'services/legacyOperationsTypes.ts'),
  path.join(uiRoot, 'services/legacyProjectApi.ts'),
  path.join(uiRoot, 'services/legacyProjectApi.js'),
  path.join(uiRoot, 'services/legacyProjectTypes.ts'),
  path.join(uiRoot, 'services/legacySchedulingApi.ts'),
  path.join(uiRoot, 'services/legacySchedulingApi.js'),
  path.join(uiRoot, 'services/legacySchedulingTypes.ts'),
  path.join(uiRoot, 'services/legacyWorkforceApi.ts'),
  path.join(uiRoot, 'services/legacyWorkforceApi.js'),
  path.join(uiRoot, 'services/legacyWorkforceTypes.ts'),
  path.join(uiRoot, 'services/iamClientState.ts'),
  path.join(uiRoot, 'services/iamClientState.js'),
  path.join(uiRoot, 'services/iamHttpClient.ts'),
  path.join(uiRoot, 'services/iamHttpClient.js'),
  path.join(uiRoot, 'services/iamApiRuntime.ts'),
  path.join(uiRoot, 'services/iamApiRuntime.js'),
  path.join(uiRoot, 'services/iamApiTypes.ts'),
  path.join(uiRoot, 'services/iamCompatApi.ts'),
  path.join(uiRoot, 'services/iamCompatApi.js'),
  path.join(uiRoot, 'services/standaloneApi.ts'),
  path.join(uiRoot, 'services/standaloneApi.js'),
]);

const violations = [];
const stack = [uiRoot];

while (stack.length) {
  const dir = stack.pop();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stack.push(target);
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      continue;
    }
    if (allowedDirectImports.has(target)) {
      continue;
    }
    const source = fs.readFileSync(target, 'utf8');
    if (/from\s+['"](?:\.\.\/|\.\.\/\.\.\/|\.\/)services\/(?:api|compatApi|iamCompatApi|legacyApi|legacyApiTypes|legacyAccessApi|legacyAdapterApi|legacyAdapterTypes|legacyAdminApi|legacyAdminTypes|legacyCommerceApi|legacyCommerceTypes|legacyCmsApi|legacyCommunicationsApi|legacyCommunicationsTypes|legacyCrmApi|legacyCrmTypes|legacyCutoverApi|legacyCutoverTypes|legacyDeliveryApi|legacyDeliveryTypes|legacyIamApi|legacyIamFederationApi|legacyIamManagementApi|legacyIamPublicApi|legacyLearningApi|legacyLearningTypes|legacyLmsApi|legacyLmsTypes|legacyOperationsApi|legacyOperationsTypes|legacyProjectApi|legacyProjectTypes|legacySchedulingApi|legacySchedulingTypes|legacyWorkforceApi|legacyWorkforceTypes|iamClientState|iamHttpClient|iamApiRuntime|iamApiTypes)['"]/.test(source)) {
      violations.push(path.relative(root, target));
    }
  }
}

if (violations.length > 0) {
  console.error('Direct UI imports of internal client layers are not allowed outside the client boundary stack.');
  for (const file of violations) {
    console.error(file);
  }
  process.exit(1);
}

for (const boundaryFile of allowedDirectImports) {
  const source = fs.readFileSync(boundaryFile, 'utf8');
  const relativePath = path.relative(root, boundaryFile);
  if (/standaloneApi\.(ts|js)$/.test(relativePath) && /export\s+\*\s+from\s+['"]\.\/(?:api|compatApi|iamCompatApi|legacyApi)['"]/.test(source)) {
    console.error(`Wildcard exports are not allowed in ${relativePath}.`);
    process.exit(1);
  }
  if (/standaloneApi\.(ts|js)$/.test(relativePath) && !/from\s+['"]\.\/iamCompatApi['"]/.test(source)) {
    console.error(`${relativePath} must source its exports from services/iamCompatApi.`);
    process.exit(1);
  }
}

const standaloneTypeFile = path.join(uiRoot, 'services/standaloneApi.ts');
const standaloneTypeSource = fs.readFileSync(standaloneTypeFile, 'utf8');
if (!/from\s+['"]\.\/iamApiTypes['"]/.test(standaloneTypeSource)) {
  console.error(`${path.relative(root, standaloneTypeFile)} must source IAM type exports from services/iamApiTypes.`);
  process.exit(1);
}

const standaloneJsFile = path.join(uiRoot, 'services/standaloneApi.js');
const typescript = require(require.resolve('typescript', { paths: [path.join(root, 'apps/enterprise-ui'), root] }));

function sourceKindFor(file) {
  if (file.endsWith('.tsx')) {
    return typescript.ScriptKind.TSX;
  }
  if (file.endsWith('.jsx')) {
    return typescript.ScriptKind.JSX;
  }
  if (file.endsWith('.ts')) {
    return typescript.ScriptKind.TS;
  }
  return typescript.ScriptKind.JS;
}

function createSourceFile(file) {
  return typescript.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    typescript.ScriptTarget.Latest,
    true,
    sourceKindFor(file),
  );
}

function resolveLocal(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function collectStandaloneImports() {
  const runtime = new Set();
  const types = new Set();
  const unsupported = [];
  const stack = [uiRoot];

  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(target);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(entry.name) || allowedDirectImports.has(target)) {
        continue;
      }
      const sourceFile = createSourceFile(target);
      sourceFile.forEachChild((node) => {
        if (!typescript.isImportDeclaration(node) || !typescript.isStringLiteral(node.moduleSpecifier)) {
          return;
        }
        const specifier = node.moduleSpecifier.text;
        if (!specifier.startsWith('.')) {
          return;
        }
        const resolved = resolveLocal(target, specifier);
        if (resolved !== standaloneTypeFile && resolved !== standaloneJsFile) {
          return;
        }
        const importClause = node.importClause;
        if (!importClause) {
          return;
        }
        if (importClause.name) {
          unsupported.push(`${path.relative(root, target)} uses a default import from services/standaloneApi.`);
        }
        if (!importClause.namedBindings) {
          return;
        }
        if (typescript.isNamespaceImport(importClause.namedBindings)) {
          unsupported.push(`${path.relative(root, target)} uses a namespace import from services/standaloneApi.`);
          return;
        }
        for (const element of importClause.namedBindings.elements) {
          const importedName = (element.propertyName ?? element.name).text;
          if (importClause.isTypeOnly || element.isTypeOnly) {
            types.add(importedName);
          } else {
            runtime.add(importedName);
          }
        }
      });
    }
  }

  return { runtime, types, unsupported };
}

function collectNamedExports(file, { typeOnly }) {
  const namedExports = new Set();
  const sourceFile = createSourceFile(file);
  sourceFile.forEachChild((node) => {
    if (!typescript.isExportDeclaration(node) || !node.exportClause || !typescript.isNamedExports(node.exportClause)) {
      return;
    }
    if (Boolean(node.isTypeOnly) !== typeOnly) {
      return;
    }
    for (const element of node.exportClause.elements) {
      namedExports.add(element.name.text);
    }
  });
  return namedExports;
}

function formatNames(values) {
  return [...values].sort().join(', ');
}

function diff(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

const standaloneImports = collectStandaloneImports();
if (standaloneImports.unsupported.length > 0) {
  console.error('Unsupported standaloneApi import patterns detected:');
  for (const message of standaloneImports.unsupported) {
    console.error(message);
  }
  process.exit(1);
}

const standaloneTypeExports = collectNamedExports(standaloneTypeFile, { typeOnly: true });
const standaloneTsRuntimeExports = collectNamedExports(standaloneTypeFile, { typeOnly: false });
const standaloneJsRuntimeExports = collectNamedExports(standaloneJsFile, { typeOnly: false });

const missingRuntimeImports = diff(standaloneImports.runtime, standaloneTsRuntimeExports);
const unusedRuntimeExports = diff(standaloneTsRuntimeExports, standaloneImports.runtime);
if (missingRuntimeImports.length > 0 || unusedRuntimeExports.length > 0) {
  console.error('services/standaloneApi runtime exports must match app runtime imports exactly.');
  if (missingRuntimeImports.length > 0) {
    console.error(`Missing runtime exports: ${formatNames(missingRuntimeImports)}`);
  }
  if (unusedRuntimeExports.length > 0) {
    console.error(`Unused runtime exports: ${formatNames(unusedRuntimeExports)}`);
  }
  process.exit(1);
}

const runtimeOnlyInTs = diff(standaloneTsRuntimeExports, standaloneJsRuntimeExports);
const runtimeOnlyInJs = diff(standaloneJsRuntimeExports, standaloneTsRuntimeExports);
if (runtimeOnlyInTs.length > 0 || runtimeOnlyInJs.length > 0) {
  console.error('services/standaloneApi.ts and services/standaloneApi.js must expose the same runtime names.');
  if (runtimeOnlyInTs.length > 0) {
    console.error(`Only in TypeScript: ${formatNames(runtimeOnlyInTs)}`);
  }
  if (runtimeOnlyInJs.length > 0) {
    console.error(`Only in JavaScript: ${formatNames(runtimeOnlyInJs)}`);
  }
  process.exit(1);
}

const missingTypeImports = diff(standaloneImports.types, standaloneTypeExports);
const unusedTypeExports = diff(standaloneTypeExports, standaloneImports.types);
if (missingTypeImports.length > 0 || unusedTypeExports.length > 0) {
  console.error('services/standaloneApi type exports must match app type imports exactly.');
  if (missingTypeImports.length > 0) {
    console.error(`Missing type exports: ${formatNames(missingTypeImports)}`);
  }
  if (unusedTypeExports.length > 0) {
    console.error(`Unused type exports: ${formatNames(unusedTypeExports)}`);
  }
  process.exit(1);
}

const shimFiles = [
  path.join(uiRoot, 'services/api.ts'),
  path.join(uiRoot, 'services/api.js'),
];

for (const shimFile of shimFiles) {
  const source = fs.readFileSync(shimFile, 'utf8').trim();
  if (!/export\s+\*\s+from\s+['"]\.\/standaloneApi['"];?$/.test(source)) {
    console.error(`${path.relative(root, shimFile)} must remain a shim to services/standaloneApi.`);
    process.exit(1);
  }
}

const compatShimFiles = [
  path.join(uiRoot, 'services/compatApi.ts'),
  path.join(uiRoot, 'services/compatApi.js'),
];

for (const shimFile of compatShimFiles) {
  const source = fs.readFileSync(shimFile, 'utf8').trim();
  if (!/export\s+\*\s+from\s+['"]\.\/legacyApi['"];?$/.test(source)) {
    console.error(`${path.relative(root, shimFile)} must remain a shim to services/legacyApi.`);
    process.exit(1);
  }
}

const iamCompatFiles = [
  path.join(uiRoot, 'services/iamCompatApi.ts'),
  path.join(uiRoot, 'services/iamCompatApi.js'),
];

for (const iamCompatFile of iamCompatFiles) {
  const source = fs.readFileSync(iamCompatFile, 'utf8');
  if (!/from\s+['"]\.\/iamApiRuntime['"]/.test(source)) {
    console.error(`${path.relative(root, iamCompatFile)} must source idpApi from services/iamApiRuntime.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/iamClientState['"]/.test(source)) {
    console.error(`${path.relative(root, iamCompatFile)} must source browser state helpers from services/iamClientState.`);
    process.exit(1);
  }
}

const iamCompatTypeFile = path.join(uiRoot, 'services/iamCompatApi.ts');
const iamCompatTypeSource = fs.readFileSync(iamCompatTypeFile, 'utf8');
if (/export\s+type\s+\{/.test(iamCompatTypeSource)) {
  console.error(`${path.relative(root, iamCompatTypeFile)} must not re-export the standalone IAM type surface.`);
  process.exit(1);
}

const legacyFiles = [
  path.join(uiRoot, 'services/legacyApi.ts'),
  path.join(uiRoot, 'services/legacyApi.js'),
];

for (const legacyFile of legacyFiles) {
  const source = fs.readFileSync(legacyFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
  if (legacyFile.endsWith('.ts') && !/from\s+['"]\.\/legacyApiTypes['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must source its exported compatibility types from services/legacyApiTypes.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyOperationsApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted operations surface from services/legacyOperationsApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyAccessApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted access surface from services/legacyAccessApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyAdminApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted admin surface from services/legacyAdminApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyAdapterApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted adapter surface from services/legacyAdapterApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyCrmApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted CRM surface from services/legacyCrmApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyCommerceApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted commerce surface from services/legacyCommerceApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyCmsApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted CMS surface from services/legacyCmsApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyCommunicationsApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted communications surface from services/legacyCommunicationsApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyCutoverApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted cutover surface from services/legacyCutoverApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyProjectApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted project surface from services/legacyProjectApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacySchedulingApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted scheduling surface from services/legacySchedulingApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyWorkforceApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted workforce surface from services/legacyWorkforceApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyDeliveryApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted delivery surface from services/legacyDeliveryApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyIamApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted IAM surface from services/legacyIamApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyLearningApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted learning surface from services/legacyLearningApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyLmsApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyFile)} must compose the extracted LMS surface from services/legacyLmsApi.`);
    process.exit(1);
  }
}

const legacyAccessApiFiles = [
  path.join(uiRoot, 'services/legacyAccessApi.ts'),
  path.join(uiRoot, 'services/legacyAccessApi.js'),
];

for (const legacyAccessApiFile of legacyAccessApiFiles) {
  const source = fs.readFileSync(legacyAccessApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyAccessApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyAdminApiFiles = [
  path.join(uiRoot, 'services/legacyAdminApi.ts'),
  path.join(uiRoot, 'services/legacyAdminApi.js'),
];

for (const legacyAdminApiFile of legacyAdminApiFiles) {
  const source = fs.readFileSync(legacyAdminApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyAdminApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyAdminTypesFile = path.join(uiRoot, 'services/legacyAdminApi.ts');
const legacyAdminTypesSource = fs.readFileSync(legacyAdminTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyAdminTypes['"]/.test(legacyAdminTypesSource)) {
  console.error(`${path.relative(root, legacyAdminTypesFile)} must source its admin type surface from services/legacyAdminTypes.`);
  process.exit(1);
}

const legacyAdapterApiFiles = [
  path.join(uiRoot, 'services/legacyAdapterApi.ts'),
  path.join(uiRoot, 'services/legacyAdapterApi.js'),
];

for (const legacyAdapterApiFile of legacyAdapterApiFiles) {
  const source = fs.readFileSync(legacyAdapterApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyAdapterApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyAdapterTypesFile = path.join(uiRoot, 'services/legacyAdapterApi.ts');
const legacyAdapterTypesSource = fs.readFileSync(legacyAdapterTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyAdapterTypes['"]/.test(legacyAdapterTypesSource)) {
  console.error(`${path.relative(root, legacyAdapterTypesFile)} must source its adapter type surface from services/legacyAdapterTypes.`);
  process.exit(1);
}

const legacyCrmApiFiles = [
  path.join(uiRoot, 'services/legacyCrmApi.ts'),
  path.join(uiRoot, 'services/legacyCrmApi.js'),
];

for (const legacyCrmApiFile of legacyCrmApiFiles) {
  const source = fs.readFileSync(legacyCrmApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyCrmApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyCrmTypesFile = path.join(uiRoot, 'services/legacyCrmApi.ts');
const legacyCrmTypesSource = fs.readFileSync(legacyCrmTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyCrmTypes['"]/.test(legacyCrmTypesSource)) {
  console.error(`${path.relative(root, legacyCrmTypesFile)} must source its CRM type surface from services/legacyCrmTypes.`);
  process.exit(1);
}

const legacyCommerceApiFiles = [
  path.join(uiRoot, 'services/legacyCommerceApi.ts'),
  path.join(uiRoot, 'services/legacyCommerceApi.js'),
];

for (const legacyCommerceApiFile of legacyCommerceApiFiles) {
  const source = fs.readFileSync(legacyCommerceApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyCommerceApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyCommerceTypesFile = path.join(uiRoot, 'services/legacyCommerceApi.ts');
const legacyCommerceTypesSource = fs.readFileSync(legacyCommerceTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyCommerceTypes['"]/.test(legacyCommerceTypesSource)) {
  console.error(`${path.relative(root, legacyCommerceTypesFile)} must source its commerce type surface from services/legacyCommerceTypes.`);
  process.exit(1);
}

const legacyCmsApiFiles = [
  path.join(uiRoot, 'services/legacyCmsApi.ts'),
  path.join(uiRoot, 'services/legacyCmsApi.js'),
];

for (const legacyCmsApiFile of legacyCmsApiFiles) {
  const source = fs.readFileSync(legacyCmsApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyCmsApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyCommunicationsApiFiles = [
  path.join(uiRoot, 'services/legacyCommunicationsApi.ts'),
  path.join(uiRoot, 'services/legacyCommunicationsApi.js'),
];

for (const legacyCommunicationsApiFile of legacyCommunicationsApiFiles) {
  const source = fs.readFileSync(legacyCommunicationsApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyCommunicationsApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyCommunicationsTypesFile = path.join(uiRoot, 'services/legacyCommunicationsApi.ts');
const legacyCommunicationsTypesSource = fs.readFileSync(legacyCommunicationsTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyCommunicationsTypes['"]/.test(legacyCommunicationsTypesSource)) {
  console.error(`${path.relative(root, legacyCommunicationsTypesFile)} must source its communications type surface from services/legacyCommunicationsTypes.`);
  process.exit(1);
}

const legacyCutoverApiFiles = [
  path.join(uiRoot, 'services/legacyCutoverApi.ts'),
  path.join(uiRoot, 'services/legacyCutoverApi.js'),
];

for (const legacyCutoverApiFile of legacyCutoverApiFiles) {
  const source = fs.readFileSync(legacyCutoverApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyCutoverApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyCutoverTypesFile = path.join(uiRoot, 'services/legacyCutoverApi.ts');
const legacyCutoverTypesSource = fs.readFileSync(legacyCutoverTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyCutoverTypes['"]/.test(legacyCutoverTypesSource)) {
  console.error(`${path.relative(root, legacyCutoverTypesFile)} must source its cutover type surface from services/legacyCutoverTypes.`);
  process.exit(1);
}

const legacyProjectApiFiles = [
  path.join(uiRoot, 'services/legacyProjectApi.ts'),
  path.join(uiRoot, 'services/legacyProjectApi.js'),
];

for (const legacyProjectApiFile of legacyProjectApiFiles) {
  const source = fs.readFileSync(legacyProjectApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyProjectApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyProjectTypesFile = path.join(uiRoot, 'services/legacyProjectApi.ts');
const legacyProjectTypesSource = fs.readFileSync(legacyProjectTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyProjectTypes['"]/.test(legacyProjectTypesSource)) {
  console.error(`${path.relative(root, legacyProjectTypesFile)} must source its project type surface from services/legacyProjectTypes.`);
  process.exit(1);
}

const legacySchedulingApiFiles = [
  path.join(uiRoot, 'services/legacySchedulingApi.ts'),
  path.join(uiRoot, 'services/legacySchedulingApi.js'),
];

for (const legacySchedulingApiFile of legacySchedulingApiFiles) {
  const source = fs.readFileSync(legacySchedulingApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacySchedulingApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacySchedulingTypesFile = path.join(uiRoot, 'services/legacySchedulingApi.ts');
const legacySchedulingTypesSource = fs.readFileSync(legacySchedulingTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacySchedulingTypes['"]/.test(legacySchedulingTypesSource)) {
  console.error(`${path.relative(root, legacySchedulingTypesFile)} must source its scheduling type surface from services/legacySchedulingTypes.`);
  process.exit(1);
}

const legacyWorkforceApiFiles = [
  path.join(uiRoot, 'services/legacyWorkforceApi.ts'),
  path.join(uiRoot, 'services/legacyWorkforceApi.js'),
];

for (const legacyWorkforceApiFile of legacyWorkforceApiFiles) {
  const source = fs.readFileSync(legacyWorkforceApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyWorkforceApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyWorkforceTypesFile = path.join(uiRoot, 'services/legacyWorkforceApi.ts');
const legacyWorkforceTypesSource = fs.readFileSync(legacyWorkforceTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyWorkforceTypes['"]/.test(legacyWorkforceTypesSource)) {
  console.error(`${path.relative(root, legacyWorkforceTypesFile)} must source its workforce type surface from services/legacyWorkforceTypes.`);
  process.exit(1);
}

const legacyDeliveryApiFiles = [
  path.join(uiRoot, 'services/legacyDeliveryApi.ts'),
  path.join(uiRoot, 'services/legacyDeliveryApi.js'),
];

for (const legacyDeliveryApiFile of legacyDeliveryApiFiles) {
  const source = fs.readFileSync(legacyDeliveryApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyDeliveryApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyDeliveryTypesFile = path.join(uiRoot, 'services/legacyDeliveryApi.ts');
const legacyDeliveryTypesSource = fs.readFileSync(legacyDeliveryTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyDeliveryTypes['"]/.test(legacyDeliveryTypesSource)) {
  console.error(`${path.relative(root, legacyDeliveryTypesFile)} must source its delivery type surface from services/legacyDeliveryTypes.`);
  process.exit(1);
}

const legacyIamApiFiles = [
  path.join(uiRoot, 'services/legacyIamApi.ts'),
  path.join(uiRoot, 'services/legacyIamApi.js'),
];

for (const legacyIamApiFile of legacyIamApiFiles) {
  const source = fs.readFileSync(legacyIamApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyIamPublicApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamApiFile)} must compose the extracted IAM public surface from services/legacyIamPublicApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyIamManagementApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamApiFile)} must compose the extracted IAM management surface from services/legacyIamManagementApi.`);
    process.exit(1);
  }
  if (!/from\s+['"]\.\/legacyIamFederationApi['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamApiFile)} must compose the extracted IAM federation surface from services/legacyIamFederationApi.`);
    process.exit(1);
  }
}

const legacyIamFederationApiFiles = [
  path.join(uiRoot, 'services/legacyIamFederationApi.ts'),
  path.join(uiRoot, 'services/legacyIamFederationApi.js'),
];

for (const legacyIamFederationApiFile of legacyIamFederationApiFiles) {
  const source = fs.readFileSync(legacyIamFederationApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamFederationApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyIamPublicApiFiles = [
  path.join(uiRoot, 'services/legacyIamPublicApi.ts'),
  path.join(uiRoot, 'services/legacyIamPublicApi.js'),
];

for (const legacyIamPublicApiFile of legacyIamPublicApiFiles) {
  const source = fs.readFileSync(legacyIamPublicApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamPublicApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyIamManagementApiFiles = [
  path.join(uiRoot, 'services/legacyIamManagementApi.ts'),
  path.join(uiRoot, 'services/legacyIamManagementApi.js'),
];

for (const legacyIamManagementApiFile of legacyIamManagementApiFiles) {
  const source = fs.readFileSync(legacyIamManagementApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyIamManagementApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyLearningApiFiles = [
  path.join(uiRoot, 'services/legacyLearningApi.ts'),
  path.join(uiRoot, 'services/legacyLearningApi.js'),
];

for (const legacyLearningApiFile of legacyLearningApiFiles) {
  const source = fs.readFileSync(legacyLearningApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyLearningApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyLearningTypesFile = path.join(uiRoot, 'services/legacyLearningApi.ts');
const legacyLearningTypesSource = fs.readFileSync(legacyLearningTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyLearningTypes['"]/.test(legacyLearningTypesSource)) {
  console.error(`${path.relative(root, legacyLearningTypesFile)} must source its learning type surface from services/legacyLearningTypes.`);
  process.exit(1);
}

const legacyLmsApiFiles = [
  path.join(uiRoot, 'services/legacyLmsApi.ts'),
  path.join(uiRoot, 'services/legacyLmsApi.js'),
];

for (const legacyLmsApiFile of legacyLmsApiFiles) {
  const source = fs.readFileSync(legacyLmsApiFile, 'utf8');
  if (!/from\s+['"]\.\/iamHttpClient['"]/.test(source)) {
    console.error(`${path.relative(root, legacyLmsApiFile)} must source transport clients from services/iamHttpClient.`);
    process.exit(1);
  }
}

const legacyLmsTypesFile = path.join(uiRoot, 'services/legacyLmsApi.ts');
const legacyLmsTypesSource = fs.readFileSync(legacyLmsTypesFile, 'utf8');
if (!/from\s+['"]\.\/legacyLmsTypes['"]/.test(legacyLmsTypesSource)) {
  console.error(`${path.relative(root, legacyLmsTypesFile)} must source its LMS type surface from services/legacyLmsTypes.`);
  process.exit(1);
}

const legacyOperationsApiFile = path.join(uiRoot, 'services/legacyOperationsApi.ts');
const legacyOperationsApiSource = fs.readFileSync(legacyOperationsApiFile, 'utf8');
if (!/from\s+['"]\.\/legacyOperationsTypes['"]/.test(legacyOperationsApiSource)) {
  console.error(`${path.relative(root, legacyOperationsApiFile)} must source its operations type surface from services/legacyOperationsTypes.`);
  process.exit(1);
}
NODE

echo "Checking local import closure in standalone source..."
ROOT_DIR="${ROOT_DIR}" node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.env.ROOT_DIR;
const roots = [
  path.join(root, 'apps/api-server/src/platform'),
  path.join(root, 'apps/enterprise-ui/src'),
];

const files = [];
for (const start of roots) {
  if (!fs.existsSync(start)) continue;
  const stack = [start];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(target);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(target);
    }
  }
}

function resolveLocal(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.css`,
    `${base}.scss`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.jsx'),
    path.join(base, 'index.css'),
    path.join(base, 'index.scss'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

const missing = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = source.matchAll(/import\s+(?:[^'";]+\s+from\s+)?['"]([^'"]+)['"]/g);
  for (const match of imports) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    if (!resolveLocal(file, spec)) {
      missing.push(`${file} -> ${spec}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`Missing local imports detected: ${missing.length}`);
  for (const line of missing) {
    console.error(line);
  }
  process.exit(1);
}
NODE

echo "IDP standalone baseline verification passed."
