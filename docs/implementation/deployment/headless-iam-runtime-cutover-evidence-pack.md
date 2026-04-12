---
id: headless-iam-runtime-cutover-evidence-pack
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Runtime Cutover Evidence Pack

Last updated: 2026-04-11

## Purpose

This document is the formal recording template for `Cutover Sequence A` execution evidence.

It is used when a sequence step is:

- executed in a target environment, or
- dry-run simulated because the target environment is not yet available

The purpose is to ensure each runtime cutover step records the same decision-grade evidence before the program claims shared-durable authority progress.

## Applicable Checklists

Use this evidence pack together with:

- [Headless_IAM_Login_Transaction_Cutover_Checklist.md](./Headless_IAM_Login_Transaction_Cutover_Checklist.md)
- [Headless_IAM_Ticket_Cutover_Checklist.md](./Headless_IAM_Ticket_Cutover_Checklist.md)
- [Headless_IAM_Session_Cutover_Checklist.md](./Headless_IAM_Session_Cutover_Checklist.md)
- [Headless_IAM_Issued_Token_Cutover_Checklist.md](./Headless_IAM_Issued_Token_Cutover_Checklist.md)

## Execution Metadata

| Field | Value |
| --- | --- |
| Sequence step | |
| Entity family | |
| Target environment | |
| Execution mode | `live` / `dry-run` |
| Execution date | |
| Operator | |
| Runtime build / commit | |
| Runtime table name | |
| Related checklist | |

## Preconditions Review

| Precondition | Status | Notes |
| --- | --- | --- |
| Runtime entity table provisioned and reachable | | |
| Runtime flags independently configurable | | |
| Legacy-only starting state confirmed | | |
| Restart window available | | |
| Functional test flow available for this entity family | | |
| Logs and storage evidence accessible | | |
| Rollback window reserved | | |

Preflight attachment:

- include the output of `OUTPUT_MODE=json bash scripts/verify-idp-runtime-cutover-readiness.sh`
- optionally render an evidence-pack section with `npm run render:idp:runtime-cutover-preflight -- /path/to/preflight.json`
- for the parent shared-environment review surface, operators can render `sequence-a-status-matrix.md` with `npm run render:idp:sequence-a-status-matrix -- /path/to/sequence-a-manifest.json`
- operators can verify that the parent status matrix and step evidence documents are fully filled in with `npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json`
- operators can render that verification result as markdown with `OUTPUT_MODE=markdown npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json`
- operators can refresh the manifest lifecycle state with `npm run update:idp:sequence-a-bundle-status -- /path/to/sequence-a-manifest.json`
- for any `Sequence A` step, operators can scaffold a full evidence document with `npm run scaffold:idp:runtime-cutover-evidence -- /path/to/preflight.json <step-number> "<entity-family>" <checklist-path>`
- for the first live login-transaction run, operators can scaffold a full evidence document with `npm run scaffold:idp:login-transaction-evidence -- /path/to/preflight.json`
- or use the shorthand scaffold commands:
  - `npm run scaffold:idp:ticket-evidence -- /path/to/preflight.json`
  - `npm run scaffold:idp:session-evidence -- /path/to/preflight.json`
  - `npm run scaffold:idp:issued-token-evidence -- /path/to/preflight.json`
- operators can generate a full generic bundle with `npm run prepare:idp:runtime-cutover-evidence -- <slug> <step-number> "<entity-family>" <checklist-path> /path/to/output-dir`
- or generate both artifacts together with `npm run prepare:idp:login-transaction-evidence -- /path/to/output-dir`
- or use the shorthand bundle commands:
  - `npm run prepare:idp:ticket-evidence -- /path/to/output-dir`
  - `npm run prepare:idp:session-evidence -- /path/to/output-dir`
  - `npm run prepare:idp:issued-token-evidence -- /path/to/output-dir`
- for a shared-environment execution window, operators can prepare all four `Sequence A` bundles together with `npm run prepare:idp:sequence-a-evidence -- /path/to/output-dir`
- the Sequence A batch bundle now includes a parent `README.md`, `sequence-a-manifest.json`, and `sequence-a-status-matrix.md` so reviewers can traverse the four step bundles and record the top-level go/no-go decision from one entrypoint
- the parent `sequence-a-status-matrix.md` is rendered from the generated manifest and preflight artifacts, so it starts with actual captured preflight state instead of a blank matrix
- the bundle verifier treats unresolved `<fill>` placeholders as incomplete evidence, which gives the execution window a simple review-readiness gate before Phase 1 claims are advanced
- the batch bundle also persists `sequence-a-verification.md` and `sequence-a-verification.json`, so the latest completeness check result travels with the packet instead of living only in terminal output
- those persisted verification artifacts are emitted after the manifest lifecycle state is refreshed, so the packet does not immediately ship with a stale verification/status mismatch
- the parent `sequence-a-status-matrix.md` is re-rendered after that lifecycle refresh as well, so the packet does not ship with a stale status-matrix view of the manifest state
- the generated parent bundle `README.md` includes the exact regenerate and verify commands so reviewers can re-run the parent checks without reconstructing the workflow from repo docs
- the generated parent bundle `README.md` also includes a parent artifact index and per-step artifact map so the full packet can be navigated from one entrypoint
- the generated `sequence-a-manifest.json` now mirrors that structure with explicit parent-artifact and per-step artifact paths for automation and secondary tooling
- the parent status-matrix renderer and bundle verifier now resolve packet locations from those manifest-declared artifact paths first, which makes the manifest the authoritative machine-readable index for the bundle
- the manifest also carries explicit format metadata (`manifest_kind`, `manifest_version`) and a `bundle_status` field so downstream tooling can evolve without inferring packet shape heuristically
- `bundle_status` is now maintained by a dedicated updater and currently distinguishes `scaffolded`, `in-progress`, and `review-ready` packet states
- the verifier now also compares the declared `bundle_status` to the status implied by the actual packet contents, so stale lifecycle metadata is surfaced during review instead of being silently trusted
- when using the combined preparer, attach the generated bundle `README.md` to preserve the operator workflow context used during execution
- attach the corresponding persisted `operations-health.json` response from the generated bundle
- if the target environment is not the default local bootstrap, set `IDP_BASE_URL` before running the preflight or bundle commands

## Stage Results

### Stage 0. Legacy-Only Baseline

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=false`
- `IDP_DDB_RUNTIME_READ_V2=false`

| Validation scenario | Pass/Fail | Notes / Evidence |
| --- | --- | --- |
| Baseline functional scenario 1 | | |
| Baseline functional scenario 2 | | |
| Baseline functional scenario 3 | | |
| Baseline restart scenario | | |
| Baseline expiry or terminal-state scenario | | |

Stage 0 decision:

- result:
- blocking issues:
- logs / references:

### Stage 1. Dual-Write with Legacy Reads

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=false`

| Validation scenario | Pass/Fail | Notes / Evidence |
| --- | --- | --- |
| Dual-write functional scenario 1 | | |
| Dual-write functional scenario 2 | | |
| Dual-write functional scenario 3 | | |
| Dual-write restart scenario | | |
| Legacy-v2 parity check | | |

Stage 1 decision:

- result:
- blocking issues:
- legacy evidence:
- v2 evidence:
- logs / references:

### Stage 2. V2 Reads with Dual-Write Still Enabled

Flags:

- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`

| Validation scenario | Pass/Fail | Notes / Evidence |
| --- | --- | --- |
| V2-read functional scenario 1 | | |
| V2-read functional scenario 2 | | |
| V2-read functional scenario 3 | | |
| V2-read restart scenario | | |
| V2-read parity check | | |

Stage 2 decision:

- result:
- blocking issues:
- logs / references:

## Rollback Drill

| Item | Result | Notes |
| --- | --- | --- |
| `readV2` rollback executed | | |
| Runtime restarted successfully after rollback | | |
| Baseline functional path restored | | |
| `dualWrite` rollback executed if needed | | |

Rollback notes:

- observed behavior:
- residual risk:

## Behavior Comparison Summary

| Behavior area | Legacy-only | Dual-write | V2-read | Outcome |
| --- | --- | --- | --- | --- |
| Create / issue | | | | |
| Read / resume / introspect | | | | |
| Update / touch / refresh | | | | |
| Complete / consume / revoke | | | | |
| Restart behavior | | | | |
| Expiry / terminal-state behavior | | | | |

## Storage Parity Summary

| Evidence item | Status | Notes |
| --- | --- | --- |
| Expected writes observed in legacy | | |
| Expected writes observed in v2 | | |
| Terminal state consistent across stores | | |
| No missing records observed | | |
| No user-visible behavior drift observed | | |

## Decision

| Decision item | Outcome |
| --- | --- |
| Step accepted | |
| Step blocked | |
| Rollback required | |
| Next step approved | |

Decision notes:

- recommendation:
- blockers:
- follow-up actions:

## Dry-Run Mode Addendum

If the execution mode is `dry-run`, record the following instead of live runtime evidence:

| Dry-run item | Status | Notes |
| --- | --- | --- |
| Checklist reviewed against current code paths | | |
| Runtime flags mapped to actual implementation | | |
| Validation scenarios are executable in principle | | |
| Required environment capabilities identified | | |
| Missing prerequisites identified | | |

Dry-run conclusion:

- what is ready now:
- what remains before live execution:
- go/no-go recommendation for live environment execution:
