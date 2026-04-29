const fs = require('fs')
const path = require('path')
const autocannon = require('autocannon')
const { startDistributedStandaloneApi, rootDir } = require('../support/standaloneApi')
const {
  issueBrowserToken,
  loginWithConsent,
  resolveAuthConfig,
  verifyDistributedIntegrationEnv,
} = require('../integration/runtimeLocalstackHelpers')

function runAutocannon(options) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(options, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })

    autocannon.track(instance, {
      renderProgressBar: false,
      renderLatencyTable: false,
      renderResultsTable: false,
    })
  })
}

function summarizeResult(name, result) {
  return {
    name,
    requests: {
      average: result.requests.average,
      mean: result.requests.mean,
      total: result.requests.total,
    },
    latency: {
      average: result.latency.average,
      p90: result.latency.p90,
      p99: result.latency.p99,
      max: result.latency.max,
    },
    errors: result.errors,
    timeouts: result.timeouts,
    non2xx: result.non2xx,
  }
}

function assertBudget(summary, { maxP99, maxErrors = 0, maxNon2xx = 0 }) {
  if (summary.errors > maxErrors) {
    throw new Error(`${summary.name} exceeded the error budget: ${summary.errors} > ${maxErrors}`)
  }
  if (summary.non2xx > maxNon2xx) {
    throw new Error(`${summary.name} exceeded the non-2xx budget: ${summary.non2xx} > ${maxNon2xx}`)
  }
  if (summary.latency.p99 > maxP99) {
    throw new Error(`${summary.name} exceeded the latency budget: ${summary.latency.p99}ms > ${maxP99}ms`)
  }
}

function budgetFailures(summary, budget) {
  const failures = []
  if (summary.requests.total <= (budget.minTotalRequests ?? 0)) {
    failures.push({
      name: summary.name,
      metric: 'requests_total',
      actual: summary.requests.total,
      limit: budget.minTotalRequests ?? 0,
    })
  }
  if (summary.errors > (budget.maxErrors ?? 0)) {
    failures.push({
      name: summary.name,
      metric: 'errors',
      actual: summary.errors,
      limit: budget.maxErrors ?? 0,
    })
  }
  if (summary.non2xx > (budget.maxNon2xx ?? 0)) {
    failures.push({
      name: summary.name,
      metric: 'non2xx',
      actual: summary.non2xx,
      limit: budget.maxNon2xx ?? 0,
    })
  }
  if (summary.latency.p99 > budget.maxP99) {
    failures.push({
      name: summary.name,
      metric: 'latency_p99_ms',
      actual: summary.latency.p99,
      limit: budget.maxP99,
    })
  }
  return failures
}

async function main() {
  verifyDistributedIntegrationEnv()

  const api = await startDistributedStandaloneApi({
    port: 4106,
    tempRoot: path.join(rootDir, '.tmp', 'performance', 'runtime-token'),
    logFile: path.join(rootDir, '.tmp', 'performance', 'runtime-token', 'standalone-api.log'),
  })

  try {
    const authConfig = await resolveAuthConfig(api.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'

    const login = await loginWithConsent(api.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
    const tokenSet = await issueBrowserToken(api.baseUrl, authConfig.realm_id, authConfig.client_id, login.session_id)

    const userinfoResult = await runAutocannon({
      url: `${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/protocol/openid-connect/userinfo`,
      connections: 10,
      duration: 8,
      headers: {
        authorization: `Bearer ${tokenSet.access_token}`,
      },
    })

    const introspectionResult = await runAutocannon({
      url: `${api.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/protocol/openid-connect/token/introspect`,
      method: 'POST',
      connections: 5,
      duration: 8,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        token: tokenSet.access_token,
        client_id: authConfig.client_id,
      }),
    })

    const suites = [
      summarizeResult('iam-userinfo-runtime', userinfoResult),
      summarizeResult('iam-introspection-runtime', introspectionResult),
    ]
    const budgets = {
      'iam-userinfo-runtime': { maxP99: 2_500, maxErrors: 0, maxNon2xx: 0, minTotalRequests: 1 },
      'iam-introspection-runtime': { maxP99: 2_500, maxErrors: 0, maxNon2xx: 0, minTotalRequests: 1 },
    }
    const failures = suites.flatMap((suite) => budgetFailures(suite, budgets[suite.name]))

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      persistence_backend: 'dynamodb-s3',
      runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
      budgets,
      suites,
      overall_pass: failures.length === 0,
      failures,
    }

    const reportPath = path.join(rootDir, 'tests', 'performance', 'latest-runtime-token-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
    if (failures.length > 0) {
      const firstFailure = failures[0]
      throw new Error(`${firstFailure.name} exceeded the ${firstFailure.metric} budget: ${firstFailure.actual} > ${firstFailure.limit}`)
    }
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
