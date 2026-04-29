const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { rootDir } = require('../support/standaloneApi')

const logsDir = path.join(rootDir, 'tests', 'integration', 'runtime-distributed-bundle-logs')

function ensureLogsDir() {
  fs.mkdirSync(logsDir, { recursive: true })
}

function sanitizeLogName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase()
}

function runStep(name, command, args, envOverrides = {}) {
  const startedAt = new Date().toISOString()
  const startedAtMs = Date.now()
  const logPath = path.join(logsDir, `${sanitizeLogName(name)}.log`)
  const effectiveEnv = {
    ...process.env,
    ...envOverrides,
  }
  const header = [
    `step=${name}`,
    `command=${command}`,
    `args=${JSON.stringify(args)}`,
    `started_at=${startedAt}`,
    `env_overrides=${JSON.stringify(envOverrides)}`,
    '',
  ].join('\n')
  fs.writeFileSync(logPath, header)

  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: effectiveEnv,
    encoding: 'utf8',
  })

  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  if (stdout) {
    fs.appendFileSync(logPath, `--- stdout ---\n${stdout}${stdout.endsWith('\n') ? '' : '\n'}`)
    process.stdout.write(stdout)
  }
  if (stderr) {
    fs.appendFileSync(logPath, `--- stderr ---\n${stderr}${stderr.endsWith('\n') ? '' : '\n'}`)
    process.stderr.write(stderr)
  }

  const completedAt = new Date().toISOString()
  const durationMs = Date.now() - startedAtMs
  fs.appendFileSync(
    logPath,
    [
      '--- result ---',
      `completed_at=${completedAt}`,
      `duration_ms=${durationMs}`,
      `exit_code=${typeof result.status === 'number' ? result.status : 1}`,
      '',
    ].join('\n'),
  )

  if (result.error) {
    fs.appendFileSync(logPath, `spawn_error=${result.error.message}\n`)
  }

  const common = {
    name,
    command,
    args,
    started_at: startedAt,
    completed_at: completedAt,
    duration_ms: durationMs,
    log_path: logPath,
  }

  if (result.status === 0) {
    return {
      ...common,
      status: 'passed',
      exit_code: 0,
    }
  }

  try {
    return {
      ...common,
      status: 'failed',
      exit_code: typeof result.status === 'number' ? result.status : 1,
      spawn_error: result.error ? result.error.message : null,
    }
  } catch (error) {
    return {
      ...common,
      status: 'failed',
      exit_code: 1,
      spawn_error: error instanceof Error ? error.message : String(error),
    }
  }
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeBundleReport(report) {
  const reportPath = path.join(rootDir, 'tests', 'integration', 'latest-runtime-distributed-bundle.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  return reportPath
}

async function main() {
  ensureLogsDir()
  const bundleEnv = {
    IDP_DDB_RUNTIME_DUAL_WRITE: 'true',
    IDP_DDB_RUNTIME_READ_V2: 'true',
  }

  const steps = [
    {
      name: 'verify-distributed-test-env',
      command: 'bash',
      args: ['deploy/iam-standalone/verify-distributed-test-env.sh'],
      env: bundleEnv,
    },
    {
      name: 'runtime-cutover-localstack',
      command: 'node',
      args: ['tests/integration/run-runtime-cutover-localstack.js'],
      artifact: path.join(rootDir, 'tests', 'integration', 'latest-runtime-cutover-localstack.json'),
      env: bundleEnv,
    },
    {
      name: 'runtime-session-maintenance-localstack',
      command: 'node',
      args: ['tests/integration/run-runtime-session-maintenance-localstack.js'],
      artifact: path.join(rootDir, 'tests', 'integration', 'latest-runtime-session-maintenance-localstack.json'),
      env: bundleEnv,
    },
    {
      name: 'runtime-token-revocation-localstack',
      command: 'node',
      args: ['tests/integration/run-runtime-token-revocation-localstack.js'],
      artifact: path.join(rootDir, 'tests', 'integration', 'latest-runtime-token-revocation-localstack.json'),
      env: bundleEnv,
    },
    {
      name: 'runtime-multi-instance-localstack',
      command: 'node',
      args: ['tests/integration/run-runtime-multi-instance-localstack.js'],
      artifact: path.join(rootDir, 'tests', 'integration', 'latest-runtime-multi-instance-localstack.json'),
      env: bundleEnv,
    },
    {
      name: 'security-token-abuse',
      command: 'node',
      args: ['tests/security/run-token-abuse-evaluation.js'],
      artifact: path.join(rootDir, 'tests', 'security', 'latest-token-abuse-report.json'),
      env: bundleEnv,
    },
  ]

  const results = []

  for (const step of steps) {
    const result = runStep(step.name, step.command, step.args, step.env)
    results.push({
      ...result,
      artifact: step.artifact ?? null,
      artifact_present: step.artifact ? fs.existsSync(step.artifact) : null,
    })

    if (result.status !== 'passed') {
      break
    }
  }

  const report = {
    generated_at: new Date().toISOString(),
    environment: {
      aws_endpoint: process.env.AWS_ENDPOINT || process.env.IDP_DYNAMODB_ENDPOINT || 'http://127.0.0.1:4566',
      state_table: process.env.IDP_PLATFORM_STATE_DYNAMODB_TABLE || null,
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE || null,
      rate_limit_table: process.env.IDP_RATE_LIMIT_DYNAMODB_TABLE || null,
      durable_bucket: process.env.IDP_PLATFORM_DURABLE_S3_BUCKET || null,
      runtime_dual_write: bundleEnv.IDP_DDB_RUNTIME_DUAL_WRITE,
      runtime_read_v2: bundleEnv.IDP_DDB_RUNTIME_READ_V2,
    },
    logs_directory: logsDir,
    checks: {
      total_steps: steps.length,
      passed_steps: results.filter((result) => result.status === 'passed').length,
      failed_steps: results.filter((result) => result.status === 'failed').length,
      all_steps_passed: results.length === steps.length && results.every((result) => result.status === 'passed'),
    },
    steps: results,
    artifacts: {
      runtime_cutover: readJsonIfPresent(path.join(rootDir, 'tests', 'integration', 'latest-runtime-cutover-localstack.json')),
      runtime_session_maintenance: readJsonIfPresent(path.join(rootDir, 'tests', 'integration', 'latest-runtime-session-maintenance-localstack.json')),
      runtime_token_revocation: readJsonIfPresent(path.join(rootDir, 'tests', 'integration', 'latest-runtime-token-revocation-localstack.json')),
      runtime_multi_instance: readJsonIfPresent(path.join(rootDir, 'tests', 'integration', 'latest-runtime-multi-instance-localstack.json')),
      security_token_abuse: readJsonIfPresent(path.join(rootDir, 'tests', 'security', 'latest-token-abuse-report.json')),
    },
  }

  const reportPath = writeBundleReport(report)
  console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))

  if (!report.checks.all_steps_passed) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
