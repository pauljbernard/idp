---
id: headless-iam-ticket-cutover-checklist
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Ticket Cutover Checklist

Last updated: 2026-04-11

## Purpose

This checklist converts `Sequence A / Step 2` from [Headless_IAM_Runtime_Cutover_Runbook.md](./cutover-runbook.md) into an execution-ready cutover procedure for runtime ticket entities.

It is intended to be executed only after the login-transaction cutover has either:

- passed and produced acceptable parity evidence, or
- failed with blockers that do not invalidate the ticket-path adapter design itself

## Code and Runtime Basis

This checklist is based on the current implementation in:

- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)

Relevant implementation facts:

- ticket entities are already fronted by `DualRunAsyncTicketStoreAdapter`
- the runtime ticket cutover covers three entity families:
  - password reset tickets
  - email verification tickets
  - pending MFA enrollments
- `IDP_DDB_RUNTIME_DUAL_WRITE=true` enables writes to both legacy and v2 while reads remain on legacy
- `IDP_DDB_RUNTIME_READ_V2=true` moves reads to v2 while writes continue to both stores

## Scope

In scope:

- password reset ticket issuance
- password reset ticket redemption
- email verification ticket issuance
- email verification ticket redemption
- pending MFA enrollment creation
- pending MFA enrollment retrieval and replacement
- expiry behavior where applicable
- restart behavior for active ticket entities

Not in scope:

- login transactions
- account sessions
- issued tokens
- broader control-plane directory authority cutover

## Preconditions

Do not execute this checklist until all of the following are true:

1. the login-transaction cutover outcome is recorded
2. the target environment has the runtime entity table provisioned and reachable
3. the target environment can set `IDP_DDB_RUNTIME_DUAL_WRITE` and `IDP_DDB_RUNTIME_READ_V2` independently
4. the environment can start in legacy-only mode:
   - `IDP_DDB_RUNTIME_DUAL_WRITE=false`
   - `IDP_DDB_RUNTIME_READ_V2=false`
5. password reset, email verification, and MFA enrollment flows are available in the target environment
6. operators can restart the API runtime intentionally during the test window
7. logs and storage evidence can be captured for both legacy and v2 paths

## Functional Validation Set

Run the following validation set in each stage:

1. issue a password reset ticket and confirm it is created with the expected active status
2. redeem the password reset ticket with a valid code and confirm it transitions to consumed state
3. issue a second password reset ticket, let it expire, and confirm it transitions to expired state and cannot be redeemed
4. issue an email verification ticket and confirm it is created with the expected active status
5. redeem the email verification ticket with a valid code and confirm it transitions to consumed state
6. issue a second email verification ticket, let it expire, and confirm it transitions to expired state and cannot be redeemed
7. create a pending MFA enrollment and confirm it is retrievable by enrollment identifier
8. replace or overwrite the pending MFA enrollment for the same user and confirm the latest enrollment is the one retrieved
9. restart the API runtime while at least one active ticket or enrollment record exists, then confirm the active record can still be read and completed if still valid

## Evidence to Capture

Capture the following evidence for each stage:

- flag values used for the run
- timestamped application logs for ticket issuance, ticket redemption, enrollment creation, enrollment replacement, and expiry transitions
- direct confirmation that legacy storage contains the expected ticket or enrollment state
- direct confirmation that v2 storage contains matching state when dual-write is enabled
- restart evidence showing active entities remain readable after restart
- mismatches in status transitions, missing records, or incorrect post-expiry behavior

## Execution Stages

### Stage 0. Legacy-Only Baseline

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

Actions:

1. deploy or restart the runtime with both flags disabled
2. run the full functional validation set
3. capture baseline logs and expected state transitions

Exit criteria:

- password reset issuance and redemption succeed
- email verification issuance and redemption succeed
- pending MFA enrollment retrieval and replacement succeed
- expiry and restart behavior are stable

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
   - password reset ticket creation, expiry, and consumption
   - email verification ticket creation, expiry, and consumption
   - pending MFA enrollment create and replace operations

Exit criteria:

- all validation scenarios still pass with legacy reads
- v2 receives the expected ticket and enrollment writes
- no regression appears in issuance, redemption, replacement, or expiry handling

Rollback from Stage 1:

1. set `IDP_DDB_RUNTIME_DUAL_WRITE=false`
2. restart the runtime
3. rerun a minimal legacy-only ticket validation to confirm baseline behavior is restored

### Stage 2. V2 Reads with Dual-Write Still Enabled

Required flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`

Actions:

1. enable v2 reads while keeping dual-write enabled
2. restart or roll the runtime so the new flag state is active
3. run the full functional validation set again
4. include at least one restart-in-the-middle scenario with an active ticket or pending MFA enrollment
5. confirm reads now succeed from v2 without user-visible behavior drift

Exit criteria:

- all validation scenarios pass with v2 as the read path
- consumed, expired, and active status transitions remain unchanged
- pending MFA retrieval and replacement semantics remain unchanged
- restart behavior remains correct for active entities

Rollback from Stage 2:

1. set `IDP_DDB_RUNTIME_READ_V2=false`
2. restart the runtime
3. rerun a minimal ticket validation
4. if problems continue, also set `IDP_DDB_RUNTIME_DUAL_WRITE=false` and return to legacy-only mode

## Failure Conditions

Stop the cutover immediately if any of the following occur:

- a valid ticket cannot be redeemed after restart when it should still be active
- an expired or consumed ticket is still accepted
- pending MFA enrollment retrieval returns stale or missing data after replacement
- legacy and v2 disagree on ticket status or enrollment state
- switching `readV2` changes user-visible ticket or MFA behavior

## Acceptance Gate

This checklist is complete only when:

1. Stage 0, Stage 1, and Stage 2 have all passed
2. rollback has been exercised successfully at least once
3. parity evidence exists for ticket issuance, redemption, expiry, pending MFA replacement, and restart behavior
4. the program can state that the ticket-path runtime entities are ready for shared-durable authority cutover

## Exit Output

When this checklist is complete, record:

- target environment
- execution date
- flag settings per stage
- pass/fail result per validation scenario
- rollback result
- open defects, if any
- go/no-go recommendation for the next `Sequence A` step: sessions
