#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/spec/constitution.idp.md',
  'docs/spec/requirements.idp.md',
  'docs/spec/plans/Headless_IAM_Gap_Remediation_Plan.md',
  'docs/spec/plans/Headless_IAM_Standalone_Validation_Review_Guide.md',
  'docs/spec/plans/Crew_IDP_Authorization_Replacement_Plan.md',
  'contracts/sdk-iam/contract-manifest.json',
  'scripts/verify-sdk-iam-contract.js',
  'scripts/verify-idp-standalone-baseline.sh',
];

const contentChecks = [
  {
    file: 'docs/spec/constitution.idp.md',
    required: [
      'tenant-aware principal context including active tenant or organization selection',
      'application-binding registries',
      'authorization-profile engines',
      'service-account application projection',
      'external policy-input composition',
      'consumer SDKs, conformance harnesses, and contract validators',
      'tenant- or realm-scoped login and registration template resolution',
      'self-service registration, invite-only registration, approval-required registration',
    ],
  },
  {
    file: 'docs/spec/requirements.idp.md',
    required: [
      'tenant-aware principal context including active tenant or organization selection in sessions and tokens',
      'application-facing capability registries and evaluation behavior for arbitrary downstream namespaces such as `cap.*`',
      'application binding registries, authorization-profile definitions, claim-match rules',
      'capability-binding rules, surface catalogs, coarse-role projection templates, compatibility `/me` templates',
      'tenant- or realm-scoped login and registration experience selection',
      'registration schema and registration-policy controls',
      'direct-projection, lazy-sync, background-sync, and provisioning-adapter settings',
    ],
  },
  {
    file: 'docs/spec/plans/Headless_IAM_Gap_Remediation_Plan.md',
    required: [
      '## Execution Tracking Rules',
      '- current phase',
      '- active workstream',
      '- active iteration',
      '- iteration completion percentage',
      '## Current Execution Status',
      '| Current phase |',
      '| Active workstream |',
      '| Active iteration |',
      '| Iteration completion |',
      '| Phase completion |',
      '### Phase status board',
      '| `Phase 0` |',
      '| `Phase 1` |',
      '| `Phase 2` |',
      '| `Phase 3` |',
      '| `Phase 4` |',
      '| `Phase 5` |',
      '| `Phase 6` |',
      '### Next execution sequence',
    ],
  },
  {
    file: 'docs/spec/plans/Crew_IDP_Authorization_Replacement_Plan.md',
    required: [
      'The target is a generic, reusable application-authorization platform',
      'Application binding registry',
      'Authorization profile engine',
      'Tenant-aware principal context and membership strategies',
      'Application capability and permission catalogs',
      'Accessible surface projection',
      'Versioned principal projection contracts',
      'Service-account application projection',
      'External policy-input composition',
      'Provisioning and synchronization strategy framework',
      'Consumer SDKs and conformance validators',
    ],
  },
  {
    file: 'docs/spec/plans/Headless_IAM_Standalone_Validation_Review_Guide.md',
    required: [
      '## Required Validation Tracks',
      '### 1. Authentication and Session Control',
      '### 2. Administrative Security Operations',
      '### 3. Request-Level Audit Review',
      '### 4. Realm Isolation',
      '## Minimum Exit Criteria Before Any Integration Review',
    ],
  },
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function requireFiles() {
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      fail(`Missing required governance artifact: ${relativePath}`);
    }
  }
}

function requirePackageScripts() {
  const pkg = JSON.parse(readText('package.json'));
  const scripts = pkg.scripts || {};
  const requiredScriptNames = [
    'verify:sdk:iam-contract',
    'test:unit',
    'test:journeys',
    'test:performance',
    'test:security',
    'test:governance',
    'test:all',
  ];

  for (const scriptName of requiredScriptNames) {
    if (!scripts[scriptName]) {
      fail(`Missing required npm script: ${scriptName}`);
    }
  }

  const testAll = String(scripts['test:all']);
  for (const requiredStep of [
    'test:governance',
    'test:unit',
    'test:journeys',
    'test:performance',
    'test:security',
  ]) {
    if (!testAll.includes(requiredStep)) {
      fail(`test:all must include ${requiredStep}`);
    }
  }
}

function requireContent() {
  for (const check of contentChecks) {
    const text = readText(check.file);
    for (const requiredFragment of check.required) {
      if (!text.includes(requiredFragment)) {
        fail(`Governance content missing in ${check.file}: ${requiredFragment}`);
      }
    }
  }
}

function verifySdkContract() {
  const result = spawnSync(process.execPath, ['scripts/verify-sdk-iam-contract.js'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    fail(
      `SDK IAM contract verification failed.\n${stderr || stdout || 'No output returned from scripts/verify-sdk-iam-contract.js'}`,
    );
  }
}

function main() {
  requireFiles();
  requirePackageScripts();
  requireContent();
  verifySdkContract();

  if (process.exitCode && process.exitCode !== 0) {
    return;
  }

  console.log(
    JSON.stringify(
      {
        status: 'pass',
        validated_artifact_count: requiredFiles.length,
        validated_content_sets: contentChecks.map((check) => check.file),
        validated_validation_tracks: [
          'governance',
          'unit',
          'journeys',
          'performance',
          'security',
        ],
      },
      null,
      2,
    ),
  );
}

main();
