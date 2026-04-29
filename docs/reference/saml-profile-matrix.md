---
id: saml-profile-matrix
type: reference
domain: saml-profile-matrix.md
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, saml-profile-matrix.md]
last_updated: "2026-04-29"
related: []
---
# Headless IAM SAML Profile Matrix

Last updated: 2026-04-29

## Purpose

This document is the Phase 0 support matrix for standalone IAM SAML claims.

The runtime mirror of this matrix is published through `GET /api/v1/iam/saml/support-matrix` and backed by [iamSamlSupportMatrixRuntime.ts](../../apps/api-server/src/platform/iamSamlSupportMatrixRuntime.ts).

## Current Status

The implementation includes:

- metadata generation,
- auth request tracking,
- continuation,
- direct login,
- logout,
- and SAML session tracking.

The implementation does not yet support broad service-provider interoperability claims, but it now does define one runtime-enforced bounded service-provider contract.

There is now also a reproducible bounded SP-facing evidence artifact for that contract in [latest-bounded-saml-sp-interoperability.json](../../tests/integration/latest-bounded-saml-sp-interoperability.json). That artifact proves the declared Redirect/Post profile end to end through metadata, request tracking, request-shape rejection, signed login response issuance, and signed logout response issuance.

The repository also now contains a target-driven harness artifact in [latest-bounded-saml-sp-target-harness.json](../../tests/integration/latest-bounded-saml-sp-target-harness.json), a first SP-family-shape calibration artifact in [latest-bounded-saml-sp-family-shape-calibration.json](../../tests/integration/latest-bounded-saml-sp-family-shape-calibration.json), a first live external SimpleSAMLphp artifact in [latest-bounded-saml-sp-live-external-target.json](../../tests/integration/latest-bounded-saml-sp-live-external-target.json), and the corresponding target matrix in [saml-third-party-sp-targets.md](./saml-third-party-sp-targets.md). Those lanes prove the bounded profile can be executed from an explicit target manifest, that the first SP-family-shaped fixture stays aligned to runtime, and that one real external SP family target now passes under the bounded profile. They do not yet replace broader third-party SP validation.

The runtime now enforces the following bounded profile rules:

- SAML ACS URLs must exactly match registered client redirect URIs,
- wildcard ACS redirect patterns are rejected for SAML clients,
- `REDIRECT` is the only supported request binding,
- `POST` is the only supported response binding,
- `request_id` is required for the bounded profile,
- passive requests and `AllowCreate=true` are rejected,
- supported `NameIDPolicy` formats are limited to `emailAddress` and `unspecified`,
- and supported requested authentication context is limited to `PasswordProtectedTransport`.

## Declared Bounded SP Profile

The currently declared bounded service-provider contract is:

- Profile ID: `saml-sp-bounded-redirect-post-v1`
- Profile name: `Bounded SAML SP Redirect/Post profile`
- SP-initiated flow: supported
- IdP-initiated flow: supported
- Supported request bindings:
  - `REDIRECT`
- Supported response bindings:
  - `POST`
- ACS handling:
  - exact ACS match required
  - wildcard ACS patterns rejected
- Correlation requirements:
  - `request_id` required
  - maximum `request_id` length `256`
- `NameIDPolicy`:
  - supported formats: `emailAddress`, `unspecified`
  - `AllowCreate=true` rejected
- `RequestedAuthnContext`:
  - supported comparison: `exact`
  - supported class: `PasswordProtectedTransport`
- Unsupported request variants:
  - passive requests
  - unsupported response bindings
  - unsupported `NameIDPolicy` formats
  - unsupported authentication context classes
- Response posture:
  - signed login responses required
  - signed logout responses required

This is the exact contract published through `GET /api/v1/iam/saml/support-matrix`. It is a runtime-enforced bounded profile, not yet a broadly supported SAML interoperability claim.

## Profile Matrix

| SAML area | Current maturity | Evidence class | Current product posture | Next gate |
| --- | --- | --- | --- | --- |
| Metadata endpoint | Implemented to bounded profile | Internal runtime | Present and exercised by the bounded SP-facing interoperability artifact and target-driven harness | Third-party SP validation |
| SP-initiated request tracking | Implemented to bounded profile | Internal runtime | Present and exercised by the bounded SP-facing interoperability artifact and target-driven harness | Third-party SP validation |
| SAML response issuance | Implemented to bounded profile | Internal runtime | Present, signed, and exercised by the bounded SP-facing interoperability artifact and target-driven harness | Third-party SP validation and remaining assertion hardening |
| SAML logout response | Implemented to bounded profile | Internal runtime | Present, signed, and exercised by the bounded SP-facing interoperability artifact and target-driven harness | Third-party SP logout interoperability validation |
| SAML session tracking and termination | Implemented | Internal runtime | Present and integrated with browser session lifecycle | Shared durable-state and external SP evidence |
| Supported SP profile definition | Implemented to bounded profile with first external candidate | External interoperability candidate | A bounded Redirect/Post SP contract is enforced in runtime, backed by dedicated SP-facing artifacts, and now exercised against one live external SimpleSAMLphp target; the broader supported SP matrix is still not externally validated | More than one external SP target and explicit bounded support promotion |

## Current Claim Boundary

The product may claim:

- implemented SAML IdP lifecycle surface,
- metadata, request tracking, login, logout, and session APIs,
- internal SAML lifecycle integration with browser-session handling,
- a runtime-enforced bounded Redirect/Post service-provider contract,
- bounded SP-facing artifact evidence for metadata, request tracking, login, and logout under that contract,
- a target-driven harness calibrated to the same bounded profile,
- and one live external SimpleSAMLphp interoperability candidate artifact for that bounded profile.

The product shall not yet claim:

- broadly supported SAML service-provider interoperability,
- standards-grade SAML profile coverage,
- or production-grade SAML parity with mature IAM products.
