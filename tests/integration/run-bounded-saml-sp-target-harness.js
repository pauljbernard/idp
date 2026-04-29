const fs = require('fs')
const path = require('path')
const { rootDir } = require('../support/standaloneApi')
const { assert } = require('./runtimeLocalstackHelpers')
const { runBoundedSamlSpInteroperability } = require('./run-bounded-saml-sp-interoperability')

const DEFAULT_MANIFEST_PATH = path.join(rootDir, 'tests', 'fixtures', 'saml', 'third-party-sp-targets.json')
const DEFAULT_TARGET_ID = 'reference-bounded-fixture'

function loadManifest(manifestPath) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
}

function resolveTarget(manifest, targetId) {
  const target = Array.isArray(manifest?.targets)
    ? manifest.targets.find((entry) => entry.target_id === targetId)
    : null
  assert(target, `SAML target manifest did not contain target '${targetId}'.`, manifest)
  return target
}

async function runBoundedSamlSpTargetHarness(options = {}) {
  const manifestPath = options.manifestPath || process.env.IDP_SAML_SP_TARGET_MANIFEST || DEFAULT_MANIFEST_PATH
  const targetId = options.targetId || process.env.IDP_SAML_SP_TARGET_ID || DEFAULT_TARGET_ID
  const manifest = loadManifest(manifestPath)
  const target = resolveTarget(manifest, targetId)
  const expectedValidationMode = options.expectedValidationMode || null

  assert(target.profile_id === 'saml-sp-bounded-redirect-post-v1', 'SAML target is not aligned to the declared bounded SP profile.', target)
  assert(typeof target.request_fixture === 'string' && target.request_fixture.length > 0, 'SAML target is missing request fixture path.', target)
  assert(typeof target.client_id === 'string' && target.client_id.length > 0, 'SAML target is missing client_id.', target)
  assert(typeof target.expected_request_id === 'string' && target.expected_request_id.length > 0, 'SAML target is missing expected_request_id.', target)
  assert(typeof target.expected_acs_url === 'string' && target.expected_acs_url.length > 0, 'SAML target is missing expected_acs_url.', target)
  if (expectedValidationMode) {
    assert(target.validation_mode === expectedValidationMode, `SAML target '${targetId}' did not match expected validation mode '${expectedValidationMode}'.`, target)
  }

  const requestFixturePath = options.requestFixturePath || path.join(rootDir, target.request_fixture)
  assert(fs.existsSync(requestFixturePath), `SAML target fixture was not found: ${target.request_fixture}`, target)

  await runBoundedSamlSpInteroperability({
    suiteName: options.suiteName || 'bounded-saml-sp-target-harness',
    reportName: options.reportName || 'latest-bounded-saml-sp-target-harness.json',
    evidenceClass: options.evidenceClass || 'target-harness',
    clientId: options.clientId || target.client_id,
    requestFixturePath,
    expectedRequestId: options.expectedRequestId || target.expected_request_id,
    expectedAcsUrl: options.expectedAcsUrl || target.expected_acs_url,
    baseUrl: options.baseUrl || process.env.IDP_SAML_SP_TARGET_BASE_URL,
    port: options.port || 4111,
    tempRoot: options.tempRoot || path.join(rootDir, '.tmp', 'integration', options.suiteName || 'bounded-saml-sp-target-harness'),
    logFile: options.logFile || path.join(rootDir, '.tmp', 'integration', options.suiteName || 'bounded-saml-sp-target-harness', 'standalone-api.log'),
    target: {
      ...target,
      manifest_path: path.relative(rootDir, manifestPath),
    },
  })
}

async function main() {
  await runBoundedSamlSpTargetHarness()
}

module.exports = {
  runBoundedSamlSpTargetHarness,
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
