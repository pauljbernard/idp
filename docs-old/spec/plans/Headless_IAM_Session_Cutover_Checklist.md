# Headless IAM Session Cutover Checklist

Last updated: 2026-04-11

## Purpose

This checklist converts `Sequence A / Step 3` from [Headless_IAM_Runtime_Cutover_Runbook.md](./Headless_IAM_Runtime_Cutover_Runbook.md) into an execution-ready cutover procedure for browser account sessions.

This step should be executed only after the login-transaction and ticket cutover outcomes are recorded, because session behavior is broader and has stronger downstream impact.

## Code and Runtime Basis

This checklist is based on the current implementation in:

- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)

Relevant implementation facts:

- account sessions are already fronted by `DualRunAsyncSessionStoreAdapter`
- session creation, retrieval, touch, logout, targeted revocation, and multi-session revocation all use the session runtime store
- session revocation also drives downstream token revocation and linked-session termination behavior
- `IDP_DDB_RUNTIME_DUAL_WRITE=true` enables writes to both legacy and v2 while reads remain on legacy
- `IDP_DDB_RUNTIME_READ_V2=true` moves reads to v2 while writes continue to both stores

## Scope

In scope:

- browser session creation during login
- session retrieval and touch behavior
- session listing for the current user
- logout and targeted session revocation
- revoke-other-sessions behavior
- restart behavior for active sessions
- expiry and revoked-session behavior

Not in scope:

- login transactions
- password reset and verification tickets
- issued-token repository cutover itself
- broader control-plane directory authority cutover

## Preconditions

Do not execute this checklist until all of the following are true:

1. the login-transaction and ticket cutover outcomes are recorded
2. the target environment has the runtime entity table provisioned and reachable
3. the target environment can set `IDP_DDB_RUNTIME_DUAL_WRITE` and `IDP_DDB_RUNTIME_READ_V2` independently
4. the environment can start in legacy-only mode:
   - `IDP_DDB_RUNTIME_DUAL_WRITE=false`
   - `IDP_DDB_RUNTIME_READ_V2=false`
5. operators can create at least two active sessions for the same user
6. operators can restart the API runtime intentionally during the test window
7. logs and storage evidence can be captured for both legacy and v2 session paths

## Functional Validation Set

Run the following validation set in each stage:

1. complete a successful login and confirm an active browser session is created
2. reuse the session on an authenticated endpoint and confirm touch or last-seen behavior still works
3. list sessions for the current user and confirm the current session appears with the expected active status
4. create a second session for the same user and confirm both sessions are listed
5. revoke one target session and confirm it can no longer be used while the other active session remains valid
6. recreate a second session and run revoke-other-sessions, confirming only the current session remains active
7. restart the API runtime while one valid active session exists, then confirm it remains usable after restart
8. let a session expire and confirm it is no longer accepted and is surfaced consistently as expired or inactive

## Evidence to Capture

Capture the following evidence for each stage:

- flag values used for the run
- timestamped application logs for session creation, touch, logout, revocation, and expiry
- direct confirmation that legacy storage contains the expected session state
- direct confirmation that v2 storage contains matching session state when dual-write is enabled
- restart evidence showing active sessions remain usable after restart
- evidence that targeted revocation and revoke-other-sessions preserve intended semantics

## Execution Stages

### Stage 0. Legacy-Only Baseline

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

Actions:

1. deploy or restart the runtime with both flags disabled
2. run the full functional validation set
3. capture baseline logs and expected session behavior

Exit criteria:

- session creation, touch, listing, logout, and revocation succeed
- restart behavior is stable
- expired sessions are not treated as active

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
   - session creation
   - last-seen updates
   - logout and revocation
   - expiry transitions

Exit criteria:

- all validation scenarios still pass with legacy reads
- v2 receives the expected session writes
- no regression appears in authenticated session behavior or revocation behavior

Rollback from Stage 1:

1. set `IDP_DDB_RUNTIME_DUAL_WRITE=false`
2. restart the runtime
3. rerun a minimal legacy-only session validation

### Stage 2. V2 Reads with Dual-Write Still Enabled

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`

Actions:

1. enable v2 reads while keeping dual-write enabled
2. restart or roll the runtime so the new flag state is active
3. run the full functional validation set again
4. include at least one restart-in-the-middle scenario with an active session
5. confirm session reads now succeed from v2 without behavior drift

Exit criteria:

- all validation scenarios pass with v2 as the read path
- current-session and revoke-other-sessions semantics remain unchanged
- expiry and revoked-session semantics remain unchanged
- restart behavior remains correct for active sessions

Rollback from Stage 2:

1. set `IDP_DDB_RUNTIME_READ_V2=false`
2. restart the runtime
3. rerun a minimal session validation
4. if problems continue, also set `IDP_DDB_RUNTIME_DUAL_WRITE=false` and return to legacy-only mode

## Failure Conditions

Stop the cutover immediately if any of the following occur:

- a valid active session becomes unusable after restart
- logout or targeted revocation fails to deactivate the target session
- revoke-other-sessions deactivates the wrong session set
- expired or revoked sessions continue to authenticate successfully
- legacy and v2 disagree on active, revoked, or expired session status
- switching `readV2` changes user-visible session behavior

## Acceptance Gate

This checklist is complete only when:

1. Stage 0, Stage 1, and Stage 2 have all passed
2. rollback has been exercised successfully at least once
3. parity evidence exists for session creation, listing, touch, logout, revocation, expiry, and restart behavior
4. the program can state that browser sessions are ready for shared-durable authority cutover

## Exit Output

When this checklist is complete, record:

- target environment
- execution date
- flag settings per stage
- pass/fail result per validation scenario
- rollback result
- open defects, if any
- go/no-go recommendation for the next `Sequence A` step: issued tokens
