#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function normalizeSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const preflightPath = process.argv[2]
const stepNumber = process.argv[3]
const entityFamily = process.argv[4]
const checklistPath = process.argv[5]

if (!preflightPath || !stepNumber || !entityFamily || !checklistPath) {
  fail(
    'Usage: node scripts/scaffold-idp-runtime-cutover-evidence.js <preflight.json> <step-number> <entity-family> <checklist-path>',
  )
}

let preflight
try {
  preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'))
} catch (error) {
  fail(`Failed to read preflight JSON from ${preflightPath}: ${error instanceof Error ? error.message : String(error)}`)
}

const requiredFields = [
  'health_status',
  'overall_status',
  'runtime_cutover_status',
  'runtime_cutover_summary',
  'realm_id',
  'client_id',
  'base_url',
]

for (const field of requiredFields) {
  if (typeof preflight[field] !== 'string' || preflight[field].trim().length === 0) {
    fail(`Missing required preflight field: ${field}`)
  }
}

const normalizedEntityFamily = entityFamily.trim()
const entityFamilySlug = normalizeSlug(normalizedEntityFamily)
const headingEntityFamily = normalizedEntityFamily
const titleEntityFamily = normalizedEntityFamily
const checklistBasename = path.basename(checklistPath)
const today = new Date().toISOString().slice(0, 10)

const familyValidationMap = {
  'login-transactions': [
    'Login creation',
    'Login continuation',
    'Login completion',
    'Login cancellation',
    'Restart-safe resume',
    'Expiry handling',
  ],
  tickets: [
    'Password reset issuance and redemption',
    'Email verification issuance and redemption',
    'Pending MFA issuance and redemption',
    'Replacement semantics',
    'Restart continuity',
    'Expiry handling',
  ],
  sessions: [
    'Session creation',
    'Session touch / last-seen behavior',
    'Session listing',
    'Targeted revoke',
    'Revoke other sessions',
    'Restart continuity / expiry handling',
  ],
  'issued-tokens': [
    'Token issuance',
    'Active introspection',
    'Refresh exchange',
    'Direct revoke',
    'Browser-session-linked revoke',
    'Subject-wide revoke / restart continuity',
  ],
}

const stageValidationScenarios = familyValidationMap[entityFamilySlug] ?? [
  'Primary create / issue path',
  'Read / resolve path',
  'Mutation / revoke path',
  'Restart continuity',
  'Expiry / maintenance path',
  'Parity check',
]

const preflightLines = [
  '## Preflight Record',
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Health endpoint status | \`${preflight.health_status}\` |`,
  `| Overall IAM health | \`${preflight.overall_status}\` |`,
  `| Runtime cutover status | \`${preflight.runtime_cutover_status}\` |`,
  `| Realm context | \`${preflight.realm_id}\` |`,
  `| Client context | \`${preflight.client_id}\` |`,
  `| Base URL | \`${preflight.base_url}\` |`,
  preflight.auth_config_source ? `| Auth config source | \`${preflight.auth_config_source}\` |` : null,
  preflight.health_response && typeof preflight.health_response.count === 'number'
    ? `| Health check count | \`${preflight.health_response.count}\` |`
    : null,
  preflight.tmp_dir ? `| Captured tmp dir | \`${preflight.tmp_dir}\` |` : null,
  '',
  'Preflight summary:',
  '',
  `- ${preflight.runtime_cutover_summary}`,
]

function renderScenarioTable(rows) {
  return [
    '| Validation scenario | Pass/Fail | Notes / Evidence |',
    '| --- | --- | --- |',
    ...rows.map((label) => `| ${label} | \`<fill>\` | \`<fill>\` |`),
  ]
}

const doc = [
  `# Headless IAM ${titleEntityFamily} Live Evidence`,
  '',
  `Last updated: ${today}`,
  '',
  '## Purpose',
  '',
  `This document records live execution evidence for \`Sequence A / Step ${stepNumber}\` using the ${headingEntityFamily.toLowerCase()} cutover checklist.`,
  '',
  'It should be completed together with:',
  '',
  `- \`docs/spec/plans/${checklistBasename}\``,
  '- `docs/spec/plans/Headless_IAM_Runtime_Cutover_Evidence_Pack.md`',
  '',
  '## Execution Metadata',
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Sequence step | \`Sequence A / Step ${stepNumber}\` |`,
  `| Entity family | ${headingEntityFamily} |`,
  '| Target environment | `<fill>` |',
  '| Execution mode | `live` |',
  `| Execution date | ${today} |`,
  '| Operator | `<fill>` |',
  '| Runtime build / commit | `<fill>` |',
  '| Runtime table name | `<fill>` |',
  `| Related checklist | \`${checklistBasename}\` |`,
  '',
  ...preflightLines.filter(Boolean),
  '',
  '## Preconditions Review',
  '',
  '| Precondition | Status | Notes |',
  '| --- | --- | --- |',
  '| Runtime entity table provisioned and reachable | `<fill>` | `<fill>` |',
  '| Runtime flags independently configurable | `<fill>` | `<fill>` |',
  '| Legacy-only starting state confirmed | `<fill>` | `<fill>` |',
  '| Restart window available | `<fill>` | `<fill>` |',
  '| Functional test flow available for this entity family | `<fill>` | `<fill>` |',
  '| Logs and storage evidence accessible | `<fill>` | `<fill>` |',
  '| Rollback window reserved | `<fill>` | `<fill>` |',
  '',
  '## Stage 0. Legacy-Only Baseline',
  '',
  'Flags:',
  '',
  '- `IDP_DDB_RUNTIME_DUAL_WRITE=false`',
  '- `IDP_DDB_RUNTIME_READ_V2=false`',
  '',
  ...renderScenarioTable(stageValidationScenarios),
  '',
  'Stage 0 decision:',
  '',
  '- result: `<fill>`',
  '- blocking issues: `<fill>`',
  '- logs / references: `<fill>`',
  '',
  '## Stage 1. Dual-Write with Legacy Reads',
  '',
  'Flags:',
  '',
  '- `IDP_DDB_RUNTIME_DUAL_WRITE=true`',
  '- `IDP_DDB_RUNTIME_READ_V2=false`',
  '',
  ...renderScenarioTable(stageValidationScenarios),
  '',
  'Stage 1 decision:',
  '',
  '- result: `<fill>`',
  '- blocking issues: `<fill>`',
  '- legacy evidence: `<fill>`',
  '- v2 evidence: `<fill>`',
  '- logs / references: `<fill>`',
  '',
  '## Stage 2. V2 Reads with Dual-Write Still Enabled',
  '',
  'Flags:',
  '',
  '- `IDP_DDB_RUNTIME_DUAL_WRITE=true`',
  '- `IDP_DDB_RUNTIME_READ_V2=true`',
  '',
  ...renderScenarioTable(stageValidationScenarios),
  '',
  'Stage 2 decision:',
  '',
  '- result: `<fill>`',
  '- blocking issues: `<fill>`',
  '- logs / references: `<fill>`',
  '',
  '## Rollback Drill',
  '',
  '| Item | Result | Notes |',
  '| --- | --- | --- |',
  '| `readV2` rollback executed | `<fill>` | `<fill>` |',
  '| Runtime restarted successfully after rollback | `<fill>` | `<fill>` |',
  '| Baseline functional path restored | `<fill>` | `<fill>` |',
  '| `dualWrite` rollback executed if needed | `<fill>` | `<fill>` |',
  '',
  'Rollback notes:',
  '',
  '- observed behavior: `<fill>`',
  '- residual risk: `<fill>`',
  '',
  '## Decision',
  '',
  '| Decision item | Outcome |',
  '| --- | --- |',
  '| Step accepted | `<fill>` |',
  '| Step blocked | `<fill>` |',
  '| Rollback required | `<fill>` |',
  '| Next step approved | `<fill>` |',
  '',
  'Decision notes:',
  '',
  '- recommendation: `<fill>`',
  '- blockers: `<fill>`',
  '- follow-up actions: `<fill>`',
]

process.stdout.write(doc.join('\n') + '\n')
