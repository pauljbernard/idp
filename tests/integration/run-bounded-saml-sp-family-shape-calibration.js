const path = require('path')
const { rootDir } = require('../support/standaloneApi')
const { runBoundedSamlSpTargetHarness } = require('./run-bounded-saml-sp-target-harness')

async function main() {
  await runBoundedSamlSpTargetHarness({
    targetId: 'simplesamlphp-bounded-profile-candidate',
    expectedValidationMode: 'target-harness',
    suiteName: 'bounded-saml-sp-family-shape-calibration',
    reportName: 'latest-bounded-saml-sp-family-shape-calibration.json',
    evidenceClass: 'family-shape-calibration',
    baseUrl: process.env.IDP_SAML_SP_TARGET_BASE_URL,
    tempRoot: path.join(rootDir, '.tmp', 'integration', 'bounded-saml-sp-family-shape-calibration'),
    logFile: path.join(rootDir, '.tmp', 'integration', 'bounded-saml-sp-family-shape-calibration', 'standalone-api.log'),
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
