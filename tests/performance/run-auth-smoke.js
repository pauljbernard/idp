const fs = require('fs')
const path = require('path')
const autocannon = require('autocannon')
const { rootDir, startStandaloneApi } = require('../support/standaloneApi')

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

async function main() {
  const api = await startStandaloneApi({
    port: 4_100,
    tempRoot: path.join(rootDir, '.tmp', 'performance'),
    logFile: path.join(rootDir, '.tmp', 'performance', 'standalone-api.log'),
    env: {
      IDP_GLOBAL_RATE_LIMIT_RPM: '100000',
      IDP_AUTH_RATE_LIMIT_RPM: '100000',
      IDP_RATE_LIMIT_BLOCK_MS: '1000',
      IDP_AUTH_RATE_LIMIT_BLOCK_MS: '1000',
    },
  })

  try {
    const publicCatalogResult = await runAutocannon({
      url: `${api.baseUrl}/api/v1/iam/public/catalog`,
      connections: 15,
      duration: 5,
    })

    const loginResult = await runAutocannon({
      url: `${api.baseUrl}/api/v1/iam/realms/realm-idp-default/login`,
      method: 'POST',
      connections: 5,
      duration: 5,
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin@idp.local',
        password: 'StandaloneIAM!SuperAdmin2026',
        client_id: 'admin-console-demo',
        scope: ['openid', 'profile', 'email', 'roles', 'groups'],
      }),
    })

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      suites: [
        summarizeResult('iam-public-catalog', publicCatalogResult),
        summarizeResult('iam-login', loginResult),
      ],
    }

    assertBudget(report.suites[0], { maxP99: 1_000 })
    assertBudget(report.suites[1], { maxP99: 2_500 })

    const reportPath = path.join(rootDir, 'tests', 'performance', 'latest-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
