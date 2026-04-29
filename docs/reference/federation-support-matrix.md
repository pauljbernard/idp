---
id: federation-support-matrix
type: reference
domain: federation-support-matrix.md
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, federation-support-matrix.md]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Federation Support Matrix

Last updated: 2026-04-11

## Purpose

This document is the Phase 0 support matrix for federation, brokering, and provider-family execution.

It separates:

- provider families that are represented in the runtime,
- provider families that execute through real supported paths,
- and provider families that remain modeled or synthetic.

## Federation Matrix

| Provider family | Current maturity | Evidence class | Current product posture | Support decision | Next gate |
| --- | --- | --- | --- | --- | --- |
| OIDC broker login | Implemented | Internal runtime | Broker catalog and broker login flow exist, but current default fixtures are synthetic | Experimental / bounded support only | Replace synthetic-first adapters with live supported broker profiles |
| SAML broker login | Implemented | Internal runtime | Runtime path exists, but default fixtures are synthetic | Experimental / bounded support only | Same as OIDC broker: live supported adapters and external tests |
| LDAP directory federation | Modeled | Synthetic | Provider family exists in records and sync model, but seeded behavior is synthetic | Not yet supported | First live directory adapter and external sync/import test |
| SCIM-style directory federation | Modeled | Synthetic | Present as a differentiator candidate only | Not yet supported | Explicit promote-or-defer decision |
| AWS Identity Center federation family | Modeled | Synthetic | Represented in kind enums and planning posture | Deferred | Explicit defer or later live adapter work |
| Cognito user-pool federation family | Modeled | Synthetic | Represented in kind enums and planning posture | Deferred | Explicit defer or later live adapter work |
| Federation failover monitoring | Implemented | Internal runtime | Health and failover surfaces exist | Experimental / internal-only claim | Tie to live provider execution and operational evidence |
| Linked identity tracking | Supported | Internal runtime | Linked-identity and broker-link lifecycle exists inside the standalone plane | Supported for implemented broker flows | Preserve and expand with live adapters |

## Current Claim Boundary

The current standalone IAM product should not claim broad support for LDAP, SCIM, AWS Identity Center, or Cognito federation.

The current standalone IAM product may claim:

- implemented broker login runtime for bounded OIDC and SAML provider profiles,
- linked-identity lifecycle support,
- and implemented federation administration and review surfaces.

It should not yet claim:

- enterprise-grade live federation depth,
- standards-grade support for directory sync families,
- or production-grade federation failover.
