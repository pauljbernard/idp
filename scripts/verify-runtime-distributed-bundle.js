#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const rootDir = '/Volumes/data/development/hmh/idp'
const defaultReportPath = path.join(rootDir, 'tests', 'integration', 'latest-runtime-distributed-bundle.json')
const defaultVerificationArtifactPath = path.join(rootDir, 'tests', 'integration', 'latest-runtime-distributed-bundle-verification.json')
const freshnessThresholdHours = 48
const multiInstanceConvergenceThresholdMs = {
  first_session_visible_on_instance_b: 5_000,
  first_token_active_on_instance_b: 5_000,
  second_session_visible_on_instance_a: 5_000,
  second_token_active_on_instance_a: 5_000,
  first_session_revoked_on_instance_a: 7_500,
  first_token_inactive_on_instance_a: 7_500,
  second_session_still_active_on_instance_a: 5_000,
  second_token_still_active_on_instance_a: 5_000,
  second_session_revoked_on_instance_b: 7_500,
  second_token_inactive_on_instance_b: 7_500,
}
const tokenAbuseDiagnosticThresholdMs = {
  login_with_consent_ms: 10_000,
  issue_browser_token_ms: 10_000,
  introspect_before_logout_ms: 5_000,
  userinfo_before_logout_ms: 5_000,
  refresh_grant_before_logout_ms: 7_500,
  logout_ms: 7_500,
  introspect_after_logout_ms: 5_000,
  refresh_grant_after_logout_ms: 7_500,
  replayed_userinfo_ms: 5_000,
  password_reset_request_ms: 7_500,
  password_reset_confirm_ms: 7_500,
  password_reset_replay_ms: 5_000,
  password_reset_wrong_code_ms: 5_000,
}

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

function fileAgeHours(filePath) {
  const stats = fs.statSync(filePath)
  return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)
}

function resolveArtifact(label, absolutePath) {
  const exists = !!absolutePath && fs.existsSync(absolutePath)
  const ageHours = exists ? Number(fileAgeHours(absolutePath).toFixed(2)) : null
  return {
    label,
    path: absolutePath,
    exists,
    age_hours: ageHours,
    stale: exists ? ageHours > freshnessThresholdHours : true,
  }
}

const reportPath = process.argv[2] || defaultReportPath

if (!fs.existsSync(reportPath)) {
  fail(`Runtime distributed bundle report not found: ${reportPath}`)
}

const bundle = readJson(reportPath)

if (!bundle || typeof bundle !== 'object') {
  fail(`Invalid runtime distributed bundle report: ${reportPath}`)
}

if (!bundle.checks || typeof bundle.checks !== 'object') {
  fail(`Runtime distributed bundle report is missing checks: ${reportPath}`)
}

const requiredSteps = [
  'verify-distributed-test-env',
  'runtime-cutover-localstack',
  'runtime-session-maintenance-localstack',
  'runtime-token-revocation-localstack',
  'runtime-multi-instance-localstack',
  'security-token-abuse',
]

const steps = Array.isArray(bundle.steps) ? bundle.steps : []
const stepByName = new Map(steps.map((step) => [step.name, step]))
const missingSteps = requiredSteps.filter((name) => !stepByName.has(name))
const failedSteps = requiredSteps
  .map((name) => stepByName.get(name))
  .filter((step) => step && step.status !== 'passed')

const artifacts = [
  resolveArtifact('runtime-cutover-localstack', path.join(rootDir, 'tests', 'integration', 'latest-runtime-cutover-localstack.json')),
  resolveArtifact('runtime-session-maintenance-localstack', path.join(rootDir, 'tests', 'integration', 'latest-runtime-session-maintenance-localstack.json')),
  resolveArtifact('runtime-token-revocation-localstack', path.join(rootDir, 'tests', 'integration', 'latest-runtime-token-revocation-localstack.json')),
  resolveArtifact('runtime-multi-instance-localstack', path.join(rootDir, 'tests', 'integration', 'latest-runtime-multi-instance-localstack.json')),
  resolveArtifact('security-token-abuse', path.join(rootDir, 'tests', 'security', 'latest-token-abuse-report.json')),
]

const missingArtifacts = artifacts.filter((artifact) => !artifact.exists)
const staleArtifacts = artifacts.filter((artifact) => artifact.exists && artifact.stale)
const multiInstanceArtifactPath = path.join(rootDir, 'tests', 'integration', 'latest-runtime-multi-instance-localstack.json')
const tokenAbuseArtifactPath = path.join(rootDir, 'tests', 'security', 'latest-token-abuse-report.json')
const multiInstanceArtifact = fs.existsSync(multiInstanceArtifactPath) ? readJson(multiInstanceArtifactPath) : null
const tokenAbuseArtifact = fs.existsSync(tokenAbuseArtifactPath) ? readJson(tokenAbuseArtifactPath) : null
const slowConvergenceChecks = []
const slowTokenAbuseDiagnostics = []

if (multiInstanceArtifact?.diagnostics && typeof multiInstanceArtifact.diagnostics === 'object') {
  for (const [check, thresholdMs] of Object.entries(multiInstanceConvergenceThresholdMs)) {
    const diagnostic = multiInstanceArtifact.diagnostics[check]
    if (!diagnostic || typeof diagnostic.converged_in_ms !== 'number') {
      slowConvergenceChecks.push({
        check,
        actual_ms: diagnostic?.converged_in_ms ?? null,
        threshold_ms: thresholdMs,
        reason: 'missing_diagnostic',
      })
      continue
    }

    if (diagnostic.converged_in_ms > thresholdMs) {
      slowConvergenceChecks.push({
        check,
        actual_ms: diagnostic.converged_in_ms,
        threshold_ms: thresholdMs,
        reason: 'slow_convergence',
      })
    }
  }
}

if (tokenAbuseArtifact?.diagnostics && typeof tokenAbuseArtifact.diagnostics === 'object') {
  for (const [check, thresholdMs] of Object.entries(tokenAbuseDiagnosticThresholdMs)) {
    const actualMs = tokenAbuseArtifact.diagnostics[check]
    if (typeof actualMs !== 'number') {
      slowTokenAbuseDiagnostics.push({
        check,
        actual_ms: actualMs ?? null,
        threshold_ms: thresholdMs,
        reason: 'missing_diagnostic',
      })
      continue
    }

    if (actualMs > thresholdMs) {
      slowTokenAbuseDiagnostics.push({
        check,
        actual_ms: actualMs,
        threshold_ms: thresholdMs,
        reason: 'slow_execution',
      })
    }
  }
} else if (fs.existsSync(tokenAbuseArtifactPath)) {
  for (const [check, thresholdMs] of Object.entries(tokenAbuseDiagnosticThresholdMs)) {
    slowTokenAbuseDiagnostics.push({
      check,
      actual_ms: null,
      threshold_ms: thresholdMs,
      reason: 'missing_diagnostics_object',
    })
  }
}

const generatedAt = bundle.generated_at ? Date.parse(bundle.generated_at) : Number.NaN
const bundleAgeHours = Number.isFinite(generatedAt)
  ? Number(((Date.now() - generatedAt) / (1000 * 60 * 60)).toFixed(2))
  : null
const bundleStale = bundleAgeHours === null ? true : bundleAgeHours > freshnessThresholdHours

const payload = {
  report_path: reportPath,
  bundle_generated_at: bundle.generated_at ?? null,
  bundle_age_hours: bundleAgeHours,
  bundle_stale: bundleStale,
  environment: bundle.environment ?? null,
  bundle_checks: bundle.checks ?? null,
  expected_steps: requiredSteps.length,
  actual_steps: steps.length,
  missing_step_count: missingSteps.length,
  failed_step_count: failedSteps.length,
  missing_steps: missingSteps,
  failed_steps: failedSteps.map((step) => ({
    name: step.name,
    status: step.status,
    exit_code: step.exit_code ?? null,
  })),
  missing_artifact_count: missingArtifacts.length,
  stale_artifact_count: staleArtifacts.length,
  slow_convergence_count: slowConvergenceChecks.length,
  slow_token_abuse_diagnostic_count: slowTokenAbuseDiagnostics.length,
  checks: {
    bundle_stale: bundleStale,
    missing_step_count: missingSteps.length,
    failed_step_count: failedSteps.length,
    missing_artifact_count: missingArtifacts.length,
    stale_artifact_count: staleArtifacts.length,
    slow_convergence_count: slowConvergenceChecks.length,
    slow_token_abuse_diagnostic_count: slowTokenAbuseDiagnostics.length,
    overall_pass:
      bundle.checks.all_steps_passed === true &&
      missingSteps.length === 0 &&
      failedSteps.length === 0 &&
      missingArtifacts.length === 0 &&
      staleArtifacts.length === 0 &&
      slowConvergenceChecks.length === 0 &&
      slowTokenAbuseDiagnostics.length === 0 &&
      bundleStale === false,
  },
  artifacts,
  step_results: steps.map((step) => ({
    name: step.name ?? null,
    status: step.status ?? null,
    started_at: step.started_at ?? null,
    completed_at: step.completed_at ?? null,
    duration_ms: step.duration_ms ?? null,
    exit_code: step.exit_code ?? null,
    artifact: step.artifact ?? null,
    artifact_present: step.artifact_present ?? null,
    log_path: step.log_path ?? null,
    log_present: typeof step.log_path === 'string' ? fs.existsSync(step.log_path) : null,
    spawn_error: step.spawn_error ?? null,
  })),
  convergence_thresholds_ms: multiInstanceConvergenceThresholdMs,
  token_abuse_diagnostic_thresholds_ms: tokenAbuseDiagnosticThresholdMs,
  failing_diagnostics: slowConvergenceChecks,
  failing_token_abuse_diagnostics: slowTokenAbuseDiagnostics,
}

payload.overall_pass = payload.checks.overall_pass

fs.writeFileSync(defaultVerificationArtifactPath, `${JSON.stringify(payload, null, 2)}\n`)

const outputMode = (process.env.OUTPUT_MODE || 'text').trim().toLowerCase()

if (outputMode === 'json') {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
  process.exit(payload.overall_pass ? 0 : 1)
}

if (outputMode === 'markdown') {
  const lines = [
    '# Runtime Distributed Bundle Verification',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Report path | \`${payload.report_path}\` |`,
    `| Bundle generated at | \`${payload.bundle_generated_at ?? 'unknown'}\` |`,
    `| Bundle age hours | \`${payload.bundle_age_hours ?? 'unknown'}\` |`,
    `| Bundle stale | \`${payload.bundle_stale}\` |`,
    `| Expected steps | \`${payload.expected_steps}\` |`,
    `| Actual steps | \`${payload.actual_steps}\` |`,
    `| Missing step count | \`${payload.missing_step_count}\` |`,
    `| Failed step count | \`${payload.failed_step_count}\` |`,
    `| Missing artifact count | \`${payload.missing_artifact_count}\` |`,
    `| Stale artifact count | \`${payload.stale_artifact_count}\` |`,
    `| Slow convergence count | \`${payload.slow_convergence_count}\` |`,
    `| Slow token-abuse diagnostics | \`${payload.slow_token_abuse_diagnostic_count}\` |`,
    `| Overall pass | \`${payload.overall_pass}\` |`,
    '',
    '## Step Results',
    '',
    '| Step | Status | Exit Code | Duration ms | Artifact Present | Log Present |',
    '| --- | --- | --- | --- | --- | --- |',
    ...payload.step_results.map((step) => `| ${step.name ?? 'unknown'} | \`${step.status ?? 'unknown'}\` | \`${step.exit_code ?? 'n/a'}\` | \`${step.duration_ms ?? 'n/a'}\` | \`${step.artifact_present ?? 'n/a'}\` | \`${step.log_present ?? 'n/a'}\` |`),
    '',
    '## Artifacts',
    '',
    '| Artifact | Exists | Age (hours) | Stale |',
    '| --- | --- | --- | --- |',
    ...payload.artifacts.map((artifact) => `| ${artifact.label} | \`${artifact.exists}\` | \`${artifact.age_hours ?? 'unknown'}\` | \`${artifact.stale}\` |`),
    '',
    '## Token Abuse Diagnostics',
    '',
    '| Check | Actual ms | Threshold ms | Reason |',
    '| --- | --- | --- | --- |',
    ...(payload.failing_token_abuse_diagnostics.length > 0
      ? payload.failing_token_abuse_diagnostics.map((item) => `| \`${item.check}\` | \`${item.actual_ms ?? 'unknown'}\` | \`${item.threshold_ms}\` | \`${item.reason}\` |`)
      : ['| none | `n/a` | `n/a` | `none_recorded` |']),
  ]
  process.stdout.write(`${lines.join('\n')}\n`)
  process.exit(payload.overall_pass ? 0 : 1)
}

process.stdout.write(`report_path=${payload.report_path}\n`)
process.stdout.write(`bundle_generated_at=${payload.bundle_generated_at ?? 'unknown'}\n`)
process.stdout.write(`bundle_age_hours=${payload.bundle_age_hours ?? 'unknown'}\n`)
process.stdout.write(`bundle_stale=${payload.bundle_stale}\n`)
process.stdout.write(`missing_step_count=${payload.missing_step_count}\n`)
process.stdout.write(`failed_step_count=${payload.failed_step_count}\n`)
process.stdout.write(`missing_artifact_count=${payload.missing_artifact_count}\n`)
process.stdout.write(`stale_artifact_count=${payload.stale_artifact_count}\n`)
process.stdout.write(`overall_pass=${payload.overall_pass}\n`)

process.exit(payload.overall_pass ? 0 : 1)
