#!/usr/bin/env node

const fs = require('fs')

function readInput() {
  const filePath = process.argv[2]
  if (filePath) {
    return fs.readFileSync(filePath, 'utf8')
  }

  return fs.readFileSync(0, 'utf8')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const raw = readInput().trim()
if (!raw) {
  fail('Expected runtime distributed bundle verification JSON on stdin or as the first file argument.')
}

let payload
try {
  payload = JSON.parse(raw)
} catch (error) {
  fail(`Failed to parse runtime distributed bundle verification JSON: ${error instanceof Error ? error.message : String(error)}`)
}

const requiredFields = [
  'report_path',
  'bundle_generated_at',
  'bundle_age_hours',
  'bundle_stale',
  'missing_step_count',
  'failed_step_count',
  'missing_artifact_count',
  'stale_artifact_count',
  'overall_pass',
]

for (const field of requiredFields) {
  if (!(field in payload)) {
    fail(`Missing required verification field: ${field}`)
  }
}

const artifactLines = Array.isArray(payload.artifacts)
  ? payload.artifacts.map((artifact) => `| ${artifact.label} | \`${artifact.exists}\` | \`${artifact.age_hours ?? 'unknown'}\` | \`${artifact.stale}\` |`)
  : []

const stepLines = Array.isArray(payload.step_results)
  ? payload.step_results.map((step) =>
      `| ${step.name ?? 'unknown'} | \`${step.status ?? 'unknown'}\` | \`${step.exit_code ?? 'n/a'}\` | \`${step.duration_ms ?? 'n/a'}\` | \`${step.artifact_present ?? 'n/a'}\` | \`${step.log_present ?? 'n/a'}\` | ${step.artifact ?? 'n/a'} | ${step.log_path ?? 'n/a'} |`,
    )
  : []

const environmentLines = payload.environment && typeof payload.environment === 'object'
  ? Object.entries(payload.environment).map(([key, value]) => `| ${key} | \`${value ?? 'null'}\` |`)
  : []

const bundleCheckLines = payload.bundle_checks && typeof payload.bundle_checks === 'object'
  ? Object.entries(payload.bundle_checks).map(([key, value]) => `| ${key} | \`${value}\` |`)
  : []

const failingDiagnostics = Array.isArray(payload.failing_diagnostics) ? payload.failing_diagnostics : []
const failingDiagnosticLines = failingDiagnostics.length > 0
  ? [
      '## Convergence Failures',
      '',
      '| Check | Actual ms | Threshold ms | Reason |',
      '| --- | --- | --- | --- |',
      ...failingDiagnostics.map(
        (item) => `| \`${item.check}\` | \`${item.actual_ms ?? 'unknown'}\` | \`${item.threshold_ms}\` | \`${item.reason}\` |`,
      ),
      '',
    ]
  : [
      '## Convergence Failures',
      '',
      '- none recorded',
      '',
    ]

const failingTokenAbuseDiagnostics = Array.isArray(payload.failing_token_abuse_diagnostics) ? payload.failing_token_abuse_diagnostics : []
const failingTokenAbuseDiagnosticLines = failingTokenAbuseDiagnostics.length > 0
  ? [
      '## Token-Abuse Diagnostic Failures',
      '',
      '| Check | Actual ms | Threshold ms | Reason |',
      '| --- | --- | --- | --- |',
      ...failingTokenAbuseDiagnostics.map(
        (item) => `| \`${item.check}\` | \`${item.actual_ms ?? 'unknown'}\` | \`${item.threshold_ms}\` | \`${item.reason}\` |`,
      ),
      '',
    ]
  : [
      '## Token-Abuse Diagnostic Failures',
      '',
      '- none recorded',
      '',
    ]

const missingSteps = Array.isArray(payload.missing_steps) && payload.missing_steps.length > 0
  ? payload.missing_steps.map((step) => `- ${step}`)
  : ['- none']

const failedSteps = Array.isArray(payload.failed_steps) && payload.failed_steps.length > 0
  ? payload.failed_steps.map((step) => `- ${step.name}: status=\`${step.status}\` exit_code=\`${step.exit_code ?? 'unknown'}\``)
  : ['- none']

const lines = [
  '# Runtime Distributed Bundle Summary',
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Verification report path | \`${payload.report_path}\` |`,
  `| Bundle generated at | \`${payload.bundle_generated_at ?? 'unknown'}\` |`,
  `| Bundle age hours | \`${payload.bundle_age_hours ?? 'unknown'}\` |`,
  `| Bundle stale | \`${payload.bundle_stale}\` |`,
  `| Missing step count | \`${payload.missing_step_count}\` |`,
  `| Failed step count | \`${payload.failed_step_count}\` |`,
  `| Missing artifact count | \`${payload.missing_artifact_count}\` |`,
  `| Stale artifact count | \`${payload.stale_artifact_count}\` |`,
  `| Slow convergence count | \`${payload.slow_convergence_count ?? 0}\` |`,
  `| Slow token-abuse diagnostics | \`${payload.slow_token_abuse_diagnostic_count ?? 0}\` |`,
  `| Overall pass | \`${payload.overall_pass}\` |`,
  '',
  '## Runtime Environment',
  '',
  '| Field | Value |',
  '| --- | --- |',
  ...(environmentLines.length > 0 ? environmentLines : ['| environment | `not_captured` |']),
  '',
  '## Bundle Checks',
  '',
  '| Check | Value |',
  '| --- | --- |',
  ...(bundleCheckLines.length > 0 ? bundleCheckLines : ['| checks | `not_captured` |']),
  '',
  '## Step Results',
  '',
  '| Step | Status | Exit Code | Duration ms | Artifact Present | Log Present | Artifact Path | Log Path |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...(stepLines.length > 0 ? stepLines : ['| none | `not_captured` | `n/a` | `n/a` | `n/a` | `n/a` | n/a | n/a |']),
  '',
  '## Missing Steps',
  '',
  ...missingSteps,
  '',
  '## Failed Steps',
  '',
  ...failedSteps,
  '',
  '## Artifact Freshness',
  '',
  '| Artifact | Exists | Age (hours) | Stale |',
  '| --- | --- | --- | --- |',
  ...artifactLines,
  '',
  ...failingDiagnosticLines,
  ...failingTokenAbuseDiagnosticLines,
  '## Operator Notes',
  '',
  '- Attach the raw distributed bundle JSON and the verifier JSON alongside this summary.',
  '- If `overall_pass` is `false`, treat the bundle as non-admissible for release or cutover review.',
  '- If artifacts are stale, rerun the full distributed bundle rather than trying to reuse individual lane outputs.',
]

process.stdout.write(`${lines.join('\n')}\n`)
