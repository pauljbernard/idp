---
id: headless-iam-login-transaction-local-dynamo-evidence
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Login Transaction Local Dynamo Evidence

Last updated: 2026-04-11

## Purpose

This document records the first successful local development execution of the `Sequence A / Step 1` runtime cutover path using a real Dynamo-backed runtime entity table.

It is not a substitute for shared-environment evidence, but it is the first governed proof that:

- the current runtime can move beyond `NOOP_FALLBACK`,
- the Sequence A entity families can resolve to real Dynamo-backed adapters,
- and the local development environment can now reproduce the cutover gate intentionally.

## Execution Metadata

| Field | Value |
| --- | --- |
| Sequence step | `Sequence A / Step 1` |
| Entity family | Login transactions, with shared runtime status observed for sessions, tickets, and issued tokens |
| Target environment | Local development |
| Execution mode | `live` |
| Execution date | 2026-04-11 |
| Operator | Codex |
| Runtime build / commit | Workspace state on 2026-04-11 |
| Runtime table name | `idp-iam-runtime-local` |
| Related checklist | [Headless_IAM_Login_Transaction_Cutover_Checklist.md](./headless-iam-login-transaction-cutover-checklist.md) |

## Environment Setup

Runtime table provisioning:

- endpoint: `http://127.0.0.1:8000`
- table name: `idp-iam-runtime-local`
- partition and sort key: `pk`, `sk`
- required secondary indexes: `gsi1`, `gsi2`
- TTL attribute: `expires_at_epoch`

The table was provisioned successfully against the existing local DynamoDB container.

Runtime activation environment:

- `PORT=4111`
- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_IAM_RUNTIME_DDB_TABLE=idp-iam-runtime-local`
- `IDP_DYNAMODB_ENDPOINT=http://127.0.0.1:8000`
- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`

## Preconditions Review

| Precondition | Status | Notes |
| --- | --- | --- |
| Runtime entity table provisioned and reachable | `Pass` | Local Dynamo-backed runtime table created and queried successfully |
| Runtime flags independently configurable | `Pass` | Runtime started with dual-write enabled and read-v2 disabled |
| Legacy-only starting state confirmed | `Pass` | Earlier local baseline run reported `runtime-cutover-readiness=WARN` |
| Restart window available | `Pass` | Local runtime was started on an isolated port for the rehearsal |
| Functional test flow available for this entity family | `Pass` | Browser login flow completed successfully |
| Logs and storage evidence accessible | `Partial` | Runtime health and login responses were captured; storage-row inspection not yet formalized |
| Rollback window reserved | `Pass` | Local process was isolated and terminated after verification |

## Stage Results

### Stage 0. Legacy-Only Baseline

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

Result:

- `Pass`

Observed health result:

- `overall_status=DEGRADED`
- `runtime-cutover-readiness=WARN`
- summary: `Runtime cutover flags are disabled; shared-durable v2 adapter activation has not been proven yet.`

### Stage 1. Dual-Write with No Reachable Runtime Table

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=false`
- no valid runtime table configuration

Result:

- `Fail as designed`

Observed health result:

- `overall_status=FAILED`
- `runtime-cutover-readiness=FAIL`
- summary: `Runtime cutover flags are enabled, but at least one v2 path is in noop fallback: sessions=NOOP_FALLBACK, tickets=NOOP_FALLBACK, login_transactions=NOOP_FALLBACK, issued_tokens=NOOP_FALLBACK.`

Interpretation:

- this was the expected safety gate
- the runtime did not silently over-claim successful cutover activation

### Stage 1. Dual-Write with Reachable Runtime Table

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=false`
- runtime table configured and reachable

Result:

- `Pass`

Observed health result:

- `overall_status=DEGRADED`
- `runtime-cutover-readiness=PASS`
- summary: `Runtime cutover flags are enabled and all Sequence A v2 paths resolved to Dynamo-backed adapters: sessions=DYNAMO_V2_ACTIVE, tickets=DYNAMO_V2_ACTIVE, login_transactions=DYNAMO_V2_ACTIVE, issued_tokens=DYNAMO_V2_ACTIVE.`

### Stage 2. V2 Reads with Dual-Write Still Enabled

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`
- runtime table configured and reachable

Result:

- `Pass`

Observed health result:

- `overall_status=DEGRADED`
- `runtime-cutover-readiness=PASS`
- summary: `Runtime cutover flags are enabled and all Sequence A v2 paths resolved to Dynamo-backed adapters: sessions=DYNAMO_V2_ACTIVE, tickets=DYNAMO_V2_ACTIVE, login_transactions=DYNAMO_V2_ACTIVE, issued_tokens=DYNAMO_V2_ACTIVE.`

Additional local evidence:

- browser login still completed successfully while `read_v2=true`
- direct DynamoDB table inspection showed runtime-backed session and login-transaction records present in `idp-iam-runtime-local`

## Functional Validation Summary

| Validation scenario | Pass/Fail | Notes |
| --- | --- | --- |
| Browser login transaction creation | `Pass` | Login request completed successfully against the Dynamo-backed runtime activation |
| Authenticated session issuance | `Pass` | Browser login returned a live IAM session |
| IAM operations health access | `Pass` | Health route returned authenticated runtime status through the real admin path |
| Runtime adapter activation proof | `Pass` | All Sequence A families reported `DYNAMO_V2_ACTIVE` |
| Stage 2 `read_v2` activation | `Pass` | Enabling `IDP_DDB_RUNTIME_READ_V2=true` preserved healthy cutover posture |
| Runtime-table inspection | `Pass` | Shared table contained runtime session and login-transaction records |
| Negative cutover-path proof | `Pass` | Earlier dual-write rehearsal without a table reported `NOOP_FALLBACK` as expected |

## Rollback Notes

Rollback execution:

- `read_v2` was disabled again on a fresh runtime boot while `dual_write` remained enabled
- browser login still completed successfully after the rollback
- `/api/v1/iam/operations/health` continued to report `runtime-cutover-readiness=PASS`

Rollback conclusion:

- local rollback from Stage 2 back to Stage 1 is viable
- a full shared-environment evidence run should still capture explicit artifact-level rollback logs and timestamps, but the local runtime behavior is now proven in both directions

Current local conclusion:

- the environment is now capable of repeatable local activation
- the environment is also capable of local Stage 2 activation and return-to-Stage-1 rollback without losing healthy runtime posture
- the next governed exercise should reproduce the same sequence in a shared target environment with formal artifact capture

## Decision

| Decision item | Outcome |
| --- | --- |
| Step accepted | `Accepted for local viability proof` |
| Step blocked | `Still blocked for shared-environment claim gate` |
| Rollback required | `Not for this local proof run` |
| Next step approved | `Yes, in a shared target environment` |

Decision notes:

- recommendation: treat this as the first successful local preflight proving the runtime-table dependency and healthy activation path
- recommendation: treat this as a near-complete local Sequence A rehearsal covering baseline, negative gate, positive dual-write activation, positive v2-read activation, and rollback to dual-write-only
- blockers: formal evidence bundle generation inside the current Codex sandbox is still constrained by child-process network restrictions, and shared-environment execution has not yet been recorded
- follow-up actions:
  - repeat the same activation pattern in the intended shared target environment
  - execute the full login-transaction checklist with rollback evidence
  - advance to tickets only after the shared-environment evidence pack is complete
