#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`Failed to read JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const manifestPath = process.argv[2]

if (!manifestPath) {
  fail('Usage: node scripts/render-idp-sequence-a-status-matrix.js <sequence-a-manifest.json>')
}

const manifest = readJson(manifestPath)

if (!Array.isArray(manifest.steps) || manifest.steps.length === 0) {
  fail('Sequence A manifest is missing a non-empty steps array.')
}

const generatedAt = typeof manifest.generated_at === 'string' ? manifest.generated_at : '<fill>'
const manifestKind = typeof manifest.manifest_kind === 'string' ? manifest.manifest_kind : 'unknown'
const manifestVersion = Number.isInteger(manifest.manifest_version) ? manifest.manifest_version : '<fill>'
const bundleStatus = typeof manifest.bundle_status === 'string' ? manifest.bundle_status : '<fill>'
const updatedDate = generatedAt.slice(0, 10) || new Date().toISOString().slice(0, 10)
const environmentLabel = typeof manifest.environment_label === 'string' ? manifest.environment_label : '<fill>'
const outputDir = typeof manifest.output_dir === 'string' ? manifest.output_dir : path.dirname(manifestPath)

function summarizePreflight(step) {
  const preflightPath =
    step && step.artifacts && typeof step.artifacts.preflight_json === 'string'
      ? step.artifacts.preflight_json
      : path.join(step.output_dir, `${step.slug}-preflight.json`)
  if (!fs.existsSync(preflightPath)) {
    return {
      result: '`Missing`',
      note: '`Preflight artifact not found`',
      baseUrl: null,
    }
  }

  const payload = readJson(preflightPath)
  const status = typeof payload.runtime_cutover_status === 'string' ? payload.runtime_cutover_status : 'UNKNOWN'
  const summary = typeof payload.runtime_cutover_summary === 'string' ? payload.runtime_cutover_summary : 'No summary captured'
  const overall = typeof payload.overall_status === 'string' ? payload.overall_status : 'UNKNOWN'
  const baseUrl = typeof payload.base_url === 'string' ? payload.base_url : null
  return {
    result: `\`${status}\``,
    note: `overall=${overall}; ${summary.replace(/\|/g, '\\|')}`,
    baseUrl,
  }
}

const preflightSummaries = manifest.steps.map((step) => ({
  ...step,
  preflight: summarizePreflight(step),
}))

const inferredBaseUrl = preflightSummaries.find((step) => step.preflight.baseUrl)?.preflight.baseUrl || '<fill>'
const allPreflightPass = preflightSummaries.every((step) => step.preflight.result === '`PASS`')

const lines = [
  '# Sequence A Status Matrix',
  '',
  `Last updated: ${updatedDate}`,
  '',
  '## Purpose',
  '',
  'This document is the parent execution status matrix for the current `Cutover Sequence A` evidence window.',
  '',
  'It should be completed alongside the four generated step bundles:',
  '',
  '- `login-transactions/`',
  '- `tickets/`',
  '- `sessions/`',
  '- `issued-tokens/`',
  '',
  '## Execution Metadata',
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Environment label | \`${environmentLabel}\` |`,
  `| Manifest kind | \`${manifestKind}\` |`,
  `| Manifest version | \`${manifestVersion}\` |`,
  `| Bundle status | \`${bundleStatus}\` |`,
  '| Target environment | `<fill>` |',
  `| Execution window | \`${generatedAt}\` |`,
  '| Operator | `<fill>` |',
  '| Runtime build / commit | `<fill>` |',
  `| Base URL | \`${inferredBaseUrl}\` |`,
  `| Parent output directory | \`${outputDir}\` |`,
  '',
  '## Step Status',
  '',
  '| Sequence step | Entity family | Bundle path | Preflight result | Stage 0 | Stage 1 | Stage 2 | Rollback drill | Final step decision | Notes |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
]

for (const step of preflightSummaries) {
  lines.push(
    `| \`Step ${step.step_number}\` | ${step.entity_family} | \`${step.slug}/\` | ${step.preflight.result} | \`<fill>\` | \`<fill>\` | \`<fill>\` | \`<fill>\` | \`<fill>\` | ${step.preflight.note} |`,
  )
}

lines.push(
  '',
  '## Phase 1 Go/No-Go Summary',
  '',
  '| Decision item | Outcome | Notes |',
  '| --- | --- | --- |',
  `| Shared-environment Sequence A completed | \`${allPreflightPass ? 'Preflight-ready' : '<fill>'}\` | \`${allPreflightPass ? 'All generated preflight artifacts report PASS; execution evidence still needs to be completed.' : 'At least one generated preflight artifact is not PASS or is missing.'}\` |`,
  '| Runtime cutover evidence is sufficient for claim gate | `<fill>` | `<fill>` |',
  '| Phase 1 can close | `<fill>` | `<fill>` |',
  '| Phase 2 can begin | `<fill>` | `<fill>` |',
  '',
  '## Open Issues',
  '',
  '| Issue | Severity | Owner | Follow-up |',
  '| --- | --- | --- | --- |',
  '| `<fill>` | `<fill>` | `<fill>` | `<fill>` |',
  '',
  '## Recommendation',
  '',
  '- recommendation: `<fill>`',
  '- blockers: `<fill>`',
  '- follow-up actions: `<fill>`',
)

process.stdout.write(lines.join('\n') + '\n')
