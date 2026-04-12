---
id: protocol-support-matrix
type: reference
domain: protocol-support-matrix.md
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, protocol-support-matrix.md]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Protocol Support Matrix

Last updated: 2026-04-11

## Purpose

This document is the Phase 0 support matrix for protocol-facing standalone IAM capabilities.

It defines the current supported surface, deferred surface, and required evidence for advancement.

The runtime mirror of these decisions is published through `GET /api/v1/iam/support-profiles` and backed by [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts). The review runtime now consumes that support posture so claim-bearing review outputs do not promote a capability from mere feature presence.

## Protocol Matrix

| Capability | Current maturity | Current evidence | Supported now | Not yet supported as a product claim | Next gate |
| --- | --- | --- | --- | --- | --- |
| OIDC discovery and JWKS | Supported | External interoperability | Realm discovery and JWKS publication for the supported validation and public-client profiles | Broad parity claims across all client profiles | Extend into explicit production deployment profile evidence |
| OIDC auth-code plus PKCE | Supported | External interoperability | Supported public-client browser flow with consent and logout/session reuse behavior | Broad browser/OIDC parity across all client types and edge cases | Add more external client coverage and support-matrix profile detail |
| Refresh token flow | Supported | External interoperability | Default-scope refresh flow journey | All refresh modes and policy variants | Harden and document supported refresh policies |
| Token introspection and revocation | Implemented | Internal runtime | Present in runtime and routes | Broad production-grade claims at scale | Add explicit scale and concurrent-instance evidence |
| Userinfo | Supported | External interoperability | Present in the supported OIDC browser journey | Broader profile claims | Preserve and include in supported OIDC profile set |
| Dynamic client registration | Supported for bounded profile | External interoperability | Supported public OIDC registration path with client-policy enforcement | Broad registration support for all client profiles | Publish exact supported registration profile rules |
| PAR | Implemented | Internal runtime | Route and runtime are present | Broad supported claim | External interoperability and profile declaration |
| Device authorization | Implemented to narrowly supported | External interoperability | Journey-tested baseline device flow | Full standards-profile claim | Harden approval, lifecycle, and scale semantics |
| CIBA | Implemented | Internal runtime | Route and runtime are present | Supported product claim | Add external validation and support-profile declaration |
| Token exchange | Implemented to narrowly supported | External interoperability | Journey-tested bounded flow exists | Broad token-exchange support claim | Harden supported profile set and lineage semantics |
| UMA / permission ticket token behavior | Implemented | Internal runtime plus narrow interoperability | Minimal UMA-style ticket and evaluation paths exist | Broad UMA parity claim | Define supported protected-resource profile and validate externally |
| SAML IdP metadata | Implemented | Internal runtime | Metadata route is present | Product-grade SAML support claim | Define exact supported SAML SP profiles |
| SAML auth / response / logout | Implemented | Internal runtime | Request tracking, continuation, login, logout, and session APIs exist | Supported SAML profile claim | Assertion, signing, and logout hardening with external SP validation |
| Passkey / WebAuthn authentication | Implemented | Internal runtime | Browser-visible runtime exists | Supported standards-grade WebAuthn claim | Browser interoperability and standards-grade validation |

## Immediate Phase 0 Decisions

- Supported product claims should currently be limited to the bounded OIDC browser and dynamic-registration profiles already covered by journey tests.
- SAML and passkey flows should remain `Implemented` in product language until their support matrices are hardened with explicit supported-profile definitions and stronger evidence.
- PAR, CIBA, and broader advanced OAuth capabilities should be described as present or implemented, not broadly supported, unless and until their supported profiles are declared and validated.
