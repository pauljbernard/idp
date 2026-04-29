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

function resolveDependencyMapReference(dependencyMap, reference) {
  if (typeof reference !== 'string' || !reference) {
    return null;
  }

  if (reference.startsWith('docs/')) {
    return reference;
  }

  if (reference.endsWith('.md') || reference.endsWith('.json')) {
    return path.join('docs', reference);
  }

  const entry = dependencyMap.documents && dependencyMap.documents[reference];
  if (!entry || typeof entry.path !== 'string') {
    return null;
  }

  return path.join('docs', entry.path);
}

function validateCapabilityRegistry() {
  const registry = validateJsonFile('docs/capability-registry.json');
  if (!registry) {
    return;
  }

  if (!Array.isArray(registry.required_fields) || registry.required_fields.length === 0) {
    fail('docs/capability-registry.json must declare required_fields');
  }

  if (!Array.isArray(registry.capabilities) || registry.capabilities.length === 0) {
    fail('docs/capability-registry.json must contain a non-empty capabilities array');
    return;
  }

  const seenIds = new Set();

  for (const capability of registry.capabilities) {
    if (!capability || typeof capability !== 'object') {
      fail('docs/capability-registry.json contains a non-object capability entry');
      continue;
    }

    for (const field of registry.required_fields) {
      if (!(field in capability)) {
        fail(`Capability registry entry missing "${field}": ${capability.id || '<unknown>'}`);
      }
    }

    if (typeof capability.id !== 'string' || capability.id.length === 0) {
      fail('Capability registry entry has invalid id');
    } else if (seenIds.has(capability.id)) {
      fail(`Capability registry has duplicate id: ${capability.id}`);
    } else {
      seenIds.add(capability.id);
    }

    if (!Array.isArray(capability.supported_profiles) || capability.supported_profiles.length === 0) {
      fail(`Capability registry entry must declare supported_profiles: ${capability.id}`);
    }

    if (
      !Array.isArray(capability.governing_specifications) ||
      capability.governing_specifications.length === 0
    ) {
      fail(`Capability registry entry must declare governing_specifications: ${capability.id}`);
    } else {
      for (const targetPath of capability.governing_specifications) {
        if (!maintainedSpecs.includes(targetPath)) {
          fail(
            `Capability registry governing specification must be a maintained spec for ${capability.id}: ${targetPath}`,
          );
        }
        if (!fs.existsSync(path.join(repoRoot, targetPath))) {
          fail(`Capability registry references missing governing specification for ${capability.id}: ${targetPath}`);
        }
      }
    }

    if (
      !Array.isArray(capability.current_state_references) ||
      capability.current_state_references.length === 0
    ) {
      fail(`Capability registry entry must declare current_state_references: ${capability.id}`);
    } else {
      for (const targetPath of capability.current_state_references) {
        if (!fs.existsSync(path.join(repoRoot, targetPath))) {
          fail(`Capability registry references missing current-state document for ${capability.id}: ${targetPath}`);
        }
      }
    }

    if (
      typeof capability.adoption_gate_reference !== 'string' ||
      capability.adoption_gate_reference.length === 0
    ) {
      fail(`Capability registry entry must declare adoption_gate_reference: ${capability.id}`);
    } else if (!fs.existsSync(path.join(repoRoot, capability.adoption_gate_reference))) {
      fail(
        `Capability registry references missing adoption gate for ${capability.id}: ${capability.adoption_gate_reference}`,
      );
    }
  }
}

function validateAgentBootstrap() {
  const bootstrap = validateJsonFile('docs/agent-bootstrap.json', [
    'docs/dependency-map.json',
    'docs/capability-registry.json',
  ]);

  if (!bootstrap) {
    return;
  }

  const dependencyMap = validateJsonFile('docs/dependency-map.json');
  if (!dependencyMap || !dependencyMap.documents || typeof dependencyMap.documents !== 'object') {
    fail('docs/agent-bootstrap.json requires a valid docs/dependency-map.json resolver');
    return;
  }

  if (!Array.isArray(bootstrap.read_order) || bootstrap.read_order.length === 0) {
    fail('docs/agent-bootstrap.json must declare a non-empty read_order');
  }

  if (!Array.isArray(bootstrap.required_spec_fields) || bootstrap.required_spec_fields.length === 0) {
    fail('docs/agent-bootstrap.json must declare required_spec_fields');
  }

  if (!bootstrap.routes || typeof bootstrap.routes !== 'object') {
    fail('docs/agent-bootstrap.json must declare routes');
    return;
  }

  for (const reference of bootstrap.read_order) {
    const resolved = resolveDependencyMapReference(dependencyMap, reference);
    if (!resolved || !fs.existsSync(path.join(repoRoot, resolved))) {
      fail(`docs/agent-bootstrap.json references missing read-order target: ${reference}`);
    }
  }

  for (const [routeName, routeRefs] of Object.entries(bootstrap.routes)) {
    if (!Array.isArray(routeRefs) || routeRefs.length === 0) {
      fail(`docs/agent-bootstrap.json route must be a non-empty array: ${routeName}`);
      continue;
    }

    for (const reference of routeRefs) {
      const resolved = resolveDependencyMapReference(dependencyMap, reference);
      if (!resolved || !fs.existsSync(path.join(repoRoot, resolved))) {
        fail(`docs/agent-bootstrap.json references missing route target for ${routeName}: ${reference}`);
      }
    }
  }

  for (const reference of bootstrap.refs || []) {
    const resolved = resolveDependencyMapReference(dependencyMap, reference);
    if (!resolved || !fs.existsSync(path.join(repoRoot, resolved))) {
      fail(`docs/agent-bootstrap.json references missing canonical ref: ${reference}`);
    }
  }
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
  validateAgentBootstrap();
  validateCapabilityRegistry();

  const documentationMap = validateJsonFile('.claude/documentation_map.json', [
    'docs/agent-bootstrap.json',
    'docs/AGENT_USAGE_GUIDE.md',
    'CLAUDE.md',
    'AGENTS.md',
    'docs/README.md',
    'docs/capability-registry.json',
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
    'docs/agent-bootstrap.json',
    'docs/AGENT_USAGE_GUIDE.md',
    'docs/capability-registry.json',
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
    documentationMap &&
    (!Array.isArray(documentationMap.machine_readable_claim_sources) ||
      !documentationMap.machine_readable_claim_sources.includes('docs/agent-bootstrap.json') ||
      !documentationMap.machine_readable_claim_sources.includes('docs/capability-registry.json'))
  ) {
    fail('.claude/documentation_map.json must declare docs/agent-bootstrap.json and docs/capability-registry.json as machine-readable claim sources');
  }

  if (
    agentConfig &&
    (!agentConfig.claim_model || !Array.isArray(agentConfig.claim_model.required_spec_fields))
  ) {
    fail('.claude/agent_config.json must declare claim_model.required_spec_fields');
  }

  if (
    agentConfig &&
    (!agentConfig.claim_model ||
      agentConfig.claim_model.machine_readable_registry !== 'docs/capability-registry.json')
  ) {
    fail('.claude/agent_config.json must declare claim_model.machine_readable_registry');
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
        capability_registry_validated: true,
      },
      null,
      2,
    ),
  );
}

main();
