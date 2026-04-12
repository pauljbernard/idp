---
id: migration-from-keycloak
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Keycloak Parity Plan

Last updated: 2026-03-29

## Purpose

This document is the single planning source of truth for closing the gap between the standalone IDP and current Keycloak.

It combines:

- the comparison matrix,
- the execution plan,
- the priority order,
- and the acceptance gates for any future “Keycloak-class” claim.

This document supersedes the split draft artifacts that previously separated the gap matrix from the execution plan.

## Planning Inputs

This plan is derived from:

- [Headless_IAM_Production_Remediation_Plan.md](./Headless_IAM_Production_Remediation_Plan.md)
- [Headless_IAM_Standalone_Product_Assessment.md](./Headless_IAM_Standalone_Product_Assessment.md)
- [requirements.idp.md](../requirements.idp.md)
- [constitution.idp.md](../constitution.idp.md)
- [capability-maturity-standard.idp.md](../capability-maturity-standard.idp.md)
- [Headless_IAM_Status_Matrix.md](./Headless_IAM_Status_Matrix.md)
- [Headless_IAM_Protocol_Support_Matrix.md](./Headless_IAM_Protocol_Support_Matrix.md)
- [Headless_IAM_Federation_Support_Matrix.md](./Headless_IAM_Federation_Support_Matrix.md)
- [Headless_IAM_Passkey_Support_Matrix.md](./Headless_IAM_Passkey_Support_Matrix.md)
- [Headless_IAM_SAML_Profile_Matrix.md](./Headless_IAM_SAML_Profile_Matrix.md)
- [Headless_IAM_Deployment_Mode_Matrix.md](./Headless_IAM_Deployment_Mode_Matrix.md)

## Comparison Basis

This plan compares the current repository against official Keycloak documentation current as of **March 29, 2026**.

Reference set used for comparison:

- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Keycloak Authorization Services Guide](https://www.keycloak.org/docs/latest/authorization_services/index.html)
- [Keycloak Supported Specifications](https://www.keycloak.org/securing-apps/specifications)
- [Keycloak Feature Flags / Optional Features](https://www.keycloak.org/server/features)
- [Keycloak High Availability: Multi-cluster deployments](https://www.keycloak.org/high-availability/multi-cluster/introduction)

## Status Legend

- `Match`: materially present and directionally competitive with Keycloak.
- `Partial`: present, but narrower, weaker, or less interoperable than Keycloak.
- `Synthetic`: modeled for validation, but not yet credible as production-grade parity.
- `Missing`: no meaningful implementation evidence found.
- `Differentiator candidate`: could become strategically stronger than Keycloak if fully productionized.

## Program Decision

The standalone IDP is **not yet at Keycloak parity** and **does not yet exceed Keycloak overall**.

The biggest remaining gap is **not feature count**. It is **production reality**:

- shared durable state,
- distributed session and token handling,
- standards-grade browser and protocol behavior,
- and independently credible interoperability, load, and recovery evidence.

The standalone IDP must not be described as a Keycloak-class production alternative until all of the following are true:

- the major IAM state domains no longer depend on process-local snapshot state as the primary runtime architecture,
- browser/OIDC, passkey, and SAML flows have standards-grade behavior and external interoperability evidence,
- load and failure evidence is produced by real test harnesses against production-like infrastructure,
- and the remaining unsupported enterprise claims are explicitly scoped as delivered, deferred, or not in product scope.

## Executive Position

The current state is best described as:

- **architecturally serious** in feature breadth,
- **competitive in several IAM feature families**,
- **not yet competitive in production scale or protocol maturity**,
- and **still behind Keycloak in high-availability and operational evidence that is backed by real load-tested infrastructure**.

## Parity Matrix

### A. Core Identity Product Surface

| Capability family | Keycloak baseline | IDP current state | Status | Primary local evidence | Planning lane |
| --- | --- | --- | --- | --- | --- |
| Realms, users, groups, roles, clients, scopes, mappers | Core first-class model | Present across foundation and protocol runtime; broad CRUD/admin routes exist | Match | [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts), [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Preserve; harden for scale |
| Organizations and invitations | Keycloak now documents organizations as first-class B2B capability | Organizations, memberships, invitations, and account acceptance flows are implemented | Match | [iamOrganizations.ts](../../../apps/api-server/src/platform/iamOrganizations.ts), [server.ts](../../../apps/api-server/src/server.ts) | Preserve; scale |
| User self-service account operations | Account console, sessions, credentials, profile, MFA | Account profile, password, MFA, passkeys, sessions, delegated consent, and org acceptance flows are present | Partial | [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Harden browser/session semantics |
| User profile schema and attribute governance | Keycloak supports user profile schema and attribute visibility/edit rules | Attribute schemas, validation rules, view/edit scopes, and privacy metadata exist | Partial | [iamUserProfiles.ts](../../../apps/api-server/src/platform/iamUserProfiles.ts), [server.ts](../../../apps/api-server/src/server.ts) | Validate interoperability and admin UX |
| Themes, localization, notification templates | Keycloak supports theming and admin-managed UX customization | Realm themes, localization bundles, notification template preview/update, and theme package registry exist | Partial | [iamExperienceRuntime.ts](../../../apps/api-server/src/platform/iamExperienceRuntime.ts), [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts), [server.ts](../../../apps/api-server/src/server.ts) | Preserve; move assets to production backing stores |

### B. Protocol and Standards Surface

| Capability family | Keycloak baseline | IDP current state | Status | Primary local evidence | Planning lane |
| --- | --- | --- | --- | --- | --- |
| OIDC discovery, JWKS, token, introspection, revocation, userinfo | Core OIDC server surface | Present with signed token issuance and OIDC metadata | Partial | [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Protocol conformance hardening |
| Authorization endpoint, browser authorization-code flow, PKCE | Keycloak-class browser/OIDC flows | Authorization request, continuation flow, PKCE policy fields, and browser login orchestration are present, but not yet proven interoperable at Keycloak depth | Partial | [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts), [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Priority protocol hardening |
| Advanced OAuth: PAR, device authorization, CIBA, token exchange, dynamic client registration, client policies | Keycloak exposes these as major competitive features | All are modeled and routed, including initial access and registration access tokens | Partial | [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Interop validation and production hardening |
| SAML 2.0 IdP lifecycle | Keycloak offers mature SAML support | Metadata, auth request tracking, login continuation, SAML response issuance, and logout are present, but the implementation is still handcrafted and limited | Partial | [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Priority protocol hardening |
| Configurable auth flows and required actions | Keycloak offers configurable auth flows, subflows, executions, bindings, required actions | Flow definitions, executions, conditions, realm bindings, and client bindings are implemented | Partial | [iamAuthFlows.ts](../../../apps/api-server/src/platform/iamAuthFlows.ts), [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Expand authenticator depth and validation |
| WebAuthn and passkeys | Keycloak supports passkeys and passwordless auth | Passkey registration and authentication flows exist, but they are custom and need standards-grade validation and browser interoperability review | Partial | [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts), [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Priority security and standards hardening |
| Authorization Services and UMA | Keycloak has resource servers, policies, permissions, tickets, RPT | Resource servers, policies, evaluations, permission tickets, and UMA-style token exchange are present | Partial | [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts), [server.ts](../../../apps/api-server/src/server.ts) | Harden semantics and interoperability |
| Fine-grained administrative authorization and impersonation | Keycloak has dedicated realm-management based admin authz | Admin permissions, admin policies, evaluations, and impersonation are present, but scope is narrower than Keycloak’s overall admin model | Partial | [iamAdminAuthorization.ts](../../../apps/api-server/src/platform/iamAdminAuthorization.ts), [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Broaden coverage and policy depth |
| DPoP | Keycloak documents DPoP support as an optional feature | No implementation evidence found | Missing | No runtime matches for `dpop` under `apps/api-server/src/platform` as of 2026-03-29 | Later protocol parity phase |
| Kerberos / SPNEGO browser SSO | Keycloak documents Kerberos support | No implementation evidence found | Missing | No runtime matches for `kerberos` or `spnego` under `apps/api-server/src/platform` as of 2026-03-29 | Later enterprise parity phase |

### C. Federation, Extensibility, and Ecosystem Surface

| Capability family | Keycloak baseline | IDP current state | Status | Primary local evidence | Planning lane |
| --- | --- | --- | --- | --- | --- |
| OIDC and SAML identity brokering | Keycloak supports external identity providers | Broker records and broker login flows exist | Partial | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Replace synthetic adapters with live adapters |
| LDAP / directory federation | Keycloak supports LDAP and Active Directory federation | LDAP and directory-style providers are modeled, but current evidence is synthetic seed/provider behavior rather than live enterprise adapter depth | Synthetic | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts), [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts) | Live adapter implementation |
| SCIM-style federation | Not a current Keycloak core strength | SCIM-style providers are modeled, but only as synthetic validation fixtures today | Synthetic / Differentiator candidate | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts) | Optional differentiation track |
| Extensibility / SPI / provider runtime | Keycloak has mature SPI/provider model | Registry, interfaces, packages, providers, and bindings are cataloged, but there is not yet a comparable runtime execution model | Synthetic | [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts), [server.ts](../../../apps/api-server/src/server.ts) | Runtime plugin architecture |

### D. Operations, Security, and Production Readiness

| Capability family | Keycloak baseline | IDP current state | Status | Primary local evidence | Planning lane |
| --- | --- | --- | --- | --- | --- |
| Audit, security events, admin events | Keycloak provides extensive eventing and admin events | Security audit, request logging, admin event surfaces, and review records exist | Partial | [iamSecurityAudit.ts](../../../apps/api-server/src/platform/iamSecurityAudit.ts), [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Expand observability and external sinks |
| Backup, restore, resilience, key rotation, readiness review | Keycloak has operational guides; IDP aims explicit built-in evidence | Backup, restore, resilience runs, signing key rotation, recovery drill, health summary, and formal review artifacts exist | Differentiator candidate | [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts), [iamRecoveryRuntime.ts](../../../apps/api-server/src/platform/iamRecoveryRuntime.ts), [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts), [iamHealthRuntime.ts](../../../apps/api-server/src/platform/iamHealthRuntime.ts) | Preserve; convert to real infra-backed evidence |
| Benchmark and readiness evidence quality | Keycloak ships real HA/load guidance and benchmark projects | Current benchmark and review evidence are mostly internally generated validation artifacts, not external load-tested proof | Synthetic | [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts), [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts) | Replace with real test evidence |
| Secret and key posture | Keycloak supports production secret and key management | Secret storage and signing key rotation exist, but the overall platform posture still depends on local-development-oriented state patterns in several domains | Partial | [secretStore.ts](../../../apps/api-server/src/platform/secretStore.ts), [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts) | Production hardening |
| FIPS/high-assurance/compliance-ready modes | Keycloak documents stronger enterprise deployment posture | Requirements mention these targets, but no runtime evidence demonstrates real FIPS/high-assurance execution modes | Missing | [requirements.idp.md](../requirements.idp.md), no concrete runtime feature surface under `apps/api-server/src/platform` | Later enterprise/compliance phase |

### E. Scale, Durability, and High Availability

| Capability family | Keycloak baseline | IDP current state | Status | Primary local evidence | Planning lane |
| --- | --- | --- | --- | --- | --- |
| Shared durable persistence for identities, clients, sessions, grants, tokens | Keycloak is DB-backed and HA-oriented | Many major IAM stores still load entire state snapshots into process memory and persist through snapshot-style helpers | Synthetic | [persistence.ts](../../../apps/api-server/src/platform/persistence.ts), [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts), [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts) | Highest-priority scale foundation |
| Session durability across restarts/upgrades | Keycloak documents persistent user sessions as a feature | Session-bearing state is persisted through the generic store, but not yet with a production-grade session architecture or proof at scale | Synthetic | [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts), [persistence.ts](../../../apps/api-server/src/platform/persistence.ts) | Highest-priority scale foundation |
| Horizontal scale and HA topology | Keycloak documents tested multi-instance and multi-cluster deployment patterns | IDP currently models AWS-native topology and adapters, but the runtime is still effectively a single-process state machine | Synthetic | [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts), [persistence.ts](../../../apps/api-server/src/platform/persistence.ts) | Highest-priority scale foundation |
| Multi-site / rolling upgrade style production posture | Keycloak documents optional multi-site and rolling-update features | No implementation evidence found | Missing | No runtime matches for `multi-site` or `rolling` in the IAM runtime modules as of 2026-03-29 | Later HA phase |
| User-event metrics / production telemetry | Keycloak documents optional user-event metrics | No equivalent user-event metrics feature surface found | Missing | No runtime matches for `user-event metrics` in the IAM runtime modules as of 2026-03-29 | Observability phase |
| Scale validation evidence | Keycloak publishes tested configuration guidance and benchmark project references | IDP has benchmark artifacts, but they are not credible yet as proof for 22,000 realms, 1.2 million users per realm upper tier, or 75,000 concurrent users | Synthetic | [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts), [Headless_IAM_Production_Remediation_Plan.md](./Headless_IAM_Production_Remediation_Plan.md) | Highest-priority scale foundation |

### F. Strategic Differentiation Potential

| Candidate differentiator | Why it matters | Current reality | Status | Primary local evidence | Planning lane |
| --- | --- | --- | --- | --- | --- |
| AWS-native serverless-first cost posture | Could undercut Keycloak’s heavier Kubernetes-first operational footprint for low-to-medium utilization | The intended AWS-native shape is well documented, but the runtime is not yet fully there | Differentiator candidate | [requirements.idp.md](../requirements.idp.md), [constitution.idp.md](../constitution.idp.md), [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts) | Convert architecture intent into reality |
| Explicit readiness, recovery, and review evidence | Could provide stronger built-in operational governance than a typical IAM product | The evidence model exists, but much of it is still synthetic and not yet backed by production-grade infrastructure or externalized testing | Differentiator candidate | [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts), [iamRecoveryRuntime.ts](../../../apps/api-server/src/platform/iamRecoveryRuntime.ts), [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts) | Preserve and harden |
| SCIM-style directory/federation posture | Could differentiate if made real, because Keycloak is not currently strongest here | Only synthetic today | Differentiator candidate | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts) | Optional future differentiation |

## Workstream Overview

| Workstream | Objective | Why now | Exit condition |
| --- | --- | --- | --- |
| WS1. Shared State Plane | Replace process-local IAM state patterns with shared durable backing services | Current architecture is the biggest parity blocker | Major IAM domains run on shared production backends with no process-local source of truth |
| WS2. Session and Token Plane | Rebuild session, grant, token, and challenge handling for distributed operation | Scale claims fail if these remain process-local/snapshot-driven | Sessions, grants, revocations, and challenges survive restart and scale horizontally |
| WS3. Browser and OIDC Standards Hardening | Make browser login, auth-code, PKCE, logout, and client-policy behavior standards-grade | Current protocol breadth is respectable, but maturity is still below Keycloak | External interop tests pass for browser/OIDC critical paths |
| WS4. Passkey and SAML Hardening | Bring WebAuthn/passkeys and SAML from custom proving flows to standards-grade operation | These are visible competitive surfaces and risk areas | External conformance and integration tests pass for supported profiles |
| WS5. Evidence and Scale Validation | Replace synthetic evidence with real benchmark and resilience evidence | No honest parity claim is possible without this | Production-like load and recovery evidence exists and is reproducible |
| WS6. Enterprise Parity Closure | Close remaining non-foundational gaps after the platform is real | Only valuable after WS1-WS5 are complete | Remaining gap set is explicitly small, scoped, and prioritized |

## Out of Scope for the First Parity Program

These are real gaps, but they are not the first blockers to honest parity:

- Kerberos / SPNEGO
- multi-site deployment
- rolling-upgrade style site failover posture
- compliance-mode productization beyond baseline hardening
- strategic differentiation work that does not remove current credibility blockers

They remain later-phase items unless they become contract-critical.

## Phase Sequence

### Phase 0 — Program Baseline and Freeze

#### Goal

Stop digging the hole deeper while the parity foundation is being rebuilt.

#### Tasks

1. Freeze any new major IAM surface-area additions unless they directly support parity blockers.
2. Mark synthetic benchmark and review outputs as internal validation artifacts only, not market-evidence artifacts.
3. Define the canonical deployment target for parity work:
   - API Gateway
   - Lambda
   - DynamoDB
   - S3
   - KMS
   - EventBridge / Step Functions where orchestration is required
4. Establish benchmark and interoperability environments separate from local developer state.
5. Create a parity scoreboard that reports by workstream and acceptance gate.

#### Primary code areas

- [persistence.ts](../../../apps/api-server/src/platform/persistence.ts)
- [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts)
- [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts)
- [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts)

#### Acceptance criteria

- No new major feature work starts without being mapped to a workstream in this plan.
- Synthetic benchmark/review artifacts are labeled as synthetic in docs and reporting.
- A production-like AWS target topology is agreed and documented as the parity baseline.

### Phase 1 — Shared State Plane

#### Goal

Remove process-local snapshot state as the primary production architecture.

#### Why this comes first

Everything else is downstream of this. Keycloak parity is not credible while the main IAM domains still depend on in-process caches and snapshot persistence patterns.

#### Scope

Replace generic process-local store dependence for these domains first:

- foundation: realms, users, groups, roles, delegated admin
- protocol: clients, scopes, mappers, issued tokens, SAML requests, SAML sessions
- authentication: account sessions, MFA state, recovery state, consent state
- advanced OAuth: PAR, device authorization, CIBA, dynamic registration records, initial access tokens
- authorization services: resource servers, policies, permission tickets
- organizations and user profiles
- security audit and operations ledgers

#### Tasks

1. Define a real persistence contract per domain instead of continuing to widen the generic snapshot helper.
2. Implement DynamoDB-backed repositories for mutable IAM entities.
3. Move large artifacts and export or backup payloads to S3-backed stores.
4. Add optimistic concurrency/versioning for mutable writes.
5. Add TTL-managed item classes for ephemeral state:
   - authorization requests
   - PAR records
   - device codes
   - CIBA requests
   - browser login challenges
   - passkey challenges
   - transient recovery flows
6. Remove remaining production reliance on the generic `loadOrCreatePersistedState` / `savePersistedState` pattern in major IAM domains.
7. Keep local filesystem adapters only as local-dev backends behind the same repository contracts.

#### Primary code areas

- [persistence.ts](../../../apps/api-server/src/platform/persistence.ts)
- [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)
- [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts)
- [iamOrganizations.ts](../../../apps/api-server/src/platform/iamOrganizations.ts)
- [iamUserProfiles.ts](../../../apps/api-server/src/platform/iamUserProfiles.ts)
- [iamSecurityAudit.ts](../../../apps/api-server/src/platform/iamSecurityAudit.ts)

#### Acceptance criteria

- No major IAM domain uses process-local snapshot state as the production source of truth.
- Restarting or scaling the API does not lose or fork authoritative IAM state.
- Token revocation, session revocation, consent changes, and admin mutations are consistent across concurrent instances.
- The filesystem backend remains available only as a development adapter.

#### WS1 implementation slices

| Slice | Domains | Why this slice exists | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| WS1-A. Persistence contracts | all major IAM domains | The codebase currently widens one generic persistence helper across unrelated domains; this must be inverted before migration can proceed cleanly | none | Every target domain has an explicit repository contract and local-dev adapter boundary |
| WS1-B. Ephemeral protocol state | authorization requests, PAR, device codes, CIBA requests, passkey challenges, SAML requests | These are high-churn state classes, good first candidates for TTL-backed storage, and strong preparation for WS2 | WS1-A | Ephemeral protocol state is backed by shared storage with TTL and no process-local source of truth |
| WS1-C. Session and token authority | issued tokens, refresh lineage, browser sessions, account sessions | This is the highest-value slice because it unlocks real distributed behavior | WS1-A, WS1-B | Session and token state are backed by shared repositories and consistent under concurrent access |
| WS1-D. Core identity records | realms, users, groups, roles, delegated admin, clients, scopes, mappers | These are the foundational entities required by every major IAM path | WS1-A | Core identity reads and writes use shared repositories, version checks, and indexed lookups |
| WS1-E. Secondary IAM domains | organizations, user profiles, authz services, security audit, operations ledgers | These complete the transition and remove lingering process-local authority | WS1-A, WS1-D | Secondary IAM domains no longer rely on the generic snapshot helper in production mode |
| WS1-F. Filesystem demotion | local adapter path only | This prevents regression back to process-local production behavior | WS1-B through WS1-E | Filesystem persistence remains available only as an explicit development backend |

#### WS1 recommended engineering order

1. Extract repository contracts from [persistence.ts](../../../apps/api-server/src/platform/persistence.ts) consumers without changing behavior yet.
2. Migrate ephemeral protocol state first to prove the repository pattern and TTL strategy.
3. Migrate session and token authority next, because it is the highest-value blocker for parity.
4. Migrate core identity entities after session/token plumbing is stable.
5. Finish with secondary domains and remove remaining production dependence on snapshot persistence.

#### WS1 first implementation targets

The first two end-to-end migrations should be:

1. [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
2. [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)

Reason:

- they carry the highest-risk browser and token state,
- they are on the critical path for WS2 and WS3,
- and they are currently the least compatible with honest scale claims.

#### WS1 sprint backlog

##### Sprint A — Repository seams

1. Define repository interfaces for:
   - protocol state
   - authentication state
   - ephemeral challenge state
   - token/session lookup paths
2. Implement local filesystem adapters behind those interfaces.
3. Refactor the runtimes to depend on interfaces, not the generic persistence helper.

##### Sprint B — Shared ephemeral state

1. Implement DynamoDB-backed storage for:
   - authorization requests
   - PAR records
   - device authorization records
   - CIBA requests
   - passkey challenges
   - SAML request records
2. Add TTL behavior and cleanup expectations by item type.
3. Verify restart and duplicate-instance behavior in a production-like environment.

##### Sprint C — Shared session and token authority

1. Move:
   - issued token records
   - refresh lineage
   - browser sessions
   - account sessions
   - token revocation state
2. Add concurrency controls and idempotency behavior.
3. Add hot-path indexes and remove list scans from critical lookups.

##### Sprint D — Core identity entities

1. Move:
   - realms
   - users
   - groups
   - roles
   - delegated admin records
   - clients, scopes, mappers
2. Add optimistic concurrency checks for mutable writes.
3. Verify read and write consistency across concurrent instances.

#### WS1 architecture checkpoints

The team should stop and verify the following before advancing from one slice to the next:

1. Can two API instances mutate the same domain state without divergent outcomes?
2. Does a process restart preserve authoritative state for the migrated slice?
3. Are all hot lookups in the migrated slice using targeted key/index access rather than broad scans?
4. Is the filesystem backend still isolated to explicit development mode only?

### Phase 2 — Session and Token Plane

#### Goal

Make session, grant, and token behavior safe for high concurrency and horizontal execution.

#### Scope

- browser sessions
- account sessions
- service-account token issuance and revocation
- refresh token rotation and invalidation
- device authorization state
- CIBA state
- permission tickets and RPT lineage
- passkey registration/authentication challenge lifecycles

#### Tasks

1. Separate long-lived session records from ephemeral challenge records.
2. Make revocation and rotation operations idempotent and race-safe.
3. Add partition-aware indexes for:
   - realm + user lookup
   - realm + client lookup
   - realm + session lookup
   - token ID and refresh lineage lookup
4. Remove list-scan behavior from hot token/session paths.
5. Define bounded retention and TTL policies for ephemeral security state.
6. Add distributed rate-limit and abuse-control integration to auth-sensitive paths.

#### Primary code areas

- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)
- [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts)
- [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts)
- [rateLimiting.ts](../../../apps/api-server/src/platform/rateLimiting.ts)

#### Acceptance criteria

- Session and token operations are backed by shared state and pass concurrency tests.
- Refresh token rotation and revocation semantics are deterministic under retry and duplicate delivery.
- Hot auth/token endpoints no longer depend on broad in-memory array scans.
- Auth abuse controls work with distributed backends in production mode.

#### WS2 implementation slices

| Slice | Scope | Why this slice exists | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| WS2-A. Session model split | browser sessions, account sessions, impersonation sessions | Current behavior mixes long-lived and interactive state concerns too loosely for distributed operation | WS1-B, WS1-C | Session classes are explicit, storage-backed, and lifecycle-managed independently |
| WS2-B. Token and refresh lineage | access tokens, refresh tokens, revocation state, token exchange lineage | Token correctness is a hard blocker for scale and standards credibility | WS1-C | Revocation, rotation, and lineage queries are deterministic and storage-backed |
| WS2-C. Challenge and grant state | device authorization, CIBA, PAR continuation, passkey challenges, required-action continuity | These are concurrency-sensitive and should be bounded, expirable, and replay-safe | WS1-B | All interactive challenges and grants are replay-safe, TTL-backed, and partition-aware |
| WS2-D. Hot-path index removal | user/session, token, client, refresh-lineage lookups | Array scans in these paths will fail at the target scale even if data is durable | WS1-C | Critical auth/token paths use key/index lookups only |
| WS2-E. Distributed abuse controls | rate limiting, retry safety, idempotency keys for sensitive writes | Scale without abuse controls is not production-ready | WS1-C | Auth-sensitive paths enforce distributed limits and idempotent semantics where required |

#### WS2 recommended engineering order

1. Split session classes and lifecycle rules first.
2. Move token and refresh lineage next, because they are the center of revocation and replay safety.
3. Migrate challenge and grant state after the token authority is stable.
4. Remove hot-path scans before any serious scale test.
5. Only then rely on distributed rate limiting and abuse controls as production safeguards.

#### WS2 first implementation targets

The first concrete targets inside this phase should be:

1. session lifecycle in [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
2. issued token and refresh lineage in [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
3. device/CIBA/PAR state in [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)

#### WS2 sprint backlog

##### Sprint E — Session lifecycle normalization

1. Separate:
   - browser sessions
   - account sessions
   - impersonation sessions
2. Define explicit lifecycle transitions:
   - created
   - active
   - revoked
   - expired
3. Ensure every revoke/logout path is idempotent.

##### Sprint F — Token lineage and revocation

1. Introduce explicit storage-backed token lineage records.
2. Make refresh rotation deterministic under retry and duplicate requests.
3. Ensure revoke-by-subject, revoke-by-session, and revoke-by-token produce consistent outcomes across instances.

##### Sprint G — Challenge/grant hardening

1. Migrate:
   - device authorization records
   - CIBA requests
   - PAR continuation state
   - passkey challenges
   - required-action continuity records
2. Add TTL, replay protection, and correlation IDs.
3. Verify duplicate-delivery and stale-state behavior.

##### Sprint H — Hot-path and abuse control cleanup

1. Remove remaining list scans from auth/token/session hot paths.
2. Add production distributed rate-limit enforcement on:
   - login
   - token
   - broker
   - token exchange
   - passkey begin/complete
3. Add idempotency keys where retried writes can create duplicate effects.

#### WS2 architecture checkpoints

The team should stop and verify the following before closing this phase:

1. Can session revoke, logout, and disable-user actions converge correctly across multiple API instances?
2. Can refresh token rotation tolerate retries without double-issuing valid lineages?
3. Are challenge and grant records bounded, expirable, and replay-safe?
4. Are all auth-sensitive paths using distributed guardrails in production mode?

### Phase 3 — Browser and OIDC Standards Hardening

#### Goal

Bring the browser-facing OIDC experience to standards-grade behavior.

#### Scope

- authorization endpoint behavior
- auth-code issuance and continuation
- PKCE validation
- consent and required-action interaction in browser flows
- browser logout and end-session semantics
- dynamic client registration and client policy enforcement

#### Tasks

1. Define the supported browser/OIDC profiles explicitly.
2. Build interop tests against standard OIDC client libraries and sample relying parties.
3. Tighten authorization request validation, redirect URI validation, and response construction.
4. Validate PKCE edge cases and negative paths.
5. Align logout behavior with supported browser-session model and token/session revocation policy.
6. Verify client-policy behavior for public, confidential, and machine clients.
7. Remove or de-emphasize browser-facing dependence on password-grant-first assumptions.

#### Primary code areas

- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)
- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [iamAuthFlows.ts](../../../apps/api-server/src/platform/iamAuthFlows.ts)
- [server.ts](../../../apps/api-server/src/server.ts)

#### Acceptance criteria

- Supported OIDC browser flows pass interoperability tests with external clients.
- Auth-code, PKCE, consent, and logout behavior are documented and externally validated.
- Unsupported flows or modes are explicitly rejected and documented rather than half-supported.

#### WS3 implementation slices

| Slice | Scope | Why this slice exists | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| WS3-A. Supported OIDC profile definition | auth-code, PKCE, logout, dynamic registration, client-policy modes | The runtime currently has broad behavior but not a sharply defined supported profile boundary | WS2-B, WS2-C | The supported browser/OIDC profiles are explicit, documented, and enforced |
| WS3-B. Authorization request and redirect validation | authorization endpoint, redirect URI checks, request objects/continuation state | Browser interoperability fails if request validation is loose or inconsistent | WS1-B, WS2-C | Authorization requests are validated deterministically and reject unsupported/malformed inputs cleanly |
| WS3-C. Auth-code and consent lifecycle | code issuance, continuation, consent, required actions in browser flows | This is the core browser interaction path that must behave consistently across clients | WS2-A, WS2-B | Auth-code and consent paths are externally testable and correct under replay/retry conditions |
| WS3-D. Logout and browser session semantics | browser logout, end-session behavior, session/token interaction | Browser-session semantics are one of the most visible parity gaps | WS2-A, WS2-B | Logout behavior is explicit, consistent, and validated against supported client profiles |
| WS3-E. Client registration and policy enforcement | dynamic registration, initial access, registration access, client profiles/policies | These features are present but need stronger standards-grade behavior | WS1-B, WS2-B | Supported client registration and policy paths pass external interop tests |

#### WS3 recommended engineering order

1. Define the supported OIDC browser profiles first so the team stops treating every current path as equally supported.
2. Tighten authorization request and redirect validation next.
3. Validate auth-code and consent lifecycle behavior after request validation is stable.
4. Harden logout semantics before broad client interop claims are made.
5. Finish with dynamic registration and client policy conformance checks.

#### WS3 first implementation targets

1. authorization request handling in [server.ts](../../../apps/api-server/src/server.ts)
2. browser/OIDC runtime behavior in [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
3. advanced browser/OAuth behavior in [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts)

#### WS3 sprint backlog

##### Sprint I — Supported profile definition

1. Define the supported browser/OIDC profiles and explicitly list unsupported modes.
2. Document required request parameters, supported response behaviors, and error semantics.
3. Align admin/runtime UX messaging with the supported profile boundary.

##### Sprint J — Authorization request hardening

1. Tighten redirect URI validation and request parameter validation.
2. Add negative-path handling for malformed, expired, replayed, or unsupported requests.
3. Verify deterministic error responses for external clients.

##### Sprint K — Auth-code, consent, and logout

1. Validate auth-code issuance and continuation semantics end to end.
2. Validate consent and required-action behavior in browser flows.
3. Define and verify logout/end-session behavior for supported clients.

##### Sprint L — Client registration and policy conformance

1. Validate dynamic client registration against supported profiles.
2. Verify initial-access and registration-access token behavior.
3. Verify client-policy behavior for public, confidential, and machine-oriented clients.

#### WS3 architecture checkpoints

1. Can supported external OIDC clients complete the documented browser flow without custom product-specific assumptions?
2. Are unsupported flows rejected explicitly rather than partially executing?
3. Do consent, required-action, and logout behaviors converge correctly with session and token state?
4. Is the supported browser/OIDC profile documented tightly enough for procurement and integration review?

### Phase 4 — Passkey and SAML Hardening

#### Goal

Convert passkey and SAML behavior from “good proving runtime” to “supported production protocol surface.”

#### Passkey tasks

1. Review the current WebAuthn model against standards-grade relying-party expectations.
2. Replace custom proof conventions where they diverge from interoperable browser/WebAuthn expectations.
3. Add negative-path and replay tests for passkey registration and authentication.
4. Validate cross-browser behavior for supported authenticators and transports.

#### SAML tasks

1. Define the exact supported SAML bindings and profiles.
2. Replace handcrafted minimal response behavior with stricter profile handling.
3. Add interop tests with external service providers for supported login and logout paths.
4. Add signing, validation, and configurability controls needed for supported deployment profiles.

#### Primary code areas

- [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts)
- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [server.ts](../../../apps/api-server/src/server.ts)

#### Acceptance criteria

- Supported passkey flows pass browser interoperability testing.
- Supported SAML flows pass service-provider interoperability testing.
- The supported profile set is explicit, documented, and enforced.

#### WS4 implementation slices

| Slice | Scope | Why this slice exists | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| WS4-A. Passkey relying-party contract | challenge model, ceremony payloads, replay controls, supported authenticator profile | Current passkey behavior exists, but needs standards-grade relying-party semantics | WS2-C | Supported passkey flows use an explicit, externally validated relying-party contract |
| WS4-B. Passkey browser interoperability | registration and authentication across supported browsers/authenticators | Protocol correctness is not enough if real browser behavior diverges | WS4-A | Supported browser/authenticator combinations pass registration and authentication tests |
| WS4-C. SAML supported profile definition | bindings, login modes, logout modes, mapper/config scope | SAML parity requires a narrow supported profile, not a vague generic claim | WS2-A, WS2-B | Supported SAML profiles and exclusions are explicitly documented and enforced |
| WS4-D. SAML assertion and logout hardening | response structure, signing behavior, logout handling, lifecycle validation | Handcrafted minimal responses are not enough for production credibility | WS4-C | Assertions and logout responses are validated against supported SP integrations |
| WS4-E. External interoperability suite | browser passkey flows and external SAML SP integrations | This phase is not complete without external evidence | WS4-A through WS4-D | External protocol integrations pass and are reproducible |

#### WS4 recommended engineering order

1. Define the supported passkey and SAML profile boundaries first.
2. Harden the passkey relying-party behavior before making cross-browser claims.
3. Harden SAML assertion and logout behavior before broad SAML product claims.
4. Only close the phase after external interoperability suites are stable and repeatable.

#### WS4 first implementation targets

1. passkey challenge and verification logic in [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts)
2. passkey/browser login integration in [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
3. SAML metadata, login, and logout paths in [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)

#### WS4 sprint backlog

##### Sprint M — Passkey contract hardening

1. Review the current passkey ceremony against supported relying-party expectations.
2. Remove or isolate product-specific proof conventions that are not externally interoperable.
3. Add negative-path, replay, and stale-challenge coverage.

##### Sprint N — Passkey interoperability

1. Validate supported browser combinations for registration and authentication.
2. Validate supported authenticator categories and transport assumptions.
3. Document the supported passkey matrix and exclusions.

##### Sprint O — SAML profile definition and hardening

1. Define the exact supported SAML bindings and flows.
2. Tighten assertion, destination, request, and logout validation behavior.
3. Add the signing and configuration controls required for the supported deployment profile.

##### Sprint P — External protocol interop

1. Validate the supported SAML profile against representative external service providers.
2. Validate passkey behavior in production-like browser environments.
3. Record reproducible interop evidence for formal review use.

#### WS4 architecture checkpoints

1. Are passkey registration and authentication replay-safe and externally comprehensible as a relying-party implementation?
2. Are supported SAML bindings and flows explicit enough that unsupported combinations are rejected cleanly?
3. Can representative external service providers complete the supported SAML login/logout lifecycle?
4. Is the interop evidence repeatable enough to be used in formal parity review?

### Phase 5 — Real Evidence and Scale Validation

#### Goal

Replace self-generated readiness claims with reproducible proof.

#### Tasks

1. Create load-test harnesses for:
   - login and auth-code paths
   - token issuance and refresh
   - token introspection and revocation
   - session lookup and session revoke
   - user/group/role listing and filtered reads
   - authorization evaluation and permission ticket exchange
2. Create failure and recovery drills against the production-like AWS topology.
3. Measure latency, error rate, and concurrency behavior at progressively larger scales.
4. Define hard acceptance budgets for P50, P95, P99, error rate, and recovery objectives.
5. Keep synthetic benchmark artifacts only as local developer diagnostics; they must not remain the primary proof source.
6. Feed measured results into formal readiness review records.

#### Primary code areas

- [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts)
- [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts)
- [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts)
- [iamRecoveryRuntime.ts](../../../apps/api-server/src/platform/iamRecoveryRuntime.ts)
- [iamHealthRuntime.ts](../../../apps/api-server/src/platform/iamHealthRuntime.ts)

#### Acceptance criteria

- The platform has real benchmark evidence from production-like deployments.
- Failure, restart, and recovery drills have reproducible evidence.
- Formal review records can cite measured evidence rather than synthetic counters.
- The system demonstrates acceptable behavior for staged concurrency targets on the path to the stated business target.

#### WS5 implementation slices

| Slice | Scope | Why this slice exists | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| WS5-A. Load-test harnesses | auth-code, token, introspection, revocation, session, list-read, authz paths | Real parity claims require measured behavior, not synthetic counters | WS1 through WS4 on relevant paths | Repeatable load harnesses exist for the critical IAM control paths |
| WS5-B. Performance budgets and scorecards | P50, P95, P99, error rate, saturation, recovery budgets | Tests are not useful without explicit pass/fail budgets | WS5-A | Every critical path has documented success budgets and a scorecard result |
| WS5-C. Failure and recovery evidence | restart, restore, resilience, degraded dependency behavior | Scale without recovery proof is not production credibility | WS1, WS2, Phase 0 deployment baseline | Recovery and resilience drills are repeatable and recorded against production-like infrastructure |
| WS5-D. Formal review evidence integration | readiness review, benchmark evidence, formal approval records | Measured evidence must feed the governance layer, not sit outside it | WS5-A through WS5-C | Formal review artifacts cite measured evidence instead of synthetic summaries |
| WS5-E. Synthetic evidence demotion | synthetic benchmark/runtime review counters | The current review posture overstates maturity if synthetic evidence stays first-class | none | Synthetic evidence is explicitly labeled as diagnostic-only and not used for parity claims |

#### WS5 recommended engineering order

1. Build the load harnesses first.
2. Define budgets before running broad campaigns, so every result has an objective interpretation.
3. Run recovery and failure drills against the same production-like topology.
4. Feed the measured evidence into the formal review surfaces.
5. Demote synthetic evidence in parallel so the team cannot confuse it with measured proof.

#### WS5 first implementation targets

1. benchmark/runtime evidence in [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts)
2. review evidence handling in [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts)
3. operational drill/reporting flows in [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts) and [iamRecoveryRuntime.ts](../../../apps/api-server/src/platform/iamRecoveryRuntime.ts)

#### WS5 sprint backlog

##### Sprint Q — Load harness and budget definition

1. Build repeatable load profiles for:
   - login and auth-code
   - token issue and refresh
   - token introspection and revoke
   - session lookup and revoke
   - user/group/role filtered reads
   - authorization evaluation and permission ticket exchange
2. Define hard budgets for latency and error rate by path.
3. Record the first production-like baseline run.

##### Sprint R — Recovery and resilience evidence

1. Run restart, restore, and resilience drills against the production-like topology.
2. Measure:
   - recovery time
   - error burst window
   - state consistency after recovery
3. Record repeatable evidence artifacts suitable for formal review.

##### Sprint S — Governance evidence integration

1. Update review/reporting paths so they ingest measured evidence artifacts.
2. Demote synthetic counters to diagnostic-only status in UI/docs/review summaries.
3. Publish a parity scorecard for each completed workstream gate.

#### WS5 architecture checkpoints

1. Are the benchmark numbers coming from real externally executable harnesses rather than generated metrics?
2. Can the same production-like environment reproduce the load and recovery results reliably?
3. Do formal review records now depend on measured evidence for parity decisions?
4. Are synthetic benchmark/review artifacts clearly separated from production-credibility evidence?

### Phase 6 — Enterprise Parity Closure

#### Goal

Close the remaining material gaps once the platform is already real.

#### Scope

- live LDAP and broker adapters
- stronger admin authz depth
- broader authz-services depth
- DPoP
- observability and user-event metrics
- selected enterprise or partner deployment gaps

#### Acceptance criteria

- Remaining gaps against Keycloak are narrow, explicit, and intentionally scoped.
- The product can be honestly described as competitive for the supported operating profile.

#### WS6 implementation slices

| Slice | Scope | Why this slice exists | Depends on | Definition of done |
| --- | --- | --- | --- | --- |
| WS6-A. Live federation adapters | LDAP, OIDC broker, SAML broker, directory sync depth | Federation remains too synthetic relative to Keycloak and enterprise expectations | WS1, WS2, WS5 | Supported live federation adapters exist and are externally testable |
| WS6-B. Admin authz and authz-services depth | restricted admin scopes, policy depth, permission model depth | The current feature surface is respectable but still narrower than Keycloak’s depth | WS3, WS5 | Admin authz and authz-services behavior cover the supported enterprise profile credibly |
| WS6-C. Missing protocol parity items | DPoP and any remaining explicitly in-scope protocol gaps | These are clean parity deltas once the platform is otherwise real | WS3, WS5 | Explicitly in-scope protocol parity items are delivered or formally deferred |
| WS6-D. Observability and event metrics | user-event metrics, operational exportability, external telemetry fit | Production competitors need stronger runtime observability than local review artifacts | WS5 | Supported observability surfaces are production-usable and externally consumable |
| WS6-E. Scope closure and claim discipline | final Keycloak comparison, delivered/deferred/out-of-scope register | Final credibility depends on precise claim boundaries | WS6-A through WS6-D | Remaining deltas are explicit, justified, and acceptable for the declared product scope |

#### WS6 recommended engineering order

1. Start with live federation adapters because they are the biggest remaining enterprise realism gap.
2. Deepen admin authz and authz-services after the underlying platform is already stable and measurable.
3. Deliver or explicitly defer remaining protocol deltas such as DPoP.
4. Close with observability and formal claim-scope discipline.

#### WS6 first implementation targets

1. federation provider behavior in [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts)
2. provider/runtime registration expectations in [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts)
3. admin authz depth in [iamAdminAuthorization.ts](../../../apps/api-server/src/platform/iamAdminAuthorization.ts)
4. authz-services depth in [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts)

#### WS6 sprint backlog

##### Sprint T — Live federation baseline

1. Replace synthetic-first federation behavior for the supported LDAP and broker profiles with live adapter implementations.
2. Define supported sync/import/link semantics.
3. Validate representative external directory and broker integrations.

##### Sprint U — Admin authz and authz-services depth

1. Expand restricted admin scope coverage where Keycloak remains materially ahead.
2. Deepen authz-services behavior for the supported downstream protected-resource profile.
3. Validate the supported enterprise policy surface end to end.

##### Sprint V — Remaining parity deltas and final scope register

1. Deliver or formally defer DPoP and other explicitly in-scope remaining gaps.
2. Add production-usable observability and event metrics surfaces.
3. Publish the final delivered/deferred/out-of-scope parity register.

#### WS6 architecture checkpoints

1. Are remaining Keycloak deltas now narrow and intentionally scoped instead of structural?
2. Are live federation paths externally testable and supportable?
3. Is every remaining missing item either scheduled, deferred, or explicitly out of scope?
4. Can the product now make a precise and defensible competitive claim for the supported operating profile?

## Milestones and Gates

### Gate A — Architecture Credibility

The platform may claim “production architecture in progress” only when:

- WS1 and WS2 acceptance criteria are met for the major IAM domains,
- distributed rate limiting is active in production mode,
- and process-local snapshot state is no longer the primary production pattern.

### Gate B — Protocol Credibility

The platform may claim “standards-grade browser and protocol support for supported profiles” only when:

- WS3 and WS4 acceptance criteria are met,
- supported OIDC, SAML, and passkey profiles are explicitly documented,
- and external interoperability evidence exists.

### Gate C — Scale Credibility

The platform may claim “Keycloak-class production competitor for the supported deployment profile” only when:

- WS5 acceptance criteria are met,
- measured evidence exists for load, restart, recovery, and failure behavior,
- and formal review records approve the production posture.

### Gate D — Differentiation Claim

The platform may claim “strategically exceeds Keycloak in selected areas” only when:

- Gates A through C have already passed,
- differentiator claims are backed by measured AWS-native cost/recovery/operations evidence,
- and the differentiation is not compensating for unresolved parity blockers.

## Recommended Immediate Execution Order

1. Finish Phase 0 in documents and governance first.
2. Execute WS1 and WS2 together as the current highest-priority engineering program.
3. Start WS3 in parallel only where it does not depend on unfinished state-plane work.
4. Defer deeper parity features until WS5 exists, otherwise the team will continue mistaking surface area for product readiness.

## Immediate Next Sprint Objectives

1. Finalize repository contracts for shared persistence by domain.
2. Choose the first two domains to migrate end-to-end:
   - `iamProtocolRuntime`
   - `iamAuthenticationRuntime`
3. Build production-backed repositories for session, token, auth request, and challenge state.
4. Define the first external interoperability suite for:
   - OIDC auth-code + PKCE
   - browser logout
   - passkey registration/authentication
5. Define the first real load-test profile and success budgets.

## Bottom Line

The parity program should be judged by **architecture, standards, and evidence**.

If those three are solved, the remaining feature gaps are manageable.
If those three are not solved, adding more features will continue to create the illusion of parity without the substance of parity.
