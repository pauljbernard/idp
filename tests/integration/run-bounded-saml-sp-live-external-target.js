const path = require('path')
const fs = require('fs')
const { rootDir } = require('../support/standaloneApi')
const { assert } = require('./runtimeLocalstackHelpers')
const { runBoundedSamlSpTargetHarness } = require('./run-bounded-saml-sp-target-harness')

const DEFAULT_TARGET_ID = 'simplesamlphp-live-bounded-profile'

async function fetchMetadata(url) {
  const previousTlsSetting = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  if (url.startsWith('https://')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
  const response = await fetch(url)
  const xml = await response.text()
  if (url.startsWith('https://')) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTlsSetting
  }
  assert(response.ok, `Failed to fetch live SP metadata from ${url}.`, {
    status: response.status,
    body: xml,
  })
  return xml
}

function parseMetadata(xml) {
  const entityIdMatch = xml.match(/<(?:\w+:)?EntityDescriptor[^>]*entityID="([^"]+)"/)
  const acsMatch = xml.match(/<(?:\w+:)?AssertionConsumerService[^>]*Location="([^"]+)"/)

  assert(entityIdMatch?.[1], 'Live SP metadata did not contain entityID.', xml)
  assert(acsMatch?.[1], 'Live SP metadata did not contain AssertionConsumerService Location.', xml)

  return {
    entityId: entityIdMatch[1],
    acsUrl: acsMatch[1],
  }
}

function renderLiveRequestFixture(templatePath, outputPath, values) {
  let xml = fs.readFileSync(templatePath, 'utf8')
  xml = xml.replace('ID="simplesamlphp-request-1"', `ID="${values.requestId}"`)
  xml = xml.replace('AssertionConsumerServiceURL="https://sp.example.local/acs"', `AssertionConsumerServiceURL="${values.acsUrl}"`)
  xml = xml.replace('https://simplesamlphp.example.local/saml2/sp/metadata.php/default-sp', values.entityId)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, xml)
}

async function main() {
  const targetId = process.env.IDP_SAML_SP_TARGET_ID || DEFAULT_TARGET_ID
  const baseUrl = process.env.IDP_SAML_SP_TARGET_BASE_URL

  assert(typeof baseUrl === 'string' && baseUrl.length > 0, 'IDP_SAML_SP_TARGET_BASE_URL is required for the live external SAML target lane.')
  const clientId = process.env.IDP_SAML_SP_CLIENT_ID
  const metadataUrl = process.env.IDP_SAML_SP_METADATA_URL
  const requestId = process.env.IDP_SAML_SP_REQUEST_ID || 'simplesamlphp-live-request-1'

  assert(typeof clientId === 'string' && clientId.length > 0, 'IDP_SAML_SP_CLIENT_ID is required for the live external SAML target lane.')
  assert(typeof metadataUrl === 'string' && metadataUrl.length > 0, 'IDP_SAML_SP_METADATA_URL is required for the live external SAML target lane.')

  const metadataXml = await fetchMetadata(metadataUrl)
  const { entityId, acsUrl } = parseMetadata(metadataXml)

  const tempRoot = path.join(rootDir, '.tmp', 'integration', 'bounded-saml-sp-live-external-target')
  const generatedFixturePath = path.join(tempRoot, 'generated-live-external-authn-request.xml')
  renderLiveRequestFixture(
    path.join(rootDir, 'tests', 'fixtures', 'saml', 'simplesamlphp-bounded-authn-request.xml'),
    generatedFixturePath,
    { requestId, acsUrl, entityId },
  )

  await runBoundedSamlSpTargetHarness({
    targetId,
    expectedValidationMode: 'live-external',
    suiteName: 'bounded-saml-sp-live-external-target',
    reportName: 'latest-bounded-saml-sp-live-external-target.json',
    evidenceClass: 'external-interoperability-candidate',
    clientId,
    requestFixturePath: generatedFixturePath,
    expectedRequestId: requestId,
    expectedAcsUrl: acsUrl,
    baseUrl,
    tempRoot,
    logFile: path.join(tempRoot, 'standalone-api.log'),
  })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
