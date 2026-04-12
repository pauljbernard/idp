# Headless IAM Gap Remediation Plan

Last updated: 2026-04-11

## Purpose

This document converts the current implementation review into a concrete remediation plan.

It is intended to:

- align the implementation more closely with the constitution and requirements,
- close the credibility gap between modeled capability and production-ready capability,
- define the work required before any honest claim of Keycloak-class parity,
- and sequence the work so architecture blockers are resolved before more surface area is added.

## Review Baseline

This plan is based on:

- [constitution.idp.md](../constitution.idp.md)
- [requirements.idp.md](../requirements.idp.md)
- [capability-maturity-standard.idp.md](../capability-maturity-standard.idp.md)
- [Headless_IAM_Status_Matrix.md](./Headless_IAM_Status_Matrix.md)
- [Headless_IAM_Protocol_Support_Matrix.md](./Headless_IAM_Protocol_Support_Matrix.md)
- [Headless_IAM_Federation_Support_Matrix.md](./Headless_IAM_Federation_Support_Matrix.md)
- [Headless_IAM_Passkey_Support_Matrix.md](./Headless_IAM_Passkey_Support_Matrix.md)
- [Headless_IAM_SAML_Profile_Matrix.md](./Headless_IAM_SAML_Profile_Matrix.md)
- [Headless_IAM_Deployment_Mode_Matrix.md](./Headless_IAM_Deployment_Mode_Matrix.md)
- the current codebase under `apps/api-server` and `apps/enterprise-ui`
- current official Keycloak documentation reviewed on 2026-04-03:
  - [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
  - [Keycloak Authorization Services Guide](https://www.keycloak.org/docs/latest/authorization_services/index.html)
  - [Keycloak Supported Specifications](https://www.keycloak.org/securing-apps/specifications)
  - [Keycloak Feature Flags / Optional Features](https://www.keycloak.org/server/features)
  - [Keycloak High Availability: Multi-cluster deployments](https://www.keycloak.org/high-availability/multi-cluster/introduction)

## Program Decision

The current system is a serious standalone IAM implementation, but it is not yet a Keycloak-class production competitor.

The main issue is no longer feature count. The main issue is execution quality:

- shared durable state is not yet the real production source of truth,
- session and token handling is not yet distributed and scale-credible,
- some standards surfaces are implemented in custom or synthetic ways,
- benchmark and review evidence is still too synthetic,
- and several enterprise parity items remain absent.

The system must not be described as meeting or exceeding Keycloak until the gates in this plan are met.

## Execution Tracking Rules

All future progress reporting against this plan must include:

- current phase
- active workstream
- active iteration
- iteration completion percentage
- what has been completed in the current iteration
- what remains in the current iteration
- which phases are complete, active, or still pending
- the next planned execution sequence

Tracking rules:

- completion percentages are engineering implementation estimates against explicit checklists, not claim-gate proof
- claim gates remain binary and are not satisfied by partial percentages
- a phase is only marked complete when its exit conditions are met, even if most coding tasks are finished
- each continuation should update the current status before expanding scope

## Current Execution Status

Status date: 2026-04-11

| Tracking item | Current status |
| --- | --- |
| Current phase | `Phase 1` — State Foundation |
| Active workstream | `WS1` — Shared Durable State Plane |
| Active iteration | `Iteration 1C` — Live environment validation and cutover preconditions |
| Iteration completion | `94%` complete for local environment validation; shared-durable cutover evidence still pending |
| Phase completion | `In progress` |

Completed in the current iteration:

1. completed `Iteration 1A` repository-contract consolidation across the major mutable control-plane modules
2. published the first `Phase 1` baseline inventory in [Headless_IAM_State_Foundation_Baseline.md](./Headless_IAM_State_Foundation_Baseline.md)
3. introduced explicit repository boundaries in the primary control-plane modules: foundation, protocol, organizations, user profiles, admin authorization, authorization services, authentication runtime, federation runtime, and auth flows
4. confirmed the extraction pattern on both split-state and single-state modules while preserving current filesystem-backed behavior
5. published the residual-authority inventory in [Headless_IAM_State_Authority_Audit.md](./Headless_IAM_State_Authority_Audit.md)
6. published the first repository-to-adapter mapping and cutover recommendation in [Headless_IAM_Adapter_Cutover_Sequence.md](./Headless_IAM_Adapter_Cutover_Sequence.md)
7. published the first cutover implementation runbook in [Headless_IAM_Runtime_Cutover_Runbook.md](./Headless_IAM_Runtime_Cutover_Runbook.md) covering login transactions, tickets, sessions, and issued tokens
8. prepared the first execution-ready operator checklist in [Headless_IAM_Login_Transaction_Cutover_Checklist.md](./Headless_IAM_Login_Transaction_Cutover_Checklist.md) for the login-transaction dual-write and v2-read cutover path
9. prepared the second execution-ready operator checklist in [Headless_IAM_Ticket_Cutover_Checklist.md](./Headless_IAM_Ticket_Cutover_Checklist.md) for password reset, email verification, and pending-MFA ticket cutover
10. prepared the session cutover checklist in [Headless_IAM_Session_Cutover_Checklist.md](./Headless_IAM_Session_Cutover_Checklist.md) covering session creation, touch, listing, logout, and revocation behavior
11. prepared the issued-token cutover checklist in [Headless_IAM_Issued_Token_Cutover_Checklist.md](./Headless_IAM_Issued_Token_Cutover_Checklist.md) covering issuance, refresh, introspection, and revocation behavior
12. prepared the formal execution and dry-run recording template in [Headless_IAM_Runtime_Cutover_Evidence_Pack.md](./Headless_IAM_Runtime_Cutover_Evidence_Pack.md) so `Sequence A` can produce governed evidence instead of ad hoc notes
13. completed the first dry-run evidence assessment in [Headless_IAM_Login_Transaction_Dry_Run_Evidence.md](./Headless_IAM_Login_Transaction_Dry_Run_Evidence.md), confirming the login-transaction cutover path is structurally ready in code but still awaiting live environment proof
14. published the live-environment gate in [Headless_IAM_Runtime_Cutover_Environment_Readiness.md](./Headless_IAM_Runtime_Cutover_Environment_Readiness.md), including the explicit noop-fallback detection requirement for v2 repository activation
15. implemented runtime cutover adapter observability in the IAM health surface so `/api/v1/iam/operations/health` can distinguish `LEGACY_ONLY`, `DYNAMO_V2_ACTIVE`, and `NOOP_FALLBACK` states for Sequence A runtime domains
16. added regression coverage in `apps/api-server/test/runtimeCutoverHealth.test.ts` proving the health surface reports `WARN` for unproven legacy-only posture and `FAIL` for cutover flag activation that degrades to noop fallback
17. added authenticated HTTP-surface coverage in `apps/api-server/test/serverHttpSurface.test.ts` proving `/api/v1/iam/operations/health` exposes the runtime cutover readiness signal to operators through the real admin API route
18. added the standalone preflight verifier `scripts/verify-idp-runtime-cutover-readiness.sh` so operators can validate the live environment before beginning Sequence A evidence collection
19. integrated the runtime cutover preflight into the repo-level standalone verification surface by updating `scripts/verify-idp-standalone-baseline.sh` and the top-level README, and revalidated the baseline script successfully
20. extended the runtime cutover preflight to support structured JSON output so the first live environment gate can be attached directly to the formal Sequence A evidence pack
21. exposed the runtime cutover preflight through top-level npm scripts and documented the exact live-environment invocation pattern so operators can run the gate without remembering raw script paths
22. added the markdown rendering helper `scripts/render-idp-runtime-cutover-preflight.js` so preflight JSON can be turned into an evidence-pack section without manual formatting
23. added the live evidence scaffold `scripts/scaffold-idp-login-transaction-evidence.js` so the first Sequence A execution can start from a governed markdown document instead of a blank file
24. added the one-command preparer `scripts/prepare-idp-login-transaction-evidence.sh` and corresponding npm script so operators can generate both the preflight artifact and the first live evidence draft in a single step
25. extended the one-command preparer to emit a complete operator bundle with preflight JSON, preflight markdown, scaffolded evidence markdown, and a local bundle README describing the next execution steps
26. made the generated evidence bundle timestamped and environment-labeled by default so repeated live runs do not overwrite each other and can be compared cleanly
27. corrected the preflight artifact model so the generated bundle persists the raw health response directly instead of relying on an ephemeral temp-directory reference
28. corrected a local runtime startup blocker by accepting the legacy managed role alias `pilot` as a compatibility mapping to `specialist`, restoring the current workspace server boot path
29. restored the missing `/api/v1/auth/iam/config` compatibility endpoint so browser-bootstrap and runtime-cutover automation can resolve the configured standalone realm and client contract again
30. validated the live workspace environment on `http://127.0.0.1:4101`, proving that the API now serves the restored auth-config contract and returns a real `/api/v1/iam/operations/health` status from an authenticated browser session
31. recorded the current live environment result in [Headless_IAM_Runtime_Cutover_Environment_Readiness.md](./Headless_IAM_Runtime_Cutover_Environment_Readiness.md): `overall_status=DEGRADED` with `runtime-cutover-readiness=WARN` because the shared-durable v2 runtime path has not been activated yet
32. executed a clean dual-write rehearsal on `http://127.0.0.1:4110` with `IDP_DDB_RUNTIME_DUAL_WRITE=true`, proving that the health surface correctly transitions to `runtime-cutover-readiness=FAIL` and reports `NOOP_FALLBACK` for sessions, tickets, login transactions, and issued tokens when no real shared runtime repository is available
33. provisioned a local runtime entity table `idp-iam-runtime-local` on the existing DynamoDB Local endpoint at `http://127.0.0.1:8000`, including `gsi1`, `gsi2`, and TTL on `expires_at_epoch`
34. executed a clean dual-write activation on `http://127.0.0.1:4111` with the local runtime table wired in, proving that `runtime-cutover-readiness` advances to `PASS` and all Sequence A entity families resolve as `DYNAMO_V2_ACTIVE`
35. confirmed that the remaining blocker is now governed evidence capture and shared-environment repetition, not local cutover viability
36. added `deploy/iam-standalone/provision-dynamodb-local-runtime-table.sh` so the proven local DynamoDB Local setup can be reproduced without requiring LocalStack
37. recorded the first successful governed local evidence outcome in [Headless_IAM_Login_Transaction_Local_Dynamo_Evidence.md](./Headless_IAM_Login_Transaction_Local_Dynamo_Evidence.md)
38. updated the repo instructions so the local runtime cutover rehearsal path is explicit in the operator-facing README
39. extended the local evidence run through Stage 2 with `IDP_DDB_RUNTIME_READ_V2=true`, confirming that the runtime remains healthy while reading from the Dynamo-backed v2 path
40. completed the first local rollback proof from Stage 2 back to Stage 1, confirming that disabling `read_v2` while keeping dual-write active preserves healthy runtime-cutover posture
41. executed the first governed local ticket-path Stage 2 proof on `http://127.0.0.1:4115`, confirming live password reset issuance and redemption, email verification issuance and redemption, and MFA enrollment verification against the Dynamo-backed runtime path
42. captured the first direct local runtime-table evidence for the ticket-path run by scanning `idp-iam-runtime-local` and confirming the expected login transaction, session, password reset, email verification, and pending MFA rows
43. verified post-restart continuity for the Stage 2 runtime by restarting the API on the same flags and confirming the previously issued session still resolved with MFA enabled state intact
44. recorded the local ticket-path evidence in [Headless_IAM_Ticket_Local_Dynamo_Evidence.md](./Headless_IAM_Ticket_Local_Dynamo_Evidence.md)
45. closed a v2 semantics gap by correcting Dynamo-backed pending MFA replacement behavior to match the legacy adapter contract and adding targeted regression coverage in `apps/api-server/test/dynamoDbTicketRepository.test.ts`
46. proved active-ticket continuity after runtime reload under cutover flags by redeeming a password reset ticket after reloading the built authentication runtime against the same isolated persisted state root
47. proved ticket expiry maintenance under cutover flags by running `runTransientStateMaintenanceAsync()` against expired password reset, email verification, and pending MFA entities and confirming the expected `EXPIRED` or consumed transitions
48. executed the first governed local session-path Stage 2 proof on `http://127.0.0.1:4116`, confirming live MFA-backed session creation, touch, listing, targeted revocation, revoke-other-sessions semantics, restart continuity, and expired-session rejection against the Dynamo-backed runtime
49. recorded the local session-path evidence in [Headless_IAM_Session_Local_Dynamo_Evidence.md](./Headless_IAM_Session_Local_Dynamo_Evidence.md)
50. closed two runtime-read gaps by moving `/account/sessions` and `/account/session` onto async session-resolution paths under cutover flags so the live session surface now honors v2-backed reads
51. executed the first governed local issued-token Stage 2 proof on `http://localhost:4116`, confirming authorization-code issuance, password-grant issuance, active introspection, refresh exchange, direct revoke, browser-session-linked revoke, subject-wide revoke, direct v2 table evidence, and restart continuity for active and revoked tokens
52. recorded the local issued-token evidence in [Headless_IAM_Issued_Token_Local_Dynamo_Evidence.md](./Headless_IAM_Issued_Token_Local_Dynamo_Evidence.md)

Remaining in the current phase:

1. repeat the proven local dual-write activation in the intended shared target environment with a reachable runtime table so the same `DYNAMO_V2_ACTIVE` posture is established outside local development
2. repeat the now-proven local login-transaction, ticket-path, session-path, and issued-token evidence in that shared target environment, including explicit Stage 2 activation and rollback evidence
3. convert the remaining health-surface warnings into governed evidence or explicit backlog items: recovery drills, benchmark evidence, retained security-audit evidence, formal readiness review, and linked federated identity proof

### Phase 0 basis

The updated standalone IAM specification model now requires:

- explicit capability maturity states,
- support tiers,
- support matrices,
- and claim-boundary discipline.

Phase 0 is the first execution step because the product already contains enough implemented surface area that unsupported or synthetic capability claims can otherwise drift faster than the runtime matures.

### Phase 0 closeout assessment

`Phase 0` is now complete.

It established the baseline truth model required for the rest of the program:

- the capability-maturity standard is governed
- the status and support matrices are published
- primary analysis, wiki, runtime, and UI claim-bearing surfaces now distinguish implemented, supported, production-grade, and externally validated states
- older planning documents now defer current-state truth to the governed matrices instead of acting as implicit current-product status

### Phase status board

| Phase | Name | Status |
| --- | --- | --- |
| `Phase 0` | Truth and Freeze | Complete |
| `Phase 1` | State Foundation | In progress |
| `Phase 2` | Session and Token Foundation | Pending |
| `Phase 3` | Standards Hardening | Pending |
| `Phase 4` | Federation Runtime and Provider Execution | Pending |
| `Phase 5` | Real Evidence and Scale Validation | Pending |
| `Phase 6` | Remaining Parity Deltas | Pending |

### Next execution sequence

1. select the first shared-durable target environment and satisfy [Headless_IAM_Runtime_Cutover_Environment_Readiness.md](./Headless_IAM_Runtime_Cutover_Environment_Readiness.md), using `/api/v1/iam/operations/health` as the preflight noop-fallback gate and the new generic evidence-bundle helpers with `IDP_BASE_URL` pointed at that environment
2. execute the full local-proven `Sequence A` checklist set in that shared target environment across login transactions, tickets, sessions, and issued tokens, recording Stage 0, Stage 1, Stage 2, and rollback evidence in the same governed format
3. convert the resulting shared-environment evidence into a go/no-go decision for closing Phase 1 and beginning the narrower session-and-token hardening work in Phase 2

## Constitutional and Requirements Drivers

The most relevant obligations are:

- standalone reusable IAM subsystem capable of competing with Keycloak-class systems:
  - [constitution.idp.md:35](../constitution.idp.md:35)
  - [constitution.idp.md:37](../constitution.idp.md:37)
- standards-complete identity protocols, auth flows, federation, WebAuthn, organizations, admin APIs, authorization services, backup, restore, key rotation, resilience, and extension mechanisms:
  - [constitution.idp.md:41](../constitution.idp.md:41)
  - [constitution.idp.md:56](../constitution.idp.md:56)
  - [constitution.idp.md:57](../constitution.idp.md:57)
- Keycloak-class parity and strategic differentiation target:
  - [requirements.idp.md:56](../requirements.idp.md:56)
  - [requirements.idp.md:58](../requirements.idp.md:58)
- production-complete gate for auth-code plus PKCE, fuller SAML, auth flows, passkeys/WebAuthn, fine-grained admin authz, authz services:
  - [requirements.idp.md:113](../requirements.idp.md:113)
- adoption gate for browser, SAML, auth-flow, backup, restore, resilience, security audit, validation, and formal review:
  - [requirements.idp.md:119](../requirements.idp.md:119)
  - [requirements.idp.md:124](../requirements.idp.md:124)
  - [requirements.idp.md:127](../requirements.idp.md:127)
- AWS implementation default:
  - [requirements.idp.md:131](../requirements.idp.md:131)
  - [requirements.idp.md:138](../requirements.idp.md:138)

## Current Position

### Already real enough to preserve

- realms, users, groups, roles, clients, scopes, token endpoints, discovery, JWKS
- organizations and invitations
- configurable auth-flow model
- admin authorization model
- authorization services model
- advanced OAuth feature surface including PAR, device authorization, CIBA, token exchange
- standalone admin, login, and account UI

These should be hardened, not rewritten.

### Current credibility blockers

1. shared state and HA architecture
2. distributed session and token architecture
3. standards-grade WebAuthn and SAML behavior
4. federation and extension runtime maturity
5. real evidence for scale, recovery, interoperability, and security posture
6. explicit parity deltas still missing relative to Keycloak

## Gap Summary

| Gap | Why it matters | Current reality | Severity | Exit condition |
| --- | --- | --- | --- | --- |
| Process-local state as primary runtime architecture | Violates the practical intent of the AWS-native, multi-tenant, standalone product objective | Major stores still depend on in-process caches and snapshot persistence helpers | Critical | Shared durable repositories are authoritative for all major IAM domains |
| Session and token plane not yet scale-credible | Parity claims fail if revocation, sessions, codes, and grants are instance-local or weakly coordinated | Current state survives locally but is not yet a proven distributed session plane | Critical | Revocation, login, grant, and challenge flows are consistent across concurrent instances |
| Synthetic benchmark and review evidence | Overstates readiness relative to constitution and requirements | Internal review artifacts mark many areas PASS on counts and modeled state | Critical | Evidence is produced by real harnesses against production-like infrastructure |
| WebAuthn/passkeys are custom and synthetic | Requirement and market parity both depend on standards-grade passkeys | Current flow validates custom signatures over synthetic payloads | High | Browser/WebAuthn conformance tests pass and the runtime uses standards-grade validation |
| SAML implementation is handcrafted and limited | SAML is explicitly in-scope and still part of the production gate | XML is built manually and metadata posture remains limited | High | Supported SAML profiles are externally interoperable and operationally hardened |
| Federation and extension runtime remain mostly modeled | Keycloak parity requires more than catalogs and seed records | Federation sync and provider binding are present, but runtime depth is limited | High | Live adapters and a real provider execution model exist for supported profiles |
| Missing enterprise parity deltas | Some Keycloak features are still absent | DPoP, Kerberos/SPNEGO, multi-site posture, user-event metrics are not implemented | Medium | Explicitly delivered, deferred, or removed from parity claims |

## Workstreams

### WS0. Claim Hygiene and Baseline Control

#### Objective

Stop allowing synthetic artifacts to read like production proof.

#### Scope

- benchmark labeling
- review/report labeling
- release and readiness language
- parity scoreboard

#### Primary files

- [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts)
- [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts)
- [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts)
- [README.md](../../../README.md)
- planning docs under `docs/spec/plans`

#### Deliverables

1. Mark synthetic benchmark and review outputs as synthetic or modeled.
2. Separate internal validation artifacts from production evidence artifacts.
3. Define one parity scoreboard with statuses:
   - implemented
   - production-grade
   - externally validated
   - parity-credible
4. Freeze new major IAM feature additions unless they remove a blocker in this plan.
5. Publish and maintain governed support matrices for protocols, federation, passkeys, SAML profiles, and deployment modes.

#### Phase 0 implementation note

A runtime support-profile surface now exists in [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) and is published through `GET /api/v1/iam/support-profiles`.

This does not close the governed support-matrix deliverable by itself, but it does establish one executable source for the current claim boundary:

- `SUPPORTED_BOUNDED` for bounded OIDC browser and advanced OAuth surfaces
- `IMPLEMENTED_NOT_SUPPORTED` for passkeys, SAML, and operations/recovery posture
- `EXPERIMENTAL` for federation brokering
- `MODELED_ONLY` for extension runtime, LDAP, SCIM-style federation, and AWS-native posture
- `DEFERRED` for DPoP, Kerberos / SPNEGO, and multi-site / rolling-upgrade posture

#### Acceptance criteria

- No synthetic artifact is presented as production evidence.
- No parity claim is made without explicit gate status.
- Planning and product-assessment docs all point to the same truth model.

### WS1. Shared Durable State Plane

#### Objective

Replace process-local snapshot state with shared durable state as the production source of truth.

#### Scope

- realms, users, groups, roles
- clients, scopes, mappers
- organizations, invitations, user profiles
- admin authz state
- authz services state
- security and operations ledgers

#### Primary files

- [persistence.ts](../../../apps/api-server/src/platform/persistence.ts)
- [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamOrganizations.ts](../../../apps/api-server/src/platform/iamOrganizations.ts)
- [iamUserProfiles.ts](../../../apps/api-server/src/platform/iamUserProfiles.ts)
- [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts)
- [iamAdminAuthorization.ts](../../../apps/api-server/src/platform/iamAdminAuthorization.ts)

#### Deliverables

1. Define explicit repository contracts per major domain instead of widening generic snapshot helpers.
2. Implement DynamoDB-backed repositories for mutable IAM entities.
3. Use S3 for large artifacts:
   - exports
   - backups
   - theme assets
   - archived audit bundles
4. Add optimistic concurrency for all mutable writes.
5. Retain filesystem adapters only for local development through the same contracts.
6. Remove production dependence on `loadOrCreatePersistedState` as the primary persistence pattern for major IAM domains.

#### Acceptance criteria

- No major IAM domain uses process-local snapshot state as the production source of truth.
- Concurrent instances observe consistent realm, client, role, and user mutations.
- Instance restart does not create state divergence.

### WS2. Distributed Session and Token Plane

#### Objective

Make sessions, grants, codes, challenges, and revocations durable, distributed, and concurrency-safe.

#### Scope

- account sessions
- browser auth sessions
- authorization requests and authorization codes
- refresh and access token state where persistence is required
- revocation records
- PAR
- device authorization
- CIBA
- passkey challenges
- SAML auth requests and SAML sessions
- recovery and MFA transient state

#### Primary files

- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [iamAuthorizationRuntime.ts](../../../apps/api-server/src/platform/iamAuthorizationRuntime.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)
- [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts)

#### Deliverables

1. Create TTL-backed ephemeral stores for all transient protocol state.
2. Create shared revocation and session indexes.
3. Make logout, revocation, and forced-session termination consistent across instances.
4. Separate long-lived state from short-lived challenge state.
5. Add replay, expiry, and idempotency protections for distributed execution.

#### Acceptance criteria

- Session revocation is consistent across concurrent instances.
- Authorization code, PAR, device, CIBA, and passkey flows survive restart and scale-out.
- Expired transient state is removed through TTL or scheduled cleanup, not only in-memory cleanup.

### WS3. Browser and OIDC Standards Hardening

#### Objective

Bring browser login and OIDC behavior up to standards-grade interoperability.

#### Scope

- authorization endpoint behavior
- PKCE behavior
- login and logout semantics
- cookie/session semantics
- client-policy enforcement
- OIDC discovery contract accuracy
- dynamic client registration interoperability

#### Primary files

- [iamAuthorizationRuntime.ts](../../../apps/api-server/src/platform/iamAuthorizationRuntime.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)
- [server.ts](../../../apps/api-server/src/server.ts)
- [apps/enterprise-ui/src/providers/AuthProvider.tsx](../../../apps/enterprise-ui/src/providers/AuthProvider.tsx)
- [apps/enterprise-ui/src/services/iamHttpClient.ts](../../../apps/enterprise-ui/src/services/iamHttpClient.ts)

#### Deliverables

1. Run external OIDC client interoperability tests against supported flows.
2. Harden auth-code plus PKCE semantics for public and confidential clients.
3. Remove development-only shortcuts from supported parity paths.
4. Validate logout, session reuse, and token refresh semantics through browser and API harnesses.
5. Tighten dynamic client registration and advanced client policy enforcement to supported profiles only.

#### Acceptance criteria

- External OIDC conformance/interoperability tests pass for supported flows.
- Browser login and logout semantics are stable across restart and scale-out.
- Supported advanced OAuth behaviors pass real end-to-end tests, not only modeled-state checks.

### WS4. WebAuthn and SAML Hardening

#### Objective

Replace custom or synthetic protocol handling with standards-grade implementations for the visible competitive surfaces.

#### Scope

- WebAuthn registration and assertion validation
- passkey account UX and policy
- SAML metadata, SP-initiated and IdP-initiated flows
- SAML logout
- trust-store and certificate lifecycle posture

#### Primary files

- [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamExperienceRuntime.ts](../../../apps/api-server/src/platform/iamExperienceRuntime.ts)
- [apps/enterprise-ui/src/utils/iamPasskeys.ts](../../../apps/enterprise-ui/src/utils/iamPasskeys.ts)

#### Deliverables

1. Replace custom passkey proof-signature flow with standards-grade WebAuthn validation.
2. Add supported authenticator policy controls for attestation, resident keys, transports, and challenge handling.
3. Replace handcrafted SAML lifecycle handling with a hardened supported profile implementation.
4. Support supported trust-store and certificate rollover lifecycle operations.
5. Add external interoperability test runs for browser passkeys and supported SAML service-provider profiles.

#### Acceptance criteria

- Supported passkey flows pass browser-based WebAuthn tests.
- Supported SAML integration tests pass with external service providers.
- SAML and passkey claims in the review layer are based on test evidence, not only runtime counts.

### WS5. Federation and Provider Runtime

#### Objective

Move federation and extension from cataloged capability to operational capability.

#### Scope

- OIDC broker runtime
- SAML broker runtime
- LDAP/AD-style user federation
- SCIM-style federation if retained in scope
- provider execution model
- realm binding and provider lifecycle

#### Primary files

- [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts)
- [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts)
- [iamFederationClaimGovernance.ts](../../../apps/api-server/src/platform/iamFederationClaimGovernance.ts)

#### Deliverables

1. Define supported provider execution model, not just provider registration records.
2. Implement live supported adapters for the in-scope provider families.
3. Add attribute mapping, account-linking, import, and sync behavior that is testable against external systems.
4. Restrict unsupported provider families instead of implying full support where only synthetic fixtures exist.

#### Acceptance criteria

- Supported provider types execute through a real runtime path.
- Federation claims are backed by live integration tests.
- Unsupported provider types are clearly marked unsupported or experimental.

### WS6. Evidence, Scale, and Security Evaluation

#### Objective

Replace internally generated confidence with externally reproducible evidence.

#### Scope

- load testing
- resilience drills
- recovery drills
- interoperability test packs
- security evaluation
- operational telemetry

#### Primary files

- [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts)
- [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts)
- [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts)
- [iamSecurityAudit.ts](../../../apps/api-server/src/platform/iamSecurityAudit.ts)
- `tests/`
- `deploy/`

#### Deliverables

1. Replace formula-based benchmark outputs with measured harness outputs.
2. Add production-like load profiles for:
   - browser login
   - token issuance
   - introspection and revocation
   - admin reads
   - federation sync
3. Add recovery drills for:
   - cold restart
   - partial dependency failure
   - signing-key rotation
   - backup and restore
4. Add security evaluation packs:
   - auth bypass
   - session fixation and replay
   - token misuse
   - unsafe metadata and XML handling
   - passkey misuse cases
5. Add telemetry and event metrics suitable for production operations.

#### Acceptance criteria

- Benchmark outputs are derived from real runs.
- Recovery posture is proven by repeated scripted drills.
- Security review conclusions are backed by repeatable test evidence.
- The system has operational telemetry fit for production support.

### WS7. Remaining Keycloak Parity Deltas

#### Objective

Close or explicitly defer the remaining deltas after the platform is credible.

#### In-scope delta candidates

- DPoP
- Kerberos / SPNEGO
- user-event metrics
- multi-site or rolling-upgrade posture

#### Rule

These must not preempt WS1 through WS6. They are only worth doing once the platform is already credible in the areas it claims today.

#### Acceptance criteria

- Each delta is either:
  - delivered,
  - explicitly deferred,
  - or explicitly declared out of product scope.

## Phase Order

### Phase 0. Truth and Freeze

- execute WS0
- stop synthetic evidence from reading like parity proof

### Phase 1. State Foundation

- execute WS1
- no new major runtime surface additions

### Phase 2. Session and Token Foundation

- execute WS2
- this is the last foundational blocker before standards hardening can be treated as credible

### Phase 3. Standards Hardening

- execute WS3 and WS4 in parallel where independent

### Phase 4. Federation Runtime and Provider Execution

- execute WS5

### Phase 5. Real Evidence and Scale Validation

- execute WS6

### Phase 6. Remaining Parity Deltas

- execute WS7 only after earlier gates are green

## Immediate Backlog

### Immediate Sprint 1

1. Mark synthetic benchmark and review outputs as synthetic in code and UI.
2. Define repository contracts for:
   - foundation
   - protocol transient state
   - authentication sessions
   - advanced OAuth transient state
3. Move transient protocol records to TTL-backed shared storage first:
   - authorization requests
   - authorization codes
   - PAR
   - device authorization
   - CIBA
   - passkey challenges
   - SAML auth requests

### Immediate Sprint 2

1. Move session and revocation state to shared durable storage.
2. Add distributed invalidation semantics for logout and admin-forced revocation.
3. Add a real load harness for:
   - login
   - token
   - admin reads
   - logout/revocation

### Immediate Sprint 3

1. Replace custom passkey proof handling with standards-grade WebAuthn handling.
2. Harden SAML metadata and logout behavior to the supported profile set.
3. Begin external interoperability test runs for supported OIDC and SAML clients.

## Claim Gates

### Gate A. Constitution Alignment

All of the following must be true before claiming constitutional alignment on the Keycloak-class objective:

- shared durable state is real
- standards surfaces are not only modeled
- backup, restore, resilience, and readiness controls are real and tested
- extension and federation mechanisms are more than registries and synthetic fixtures

### Gate B. Requirements 2.18 Alignment

All of the following must be true before claiming the subsystem satisfies the standalone IAM objective in practice:

- adoption-gate items in [requirements.idp.md:119](../requirements.idp.md:119) through [requirements.idp.md:127](../requirements.idp.md:127) are actually complete
- the AWS implementation default is reflected in real runtime architecture rather than primarily in plan documents
- the system passes real validation across supported browser, federation, service-account, and recovery flows

### Gate C. Keycloak-Class Claim

The product may be described as Keycloak-class only when:

1. core feature families are delivered and externally validated,
2. scale and recovery evidence is real,
3. operational posture is production-credible,
4. known missing deltas are explicitly declared,
5. and parity claims are restricted to the supported feature set.

### Gate D. Exceeds Keycloak Claim

The product may be described as exceeding Keycloak only when differentiation is measured, not merely designed.

Acceptable differentiation proof includes:

- materially lower cost at the supported load tiers,
- stronger documented and tested readiness/recovery posture,
- stronger contract governance and API clarity,
- or materially stronger supported federation or operating controls.

## Scale Proof Threshold

No scale claim should be made against the target operating envelope until tested evidence exists for the supported deployment profile.

At minimum, the evidence program must cover:

- multi-instance correctness for shared state,
- restart-safe sessions and revocation,
- realistic throughput and latency under browser and token load,
- failure behavior under partial dependency disruption,
- and explicit reporting for the intended operating envelope, including the previously stated planning targets of large realm counts and high concurrent-user load.

## Non-Negotiable Rules

1. Do not add more modeled IAM surface area while foundational blockers remain open unless the work directly removes one of those blockers.
2. Do not let review dashboards, summary counts, or seeded records substitute for external interoperability proof.
3. Do not describe a capability as parity-complete if it is still synthetic, local-only, or development-only.
4. Do not attempt to exceed Keycloak before first becoming credible against Keycloak in the claimed feature families.

## Recommended Next Move

Start with WS0 and WS1 immediately.

The first coding sequence should be:

1. label synthetic review and benchmark artifacts honestly,
2. extract repository contracts from the generic persistence layer,
3. move ephemeral protocol state to shared TTL-backed storage,
4. then rebuild session and revocation semantics on top of that foundation.

That is the shortest path to converting the current implementation from feature-rich but partially synthetic into a credible standalone IAM platform.
