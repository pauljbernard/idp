---
id: headless-iam-login-transaction-dry-run-evidence
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Login Transaction Dry-Run Evidence

Last updated: 2026-04-11

## Purpose

This document is the first dry-run evidence pack for `Cutover Sequence A`.

It applies the structure from [Headless_IAM_Runtime_Cutover_Evidence_Pack.md](./headless-iam-runtime-cutover-evidence-pack.md) to the login-transaction cutover path, using current implementation analysis rather than live environment execution.

## Execution Metadata

| Field | Value |
| --- | --- |
| Sequence step | `Sequence A / Step 1` |
| Entity family | Login transactions |
| Target environment | Not yet assigned |
| Execution mode | `dry-run` |
| Execution date | 2026-04-11 |
| Operator | Codex |
| Runtime build / commit | Workspace state on 2026-04-11 |
| Runtime table name | Resolved at runtime by `resolveRuntimeTableName()` |
| Related checklist | [Headless_IAM_Login_Transaction_Cutover_Checklist.md](./headless-iam-login-transaction-cutover-checklist.md) |

## Preconditions Review

| Precondition | Status | Notes |
| --- | --- | --- |
| Runtime entity table provisioned and reachable | `Unknown` | Requires target environment confirmation |
| Runtime flags independently configurable | `Ready in code` | `getRuntimeRepositoryMode()` reads `IDP_DDB_RUNTIME_DUAL_WRITE` and `IDP_DDB_RUNTIME_READ_V2` independently |
| Legacy-only starting state confirmed | `Ready in code` | Both flags default to false unless explicitly enabled |
| Restart window available | `Unknown` | Operational environment not yet assigned |
| Functional test flow available for this entity family | `Likely ready` | Browser login flow already uses persisted login transactions |
| Logs and storage evidence accessible | `Unknown` | Needs environment-specific observability and storage access |
| Rollback window reserved | `Unknown` | Needs live execution schedule |

## Stage Assessment

### Stage 0. Legacy-Only Baseline

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

Assessment:

- baseline mode is structurally supported
- when both flags are disabled, `useRuntimeRepositoryPath` remains false and the runtime uses the legacy async login-transaction store
- this matches the intended baseline state for the checklist

Stage 0 dry-run conclusion:

- result: `Ready in code`
- blocking issues: none identified in code path review
- live-evidence gap: no target environment run has been recorded yet

### Stage 1. Dual-Write with Legacy Reads

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=false`

Assessment:

- dual-write mode is structurally supported
- `iamAuthenticationRuntime.ts` constructs `DualRunAsyncLoginTransactionStoreAdapter` whenever either runtime flag is enabled
- with `readV2=false`, the documented behavior is legacy reads plus writes to both legacy and v2 stores
- if the Dynamo-backed repository cannot be constructed, the runtime falls back to `NoopAsyncLoginTransactionStoreAdapter`, which protects boot but would invalidate live parity evidence

Stage 1 dry-run conclusion:

- result: `Conditionally ready`
- blocking issues:
  - live execution must verify that the Dynamo-backed repository path is actually active and not silently replaced by the noop adapter
- live-evidence gap:
  - no proof yet that the target environment resolves the runtime table successfully

### Stage 2. V2 Reads with Dual-Write Still Enabled

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`

Assessment:

- v2-read mode is structurally supported by the same dual-run adapter family
- the code path is consistent with the intended cutover sequence: enable dual-write first, then switch reads to v2
- the main remaining unknown is not code shape but environment correctness and parity under restart

Stage 2 dry-run conclusion:

- result: `Conditionally ready`
- blocking issues:
  - no live parity evidence exists yet for read-v2 semantics
  - restart behavior under v2 reads has not been exercised in a governed environment

## Code-Path Findings

1. login transactions are already isolated behind a dedicated async store path instead of raw snapshot helper calls
2. runtime mode flags are parsed centrally in [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)
3. the cutover design is credible because the login-transaction path is narrower than sessions or issued tokens
4. the primary operational risk is false confidence if the runtime silently falls back to the noop v2 adapter after a repository-construction failure

## Dry-Run Mode Addendum

| Dry-run item | Status | Notes |
| --- | --- | --- |
| Checklist reviewed against current code paths | `Complete` | Checklist aligns with current adapter and flag behavior |
| Runtime flags mapped to actual implementation | `Complete` | `dualWrite` and `readV2` semantics match the runbook and checklist |
| Validation scenarios are executable in principle | `Complete` | Login create, continue, complete, cancel, expiry, and restart scenarios all map to current behavior |
| Required environment capabilities identified | `Complete` | Needs runtime table, restart access, and storage evidence access |
| Missing prerequisites identified | `Complete` | Live environment assignment and confirmation that the v2 adapter is active are still missing |

## Decision

| Decision item | Outcome |
| --- | --- |
| Step accepted | `No` |
| Step blocked | `Not by code shape` |
| Rollback required | `Not applicable in dry-run` |
| Next step approved | `Live execution or controlled environment dry-run` |

Decision notes:

- recommendation: proceed to a live or controlled-environment execution of the login-transaction checklist before declaring `Iteration 1B` complete
- blockers: target environment selection, runtime-table reachability, and proof that the v2 adapter is not in noop fallback mode
- follow-up actions:
  - select the first environment for runtime cutover evidence collection
  - confirm runtime table resolution and repository construction succeed
  - execute Stage 0, Stage 1, and Stage 2 with rollback evidence
