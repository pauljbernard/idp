# Headless IAM SAML Profile Matrix

Last updated: 2026-04-11

## Purpose

This document is the Phase 0 support matrix for standalone IAM SAML claims.

The runtime mirror of this matrix is published through `GET /api/v1/iam/saml/support-matrix` and backed by [iamSamlSupportMatrixRuntime.ts](../../../apps/api-server/src/platform/iamSamlSupportMatrixRuntime.ts).

## Current Status

The implementation includes:

- metadata generation,
- auth request tracking,
- continuation,
- direct login,
- logout,
- and SAML session tracking.

The implementation does not yet define a fully hardened supported-profile set for external service-provider integrations.

The runtime now enforces one narrow supported-profile rule:

- SAML ACS URLs must exactly match registered client redirect URIs,
- and wildcard ACS redirect patterns are rejected for SAML clients.

## Profile Matrix

| SAML area | Current maturity | Evidence class | Current product posture | Next gate |
| --- | --- | --- | --- | --- |
| Metadata endpoint | Implemented | Internal runtime | Present | Define exact metadata commitments for supported SP profiles |
| SP-initiated request tracking | Implemented | Internal runtime | Present | External SP validation |
| SAML response issuance | Implemented | Internal runtime | Present but handcrafted | Assertion and signing hardening |
| SAML logout response | Implemented | Internal runtime | Present but handcrafted | Logout interoperability validation |
| SAML session tracking and termination | Implemented | Internal runtime | Present and integrated with browser session lifecycle | Shared durable-state and external SP evidence |
| Supported SP profile definition | Implemented to bounded profile | Internal runtime | Exact ACS matching and wildcard rejection are now enforced, but the broader supported SP matrix is still not fully declared | Publish the first supported SP matrix |

## Current Claim Boundary

The product may claim:

- implemented SAML IdP lifecycle surface,
- metadata, request tracking, login, logout, and session APIs,
- and internal SAML lifecycle integration with browser-session handling.

The product shall not yet claim:

- broadly supported SAML service-provider interoperability,
- standards-grade SAML profile coverage,
- or production-grade SAML parity with mature IAM products.
