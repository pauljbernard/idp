#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const maintainedDocs = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/README.md',
  'docs/AGENT_USAGE_GUIDE.md',
  'docs/foundation/constitution.md',
  'docs/foundation/index.md',
  'docs/specs/index.md',
  'docs/specs/platform-requirements.md',
  'docs/implementation/index.md',
  'docs/reference/index.md',
  'docs/reference/readme.md',
  'docs/reference/platform-manifest.md',
  'docs/reference/maturity-model.md',
  'docs/analysis/index.md',
  '.claude/README.md',
  '.claude/agent_instructions.md',
  '.claude/project_context.md',
];

const maintainedSpecs = [
  'docs/specs/platform-requirements.md',
  'docs/specs/authentication/oauth-flows.md',
  'docs/specs/operations/deployment-modes.md',
  'docs/specs/ui/design-system.md',
  'docs/specs/ui/component-specs.md',
  'docs/specs/ui/interaction-patterns.md',
  'docs/specs/ui/information-architecture.md',
  'docs/specs/ui/design-tokens.md',
];

const requiredFrontmatterKeys = [
  'id',
  'type',
  'domain',
  'status',
  'version',
  'dependencies',
  'last_updated',
];

const requiredSpecClaimKeys = [
  'support_tier',
  'maturity_state',
  'supported_profiles',
  'evidence_class',
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function extractFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  return match ? match[1] : null;
}

function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, '');
}

function validateFrontmatter(relativePath) {
  const text = read(relativePath);
  const frontmatter = extractFrontmatter(text);

  if (!frontmatter) {
    fail(`Missing frontmatter: ${relativePath}`);
    return;
  }

  for (const key of requiredFrontmatterKeys) {
    if (!new RegExp(`^${key}:`, 'm').test(frontmatter)) {
      fail(`Missing frontmatter key "${key}" in ${relativePath}`);
    }
  }

  if (maintainedSpecs.includes(relativePath)) {
    for (const key of requiredSpecClaimKeys) {
      if (!new RegExp(`^${key}:`, 'm').test(frontmatter)) {
        fail(`Missing specification claim key "${key}" in ${relativePath}`);
      }
    }
  }
}

function validateLinks(relativePath) {
  const text = stripFences(read(relativePath));
  const linkPattern = /\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g;
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    const target = match[1].trim();
    if (!target || /^(https?:|mailto:)/.test(target)) {
      continue;
    }

    const resolved = path.normalize(path.join(path.dirname(relativePath), target));
    const absolute = path.join(repoRoot, resolved);
    if (!fs.existsSync(absolute)) {
      fail(`Broken local link in ${relativePath}: ${target}`);
    }
  }
}

function validateDependencyMap() {
  const dependencyMapPath = path.join(repoRoot, 'docs/dependency-map.json');
  if (!fs.existsSync(dependencyMapPath)) {
    fail('Missing docs/dependency-map.json');
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(dependencyMapPath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in docs/dependency-map.json: ${error.message}`);
    return;
  }

  if (!parsed.documents || typeof parsed.documents !== 'object') {
    fail('docs/dependency-map.json must contain a "documents" object');
    return;
  }

  for (const [documentId, documentInfo] of Object.entries(parsed.documents)) {
    if (!documentInfo.path) {
      fail(`Dependency map entry missing path: ${documentId}`);
      continue;
    }

    const absolute = path.join(repoRoot, 'docs', documentInfo.path);
    if (!fs.existsSync(absolute)) {
      fail(`Dependency map path does not exist for ${documentId}: docs/${documentInfo.path}`);
    }
  }
}

function validateJsonFile(relativePath, requiredPaths = []) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing JSON config: ${relativePath}`);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
    return;
  }

  for (const targetPath of requiredPaths) {
    if (typeof targetPath !== 'string' || !targetPath) {
      continue;
    }

    const referencedPath = path.join(repoRoot, targetPath);
    if (!fs.existsSync(referencedPath)) {
      fail(`Broken config reference in ${relativePath}: ${targetPath}`);
    }
  }

  return parsed;
}

function main() {
  for (const relativePath of maintainedDocs) {
    if (!fs.existsSync(path.join(repoRoot, relativePath))) {
      fail(`Missing maintained doc: ${relativePath}`);
      continue;
    }

    validateFrontmatter(relativePath);
    validateLinks(relativePath);
  }

  validateDependencyMap();

  const documentationMap = validateJsonFile('.claude/documentation_map.json', [
    'docs/AGENT_USAGE_GUIDE.md',
    'CLAUDE.md',
    'AGENTS.md',
    'docs/README.md',
    'docs/dependency-map.json',
    'docs/foundation/constitution.md',
    'docs/foundation/architecture.md',
    'docs/specs/platform-requirements.md',
    'docs/reference/maturity-model.md',
    'docs/reference/headless-iam-status-matrix.md',
    'docs/reference/headless-iam-requirements-gap-matrix.md',
    'docs/implementation/planning/headless-iam-standalone-validation-review-guide.md',
  ]);

  const agentConfig = validateJsonFile('.claude/agent_config.json', [
    'CLAUDE.md',
    'docs/AGENT_USAGE_GUIDE.md',
    'docs/foundation/constitution.md',
    'docs/foundation/architecture.md',
    'docs/specs/platform-requirements.md',
    'docs/reference/maturity-model.md',
    'docs/reference/headless-iam-status-matrix.md',
    'docs/reference/headless-iam-requirements-gap-matrix.md',
    'docs/implementation/planning/headless-iam-standalone-validation-review-guide.md',
    'docs/specs/authentication/oauth-flows.md',
    'docs/specs/operations/deployment-modes.md',
    'docs/specs/ui/design-system.md',
  ]);

  if (documentationMap && !Array.isArray(documentationMap.spec_claim_fields)) {
    fail('.claude/documentation_map.json must declare spec_claim_fields');
  }

  if (
    agentConfig &&
    (!agentConfig.claim_model || !Array.isArray(agentConfig.claim_model.required_spec_fields))
  ) {
    fail('.claude/agent_config.json must declare claim_model.required_spec_fields');
  }

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }

  console.log(
    JSON.stringify(
      {
        status: 'pass',
        maintained_docs_validated: maintainedDocs.length,
        maintained_specs_validated: maintainedSpecs.length,
        claude_configs_validated: true,
        dependency_map_validated: true,
      },
      null,
      2,
    ),
  );
}

main();
