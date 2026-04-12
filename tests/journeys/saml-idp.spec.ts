import { expect, test } from '@playwright/test'

const REALM_ID = 'realm-idp-default'
const CLIENT_ID = 'saml-test-service-provider'
const API_PORT = process.env.IDP_JOURNEY_API_PORT ?? '4000'
const BASE_URL = `http://127.0.0.1:${API_PORT}`

function decodeBase64(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8')
}

function encodeSamlRequest(xml: string): string {
  return Buffer.from(xml, 'utf8').toString('base64')
}

test('saml metadata publishes the bounded supported profile for the external SP', async ({ request }) => {
  const metadataResponse = await request.get(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/metadata?client_id=${CLIENT_ID}`,
  )

  expect(metadataResponse.ok()).toBeTruthy()
  const metadataXml = await metadataResponse.text()

  expect(metadataXml).toContain('EntityDescriptor')
  expect(metadataXml).toContain('IDPSSODescriptor')
  expect(metadataXml).toContain('requestBinding="REDIRECT"')
  expect(metadataXml).toContain('responseBinding="POST"')
  expect(metadataXml).toContain('exactAcsMatchRequired="true"')
  expect(metadataXml).toContain('<KeyDescriptor use="signing">')
  expect(metadataXml).toContain('assertionConsumerService="https://sp.example.local/acs"')
  expect(metadataXml).not.toContain('SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"')
})

test('saml auth endpoint rejects unsupported anonymous request shape', async ({ request }) => {
  const authResponse = await request.get(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/auth?client_id=${CLIENT_ID}&binding=REDIRECT`,
  )

  expect(authResponse.status()).toBe(400)
  const body = await authResponse.json()
  expect(body.error).toContain('SAML request_id is required')
})

test('saml auth endpoint rejects unsupported external SP request profile features', async ({ request }) => {
  const unsupportedRequestXml = encodeSamlRequest(
    '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="sp-request-unsupported-1" Version="2.0" IssueInstant="2026-04-11T00:00:00.000Z" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="https://sp.example.local/acs"><samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent" AllowCreate="false"/></samlp:AuthnRequest>',
  )

  const authResponse = await request.get(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/auth?client_id=${CLIENT_ID}&binding=REDIRECT&SAMLRequest=${encodeURIComponent(unsupportedRequestXml)}`,
  )

  expect(authResponse.status()).toBe(400)
  const body = await authResponse.json()
  expect(body.error).toContain('Unsupported SAML NameIDPolicy format for the current profile')
})

test('saml request tracking and signed login/logout flow execute for the supported SP profile', async ({ request }) => {
  const requestId = 'sp-request-journey-1'
  const relayState = 'relay-journey-1'

  const authStart = await request.get(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/auth?client_id=${CLIENT_ID}&binding=REDIRECT&request_id=${requestId}&relay_state=${relayState}`,
    { maxRedirects: 0 },
  )

  expect(authStart.status()).toBe(302)
  const redirectUrl = authStart.headers()['location']
  expect(redirectUrl).toContain('/iam/login')
  expect(redirectUrl).toContain(CLIENT_ID)

  const samlRequestId = new URL(redirectUrl).searchParams.get('saml_request_id')
  expect(samlRequestId).toBeTruthy()

  const trackedRequest = await request.get(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/requests/${samlRequestId}`,
  )
  expect(trackedRequest.ok()).toBeTruthy()
  const trackedBody = await trackedRequest.json()
  expect(trackedBody.request.client_id).toBe(CLIENT_ID)
  expect(trackedBody.request.request_id).toBe(requestId)
  expect(trackedBody.request.request_binding).toBe('REDIRECT')
  expect(trackedBody.request.acs_url).toBe('https://sp.example.local/acs')

  const loginResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/login`,
    {
      form: {
        client_id: CLIENT_ID,
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
        relay_state: relayState,
      },
    },
  )

  expect(loginResponse.ok()).toBeTruthy()
  const loginBody = await loginResponse.json()
  expect(loginBody.client_id).toBe(CLIENT_ID)
  expect(loginBody.acs_url).toBe('https://sp.example.local/acs')
  expect(typeof loginBody.session_index).toBe('string')

  const samlResponseXml = decodeBase64(loginBody.saml_response)
  expect(samlResponseXml).toContain('<ds:Signature')
  expect(samlResponseXml).toContain('<ds:DigestValue>')
  expect(samlResponseXml).toContain('<saml:Audience>saml-test-service-provider</saml:Audience>')
  expect(samlResponseXml).toContain('Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"')
  expect(samlResponseXml).toContain('<saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>')
  expect(samlResponseXml).toContain('SessionNotOnOrAfter=')

  const logoutResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/logout`,
    {
      form: {
        client_id: CLIENT_ID,
        session_index: loginBody.session_index,
        request_id: 'sp-logout-request-journey-1',
        relay_state: relayState,
      },
    },
  )

  expect(logoutResponse.ok()).toBeTruthy()
  const logoutBody = await logoutResponse.json()
  expect(logoutBody.client_id).toBe(CLIENT_ID)
  expect(logoutBody.session_index).toBe(loginBody.session_index)
  expect(logoutBody.logout_destination).toBe('https://sp.example.local')

  const samlLogoutXml = decodeBase64(logoutBody.saml_logout_response)
  expect(samlLogoutXml).toContain('<ds:Signature')
  expect(samlLogoutXml).toContain('<ds:DigestValue>')
  expect(samlLogoutXml).toContain('InResponseTo="sp-logout-request-journey-1"')
  expect(samlLogoutXml).toContain('<idp:SessionIndex xmlns:idp="https://idp.local/iam">')
})

test('saml logout endpoint rejects uncorrelated request shape', async ({ request }) => {
  const logoutResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/logout`,
    {
      form: {
        client_id: CLIENT_ID,
        session_index: 'missing-request-id-session',
      },
    },
  )

  expect(logoutResponse.status()).toBe(400)
  const body = await logoutResponse.json()
  expect(body.error).toContain('Missing required SAML logout fields')
})

test('saml IdP-initiated flow executes through bounded initiation and login handoff', async ({ request }) => {
  const relayState = 'relay-idp-init-journey-1'

  const initiationResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/initiate`,
    {
      form: {
        client_id: CLIENT_ID,
        relay_state: relayState,
      },
    },
  )

  expect(initiationResponse.ok()).toBeTruthy()
  const initiationBody = await initiationResponse.json()
  expect(initiationBody.saml_request_id).toContain('iam-saml-request-')
  expect(initiationBody.redirect_url).toContain('/iam/login')
  expect(initiationBody.request.initiation_mode).toBe('IDP_INITIATED')
  expect(initiationBody.request.request_id).toBeNull()

  const loginResponse = await request.post(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/login`,
    {
      form: {
        client_id: CLIENT_ID,
        username: 'alex.morgan@northstar.example',
        password: 'StandaloneIAM!TenantAdmin2026',
        saml_request_id: initiationBody.saml_request_id,
      },
    },
  )

  expect(loginResponse.ok()).toBeTruthy()
  const loginBody = await loginResponse.json()
  expect(loginBody.saml_request_id).toBe(initiationBody.saml_request_id)
  expect(loginBody.relay_state).toBe(relayState)

  const samlResponseXml = decodeBase64(loginBody.saml_response)
  expect(samlResponseXml).toContain('Destination="https://sp.example.local/acs"')
  expect(samlResponseXml).toContain('InResponseTo="')

  const requestDetail = await request.get(
    `${BASE_URL}/api/v1/iam/realms/${REALM_ID}/protocol/saml/requests/${initiationBody.saml_request_id}`,
  )
  expect(requestDetail.ok()).toBeTruthy()
  const requestBody = await requestDetail.json()
  expect(requestBody.request.status).toBe('COMPLETED')
})
