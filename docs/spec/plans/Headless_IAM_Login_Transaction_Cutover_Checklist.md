# Headless IAM Login Transaction Cutover Checklist

Last updated: 2026-04-11

## Purpose

This checklist converts `Sequence A / Step 1` from [Headless_IAM_Runtime_Cutover_Runbook.md](./Headless_IAM_Runtime_Cutover_Runbook.md) into an execution-ready procedure for the first runtime shared-durable cutover.

The scope is intentionally narrow:

- browser login transactions only
- dual-write activation first
- v2-read activation only after parity confidence exists
- rollback tested before broader runtime cutover proceeds

## Code and Runtime Basis

This checklist is based on the current implementation in:

- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)

Relevant implementation facts:

- login transactions are already fronted by `DualRunAsyncLoginTransactionStoreAdapter`
- `IDP_DDB_RUNTIME_DUAL_WRITE=true` enables writes to both legacy and v2 stores while reads remain on legacy
- `IDP_DDB_RUNTIME_READ_V2=true` switches reads to v2 while writes continue to both paths
- `IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE` is available for parity instrumentation, but it is not a substitute for explicit functional validation

## Scope

In scope:

- login transaction creation
- login transaction continuation
- login transaction completion
- login transaction cancellation
- expiry and restart behavior for login transactions

Not in scope:

- account sessions
- password-reset or verification tickets
- issued tokens
- broader control-plane repository authority cutover

## Preconditions

Do not execute this checklist until all of the following are true:

1. the target environment has the runtime entity table provisioned and reachable
2. the target environment can set `IDP_DDB_RUNTIME_DUAL_WRITE` and `IDP_DDB_RUNTIME_READ_V2` independently
3. the environment starts in legacy-only mode:
   - `IDP_DDB_RUNTIME_DUAL_WRITE=false`
   - `IDP_DDB_RUNTIME_READ_V2=false`
4. operators can restart the API runtime intentionally during the test window
5. the target environment has at least one end-to-end browser login path that exercises a persisted login transaction
6. logs and storage evidence can be captured for both successful and rolled-back runs
7. a rollback window is reserved so the flags can be reverted immediately if parity or restart behavior fails

## Functional Validation Set

The same validation set must be run in each stage unless explicitly marked optional:

1. start a browser login and confirm the transaction is created
2. resume the same login journey from the issued transaction identifier or browser handoff point
3. complete a successful login path and confirm the transaction is no longer active
4. start a second login and cancel it, then confirm the transaction cannot be resumed
5. start a third login, restart the API runtime before completion, and confirm the transaction can still be resumed if it has not expired
6. start a fourth login, allow it to expire, and confirm expired state is observed consistently after restart
7. if consent or required-action steps are enabled in the target realm, include at least one flow that crosses those intermediate states

## Evidence to Capture

Capture the following evidence for each stage:

- flag values used for the run
- timestamped application logs for login-transaction creation, update, completion, cancellation, and expiry behavior
- direct confirmation that the expected legacy path still contains the written transaction state
- direct confirmation that the v2 runtime repository contains the same transaction state when dual-write is enabled
- restart results showing whether an in-flight transaction remains resumable
- any mismatches in terminal status, expiry handling, or missing transaction records

## Execution Stages

### Stage 0. Legacy-Only Baseline

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

Actions:

1. deploy or restart the runtime with both flags disabled
2. run the full functional validation set
3. capture baseline logs and current transaction behavior

Exit criteria:

- all validation scenarios pass
- restart behavior is stable
- no unexpected `Unknown login transaction` or cancellation-state regressions appear

### Stage 1. Dual-Write with Legacy Reads

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=false`

Actions:

1. enable dual-write only
2. restart or roll the runtime so the new flag state is active
3. run the full functional validation set
4. confirm the legacy path remains authoritative for reads during the test
5. inspect the v2 repository and confirm matching transaction records are written for created, updated, completed, cancelled, and expired transactions

Exit criteria:

- all functional scenarios still pass while reads remain on legacy
- v2 receives the expected transaction writes
- no write-path regression appears in login creation, continuation, completion, or cancellation

Rollback from Stage 1:

1. set `IDP_DDB_RUNTIME_DUAL_WRITE=false`
2. restart the runtime
3. rerun the baseline login flow to confirm legacy-only behavior is restored

### Stage 2. V2 Reads with Dual-Write Still Enabled

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`

Actions:

1. enable v2 reads while keeping dual-write enabled
2. restart or roll the runtime so the new flag state is active
3. run the full functional validation set again
4. include at least one restart-in-the-middle test for an unfinished transaction
5. confirm reads now succeed from the v2 repository without observable behavior change

Exit criteria:

- all functional scenarios pass with v2 as the read path
- restart-resume behavior is unchanged
- cancellation and expiry semantics are unchanged
- no transaction disappears during mid-flight continuation

Rollback from Stage 2:

1. set `IDP_DDB_RUNTIME_READ_V2=false`
2. restart the runtime
3. rerun the baseline login flow
4. if problems continue, also set `IDP_DDB_RUNTIME_DUAL_WRITE=false` and return to full legacy-only mode

## Failure Conditions

Stop the cutover immediately if any of the following occur:

- an in-flight login cannot be resumed after restart when it should still be valid
- a completed or cancelled transaction can still be resumed
- expiry state differs between legacy and v2
- `Unknown login transaction` appears for a known active transaction
- dual-write produces missing or structurally inconsistent transaction records in v2
- switching `readV2` changes observable login behavior

## Acceptance Gate

This checklist is complete only when:

1. Stage 0, Stage 1, and Stage 2 have all passed
2. rollback has been exercised successfully at least once
3. the evidence package shows parity for creation, continuation, completion, cancellation, expiry, and restart behavior
4. the program can state that login transactions are the first runtime-transient entity family ready for shared-durable authority cutover

## Exit Output

When this checklist is complete, record:

- target environment
- execution date
- flag settings per stage
- pass/fail result per validation scenario
- rollback result
- open defects, if any
- go/no-go recommendation for the next `Sequence A` step: tickets
