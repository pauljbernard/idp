# Headless IAM State Authority Audit

Last updated: 2026-04-11

## Purpose

This document records the post-`Iteration 1A` authority-path audit for `Phase 1`.

It answers:

- which modules now sit behind explicit repository boundaries,
- which modules still rely on direct snapshot helper paths,
- and which remaining modules are worth addressing in follow-on iterations.

This is an execution artifact for `WS1`. It does not redefine capability support or maturity claims.

## Current State

After the initial Phase 1 extraction work, the major mutable control-plane modules now use explicit repository boundaries:

- `iamFoundation.ts`
- `iamProtocolRuntime.ts`
- `iamOrganizations.ts`
- `iamUserProfiles.ts`
- `iamAdminAuthorization.ts`
- `iamAuthorizationServices.ts`
- `iamAuthenticationRuntime.ts`
- `iamFederationRuntime.ts`
- `iamAuthFlows.ts`

That means the main standalone IAM control plane is no longer directly expressing authority through ad hoc `loadOrCreatePersistedState` and `savePersistedState` calls inside those modules.

## Remaining Direct-Snapshot Modules

The remaining direct-snapshot set is now mostly secondary or support domains.

| Module | Current role | Current persistence posture | Recommendation |
| --- | --- | --- | --- |
| [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts) | parity-track advanced OAuth and client-governance state | split directory/transient snapshot helpers | next candidate if `Phase 1` continues repository extraction |
| [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts) | deployment-profile and change-history planning state | single-state snapshot | can wait; low authority risk compared to core IAM domains |
| [iamExperienceRuntime.ts](../../../apps/api-server/src/platform/iamExperienceRuntime.ts) | theme, localization, notification state | single-state snapshot | defer until after adapter-cutover sequencing |
| [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts) | extension/provider/binding catalog | single-state snapshot | useful later, but not a first authority blocker |
| [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts) | operations, readiness, resilience, backup, restore state | single-state snapshot with many write paths | should move after cutover sequencing is defined; too broad for one incidental patch |
| [iamRecoveryRuntime.ts](../../../apps/api-server/src/platform/iamRecoveryRuntime.ts) | recovery profile and drill records | single-state snapshot | low-to-medium priority follow-up |
| [iamSecurityAudit.ts](../../../apps/api-server/src/platform/iamSecurityAudit.ts) | append-style audit ledger | direct snapshot with batched persistence | should be redesigned as append-oriented durable storage, not just wrapped |
| [iamStandaloneBootstrap.ts](../../../apps/api-server/src/platform/iamStandaloneBootstrap.ts) | bootstrap package generation history | single-state snapshot | low authority risk; can wait |
| [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts) | credential and transient state | mixed repository plus direct async reload paths | revisit with passkey hardening work rather than in isolation |

## Key Finding

The remaining direct-snapshot modules are not the same kind of blocker as the ones already addressed.

The highest-risk authority domains were:

- foundation directory
- protocol directory
- organizations and profiles
- admin authorization
- authorization services
- authentication runtime

Those are now on explicit repository boundaries.

The remaining modules fall into one of three buckets:

1. secondary runtime domains that can be wrapped later without blocking the Phase 1 architecture argument
2. support or planning domains where repository wrapping is helpful but not urgent
3. domains like security audit where the real next step is not just repository wrapping, but redesign toward a more appropriate persistence model

## Recommendation

`Iteration 1A` should be considered complete once the program records this audit and acknowledges that:

- the primary control-plane repository-boundary work is done,
- the remaining direct-snapshot set is known,
- and the next iteration should focus on adapter-cutover sequencing and production-authority paths rather than continuing repository-shape extraction for its own sake.

## Proposed Next Iteration Focus

Recommended follow-on scope:

### Iteration 1B

`Authority-path audit and adapter-cutover sequencing`

Objectives:

1. map each repository-backed domain to its current adapter
2. distinguish filesystem development adapters from intended production authority paths
3. identify the first safe cutover sequence for shared durable adapters
4. avoid mixing cutover sequencing with new feature growth

Expected outputs:

- repository-to-adapter mapping
- first cutover sequence for authoritative shared durable state
- explicit note of which modules remain filesystem-only for now and why

## Exit Signal for Phase 1

`Phase 1` should not be considered complete merely because repository interfaces exist.

It should be considered complete when:

- the primary mutable domains have explicit repository boundaries,
- the authority-path audit is complete,
- and the first shared-durable adapter cutover sequence is concrete enough to begin implementation safely.
