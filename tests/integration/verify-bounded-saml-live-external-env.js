const { assert } = require('./runtimeLocalstackHelpers')

function required(name) {
  const value = process.env[name]
  assert(typeof value === 'string' && value.length > 0, `Missing required environment variable: ${name}`)
  return value
}

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
    entity_id: entityIdMatch[1],
    acs_url: acsMatch[1],
  }
}

async function main() {
  const metadataUrl = required('IDP_SAML_SP_METADATA_URL')
  const metadataXml = await fetchMetadata(metadataUrl)
  const metadata = parseMetadata(metadataXml)

  const result = {
    suite: 'bounded-saml-sp-live-external-target-env',
    checks: {
      base_url: required('IDP_SAML_SP_TARGET_BASE_URL'),
      client_id: required('IDP_SAML_SP_CLIENT_ID'),
      metadata_url: metadataUrl,
      entity_id: metadata.entity_id,
      acs_url: metadata.acs_url,
      request_id: process.env.IDP_SAML_SP_REQUEST_ID || 'simplesamlphp-live-request-1',
    },
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
