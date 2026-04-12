---
id: headless-iam-status-matrix
type: reference
domain: readiness
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, headless-iam-status-matrix.md]
last_updated: "2026-04-12"
related: []
---
# Headless IAM Status Matrix

Last updated: 2026-04-11

## Purpose

This document is the formal implementation status matrix for the standalone IAM product under the updated specification model.

It evaluates the current repository against:

- [Platform Constitution](../foundation/constitution.md)
- [Platform Requirements](../specs/platform-requirements.md)
- [Capability Maturity Standard](./maturity-model.md)
- existing planning and readiness artifacts under [`../implementation/planning`](../implementation/planning/) and [`../implementation/deployment`](../implementation/deployment/)

This document is intended to answer three questions:

1. what tier each capability belongs to,
2. what its current maturity and evidence class are,
3. and what roadmap step is required next.

## Maturity Legend

- `Modeled`
- `Implemented`
- `Supported`
- `Production-grade`
- `Externally validated`

## Evidence Legend

- `Synthetic`
- `Internal runtime`
- `External interoperability`
- `Operational`

## Executive Status

The current standalone IAM implementation is best described as:

- constitutionally aligned in product direction,
- feature-rich enough to support a serious standalone IAM release candidate,
- not yet support-matrix complete,
- not yet production-grade as a full standalone IdP,
- and not yet parity-credible outside a narrow supported OIDC surface.

The primary maturity blockers remain:

- process-local state and shared-state credibility,
- standards hardening for passkeys and SAML,
- live federation adapter depth,
- and evidence quality beyond synthetic or internal validation.

Architectural boundary correction has also progressed in the current workspace:

- the IDP no longer publishes CMS-specific workflow routes as product-owned public API surface
- the IDP no longer publishes CMS-specific governance-access routes as product-owned public API surface
- application-specific LMS, scheduling, and workforce identity-binding contracts have been removed from the IDP contract set and replaced with the generic IAM contract [iam-external-identity-bindings-api.json](../../contracts/api/iam-external-identity-bindings-api.json)
- governance workflow and governance access are now exposed through neutral route and facade names, while the remaining physical extraction into `saas-cms` is tracked in [SaaS CMS Governance Extraction Plan](../implementation/planning/saas-cms-governance-extraction-plan.md)

Operational readiness evidence has improved materially in the current workspace:

- readiness review now fails closed on `secret-store-key-source=FAIL` when encryption still uses development fallback key material
- backup, restore, signing-key rotation, and recovery-drill evidence now have explicit freshness windows rather than simple artifact-exists semantics
- restore readiness now requires a validated `DRY_RUN` rehearsal that matches the current backup lineage
- recovery drill evidence now distinguishes checksum-valid restore lineage from current-backup targeting, and both readiness and health degrade when a drill was run against an older backup or when drill evidence is stale
- those gates are now exercised through direct runtime tests and authenticated HTTP surfaces for operations health, recovery, and readiness review

Current live workspace evidence on 2026-04-11 reinforces that assessment:

- the local API now serves the expected browser-bootstrap compatibility contract at `/api/v1/auth/iam/config`
- the live IAM operations health route returns `overall_status=DEGRADED`
- the most important active blocker remains `runtime-cutover-readiness=WARN`, because shared-durable v2 runtime activation has not yet been proven in a target environment
- a dual-write rehearsal with `IDP_DDB_RUNTIME_DUAL_WRITE=true` correctly drives the live health route to `overall_status=FAILED` with explicit `NOOP_FALLBACK` for sessions, tickets, login transactions, and issued tokens, which confirms the current blocker is shared runtime infrastructure rather than missing cutover observability
- a subsequent local Dynamo-backed rehearsal now proves the positive path as well: with `IDP_IAM_RUNTIME_DDB_TABLE` and `IDP_DYNAMODB_ENDPOINT` set to a reachable runtime table, `runtime-cutover-readiness=PASS` and all Sequence A entity families resolve to `DYNAMO_V2_ACTIVE`
- a governed local Stage 2 ticket-path run now also exists for password reset, email verification, and MFA enrollment in [Headless IAM Ticket Local Dynamo Evidence](../implementation/deployment/headless-iam-ticket-local-dynamo-evidence.md), including direct v2 table evidence and post-restart continuity
- one Dynamo-backed pending-MFA replacement semantic gap was discovered during that run and closed in code with targeted regression coverage, which improves local Phase 1 confidence but does not replace the shared-environment claim gate
- a governed local Stage 2 session-path run now exists in [Headless IAM Session Local Dynamo Evidence](../implementation/deployment/headless-iam-session-local-dynamo-evidence.md), covering session creation, touch, listing, targeted revoke, revoke-other-sessions, restart continuity, and expired-session rejection on the Dynamo-backed runtime
- two session read-path gaps were found during that run and corrected so `/account/sessions` and `/account/session` now honor the v2-backed async resolver path when runtime cutover flags are enabled
- a governed local Stage 2 issued-token run now exists in [Headless IAM Issued Token Local Dynamo Evidence](../implementation/deployment/headless-iam-issued-token-local-dynamo-evidence.md), covering authorization-code issuance, password-grant issuance, refresh exchange, direct revoke, browser-session-linked revoke, subject-wide revoke, direct v2 table evidence, and restart continuity for active and revoked tokens
- this means every `Sequence A` runtime entity family now has local positive-path proof on the Dynamo-backed Stage 2 runtime, while the formal claim gate still remains blocked on repetition in the intended shared target environment

## Status Matrix

| Capability family | Requirement tier | Current maturity | Evidence class | Current status | Primary evidence | Next move |
| --- | --- | --- | --- | --- | --- | --- |
| Realms, users, groups, roles, clients, scopes, mappers | Core release | Supported | Internal runtime | Broad CRUD and admin surface is present and coherent | [server.ts](../../apps/api-server/src/server.ts), [contract-manifest.json](../../contracts/sdk-iam/contract-manifest.json) | Harden persistence and publish support boundaries |
| Account console, password, MFA, sessions, linked identities | Core release | Supported | Internal runtime | Strong standalone account plane | [server.ts](../../apps/api-server/src/server.ts) | Harden session semantics and add support-matrix boundaries |
| Organizations, memberships, invitations | Core release | Supported | Internal runtime | Strong B2B and org-lifecycle support | [server.ts](../../apps/api-server/src/server.ts) | Add supported-profile definitions for org-linked federation patterns |
| User profile schema and privacy governance | Core release | Supported | Internal runtime | Real schema, attribute governance, and privacy metadata exist | [iamUserProfiles.ts](../../apps/api-server/src/platform/iamUserProfiles.ts) | Expand admin UX and external validation where needed |
| OIDC discovery, token, introspection, revocation, userinfo | Core release | Supported for a narrow profile | External interoperability | Supported public-client browser/OIDC profile has journey evidence | [server.ts](../../apps/api-server/src/server.ts), [tests/journeys/oidc-browser.spec.ts](../../tests/journeys/oidc-browser.spec.ts), [tests/journeys/oidc-refresh.spec.ts](../../tests/journeys/oidc-refresh.spec.ts) | Publish the supported OIDC profile explicitly and harden remaining flow edges |
| Browser auth-code plus PKCE | Core release | Supported for a narrow profile | External interoperability | Journey-tested, but still not broad parity proof | [tests/journeys/oidc-browser.spec.ts](../../tests/journeys/oidc-browser.spec.ts) | Define the support matrix and extend interoperability proof |
| Passkeys / WebAuthn | Core release | Implemented, not yet supported | Internal runtime | Enrollment and login flows exist, and the runtime now rejects software-backed registrations, but support posture is still below a standards-grade browser/authenticator claim | [iamWebAuthn.ts](../../apps/api-server/src/platform/iamWebAuthn.ts), [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [server.ts](../../apps/api-server/src/server.ts) | WS4 passkey contract hardening and browser interoperability |
| SAML IdP lifecycle | Core release | Implemented, not yet supported | Internal runtime | Metadata, auth, continue, login, logout, and session handling exist, and ACS matching is now exact/non-wildcard, but the supported SP profile set is not yet fully hardened | [iamProtocolRuntime.ts](../../apps/api-server/src/platform/iamProtocolRuntime.ts), [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [tests/journeys/saml-idp.spec.ts](../../tests/journeys/saml-idp.spec.ts) | Define supported SAML profiles and harden assertions and logout |
| Configurable auth flows and required actions | Core release | Implemented | Internal runtime | Runtime and admin surface are present | [server.ts](../../apps/api-server/src/server.ts) | Expand authenticator depth and declare supported execution combinations |
| Identity brokering: OIDC and SAML | Core release | Experimental | Internal runtime | Broker catalog and broker login work, but the current posture still depends on synthetic-first external providers | [iamFederationRuntime.ts](../../apps/api-server/src/platform/iamFederationRuntime.ts), [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [server.ts](../../apps/api-server/src/server.ts) | Replace synthetic-first broker adapters with live supported profiles |
| Backup, restore, key rotation, resilience, readiness review | Core release | Implemented, not yet supported | Internal runtime | Strong productized operations surface exists and now enforces freshness, secret-key-source hardening, restore lineage, and recovery-drill lineage gates, but the evidence still remains local/internal rather than production operational proof | [iamOperationsRuntime.ts](../../apps/api-server/src/platform/iamOperationsRuntime.ts), [iamRecoveryRuntime.ts](../../apps/api-server/src/platform/iamRecoveryRuntime.ts), [iamHealthRuntime.ts](../../apps/api-server/src/platform/iamHealthRuntime.ts), [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [server.ts](../../apps/api-server/src/server.ts) | Repeat these gated rehearsals in the intended shared target environment and capture operational evidence artifacts |
| Dynamic client registration and client policies | Parity track | Supported for a bounded profile | External interoperability | Real routes, policy objects, initial and registration access tokens, and journey evidence exist | [iamAdvancedOAuthRuntime.ts](../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts), [tests/journeys/oidc-dynamic-registration.spec.ts](../../tests/journeys/oidc-dynamic-registration.spec.ts) | Harden semantics and elevate from bounded support to parity-grade support |
| PAR, device authorization, CIBA, token exchange | Parity track | Implemented to narrowly supported | External interoperability | Routed and partially journey-tested, but only bounded support should be claimed today | [server.ts](../../apps/api-server/src/server.ts), [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [tests/journeys/oidc-device-flow.spec.ts](../../tests/journeys/oidc-device-flow.spec.ts), [tests/journeys/oidc-token-exchange.spec.ts](../../tests/journeys/oidc-token-exchange.spec.ts) | Publish supported profile matrix and close remaining interoperability gaps |
| Fine-grained admin authorization and impersonation | Parity track | Implemented | Internal runtime | Permission, policy, evaluation, and impersonation surfaces exist | [iamAdminAuthorization.ts](../../apps/api-server/src/platform/iamAdminAuthorization.ts), [server.ts](../../apps/api-server/src/server.ts) | Broaden coverage and prove resource-bound evaluation semantics |
| Authorization services and UMA | Parity track | Implemented | Internal runtime plus narrow interoperability | Resource servers, policies, permissions, evaluations, tickets, and UMA-facing routes exist | [iamAuthorizationServices.ts](../../apps/api-server/src/platform/iamAuthorizationServices.ts), [tests/journeys/oidc-uma.spec.ts](../../tests/journeys/oidc-uma.spec.ts) | Harden semantics and define supported protected-resource profiles |
| Extension and provider runtime | Parity track | Modeled | Synthetic | Registry and binding catalogs exist, but there is still no product-grade execution model | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [server.ts](../../apps/api-server/src/server.ts) | Build runtime execution boundaries before making platform claims |
| LDAP and directory federation | Parity track | Modeled | Synthetic | Provider families are represented, but still synthetic rather than live | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [iamFederationRuntime.ts](../../apps/api-server/src/platform/iamFederationRuntime.ts) | Deliver the first live directory adapter or mark as deferred |
| SCIM-style federation | Differentiator track | Modeled | Synthetic | Present as a differentiator candidate, not live support | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [iamFederationRuntime.ts](../../apps/api-server/src/platform/iamFederationRuntime.ts) | Decide whether to promote or explicitly defer |
| Application-binding and consumer contracts | Differentiator track | Supported | Internal runtime | One of the strongest unique surfaces in the product | [server.ts](../../apps/api-server/src/server.ts), [apps/api-server/test/applicationConsumerRuntime.test.ts](../../apps/api-server/test/applicationConsumerRuntime.test.ts) | Preserve and document as a supported differentiator |
| Privacy-aware projection and attribute governance | Differentiator track | Supported | Internal runtime | Concrete schema and governance model exists | [iamUserProfiles.ts](../../apps/api-server/src/platform/iamUserProfiles.ts) | Preserve and align to regulated-profile support matrices |
| Explicit readiness, recovery, and review evidence | Differentiator track | Implemented | Internal runtime | Strong differentiator candidate with concrete policy gates for freshness, key-source hardening, restore lineage, and recovery-drill lineage, but evidence quality is still too internal for broader market claims | [iamOperationsRuntime.ts](../../apps/api-server/src/platform/iamOperationsRuntime.ts), [iamRecoveryRuntime.ts](../../apps/api-server/src/platform/iamRecoveryRuntime.ts), [iamHealthRuntime.ts](../../apps/api-server/src/platform/iamHealthRuntime.ts) | Move from internal gated evidence to operational evidence in the target environment |
| AWS-native low-idle-cost posture | Differentiator track | Modeled | Synthetic | Architecture intent is strong, but the operating posture is not yet proven | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [Platform Requirements](../specs/platform-requirements.md), [Platform Constitution](../foundation/constitution.md) | Convert architecture intent into deployment and cost evidence |
| DPoP | Deferred | Modeled absent | Synthetic | Explicitly deferred and not implemented | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [Headless IAM Gap Remediation Plan](../implementation/deployment/gap-remediation.md) | Explicitly defer or schedule |
| Kerberos / SPNEGO | Deferred | Modeled absent | Synthetic | Explicitly deferred and not implemented | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [Headless IAM Gap Remediation Plan](../implementation/deployment/gap-remediation.md) | Explicitly defer or schedule |
| Multi-site / rolling-upgrade posture | Deferred | Modeled absent | Synthetic | Explicitly deferred and not implemented | [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [Headless IAM Gap Remediation Plan](../implementation/deployment/gap-remediation.md) | Explicitly defer or schedule |

## Current Release Readiness Assessment

### Core Release

The implementation is close to a credible `Core release`, but it is not yet there because these core blockers remain:

- passkeys or WebAuthn are only `Implemented`, not yet `Supported`,
- SAML is only `Implemented`, not yet `Supported`,
- federation support is not yet backed by live adapters,
- shared durable state is not yet `Production-grade`,
- and support matrices are not yet fully established in governed documents.

The readiness and recovery portion of that blocker is now narrower than before. In the local workspace, readiness no longer approves on artifact presence alone; it now requires:

- environment-configured secret-store key material,
- fresh backup, restore, and signing-key rotation evidence,
- validated restore rehearsal against the current backup lineage,
- and a fresh recovery drill that validates lineage and targets the latest available backup.

That closes much of the internal semantics gap for operations credibility, but it still does not elevate the evidence class beyond `Internal runtime`.

The runtime now exposes an explicit support-profile surface through [iamSupportProfileRuntime.ts](../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) and `GET /api/v1/iam/support-profiles`, and the review runtime consumes that posture for claim-bearing areas. That closes the gap where review state could previously imply support from feature presence alone, but it does not by itself elevate any capability to supported or production-grade status.

### Parity Track

The implementation contains substantial `Parity track` surface, but parity claims remain premature because:

- several parity capabilities remain below `Supported`,
- evidence is still mostly `Internal runtime` rather than `Operational`,
- and major federation and HA gaps remain unresolved.

### Differentiator Track

The implementation already contains promising differentiator surfaces, especially:

- application-binding and consumer contracts,
- privacy-aware profile governance,
- and explicit readiness, recovery, and review artifacts.

These should be preserved, but they should not substitute for core protocol and runtime credibility work.

## Roadmap Recommendation

The next execution sequence should be:

1. `Phase 0` — claim hygiene and support matrices
2. `Phase 1` — shared durable state and concurrent-instance credibility
3. `Phase 2` — narrow supported OIDC surface hardening
4. `Phase 3` — passkey and SAML support hardening
5. `Phase 4` — live federation adapter execution
6. `Phase 5` — parity-track deepening and explicit defer/deliver decisions for remaining enterprise deltas
7. `Phase 6` — operational proof for differentiator claims

This order preserves the updated spec model:

- support must be explicit,
- maturity must be declared,
- and evidence quality must improve before broader product claims are made.
