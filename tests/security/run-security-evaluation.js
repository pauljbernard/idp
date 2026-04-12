const fs = require('fs')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { rootDir, startStandaloneApi } = require('../support/standaloneApi')

const execFileAsync = promisify(execFile)

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function runAudit() {
  try {
    const { stdout } = await execFileAsync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 10,
    })
    return JSON.parse(stdout)
  } catch (error) {
    if (error && typeof error === 'object' && 'stdout' in error && typeof error.stdout === 'string') {
      return JSON.parse(error.stdout)
    }
    throw error
  }
}

async function main() {
  const api = await startStandaloneApi({
    port: 4_101,
    tempRoot: path.join(rootDir, '.tmp', 'security'),
    logFile: path.join(rootDir, '.tmp', 'security', 'standalone-api.log'),
  })

  try {
    const healthResponse = await fetch(`${api.baseUrl}/health`)
    const publicCatalogResponse = await fetch(`${api.baseUrl}/api/v1/iam/public/catalog`)
    const protectedClientsResponse = await fetch(`${api.baseUrl}/api/v1/iam/clients`)
    const accountSessionResponse = await fetch(`${api.baseUrl}/api/v1/iam/realms/realm-idp-default/account/session`)
    const audit = await runAudit()

    assert(healthResponse.status === 200, `Expected /health to return 200, got ${healthResponse.status}`)
    assert(publicCatalogResponse.status === 200, `Expected public IAM catalog 200, got ${publicCatalogResponse.status}`)
    assert(protectedClientsResponse.status === 401, `Expected protected IAM clients route 401, got ${protectedClientsResponse.status}`)
    assert(accountSessionResponse.status === 401, `Expected IAM account session route 401, got ${accountSessionResponse.status}`)

    assert(!healthResponse.headers.has('x-powered-by'), 'Expected x-powered-by to be disabled')
    assert(healthResponse.headers.get('x-content-type-options') === 'nosniff', 'Expected nosniff header on /health')
    assert(healthResponse.headers.get('x-frame-options') === 'SAMEORIGIN', 'Expected SAMEORIGIN frame protection')

    const accountSessionCacheControl = accountSessionResponse.headers.get('cache-control') ?? ''
    assert(
      accountSessionCacheControl.toLowerCase().includes('no-store'),
      'Expected no-store cache-control on the IAM account session route',
    )

    const vulnerabilities = audit.metadata?.vulnerabilities ?? {}
    const highOrCritical = Number(vulnerabilities.high ?? 0) + Number(vulnerabilities.critical ?? 0)

    const report = {
      generated_at: new Date().toISOString(),
      environment: api.baseUrl,
      http_checks: {
        health_status: healthResponse.status,
        public_catalog_status: publicCatalogResponse.status,
        protected_clients_status: protectedClientsResponse.status,
        account_session_status: accountSessionResponse.status,
        x_powered_by_present: healthResponse.headers.has('x-powered-by'),
        x_content_type_options: healthResponse.headers.get('x-content-type-options'),
        x_frame_options: healthResponse.headers.get('x-frame-options'),
        account_session_cache_control: accountSessionCacheControl,
      },
      dependency_audit: {
        vulnerabilities,
        high_or_critical_count: highOrCritical,
      },
    }

    const reportPath = path.join(rootDir, 'tests', 'security', 'latest-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))

    assert(highOrCritical === 0, `Expected no high/critical production dependency vulnerabilities, found ${highOrCritical}`)
  } finally {
    await api.stop()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
