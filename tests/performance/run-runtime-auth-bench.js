const fs = require('fs')
const path = require('path')
const autocannon = require('autocannon')
const { startDistributedStandaloneApi, rootDir } = require('../support/standaloneApi')
const { loginWithConsent, resolveAuthConfig, verifyDistributedIntegrationEnv } = require('../integration/runtimeLocalstackHelpers')

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

function percentile(values, fraction) {
  if (values.length === 0) {
    return 0
  }
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1))
  return sorted[index]
}

async function runConcurrentJsonRequests(options) {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    concurrency,
    totalRequests,
    timeoutMs = 10_000,
  } = options

  let issued = 0
  let completed = 0
  let errors = 0
  let non2xx = 0
  const latencies = []
  const startedAt = Date.now()

  async function worker() {
    while (true) {
      if (issued >= totalRequests) {
        return
      }
      issued += 1

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const requestStartedAt = Date.now()
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        })
        latencies.push(Date.now() - requestStartedAt)
        completed += 1
        if (!response.ok) {
          non2xx += 1
        }
      } catch {
        errors += 1
      } finally {
        clearTimeout(timeout)
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  const durationMs = Math.max(1, Date.now() - startedAt)
  return {
    requests: {
      average: Number((completed / (durationMs / 1000)).toFixed(2)),
      mean: Number((completed / (durationMs / 1000)).toFixed(2)),
      total: completed,
    },
    latency: {
      average: latencies.length === 0 ? 0 : Number((latencies.reduce((sum, value) => sum + value, 0) / latencies.length).toFixed(2)),
      p90: percentile(latencies, 0.9),
      p99: percentile(latencies, 0.99),
      max: latencies.length === 0 ? 0 : Math.max(...latencies),
    },
    errors,
    timeouts: 0,
    non2xx,
  }
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

  const catalogApi = await startDistributedStandaloneApi({
    port: 4105,
    tempRoot: path.join(rootDir, '.tmp', 'performance', 'runtime-auth', 'catalog'),
    logFile: path.join(rootDir, '.tmp', 'performance', 'runtime-auth', 'catalog', 'standalone-api.log'),
    env: {
      IDP_DDB_RUNTIME_DUAL_WRITE: 'false',
      IDP_DDB_RUNTIME_READ_V2: 'true',
    },
  })

  try {
    const authConfig = await resolveAuthConfig(catalogApi.baseUrl)
    const username = process.env.IDP_ADMIN_EMAIL || 'admin@idp.local'
    const password = process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026'

    await loginWithConsent(catalogApi.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)

    const publicCatalogResult = await runAutocannon({
      url: `${catalogApi.baseUrl}/api/v1/iam/public/catalog`,
      connections: 15,
      duration: 8,
    })

    await catalogApi.stop()

    const loginApi = await startDistributedStandaloneApi({
      port: 4107,
      tempRoot: path.join(rootDir, '.tmp', 'performance', 'runtime-auth', 'login'),
      logFile: path.join(rootDir, '.tmp', 'performance', 'runtime-auth', 'login', 'standalone-api.log'),
      env: {
        IDP_LOG_LOGIN_TIMINGS: 'true',
        IDP_DDB_RUNTIME_DUAL_WRITE: 'false',
        IDP_DDB_RUNTIME_READ_V2: 'true',
      },
    })

    try {
      for (let index = 0; index < 5; index += 1) {
        await loginWithConsent(loginApi.baseUrl, authConfig.realm_id, authConfig.client_id, username, password)
      }

      const loginResult = await runConcurrentJsonRequests({
        url: `${loginApi.baseUrl}/api/v1/iam/realms/${encodeURIComponent(authConfig.realm_id)}/login`,
        method: 'POST',
        concurrency: 5,
        totalRequests: 100,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          client_id: authConfig.client_id,
          scope: ['openid', 'profile', 'email', 'roles', 'groups'],
        }),
      })

      const suites = [
        summarizeResult('iam-public-catalog-runtime', publicCatalogResult),
        summarizeResult('iam-login-runtime', loginResult),
      ]
      const budgets = {
        'iam-public-catalog-runtime': { maxP99: 1_500, maxErrors: 0, maxNon2xx: 0, minTotalRequests: 1 },
        'iam-login-runtime': { maxP99: 3_000, maxErrors: 0, maxNon2xx: 0, minTotalRequests: 1 },
      }
      const failures = suites.flatMap((suite) => budgetFailures(suite, budgets[suite.name]))

      const report = {
        generated_at: new Date().toISOString(),
        environment: loginApi.baseUrl,
        persistence_backend: 'dynamodb-s3',
        runtime_table: process.env.IDP_IAM_RUNTIME_DDB_TABLE,
        budgets,
        suites,
        overall_pass: failures.length === 0,
        failures,
      }

      const reportPath = path.join(rootDir, 'tests', 'performance', 'latest-runtime-auth-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
      if (failures.length > 0) {
        const firstFailure = failures[0]
        throw new Error(`${firstFailure.name} exceeded the ${firstFailure.metric} budget: ${firstFailure.actual} > ${firstFailure.limit}`)
      }
    } finally {
      await loginApi.stop()
    }
  } finally {
    if (catalogApi) {
      await catalogApi.stop().catch(() => {})
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
