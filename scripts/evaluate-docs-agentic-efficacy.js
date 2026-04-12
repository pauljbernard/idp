#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function resolveDependencyReference(dependencyMap, reference) {
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
  return entry ? path.join('docs', entry.path) : null;
}

function estimateTokens(value) {
  return Math.ceil(String(value).length / 4);
}

function result(name, passed, points, detail, severity = 'blocking') {
  return { name, passed, points, detail, severity };
}

function main() {
  const bootstrap = readJson('docs/agent-bootstrap.json');
  const registry = readJson('docs/capability-registry.json');
  const documentationMap = readJson('.claude/documentation_map.json');
  const agentConfig = readJson('.claude/agent_config.json');
  const dependencyMap = readJson('docs/dependency-map.json');
  const agentsMd = readText('AGENTS.md');
  const claudeMd = readText('CLAUDE.md');
  const guideMd = readText('docs/AGENT_USAGE_GUIDE.md');

  const checks = [];

  checks.push(
    result(
      'bootstrap_read_order_complete',
      Array.isArray(bootstrap.read_order) &&
        bootstrap.read_order.length >= 6 &&
        bootstrap.read_order.includes('agent-usage-guide') &&
        bootstrap.read_order.includes('platform-constitution') &&
        bootstrap.read_order.includes('platform-requirements') &&
        bootstrap.read_order.includes('capability-registry'),
      15,
      `read_order_count=${Array.isArray(bootstrap.read_order) ? bootstrap.read_order.length : 0}`,
    ),
  );

  const requiredRoutes = [
    'platform',
    'support_or_readiness',
    'implementation_sequencing',
    'authentication',
    'operations',
    'ui',
    'security',
    'federation',
  ];
  const presentRoutes = Object.keys(bootstrap.routes || {});
  checks.push(
    result(
      'task_route_coverage',
      requiredRoutes.every((routeName) => presentRoutes.includes(routeName)),
      15,
      `present_routes=${presentRoutes.join(',')}`,
    ),
  );

  const capabilityEntries = Array.isArray(registry.capabilities) ? registry.capabilities : [];
  const capabilityCoveragePassed =
    capabilityEntries.length >= 8 &&
    capabilityEntries.every((entry) => {
      return (
        Array.isArray(entry.governing_specifications) &&
        entry.governing_specifications.length > 0 &&
        Array.isArray(entry.current_state_references) &&
        entry.current_state_references.length > 0 &&
        typeof entry.adoption_gate_reference === 'string' &&
        entry.adoption_gate_reference.length > 0
      );
    });
  checks.push(
    result(
      'capability_answerability',
      capabilityCoveragePassed,
      20,
      `capability_count=${capabilityEntries.length}`,
    ),
  );

  const stateEvidencePassed = capabilityEntries.every((entry) => {
    return (
      entry.current_state_references.includes('docs/reference/headless-iam-status-matrix.md') ||
      entry.current_state_references.some((target) => /support-matrix\.md$/.test(target))
    );
  });
  checks.push(
    result(
      'current_state_evidence_coverage',
      stateEvidencePassed,
      10,
      'each capability must route to current-state support evidence',
    ),
  );

  const dependencyDocs = dependencyMap.documents || {};
  checks.push(
    result(
      'dependency_map_foundation',
      Object.prototype.hasOwnProperty.call(dependencyDocs, 'platform-constitution') &&
        Object.prototype.hasOwnProperty.call(dependencyDocs, 'platform-requirements') &&
        Object.prototype.hasOwnProperty.call(dependencyDocs, 'maturity-model') &&
        Object.prototype.hasOwnProperty.call(dependencyDocs, 'headless-iam-status-matrix'),
      10,
      `dependency_document_count=${Object.keys(dependencyDocs).length}`,
    ),
  );

  const requiredSpecFields =
    Array.isArray(bootstrap.required_spec_fields)
      ? bootstrap.required_spec_fields
      : [];
  const claimModelAligned =
    JSON.stringify(requiredSpecFields) ===
      JSON.stringify(documentationMap.spec_claim_fields || []) &&
    JSON.stringify(requiredSpecFields) ===
      JSON.stringify((agentConfig.claim_model || {}).required_spec_fields || []);
  checks.push(
    result(
      'claim_model_alignment',
      claimModelAligned,
      10,
      `required_spec_fields=${requiredSpecFields.join(',')}`,
    ),
  );

  const compactBootstrapTokens = estimateTokens(JSON.stringify(bootstrap));
  checks.push(
    result(
      'compact_bootstrap_efficiency',
      compactBootstrapTokens <= 350,
      10,
      `estimated_tokens=${compactBootstrapTokens}`,
      'warning',
    ),
  );

  const adapterThinnessPassed =
    estimateTokens(agentsMd) <= 450 &&
    estimateTokens(claudeMd) <= 450 &&
    guideMd.includes('[agent-bootstrap.json](agent-bootstrap.json)');
  checks.push(
    result(
      'adapter_thinness',
      adapterThinnessPassed,
      10,
      `AGENTS_tokens=${estimateTokens(agentsMd)},CLAUDE_tokens=${estimateTokens(claudeMd)}`,
    ),
  );

  const routeTargetsExist = presentRoutes.every((routeName) =>
    (bootstrap.routes[routeName] || []).every((reference) => {
      const targetPath = resolveDependencyReference(dependencyMap, reference);
      return Boolean(targetPath && fileExists(targetPath));
    }),
  );
  checks.push(
    result(
      'route_target_integrity',
      routeTargetsExist,
      10,
      'all routed documents must exist',
    ),
  );

  const totalPoints = checks.reduce((sum, check) => sum + check.points, 0);
  const earnedPoints = checks.reduce((sum, check) => sum + (check.passed ? check.points : 0), 0);
  const score = Math.round((earnedPoints / totalPoints) * 100);
  const failedChecks = checks.filter((check) => !check.passed);
  const blockingFailures = failedChecks.filter((check) => check.severity !== 'warning');
  const warningFailures = failedChecks.filter((check) => check.severity === 'warning');

  const payload = {
    status: blockingFailures.length === 0 ? 'pass' : 'fail',
    score,
    efficacy_rating:
      score >= 90
        ? 'high'
        : score >= 75
          ? 'moderate'
          : 'low',
    checks,
    warning_count: warningFailures.length,
    recommendation:
      blockingFailures.length === 0
        ? 'Documentation bootstrap and requirement routing are strong enough to support high-efficacy agentic development. Address warnings to further reduce context cost.'
        : 'Address blocking failed checks before treating the documentation system as a high-confidence executable requirements surface.',
  };

  if (blockingFailures.length > 0) {
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(payload, null, 2));
}

main();
