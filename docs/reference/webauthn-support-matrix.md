---
id: webauthn-support-matrix
type: reference
domain: webauthn-support-matrix.md
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, webauthn-support-matrix.md]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Passkey Support Matrix

Last updated: 2026-04-11

## Purpose

This document is the Phase 0 support matrix for passkey and WebAuthn capability claims.

The runtime mirror of this matrix is published through `GET /api/v1/iam/webauthn/support-matrix` and backed by [iamPasskeySupportMatrixRuntime.ts](../../apps/api-server/src/platform/iamPasskeySupportMatrixRuntime.ts).

## Current Status

Passkey registration, credential inventory, revocation, and login runtime paths exist in the standalone IAM surface.

However, the current implementation remains below supported product-claim status because standards-grade browser and authenticator interoperability has not yet been established for a declared support set.

The current bounded runtime now enforces one important part of that boundary:

- software-backed passkey transports are rejected for new registrations,
- and the runtime only advertises the declared transport classes `INTERNAL`, `HYBRID`, `USB`, `NFC`, and `BLE`.

## Support Matrix

| Surface | Current maturity | Evidence class | Current product posture | Next gate |
| --- | --- | --- | --- | --- |
| Account passkey enrollment begin/complete | Implemented | Internal runtime | Present and usable in the standalone runtime | Standards-grade validation and browser support declaration |
| Passkey login begin/complete | Implemented | Internal runtime | Present and usable in the standalone runtime | Standards-grade validation and browser support declaration |
| Passkey credential inventory and revocation | Implemented | Internal runtime | Present in account and admin-facing surfaces | Preserve and integrate into supported browser/authenticator profile set |
| Challenge persistence and maintenance | Implemented | Internal runtime | Transient maintenance and split-store coverage exist | Shared durable-state and replay-safety hardening |
| Browser interoperability | Modeled | Synthetic | Not yet explicitly declared | External browser test matrix |
| Authenticator support matrix | Implemented to bounded profile | Internal runtime | A bounded transport-class profile is now enforced for new registrations, but broad browser/authenticator support is not yet claimed | Explicit support matrix for platform, roaming, and software-backed authenticator classes |

## Current Claim Boundary

The product may claim:

- implemented passkey enrollment and authentication flows,
- implemented passkey credential management,
- and implemented transient-state maintenance for passkey challenges.

The product shall not yet claim:

- supported WebAuthn interoperability across browsers,
- supported authenticator combinations,
- or standards-grade passkey parity with mature IAM products.
