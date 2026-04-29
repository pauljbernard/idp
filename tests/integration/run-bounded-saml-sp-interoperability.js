const path = require('path')
const fs = require('fs')
const { rootDir, startStandaloneApi } = require('../support/standaloneApi')
const {
  assert,
  issueBrowserToken,
  loginWithConsent,
  requestJson,
  writeReport,
} = require('./runtimeLocalstackHelpers')

const REALM_ID = 'realm-idp-default'
const DEFAULT_CLIENT_ID = 'saml-test-service-provider'

function decodeBase64(value) {
  return Buffer.from(value, 'base64').toString('utf8')
}

function encodeSamlRequest(xml) {
  return Buffer.from(xml, 'utf8').toString('base64')
}

async function runBoundedSamlSpInteroperability(options = {}) {
  const suiteName = options.suiteName || 'bounded-saml-sp-interoperability'
  const reportName = options.reportName || 'latest-bounded-saml-sp-interoperability.json'
  const clientId = options.clientId || DEFAULT_CLIENT_ID
  const evidenceClass = options.evidenceClass || 'internal-runtime'
  const requestFixturePath = options.requestFixturePath
    || path.join(rootDir, 'tests', 'fixtures', 'saml', 'bounded-sp-authn-request.xml')
  const expectedRequestId = options.expectedRequestId || 'sp-interop-supported-request-1'
  const expectedAcsUrl = options.expectedAcsUrl || 'https://sp.example.local/acs'
  const target = options.target || null
  const relayState = options.relayState || 'sp-interop-relay-1'
  const idpInitiatedRelayState = options.idpInitiatedRelayState || 'sp-interop-idp-init-relay-1'
  const api = options.baseUrl
    ? {
      baseUrl: options.baseUrl,
      stop: async () => {},
    }
    : await startStandaloneApi({
      port: options.port || 4111,
      tempRoot: options.tempRoot || path.join(rootDir, '.tmp', 'integration', suiteName),
      logFile: options.logFile || path.join(rootDir, '.tmp', 'integration', suiteName, 'standalone-api.log'),
      env: {
        IDP_PLATFORM_PERSISTENCE_BACKEND: 'filesystem',
        ...(options.env || {}),
      },
    })

  try {
    const adminLogin = await loginWithConsent(
      api.baseUrl,
      REALM_ID,
      'admin-console-demo',
      process.env.IDP_ADMIN_EMAIL || 'admin@idp.local',
      process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026',
    )
    const tokens = await issueBrowserToken(api.baseUrl, REALM_ID, 'admin-console-demo', adminLogin.session_id)

    const metadataResponse = await fetch(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/metadata?client_id=${clientId}`,
    )
    const metadataXml = await metadataResponse.text()
    assert(metadataResponse.ok, 'SAML metadata fetch failed.', metadataXml)

    const supportMatrixResponse = await requestJson(`${api.baseUrl}/api/v1/iam/saml/support-matrix`, {
      headers: {
        authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const anonymousRequestResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/auth?client_id=${clientId}&binding=REDIRECT}`,
    )

    const unsupportedRequestXml = encodeSamlRequest(
      '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="sp-request-unsupported-contract-1" Version="2.0" IssueInstant="2026-04-11T00:00:00.000Z" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="https://sp.example.local/acs"><samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent" AllowCreate="false"/></samlp:AuthnRequest>',
    )
    const unsupportedRequestResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/auth?client_id=${clientId}&binding=REDIRECT&SAMLRequest=${encodeURIComponent(unsupportedRequestXml)}`,
    )

    const supportedRequestTemplate = fs.readFileSync(requestFixturePath, 'utf8')
    const supportedRequestXml = supportedRequestTemplate
    const supportedEncodedRequestXml = encodeSamlRequest(supportedRequestXml)
    const authStart = await fetch(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/auth?client_id=${clientId}&binding=REDIRECT&relay_state=${relayState}&SAMLRequest=${encodeURIComponent(supportedEncodedRequestXml)}`,
      { redirect: 'manual' },
    )
    const redirectUrl = authStart.headers.get('location') || ''
    const authStartText = await authStart.text()
    assert(authStart.status >= 300 && authStart.status < 400, 'SAML auth start did not redirect to login.', {
      status: authStart.status,
      redirectUrl,
      body: authStartText,
    })

    const samlRequestId = new URL(redirectUrl).searchParams.get('saml_request_id')
    assert(samlRequestId, 'SAML auth redirect did not include saml_request_id.', redirectUrl)

    const trackedRequest = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/requests/${samlRequestId}`,
    )
    assert(trackedRequest.ok, 'Tracked SAML request lookup failed.', trackedRequest.text)

    const loginResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/login`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          username: process.env.IDP_ADMIN_EMAIL || 'admin@idp.local',
          password: process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026',
          relay_state: relayState,
          saml_request_id: samlRequestId,
        }),
      },
    )
    assert(loginResponse.ok, 'SAML login failed.', loginResponse.text)

    const samlResponseXml = decodeBase64(loginResponse.json.saml_response)
    const logoutResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/logout`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          session_index: loginResponse.json.session_index,
          request_id: 'sp-interop-logout-1',
          relay_state: relayState,
        }),
      },
    )
    assert(logoutResponse.ok, 'SAML logout failed.', logoutResponse.text)
    const samlLogoutXml = decodeBase64(logoutResponse.json.saml_logout_response)

    const uncorrelatedLogoutResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/logout`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          session_index: loginResponse.json.session_index,
        }),
      },
    )

    const idpInitiatedResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/initiate`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          relay_state: idpInitiatedRelayState,
          acs_url: expectedAcsUrl,
        }),
      },
    )
    assert(idpInitiatedResponse.ok, 'SAML IdP-initiated start failed.', idpInitiatedResponse.text)

    const idpInitiatedRequestId = idpInitiatedResponse.json?.saml_request_id
    assert(typeof idpInitiatedRequestId === 'string' && idpInitiatedRequestId.length > 0, 'SAML IdP-initiated response did not include saml_request_id.', idpInitiatedResponse.json)

    const idpInitiatedLoginResponse = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/login`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          username: process.env.IDP_ADMIN_EMAIL || 'admin@idp.local',
          password: process.env.IDP_ADMIN_PASSWORD || 'StandaloneIAM!SuperAdmin2026',
          saml_request_id: idpInitiatedRequestId,
        }),
      },
    )
    assert(idpInitiatedLoginResponse.ok, 'SAML IdP-initiated login failed.', idpInitiatedLoginResponse.text)
    const idpInitiatedSamlResponseXml = decodeBase64(idpInitiatedLoginResponse.json.saml_response)

    const idpInitiatedRequestDetail = await requestJson(
      `${api.baseUrl}/api/v1/iam/realms/${REALM_ID}/protocol/saml/requests/${idpInitiatedRequestId}`,
    )
    assert(idpInitiatedRequestDetail.ok, 'SAML IdP-initiated tracked request lookup failed.', idpInitiatedRequestDetail.text)

    const report = {
      generated_at: new Date().toISOString(),
      suite: suiteName,
      evidence_class: evidenceClass,
      target: target
        ? {
          target_id: target.target_id ?? null,
          target_name: target.target_name ?? null,
          target_kind: target.target_kind ?? null,
          validation_mode: target.validation_mode ?? null,
        }
        : null,
      supported_profile_id: supportMatrixResponse.json?.supported_profile_definition?.profile_id ?? null,
      checks: {
        overall_pass: true,
        metadata_status: metadataResponse.status,
        metadata_declares_redirect_request_binding: metadataXml.includes('requestBinding="REDIRECT"'),
        metadata_declares_post_response_binding: metadataXml.includes('responseBinding="POST"'),
        metadata_declares_exact_acs_match: metadataXml.includes('exactAcsMatchRequired="true"'),
        support_matrix_profile_id: supportMatrixResponse.json?.supported_profile_definition?.profile_id ?? null,
        support_matrix_request_bindings: supportMatrixResponse.json?.supported_profile_definition?.request_bindings ?? [],
        support_matrix_response_bindings: supportMatrixResponse.json?.supported_profile_definition?.response_bindings ?? [],
        anonymous_request_status: anonymousRequestResponse.status,
        anonymous_request_rejected: anonymousRequestResponse.status === 400,
        unsupported_request_status: unsupportedRequestResponse.status,
        unsupported_request_rejected: unsupportedRequestResponse.status === 400,
        supported_request_xml_accepted: authStart.status >= 300 && authStart.status < 400,
        request_fixture_path: path.relative(rootDir, requestFixturePath),
        tracked_request_status: trackedRequest.status,
        tracked_request_binding: trackedRequest.json?.request?.request_binding ?? null,
        tracked_request_id: trackedRequest.json?.request?.request_id ?? null,
        login_status: loginResponse.status,
        login_contains_signature: samlResponseXml.includes('<ds:Signature'),
        login_contains_expected_audience: samlResponseXml.includes(`<saml:Audience>${clientId}</saml:Audience>`),
        login_contains_expected_authn_context: samlResponseXml.includes('<saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>'),
        login_echoes_relay_state: loginResponse.json?.relay_state === relayState,
        login_contains_in_response_to_supported_request: samlResponseXml.includes(`InResponseTo="${expectedRequestId}"`),
        logout_status: logoutResponse.status,
        logout_contains_signature: samlLogoutXml.includes('<ds:Signature'),
        logout_contains_in_response_to: samlLogoutXml.includes('InResponseTo="sp-interop-logout-1"'),
        uncorrelated_logout_status: uncorrelatedLogoutResponse.status,
        uncorrelated_logout_rejected: uncorrelatedLogoutResponse.status === 400,
        idp_initiated_status: idpInitiatedResponse.status,
        idp_initiated_request_id_present: Boolean(idpInitiatedRequestId),
        idp_initiated_mode: idpInitiatedResponse.json?.request?.initiation_mode ?? null,
        idp_initiated_login_status: idpInitiatedLoginResponse.status,
        idp_initiated_login_echoes_request_id: idpInitiatedLoginResponse.json?.saml_request_id === idpInitiatedRequestId,
        idp_initiated_login_echoes_relay_state: idpInitiatedLoginResponse.json?.relay_state === idpInitiatedRelayState,
        idp_initiated_response_contains_destination: idpInitiatedSamlResponseXml.includes(`Destination="${expectedAcsUrl}"`),
        idp_initiated_request_completed: idpInitiatedRequestDetail.json?.request?.status === 'COMPLETED',
      },
    }

    assert(report.checks.metadata_declares_redirect_request_binding, 'Metadata did not publish Redirect request binding.', metadataXml)
    assert(report.checks.metadata_declares_post_response_binding, 'Metadata did not publish Post response binding.', metadataXml)
    assert(report.checks.metadata_declares_exact_acs_match, 'Metadata did not publish exact ACS match requirement.', metadataXml)
    assert(report.checks.support_matrix_profile_id === 'saml-sp-bounded-redirect-post-v1', 'Support matrix did not publish the bounded SAML profile.', supportMatrixResponse.json)
    assert(Array.isArray(report.checks.support_matrix_request_bindings) && report.checks.support_matrix_request_bindings.join(',') === 'REDIRECT', 'Support matrix request bindings drifted.', supportMatrixResponse.json)
    assert(Array.isArray(report.checks.support_matrix_response_bindings) && report.checks.support_matrix_response_bindings.join(',') === 'POST', 'Support matrix response bindings drifted.', supportMatrixResponse.json)
    assert(report.checks.anonymous_request_rejected, 'Anonymous SAML request without request_id was not rejected.', anonymousRequestResponse)
    assert(report.checks.unsupported_request_rejected, 'Unsupported SAML request was not rejected.', unsupportedRequestResponse)
    assert(report.checks.supported_request_xml_accepted, 'Supported bounded SAML AuthnRequest XML was not accepted.', {
      status: authStart.status,
      redirectUrl,
    })
    assert(report.checks.tracked_request_binding === 'REDIRECT', 'Tracked SAML request binding was not Redirect.', trackedRequest.json)
    assert(report.checks.tracked_request_id === expectedRequestId, 'Tracked SAML request_id did not match the supported AuthnRequest fixture.', trackedRequest.json)
    assert(report.checks.login_contains_signature, 'SAML login response did not include signature envelope.', samlResponseXml)
    assert(report.checks.login_contains_expected_audience, 'SAML login response did not include expected audience.', samlResponseXml)
    assert(report.checks.login_contains_expected_authn_context, 'SAML login response did not include expected authn context.', samlResponseXml)
    assert(report.checks.login_echoes_relay_state, 'SAML login did not echo expected relay state.', loginResponse.json)
    assert(report.checks.login_contains_in_response_to_supported_request, 'SAML login response did not retain the supported AuthnRequest correlation id.', samlResponseXml)
    assert(report.checks.logout_contains_signature, 'SAML logout response did not include signature envelope.', samlLogoutXml)
    assert(report.checks.logout_contains_in_response_to, 'SAML logout response did not include expected InResponseTo value.', samlLogoutXml)
    assert(report.checks.uncorrelated_logout_rejected, 'Uncorrelated SAML logout was not rejected.', uncorrelatedLogoutResponse)
    assert(report.checks.idp_initiated_request_id_present, 'IdP-initiated flow did not yield request id.', idpInitiatedResponse.json)
    assert(report.checks.idp_initiated_mode === 'IDP_INITIATED', 'IdP-initiated request did not record expected initiation mode.', idpInitiatedResponse.json)
    assert(report.checks.idp_initiated_login_echoes_request_id, 'IdP-initiated login did not echo request id.', idpInitiatedLoginResponse.json)
    assert(report.checks.idp_initiated_login_echoes_relay_state, 'IdP-initiated login did not echo relay state.', idpInitiatedLoginResponse.json)
    assert(report.checks.idp_initiated_response_contains_destination, 'IdP-initiated login response did not include expected ACS destination.', idpInitiatedSamlResponseXml)
    assert(report.checks.idp_initiated_request_completed, 'IdP-initiated tracked request did not complete.', idpInitiatedRequestDetail.json)

    const reportPath = writeReport(reportName, report)
    console.log(JSON.stringify({ ...report, report_path: reportPath }, null, 2))
  } finally {
    await api.stop()
  }
}

async function main() {
  await runBoundedSamlSpInteroperability()
}

module.exports = {
  runBoundedSamlSpInteroperability,
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
