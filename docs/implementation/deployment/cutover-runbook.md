---
id: cutover-runbook
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Runtime Cutover Runbook

Last updated: 2026-04-11

## Purpose

This runbook operationalizes `Cutover Sequence A` from [Headless_IAM_Adapter_Cutover_Sequence.md](./headless-iam-adapter-cutover-sequence.md).

It covers the first shared-durable cutover path for runtime transient domains that already have dual-run adapter support:

1. login transactions
2. tickets
3. sessions
4. issued tokens

## Existing Cutover Mechanics

The current runtime cutover machinery is controlled by:

- `IDP_DDB_RUNTIME_DUAL_WRITE`
- `IDP_DDB_RUNTIME_READ_V2`
- `IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE`

These flags are read through [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts).

The current dual-run adapters behave as follows:

- when `readV2` is `false`, reads stay on legacy storage
- when `dualWrite` is `true`, writes are sent to both legacy and v2
- when `readV2` is `true`, reads switch to v2 and writes continue to both paths

This means the intended safe transition is:

1. legacy-only
2. dual-write with legacy reads
3. v2 reads with dual-write still enabled
4. later cleanup after parity confidence is high

## Scope of Sequence A

### Authentication Runtime

Covered by [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts):

- login transactions
- password reset tickets
- email verification tickets
- pending MFA enrollments
- account sessions

Relevant adapters:

- `DualRunAsyncLoginTransactionStoreAdapter`
- `DualRunAsyncTicketStoreAdapter`
- `DualRunAsyncSessionStoreAdapter`

### Protocol Runtime

Covered by [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts):

- issued tokens

Relevant adapter:

- `DualRunAsyncIssuedTokenStoreAdapter`

## Cutover Preconditions

Do not begin runtime cutover until all of the following are true:

1. the runtime entity table exists and matches the expected key and index shape
2. the repository mode flags are disabled by default and can be enabled deliberately per environment
3. the current repository-boundary extraction work is already complete for the major control-plane modules
4. the verification scripts and runtime smoke tests are runnable against the target environment

## Sequence A Implementation Order

### Step 1. Login Transactions

Why first:

- narrow state shape
- limited lifecycle
- high visibility in browser login correctness
- lower blast radius than sessions or issued tokens

Enablement order:

1. confirm legacy-only behavior with both flags disabled
2. enable `IDP_DDB_RUNTIME_DUAL_WRITE=true`
3. exercise login flows and verify dual persistence
4. only after parity confidence, enable `IDP_DDB_RUNTIME_READ_V2=true`

Success criteria:

- login creation and continuation succeed
- consent and required-action paths still complete
- no stranded transaction IDs appear after restart

Rollback:

- set `IDP_DDB_RUNTIME_READ_V2=false`
- if necessary, set `IDP_DDB_RUNTIME_DUAL_WRITE=false`

### Step 2. Tickets

Scope:

- password reset tickets
- email verification tickets
- pending MFA enrollment records

Why second:

- still bounded
- important for self-service and recovery correctness
- less cross-cutting than sessions

Success criteria:

- ticket issuance succeeds
- ticket redemption succeeds
- expiry handling remains correct
- pending MFA replacement and retrieval remain correct

Rollback:

- same as login transactions

### Step 3. Sessions

Why third:

- highest-impact authentication runtime path
- more cross-cutting than transactions or tickets
- directly tied to logout, reuse, and account session visibility

Success criteria:

- session creation and lookup work across restart
- logout and termination semantics remain correct
- user session listing remains consistent

Rollback:

- revert `readV2` first
- leave `dualWrite` on only if parity evidence is still being gathered

### Step 4. Issued Tokens

Why fourth:

- broad effect across introspection, revocation, refresh, and session-linked semantics
- depends on the preceding runtime paths being stable

Success criteria:

- token issuance succeeds
- access-hash and refresh-hash lookup semantics remain correct
- subject and browser-session indexes still drive revocation correctly
- refresh-token paths behave the same before and after v2 reads

Rollback:

- revert `readV2` first
- keep `dualWrite` only while parity evidence is still needed

## Validation Requirements Per Step

For each cutover step, validation should include:

1. legacy-only baseline run
2. dual-write run with legacy reads
3. v2-read run
4. restart-safe rerun
5. explicit rollback drill

Required evidence should include:

- API success behavior
- restart behavior
- parity of read/write semantics for the affected entity family
- absence of unexpected cross-family regressions

## Explicit Non-Goals for Sequence A

This cutover sequence is not the time to:

- migrate broad directory repositories to Dynamo-backed authority
- rewrite control-plane entity schemas
- expand protocol support
- add new IAM feature breadth

The purpose is to prove that the runtime transient shared-durable path works first.

## Sequence A Exit Condition

Sequence A should be considered ready to execute when:

- the target environment can enable the runtime flags safely
- validation steps exist for each entity family
- and rollback is tested before broad read-v2 adoption

Sequence A should be considered complete when:

- login transactions, tickets, sessions, and issued tokens have all passed the dual-write and v2-read sequence
- and the program can then design the broader control-plane directory adapter cutover from a stable runtime-transient base.
