# Headless IAM State Foundation Baseline

Last updated: 2026-04-11

## Purpose

This document is the `Phase 1` baseline for the standalone IAM remediation program.

It translates the broad `WS1` objective from the remediation plan into a concrete state-authority inventory:

- which IAM domains are mutable,
- how they are currently persisted,
- where process-local state still acts as the effective source of truth,
- and which repository contracts should be introduced first.

This document is a planning and execution artifact. It does not redefine support or maturity claims. Governed current-state truth remains in:

- [capability-maturity-standard.idp.md](../capability-maturity-standard.idp.md)
- [Headless_IAM_Status_Matrix.md](./Headless_IAM_Status_Matrix.md)
- [Headless_IAM_Gap_Remediation_Plan.md](./Headless_IAM_Gap_Remediation_Plan.md)

## Phase 1 Objective

`Phase 1` is not about adding new IAM breadth. It is about replacing module-local snapshot authority with explicit shared-durable repository boundaries for the major mutable control-plane domains.

The target outcome is:

- production authority is expressed through repository contracts,
- filesystem persistence remains a local-development adapter instead of the implicit architecture,
- and each major domain has a defined path to DynamoDB and S3 backed storage without widening generic snapshot helpers.

## Current Persistence Posture

The current implementation uses two broad patterns:

1. direct snapshot persistence through `loadOrCreatePersistedState`, `reloadOrCreatePersistedStateAsync`, `savePersistedState`, and `savePersistedStateAsync`
2. thin repository wrappers built on top of those same snapshot primitives through `createPersistedIamStateRepository` and `createPersistedAsyncIamStateRepository`

The second pattern is cleaner, but it is still snapshot-backed. It improves code structure more than it improves authority semantics.

## State Authority Inventory

| Domain | Primary module(s) | Current persistence pattern | Current authority risk | Phase 1 priority |
| --- | --- | --- | --- | --- |
| Foundation directory: realms, templates, bindings, users, groups, roles, delegated admins, exports | [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts) | direct split snapshot files | Highest: core identity directory remains module-local and snapshot-driven | `P0` |
| Foundation delegated consent requests | [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts) | direct split snapshot files | High: mutable request state is coupled to foundation snapshot authority | `P1` |
| Protocol directory: clients, scopes, mappers, service accounts, signing keys, issued-token directory records | [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts) | direct split snapshot files | Highest: core OAuth/OIDC control plane is still snapshot-authoritative | `P0` |
| Protocol transient state: authorization requests, codes, SAML requests, token-linked transients | [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts) | direct split snapshot files | High, but mainly a `Phase 2` distributed-transient concern | `P2` |
| Authentication runtime: sessions, login transactions, MFA and recovery transient state | [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts) | mixed snapshot/repository patterns | Highest for session-plane credibility, but broad cutover belongs after control-plane repository definition | `P1` |
| Organizations, memberships, invitations | [iamOrganizations.ts](../../../apps/api-server/src/platform/iamOrganizations.ts) | direct snapshot persistence | High: important first-party B2B domain still uses local authoritative state | `P1` |
| User profile schemas and governed attributes | [iamUserProfiles.ts](../../../apps/api-server/src/platform/iamUserProfiles.ts) | direct snapshot persistence | High: schema-governance domain should not remain module-local authority | `P1` |
| Admin authorization permissions, policies, evaluations | [iamAdminAuthorization.ts](../../../apps/api-server/src/platform/iamAdminAuthorization.ts) | direct snapshot persistence | High: fine-grained admin authz is part of control-plane authority | `P1` |
| Authorization services directory: resource servers, scopes, resources, policies, permissions, evaluations | [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts) | direct split snapshot files | High: broad mutable authz graph still uses snapshot authority | `P1` |
| Authorization services permission tickets | [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts) | direct split snapshot files | Medium in `Phase 1`; more acute in transient/distributed follow-up | `P2` |
| Authorization runtime | [iamAuthorizationRuntime.ts](../../../apps/api-server/src/platform/iamAuthorizationRuntime.ts) | repository wrapper over persisted snapshot | Medium: cleaner structure, but still snapshot-backed | `P2` |
| Advanced OAuth runtime | [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts) | repository wrapper or direct persisted state by slice | Medium: important, but should follow client and protocol directory contracts | `P2` |
| Federation runtime | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts) | direct snapshot persistence | Medium: provider realism is still a later blocker, but authority boundaries should be explicit | `P2` |
| Extension registry | [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts) | direct snapshot persistence | Medium: modeled registry can wait until core authority domains are cut over | `P3` |
| Experience runtime | [iamExperienceRuntime.ts](../../../apps/api-server/src/platform/iamExperienceRuntime.ts) | direct snapshot persistence | Medium: mutable but lower-risk than core identity/protocol domains | `P3` |
| Security audit ledger | [iamSecurityAudit.ts](../../../apps/api-server/src/platform/iamSecurityAudit.ts) | direct snapshot persistence | Medium: should become append-oriented durable state, but not first repository boundary | `P2` |
| Operations, review, benchmark, deployment, recovery | [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts), [iamReviewRuntime.ts](../../../apps/api-server/src/platform/iamReviewRuntime.ts), [iamBenchmarkRuntime.ts](../../../apps/api-server/src/platform/iamBenchmarkRuntime.ts), [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts), [iamRecoveryRuntime.ts](../../../apps/api-server/src/platform/iamRecoveryRuntime.ts) | direct snapshot or repository-wrapped snapshot | Lower than control-plane authority, but still not production-source architecture | `P3` |
| Session and token ownership indexes | [iamSessionIndex.ts](../../../apps/api-server/src/platform/iamSessionIndex.ts), [iamTokenOwnershipIndex.ts](../../../apps/api-server/src/platform/iamTokenOwnershipIndex.ts), [iamFederationSessionIndex.ts](../../../apps/api-server/src/platform/iamFederationSessionIndex.ts) | repository wrapper over persisted snapshot | Critical for distributed semantics, but best handled in `Phase 2` | `P2` |
| WebAuthn credentials and transient state | [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts) | repository wrapper over persisted snapshot | Important, but subordinate to foundation and protocol contracts | `P2` |

## Key Finding

The most important control-plane authority domains are still these four:

1. foundation directory
2. protocol directory
3. organizations and user profiles
4. admin authorization and authorization services

If those domains continue to rely on module-local state plus file snapshots, then:

- concurrency confidence remains weak,
- restart behavior is still adapter-shaped rather than domain-shaped,
- and later standards hardening will continue to ride on a state model that is not yet credible enough for broader parity claims.

## Repository Contract Baseline

The first repository cut should not be "one generic state store." It should be explicit repository families with bounded ownership.

### 1. Foundation Directory Repositories

Initial contract set:

- `IamRealmRepository`
- `IamRealmTemplateRepository`
- `IamRealmBindingRepository`
- `IamUserRepository`
- `IamGroupRepository`
- `IamRoleRepository`
- `IamDelegatedAdminRepository`
- `IamRealmExportRepository`

Why first:

- these are the backbone IAM entities
- they anchor most other modules
- they currently remain split across large snapshot files

### 2. Protocol Directory Repositories

Initial contract set:

- `IamClientRepository`
- `IamClientScopeRepository`
- `IamProtocolMapperRepository`
- `IamServiceAccountRepository`
- `IamSigningKeyRepository`
- `IamIssuedTokenDirectoryRepository`

Why next:

- protocol control-plane state is central to every supported OIDC claim
- it currently mixes durable and transient concerns in one broad runtime authority model

### 3. Organization and Profile Governance Repositories

Initial contract set:

- `IamOrganizationRepository`
- `IamOrganizationMembershipRepository`
- `IamOrganizationInvitationRepository`
- `IamUserProfileSchemaRepository`

Why next:

- these domains are already treated as product differentiators
- they should not remain on ad hoc snapshot authority if they are part of the declared release core

### 4. Administrative Governance Repositories

Initial contract set:

- `IamAdminPermissionRepository`
- `IamAdminPolicyRepository`
- `IamAdminEvaluationRepository`
- `IamAuthorizationServiceRepository` family for:
  - resource servers
  - protected scopes
  - protected resources
  - policies
  - permissions
  - evaluations

Why next:

- they define governance and resource-bound authorization semantics
- they are too important to remain embedded in module-specific persistence logic

## Execution Rules for Phase 1

1. Do not begin by moving transient protocol/session families before the directory and control-plane repository boundaries are explicit.
2. Do not widen `persistence.ts` into a generic everything-store abstraction.
3. Keep filesystem persistence as a development adapter behind repository contracts.
4. Prefer one repository family per domain over one monolithic `IamStateRepository` that hides ownership boundaries.
5. Where a module currently stores both directory and transient data, split the repository contracts before changing adapters.

## Proposed Iteration 1A Scope

`Iteration 1A` should produce:

1. a repository contract map for the `P0` and `P1` domains
2. a domain-to-file ownership inventory for the current snapshot files
3. one selected first cut where repository interfaces are introduced without changing functional behavior yet

Recommended first cut:

- foundation directory

Why:

- it is the broadest authority domain
- it is referenced by nearly every other IAM module
- and it will force the cleanest contract decisions early

## Recommended Next Sequence

1. introduce repository interfaces for the foundation directory entities
2. adapt `iamFoundation.ts` to read and write through those interfaces while preserving current filesystem-backed behavior
3. only after that, apply the same pattern to protocol directory and the next `P1` domains

## Exit Condition for Iteration 1A

Iteration `1A` should only be considered complete when:

- the first repository contract set exists in code,
- ownership boundaries for the major directory entities are explicit,
- and the next cutover sequence for protocol and governance domains is documented from that real implementation baseline.
