# Headless IAM Issued Token Cutover Checklist

Last updated: 2026-04-11

## Purpose

This checklist converts `Sequence A / Step 4` from [Headless_IAM_Runtime_Cutover_Runbook.md](./Headless_IAM_Runtime_Cutover_Runbook.md) into an execution-ready cutover procedure for issued-token storage.

This is the last step in `Cutover Sequence A` because token behavior spans issuance, refresh, introspection, and revocation semantics across the protocol runtime.

## Code and Runtime Basis

This checklist is based on the current implementation in:

- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)

Relevant implementation facts:

- issued tokens are already fronted by `DualRunAsyncIssuedTokenStoreAdapter`
- token issuance, refresh, introspection, revocation, subject-wide revocation, and browser-session-linked revocation all depend on the issued-token store
- `IDP_DDB_RUNTIME_DUAL_WRITE=true` enables writes to both legacy and v2 while reads remain on legacy
- `IDP_DDB_RUNTIME_READ_V2=true` moves reads to v2 while writes continue to both stores

## Scope

In scope:

- access-token issuance
- refresh-token issuance and refresh exchange
- token introspection
- direct token revocation
- subject-scoped token revocation
- browser-session-linked token revocation
- restart behavior for active and revoked tokens

Not in scope:

- login transaction cutover
- ticket cutover
- session cutover
- broader control-plane directory authority cutover

## Preconditions

Do not execute this checklist until all of the following are true:

1. the login-transaction, ticket, and session cutover outcomes are recorded
2. the target environment has the runtime entity table provisioned and reachable
3. the target environment can set `IDP_DDB_RUNTIME_DUAL_WRITE` and `IDP_DDB_RUNTIME_READ_V2` independently
4. the environment can start in legacy-only mode:
   - `IDP_DDB_RUNTIME_DUAL_WRITE=false`
   - `IDP_DDB_RUNTIME_READ_V2=false`
5. operators can run OAuth flows that produce access and refresh tokens
6. operators can exercise introspection and revocation endpoints in the target environment
7. operators can restart the API runtime intentionally during the test window

## Functional Validation Set

Run the following validation set in each stage:

1. obtain an authorization-code or equivalent token set and confirm access and refresh tokens are issued successfully
2. introspect the active access token and confirm the expected active response is returned
3. use the refresh token to obtain a new token set and confirm refresh semantics remain correct
4. revoke a token directly and confirm introspection or protected-resource usage reflects the revoked state
5. revoke tokens for the current browser session and confirm linked tokens become inactive
6. issue fresh tokens for the same subject, then run subject-wide revocation and confirm they become inactive
7. restart the API runtime while at least one active token and one revoked token exist, then confirm both states remain consistent after restart

## Evidence to Capture

Capture the following evidence for each stage:

- flag values used for the run
- timestamped application logs for issuance, refresh, introspection, and revocation operations
- direct confirmation that legacy storage contains the expected issued-token records
- direct confirmation that v2 storage contains matching issued-token records when dual-write is enabled
- restart evidence showing active and revoked token states remain stable after restart
- mismatches in active, revoked, or refreshed token behavior

## Execution Stages

### Stage 0. Legacy-Only Baseline

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

Actions:

1. deploy or restart the runtime with both flags disabled
2. run the full functional validation set
3. capture baseline logs and expected token behavior

Exit criteria:

- issuance, refresh, introspection, and revocation succeed
- browser-session-linked and subject-wide revocation behave as expected
- restart behavior is stable

### Stage 1. Dual-Write with Legacy Reads

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=false`

Actions:

1. enable dual-write only
2. restart or roll the runtime so the new flag state is active
3. run the full functional validation set
4. confirm legacy remains the active read path during the test
5. inspect v2 storage and confirm matching writes for:
   - issuance
   - refresh transitions
   - introspection-relevant state
   - direct and indirect revocation

Exit criteria:

- all validation scenarios still pass with legacy reads
- v2 receives the expected issued-token writes
- no regression appears in refresh, revocation, or introspection semantics

Rollback from Stage 1:

1. set `IDP_DDB_RUNTIME_DUAL_WRITE=false`
2. restart the runtime
3. rerun a minimal legacy-only token validation

### Stage 2. V2 Reads with Dual-Write Still Enabled

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`

Actions:

1. enable v2 reads while keeping dual-write enabled
2. restart or roll the runtime so the new flag state is active
3. run the full functional validation set again
4. include at least one restart-in-the-middle scenario with active and revoked tokens present
5. confirm token reads now succeed from v2 without behavior drift

Exit criteria:

- all validation scenarios pass with v2 as the read path
- refresh, introspection, and revocation semantics remain unchanged
- browser-session-linked and subject-wide revocation remain correct
- restart behavior remains correct for active and revoked tokens

Rollback from Stage 2:

1. set `IDP_DDB_RUNTIME_READ_V2=false`
2. restart the runtime
3. rerun a minimal token validation
4. if problems continue, also set `IDP_DDB_RUNTIME_DUAL_WRITE=false` and return to legacy-only mode

## Failure Conditions

Stop the cutover immediately if any of the following occur:

- an active token becomes unreadable or invalid after restart without being revoked or expired
- a revoked token remains active through introspection or protected-resource usage
- refresh-token exchange changes behavior under `readV2`
- browser-session-linked or subject-wide revocation misses affected tokens
- legacy and v2 disagree on active, revoked, or refreshed token state

## Acceptance Gate

This checklist is complete only when:

1. Stage 0, Stage 1, and Stage 2 have all passed
2. rollback has been exercised successfully at least once
3. parity evidence exists for issuance, refresh, introspection, revocation, and restart behavior
4. the program can state that issued tokens are ready for shared-durable authority cutover

## Exit Output

When this checklist is complete, record:

- target environment
- execution date
- flag settings per stage
- pass/fail result per validation scenario
- rollback result
- open defects, if any
- go/no-go recommendation for closing `Cutover Sequence A`
