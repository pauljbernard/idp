import fs from 'node:fs'
import path from 'node:path'

const root = '/Volumes/data/development/hmh/idp'

function fileExists(filePath) {
  return fs.existsSync(filePath)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function safeReadJson(filePath) {
  return fileExists(filePath) ? readJson(filePath) : null
}

function fileModifiedAt(filePath) {
  return fileExists(filePath) ? fs.statSync(filePath).mtime.toISOString() : null
}

function fileModifiedAtMs(filePath) {
  return fileExists(filePath) ? fs.statSync(filePath).mtimeMs : null
}

const freshnessThresholdHours = {
  'runtime-cutover-localstack': 48,
  'runtime-distributed-bundle': 48,
  'runtime-session-maintenance-localstack': 48,
  'runtime-multi-instance-localstack': 48,
  'runtime-token-revocation-localstack': 48,
  'bounded-production-backup-restore-rehearsal': 48,
  'bounded-production-key-rotation-drill': 48,
  'bounded-production-runtime-dependency-failure-drill': 48,
  'bounded-saml-sp-interoperability': 48,
  'bounded-saml-sp-target-harness': 48,
  'bounded-saml-sp-family-shape-calibration': 48,
  'bounded-saml-sp-live-external-target': 48,
  'performance-runtime-auth': 48,
  'performance-runtime-token': 48,
  'security-token-abuse': 48,
}

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

function computeFreshness(label, filePath) {
  const modifiedAtMs = fileModifiedAtMs(filePath)
  if (!modifiedAtMs) {
    return null
  }

  const thresholdHours = freshnessThresholdHours[label]
  if (!thresholdHours) {
    return {
      stale: false,
      age_hours: 0,
      threshold_hours: null,
    }
  }

  const ageHours = (Date.now() - modifiedAtMs) / (1000 * 60 * 60)
  return {
    stale: ageHours > thresholdHours,
    age_hours: Number(ageHours.toFixed(2)),
    threshold_hours: thresholdHours,
  }
}

const coverageThresholds = {
  'api-unit-coverage': {
    lines: 70,
    statements: 70,
    functions: 70,
    branches: 60,
  },
  'ui-unit-coverage': {
    lines: 42,
    statements: 38,
    functions: 23,
    branches: 40,
  },
}

function normalizeCoverage(label, filePath) {
  const report = safeReadJson(filePath)
  if (!report?.total) {
    return null
  }

  const thresholds = coverageThresholds[label] ?? null
  const failingMetrics = []

  for (const metric of ['lines', 'statements', 'functions', 'branches']) {
    const metricReport = report.total[metric]
    if (!metricReport || metricReport.total === 0) {
      failingMetrics.push({
        metric,
        actual_pct: metricReport?.pct ?? null,
        required_pct: thresholds?.[metric] ?? null,
        reason: 'no_coverage_recorded',
      })
      continue
    }

    if (thresholds && metricReport.pct < thresholds[metric]) {
      failingMetrics.push({
        metric,
        actual_pct: metricReport.pct,
        required_pct: thresholds[metric],
        reason: 'below_threshold',
      })
    }
  }

  return {
    suite_name: label,
    kind: 'coverage',
    status: failingMetrics.length === 0 ? 'passed' : 'failed',
    artifact: filePath,
    modified_at: fileModifiedAt(filePath),
    summary: {
      total: 4,
      passed: 4 - failingMetrics.length,
      failed: failingMetrics.length,
      errors: 0,
      skipped: 0,
      expected_failures: 0,
      unexpected_successes: 0,
    },
    coverage: report.total,
    thresholds,
    failing_metrics: failingMetrics,
  }
}

function normalizePerformance(label, filePath) {
  const report = safeReadJson(filePath)
  if (!report?.suites) {
    return null
  }

  const failureNames = new Set((report.failures ?? []).map((failure) => failure.name))
  const failingSuites = report.suites.filter((suite) =>
    suite.errors > 0
    || suite.non2xx > 0
    || suite.timeouts > 0
    || failureNames.has(suite.name)
  )
  const freshness = computeFreshness(label, filePath)
  return {
    suite_name: label,
    kind: 'performance',
    status: failingSuites.length === 0 && report.overall_pass !== false && !freshness?.stale ? 'passed' : 'failed',
    artifact: filePath,
    modified_at: fileModifiedAt(filePath),
    freshness,
    summary: {
      total: report.suites.length,
      passed: report.suites.length - failingSuites.length,
      failed: failingSuites.length + (freshness?.stale ? 1 : 0),
      errors: 0,
      skipped: 0,
      expected_failures: 0,
      unexpected_successes: 0,
    },
    details: report.suites.map((suite) => ({
      name: suite.name,
      requests_total: suite.requests?.total ?? null,
      latency_p99_ms: suite.latency?.p99 ?? null,
      errors: suite.errors ?? 0,
      non2xx: suite.non2xx ?? 0,
      timeouts: suite.timeouts ?? 0,
    })),
    failing_checks: report.failures ?? [],
  }
}

function normalizeSecurity(label, filePath) {
  const report = safeReadJson(filePath)
  if (!report) {
    return null
  }

  const auditHighOrCritical = report.dependency_audit?.high_or_critical_count ?? 0
  const httpChecks = report.http_checks ?? report.checks ?? {}
  const expectedChecksBySuite = {
    'security-baseline': {
      x_powered_by_present: false,
      health_status: 200,
      public_catalog_status: 200,
      protected_clients_status: 401,
      account_session_status: 401,
    },
    'security-authz': {
      unauthenticated_clients_status: 401,
      unauthenticated_account_session_status: 401,
      unauthenticated_revoke_others_status: 401,
      valid_session_lookup_status: 200,
      cross_realm_session_lookup_status: 401,
    },
    'security-token-abuse': {
      token_active_before_logout: true,
      token_active_after_logout: false,
      refresh_grant_before_logout_status: 200,
      refresh_grant_after_logout_status: 400,
      logout_revoked: true,
      replayed_userinfo_status: 401,
      replayed_password_reset_status: 400,
      wrong_code_password_reset_status: 400,
    },
  }
  const expectedChecks = expectedChecksBySuite[label] ?? {}
  const failingChecks = []

  for (const [key, expectedValue] of Object.entries(expectedChecks)) {
    if (!Object.prototype.hasOwnProperty.call(httpChecks, key)) {
      failingChecks.push({
        key,
        expected: expectedValue,
        actual: null,
        reason: 'missing_check',
      })
      continue
    }

    if (httpChecks[key] !== expectedValue) {
      failingChecks.push({
        key,
        expected: expectedValue,
        actual: httpChecks[key],
        reason: 'unexpected_value',
      })
    }
  }

  for (const [key, value] of Object.entries(httpChecks)) {
    if (!Object.prototype.hasOwnProperty.call(expectedChecks, key) && value === false) {
      failingChecks.push({
        key,
        expected: true,
        actual: value,
        reason: 'unexpected_false',
      })
    }
  }
  const freshness = computeFreshness(label, filePath)
  const failingDiagnostics = []

  if (label === 'security-token-abuse') {
    const diagnostics = report.diagnostics
    if (!diagnostics || typeof diagnostics !== 'object') {
      for (const [key, thresholdMs] of Object.entries(tokenAbuseDiagnosticThresholdMs)) {
        failingDiagnostics.push({
          key,
          actual_ms: null,
          threshold_ms: thresholdMs,
          reason: 'missing_diagnostics_object',
        })
      }
    } else {
      for (const [key, thresholdMs] of Object.entries(tokenAbuseDiagnosticThresholdMs)) {
        const actualMs = diagnostics[key]
        if (typeof actualMs !== 'number') {
          failingDiagnostics.push({
            key,
            actual_ms: actualMs ?? null,
            threshold_ms: thresholdMs,
            reason: 'missing_diagnostic',
          })
          continue
        }

        if (actualMs > thresholdMs) {
          failingDiagnostics.push({
            key,
            actual_ms: actualMs,
            threshold_ms: thresholdMs,
            reason: 'slow_execution',
          })
        }
      }
    }
  }
  const status = auditHighOrCritical === 0 && failingChecks.length === 0 && failingDiagnostics.length === 0 && !freshness?.stale ? 'passed' : 'failed'

  return {
    suite_name: label,
    kind: 'security',
    status,
    artifact: filePath,
    modified_at: fileModifiedAt(filePath),
    freshness,
    summary: {
      total: Object.keys(httpChecks).length + (report.dependency_audit ? 1 : 0),
      passed: status === 'passed' ? Object.keys(httpChecks).length + (report.dependency_audit ? 1 : 0) : null,
      failed: status === 'failed' ? failingChecks.length + failingDiagnostics.length + (auditHighOrCritical > 0 ? 1 : 0) + (freshness?.stale ? 1 : 0) : 0,
      errors: 0,
      skipped: 0,
      expected_failures: 0,
      unexpected_successes: 0,
    },
    details: {
      http_checks: httpChecks,
      dependency_audit: report.dependency_audit ?? null,
      diagnostics: report.diagnostics ?? null,
    },
    failing_checks: failingChecks,
    failing_diagnostics: failingDiagnostics,
    diagnostic_thresholds_ms: label === 'security-token-abuse' ? tokenAbuseDiagnosticThresholdMs : null,
  }
}

function normalizeIntegration(label, filePath) {
  const report = safeReadJson(filePath)
  if (!report?.checks) {
    return null
  }

  const freshness = computeFreshness(label, filePath)
  const slowConvergenceChecks = []

  if (label === 'runtime-multi-instance-localstack' && report.diagnostics && typeof report.diagnostics === 'object') {
    for (const [check, thresholdMs] of Object.entries(multiInstanceConvergenceThresholdMs)) {
      const diagnostic = report.diagnostics[check]
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

  const explicitFailure =
    (typeof report.checks?.all_steps_passed === 'boolean' && report.checks.all_steps_passed === false) ||
    (typeof report.checks?.overall_pass === 'boolean' && report.checks.overall_pass === false)

  const status = freshness?.stale || slowConvergenceChecks.length > 0 || explicitFailure ? 'failed' : 'passed'

  return {
    suite_name: label,
    kind: 'integration',
    status,
    artifact: filePath,
    modified_at: fileModifiedAt(filePath),
    freshness,
    summary: {
      total: Object.keys(report.checks).length,
      passed: status === 'passed' ? Object.keys(report.checks).length : 0,
      failed: (freshness?.stale ? 1 : 0) + slowConvergenceChecks.length + (explicitFailure ? 1 : 0),
      errors: 0,
      skipped: 0,
      expected_failures: 0,
      unexpected_successes: 0,
    },
    details: report.checks,
    diagnostics: report.diagnostics ?? null,
    convergence_thresholds_ms: label === 'runtime-multi-instance-localstack' ? multiInstanceConvergenceThresholdMs : null,
    failing_diagnostics: slowConvergenceChecks,
  }
}

function missingSuite(label, kind, expectedArtifact) {
  return {
    suite_name: label,
    kind,
    status: 'not_run',
    artifact: expectedArtifact,
    modified_at: null,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      skipped: 0,
      expected_failures: 0,
      unexpected_successes: 0,
    },
  }
}

const knownSuites = [
  normalizeCoverage('api-unit-coverage', path.join(root, 'apps/api-server/coverage/coverage-summary.json'))
    ?? missingSuite('api-unit-coverage', 'coverage', path.join(root, 'apps/api-server/coverage/coverage-summary.json')),
  normalizeCoverage('ui-unit-coverage', path.join(root, 'apps/enterprise-ui/coverage/coverage-summary.json'))
    ?? missingSuite('ui-unit-coverage', 'coverage', path.join(root, 'apps/enterprise-ui/coverage/coverage-summary.json')),
  normalizeIntegration('runtime-cutover-localstack', path.join(root, 'tests/integration/latest-runtime-cutover-localstack.json'))
    ?? missingSuite('runtime-cutover-localstack', 'integration', path.join(root, 'tests/integration/latest-runtime-cutover-localstack.json')),
  normalizeIntegration('runtime-distributed-bundle', path.join(root, 'tests/integration/latest-runtime-distributed-bundle.json'))
    ?? missingSuite('runtime-distributed-bundle', 'integration', path.join(root, 'tests/integration/latest-runtime-distributed-bundle.json')),
  normalizeIntegration('runtime-distributed-bundle-verification', path.join(root, 'tests/integration/latest-runtime-distributed-bundle-verification.json'))
    ?? missingSuite('runtime-distributed-bundle-verification', 'integration', path.join(root, 'tests/integration/latest-runtime-distributed-bundle-verification.json')),
  normalizeIntegration('runtime-session-maintenance-localstack', path.join(root, 'tests/integration/latest-runtime-session-maintenance-localstack.json'))
    ?? missingSuite('runtime-session-maintenance-localstack', 'integration', path.join(root, 'tests/integration/latest-runtime-session-maintenance-localstack.json')),
  normalizeIntegration('runtime-multi-instance-localstack', path.join(root, 'tests/integration/latest-runtime-multi-instance-localstack.json'))
    ?? missingSuite('runtime-multi-instance-localstack', 'integration', path.join(root, 'tests/integration/latest-runtime-multi-instance-localstack.json')),
  normalizeIntegration('runtime-token-revocation-localstack', path.join(root, 'tests/integration/latest-runtime-token-revocation-localstack.json'))
    ?? missingSuite('runtime-token-revocation-localstack', 'integration', path.join(root, 'tests/integration/latest-runtime-token-revocation-localstack.json')),
  normalizeIntegration('bounded-production-backup-restore-rehearsal', path.join(root, 'tests/integration/latest-bounded-production-backup-restore-rehearsal.json'))
    ?? missingSuite('bounded-production-backup-restore-rehearsal', 'integration', path.join(root, 'tests/integration/latest-bounded-production-backup-restore-rehearsal.json')),
  normalizeIntegration('bounded-production-key-rotation-drill', path.join(root, 'tests/integration/latest-bounded-production-key-rotation-drill.json'))
    ?? missingSuite('bounded-production-key-rotation-drill', 'integration', path.join(root, 'tests/integration/latest-bounded-production-key-rotation-drill.json')),
  normalizeIntegration('bounded-production-runtime-dependency-failure-drill', path.join(root, 'tests/integration/latest-bounded-production-runtime-dependency-failure-drill.json'))
    ?? missingSuite('bounded-production-runtime-dependency-failure-drill', 'integration', path.join(root, 'tests/integration/latest-bounded-production-runtime-dependency-failure-drill.json')),
  normalizeIntegration('bounded-saml-sp-interoperability', path.join(root, 'tests/integration/latest-bounded-saml-sp-interoperability.json'))
    ?? missingSuite('bounded-saml-sp-interoperability', 'integration', path.join(root, 'tests/integration/latest-bounded-saml-sp-interoperability.json')),
  normalizeIntegration('bounded-saml-sp-target-harness', path.join(root, 'tests/integration/latest-bounded-saml-sp-target-harness.json'))
    ?? missingSuite('bounded-saml-sp-target-harness', 'integration', path.join(root, 'tests/integration/latest-bounded-saml-sp-target-harness.json')),
  normalizeIntegration('bounded-saml-sp-family-shape-calibration', path.join(root, 'tests/integration/latest-bounded-saml-sp-family-shape-calibration.json'))
    ?? missingSuite('bounded-saml-sp-family-shape-calibration', 'integration', path.join(root, 'tests/integration/latest-bounded-saml-sp-family-shape-calibration.json')),
  normalizeIntegration('bounded-saml-sp-live-external-target', path.join(root, 'tests/integration/latest-bounded-saml-sp-live-external-target.json'))
    ?? missingSuite('bounded-saml-sp-live-external-target', 'integration', path.join(root, 'tests/integration/latest-bounded-saml-sp-live-external-target.json')),
  normalizePerformance('performance-baseline', path.join(root, 'tests/performance/latest-report.json'))
    ?? missingSuite('performance-baseline', 'performance', path.join(root, 'tests/performance/latest-report.json')),
  normalizePerformance('performance-runtime-auth', path.join(root, 'tests/performance/latest-runtime-auth-report.json'))
    ?? missingSuite('performance-runtime-auth', 'performance', path.join(root, 'tests/performance/latest-runtime-auth-report.json')),
  normalizePerformance('performance-runtime-token', path.join(root, 'tests/performance/latest-runtime-token-report.json'))
    ?? missingSuite('performance-runtime-token', 'performance', path.join(root, 'tests/performance/latest-runtime-token-report.json')),
  normalizeSecurity('security-baseline', path.join(root, 'tests/security/latest-report.json'))
    ?? missingSuite('security-baseline', 'security', path.join(root, 'tests/security/latest-report.json')),
  normalizeSecurity('security-authz', path.join(root, 'tests/security/latest-authz-report.json'))
    ?? missingSuite('security-authz', 'security', path.join(root, 'tests/security/latest-authz-report.json')),
  normalizeSecurity('security-token-abuse', path.join(root, 'tests/security/latest-token-abuse-report.json'))
    ?? missingSuite('security-token-abuse', 'security', path.join(root, 'tests/security/latest-token-abuse-report.json')),
]

const totals = knownSuites.reduce((accumulator, suite) => {
  accumulator.recorded += suite.status === 'not_run' ? 0 : 1
  accumulator.not_run += suite.status === 'not_run' ? 1 : 0
  accumulator.failed += suite.status === 'failed' ? 1 : 0
  accumulator.passed += suite.status === 'passed' ? 1 : 0
  return accumulator
}, {
  recorded: 0,
  passed: 0,
  failed: 0,
  not_run: 0,
})

const aggregate = {
  generated_at: new Date().toISOString(),
  overview: {
    status: totals.failed > 0 ? 'failed' : totals.recorded > 0 ? 'passed' : 'not_run',
    suites_recorded: totals.recorded,
    suites_passed: totals.passed,
    suites_failed: totals.failed,
    suites_not_run: totals.not_run,
  },
  suites: knownSuites,
}

const markdown = [
  '# Test Results Report',
  '',
  `Generated: ${aggregate.generated_at}`,
  '',
  '## Overview',
  '',
  `- Status: ${aggregate.overview.status}`,
  `- Suites recorded: ${aggregate.overview.suites_recorded}`,
  `- Suites passed: ${aggregate.overview.suites_passed}`,
  `- Suites failed: ${aggregate.overview.suites_failed}`,
  `- Suites not run: ${aggregate.overview.suites_not_run}`,
  '',
  '## Suite Status',
  '',
  '| Suite | Kind | Status | Artifact | Last Modified |',
  '| --- | --- | --- | --- | --- |',
  ...aggregate.suites.map((suite) => `| ${suite.suite_name} | ${suite.kind} | ${suite.status} | ${suite.artifact ? path.relative(root, suite.artifact) : 'n/a'} | ${suite.modified_at ?? 'n/a'} |`),
  '',
  '## Coverage',
  '',
]

for (const suite of aggregate.suites.filter((entry) => entry.kind === 'coverage' && entry.coverage)) {
  markdown.push(`### ${suite.suite_name}`)
  markdown.push('')
  markdown.push(`- Lines: ${suite.coverage.lines.pct}% (${suite.coverage.lines.covered}/${suite.coverage.lines.total})`)
  markdown.push(`- Statements: ${suite.coverage.statements.pct}% (${suite.coverage.statements.covered}/${suite.coverage.statements.total})`)
  markdown.push(`- Functions: ${suite.coverage.functions.pct}% (${suite.coverage.functions.covered}/${suite.coverage.functions.total})`)
  markdown.push(`- Branches: ${suite.coverage.branches.pct}% (${suite.coverage.branches.covered}/${suite.coverage.branches.total})`)
  if (suite.thresholds) {
    markdown.push(`- Thresholds: lines ${suite.thresholds.lines}%, statements ${suite.thresholds.statements}%, functions ${suite.thresholds.functions}%, branches ${suite.thresholds.branches}%`)
  }
  if (suite.failing_metrics?.length) {
    markdown.push(`- Failing metrics: ${suite.failing_metrics.map((metric) => `${metric.metric} (${metric.reason})`).join(', ')}`)
  }
  markdown.push('')
}

markdown.push('## Available Artifacts', '')
for (const suite of aggregate.suites.filter((entry) => entry.status !== 'not_run')) {
  markdown.push(`### ${suite.suite_name}`)
  markdown.push('')
  markdown.push(`- Kind: ${suite.kind}`)
  markdown.push(`- Artifact: ${suite.artifact ? path.relative(root, suite.artifact) : 'n/a'}`)
  markdown.push(`- Last modified: ${suite.modified_at ?? 'n/a'}`)
  if (Array.isArray(suite.details) && suite.details.length > 0) {
    markdown.push('')
    markdown.push('| Detail | Value |')
    markdown.push('| --- | --- |')
    for (const detail of suite.details) {
      markdown.push(`| ${detail.name ?? 'detail'} | ${JSON.stringify(detail)} |`)
    }
  } else if (suite.details && typeof suite.details === 'object') {
    markdown.push('')
    markdown.push('```json')
    markdown.push(JSON.stringify(suite.details, null, 2))
    markdown.push('```')
  }
  markdown.push('')
}

markdown.push('## Missing Artifacts', '')
for (const suite of aggregate.suites.filter((entry) => entry.status === 'not_run')) {
  markdown.push(`- ${suite.suite_name}: expected ${path.relative(root, suite.artifact)}`)
}
markdown.push('')

const jsonPath = path.join(root, 'test-results-report.json')
const mdPath = path.join(root, 'test-results-report.md')
fs.writeFileSync(jsonPath, `${JSON.stringify(aggregate, null, 2)}\n`)
fs.writeFileSync(mdPath, `${markdown.join('\n')}\n`)

console.log(JSON.stringify(aggregate, null, 2))
