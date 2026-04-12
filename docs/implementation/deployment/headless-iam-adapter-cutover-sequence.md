---
id: headless-iam-adapter-cutover-sequence
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Adapter Cutover Sequence

Last updated: 2026-04-11

## Purpose

This document defines the first adapter-cutover view for `Phase 1`, `Iteration 1B`.

It answers:

- which repository-backed domains currently resolve to which adapter path,
- where filesystem persistence is still the de facto authority path,
- where partial shared-durable cutover machinery already exists,
- and which cutover sequence should happen first.

This document depends on:

- [Headless_IAM_State_Foundation_Baseline.md](./Headless_IAM_State_Foundation_Baseline.md)
- [Headless_IAM_State_Authority_Audit.md](./Headless_IAM_State_Authority_Audit.md)

## Current Adapter Model

There are currently two broad persistence layers in the standalone IAM runtime:

1. **platform persistence adapter**
   - resolved in [persistence.ts](../../../apps/api-server/src/platform/persistence.ts)
   - supports `filesystem` and `dynamodb-s3`
   - used by `iamStateRepository.ts` and by any modules still calling snapshot helpers directly

2. **runtime repository adapters**
   - currently used only in selected transient/runtime paths
   - controlled by [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)
   - gated by:
     - `IDP_DDB_RUNTIME_DUAL_WRITE`
     - `IDP_DDB_RUNTIME_READ_V2`
     - `IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE`

The practical result today is:

- repository boundaries now exist across the major control-plane modules
- but most of those repositories still resolve through the generic platform persistence adapter
- and therefore still behave as filesystem-backed authority in the default development/runtime posture

## Repository-to-Adapter Mapping

| Domain family | Repository boundary status | Current adapter path | Shared-durable readiness |
| --- | --- | --- | --- |
| Foundation directory | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Protocol directory | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Protocol transient state | explicit repository boundary | platform persistence adapter for state shape, with separate token runtime adapters for issued-token paths | partially prepared |
| Authentication directory | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Authentication transient state | explicit repository boundary | mixed: parent state uses platform persistence adapter, selected session/ticket/login-transaction paths already have dual-run and v2 adapter machinery | best cutover candidate |
| Organizations | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| User profiles | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Admin authorization | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Authorization services | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Federation runtime | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |
| Auth flows | explicit repository boundary | platform persistence adapter via `iamStateRepository` | not yet cut over |

## Existing Shared-Durable Cutover Machinery

The most important observation for `Iteration 1B` is that partial cutover machinery already exists in two places:

### 1. Authentication Runtime

[iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts) already contains:

- `LegacySessionStoreAdapter`
- `LegacyTicketStoreAdapter`
- `LegacyLoginTransactionStoreAdapter`
- `DualRunAsyncSessionStoreAdapter`
- `DualRunAsyncTicketStoreAdapter`
- `DualRunAsyncLoginTransactionStoreAdapter`
- Dynamo-backed repositories for:
  - sessions
  - tickets
  - login transactions

These are controlled by `getRuntimeRepositoryMode()`, especially:

- `dualWrite`
- `readV2`

That means authentication transient state is already the most mature cutover target.

### 2. Protocol Runtime

[iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts) already contains:

- issued-token runtime adapters
- `DualRunAsyncIssuedTokenStoreAdapter`
- Dynamo-backed token repository support

This is also part of the runtime cutover path, but it is narrower than the authentication-runtime cutover machinery.

## Key Finding

The first real shared-durable cutover should **not** start with the broad directory domains.

Why:

- the directory domains now have repository boundaries, but no dedicated domain-specific shared-durable adapters yet
- the authentication and protocol transient/runtime families already have cutover gates, dual-write logic, and Dynamo-oriented repository machinery
- the safest near-term cutover work is therefore where dual-run patterns already exist

That leads to a two-part strategy:

1. **adapter cutover first** for the transient/runtime domains that already have dual-write infrastructure
2. **domain-specific adapter design second** for the broad control-plane directory repositories now that their boundaries are explicit

## Recommended First Cutover Sequence

### Cutover Sequence A: Runtime Transient Paths

Recommended first sequence:

1. authentication login transactions
2. authentication tickets
3. authentication sessions
4. protocol issued tokens

Why first:

- they already have dual-write and `readV2` mechanics
- they are the narrowest path to proving shared-durable authority works in practice
- they reduce the highest-risk runtime-local semantics before directory-adapter work begins

### Cutover Sequence B: Control-Plane Directory Adapters

After the runtime transient cutover is stable, define dedicated shared-durable adapters for:

1. foundation directory repositories
2. protocol directory repositories
3. organizations and user profiles
4. admin authorization and authorization services

Why second:

- repository boundaries are now explicit
- but their adapter design should be deliberate rather than copied from transient-state patterns
- these domains will likely need stronger concurrency and indexing design than a generic snapshot adapter provides

## What Still Counts as De Facto Filesystem Authority

Even with repository extraction complete in the major modules, the following remain effectively filesystem-authoritative today unless `IDP_PLATFORM_PERSISTENCE_BACKEND=dynamodb-s3` is active and deliberately exercised:

- foundation directory repositories
- protocol directory repositories
- organizations repositories
- user profile repositories
- admin authorization repositories
- authorization services repositories
- federation runtime repository
- auth flow repository

In other words:

- repository shape is now explicit
- adapter authority is not yet broadly migrated

## Iteration 1B Deliverables

`Iteration 1B` should produce:

1. a repository-to-adapter mapping
2. a declared first cutover sequence
3. explicit separation between:
   - runtime transient cutover work
   - control-plane directory adapter design

## Exit Condition for Iteration 1B

`Iteration 1B` should be considered complete when:

- the current adapter mapping is explicit,
- the first cutover sequence is chosen,
- and the implementation can begin cutover work without needing more repository-shape cleanup first.
