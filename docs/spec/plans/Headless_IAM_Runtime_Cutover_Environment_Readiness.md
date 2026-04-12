# Headless IAM Runtime Cutover Environment Readiness

Last updated: 2026-04-11

## Purpose

This document defines the environment-readiness gate for the first live execution of `Cutover Sequence A`.

It exists because the runtime cutover path is structurally ready in code, but live cutover evidence is only credible if the target environment proves that:

- the runtime table is actually reachable,
- the runtime flags can be controlled deliberately,
- and the v2 repository path is active rather than silently replaced by noop fallback adapters.

## Code Basis

This readiness gate is derived from:

- [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts)
- [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts)
- [runtimeRepositoryMode.ts](../../../apps/api-server/src/platform/dynamo/runtimeRepositoryMode.ts)
- [runtimeTables.ts](../../../apps/api-server/src/platform/dynamo/runtimeTables.ts)
- [ddbClient.ts](../../../apps/api-server/src/platform/dynamo/ddbClient.ts)

## Key Operational Finding

The runtime transient cutover path does not fail closed.

For sessions, tickets, login transactions, and issued tokens, the runtime currently attempts to construct Dynamo-backed repositories and, on construction failure, falls back to noop v2 adapters inside a broad `catch` block.

That behavior is operationally safe for boot continuity, but it creates a proof risk:

- a service can start with cutover flags enabled,
- yet still fail to write meaningful v2 evidence,
- unless the environment explicitly proves the Dynamo-backed adapter path was constructed successfully.

That proof no longer needs to be purely external.

The current implementation now exposes runtime cutover adapter posture through the IAM health summary, which can report:

- `LEGACY_ONLY`
- `DYNAMO_V2_ACTIVE`
- `NOOP_FALLBACK`

for the `Sequence A` entity families.

## Required Environment Variables

The first live cutover environment must provide and validate the following variables:

| Variable | Required for | Purpose |
| --- | --- | --- |
| `IDP_DDB_RUNTIME_DUAL_WRITE` | runtime cutover | enables dual-write mode |
| `IDP_DDB_RUNTIME_READ_V2` | runtime cutover | switches reads to v2 |
| `IDP_DDB_RUNTIME_PARITY_SAMPLE_RATE` | optional parity instrumentation | parity sampling control |
| `IDP_IAM_RUNTIME_DDB_TABLE` or `IDP_RUNTIME_DYNAMODB_TABLE` | v2 runtime repository construction | resolves the shared runtime table |
| `AWS_REGION` or `AWS_DEFAULT_REGION` | Dynamo client construction | AWS region for runtime table access |
| `IDP_DYNAMODB_ENDPOINT`, `AWS_DYNAMODB_ENDPOINT`, or `AWS_ENDPOINT` | local or custom endpoint only | explicit Dynamo endpoint when not using default AWS resolution |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | non-local AWS access where required | credentials for runtime table access |

## Readiness Checklist

### 1. Flag Control

The environment must prove all of the following:

- `IDP_DDB_RUNTIME_DUAL_WRITE` can be toggled independently
- `IDP_DDB_RUNTIME_READ_V2` can be toggled independently
- both flags default to false unless deliberately enabled for the test window
- the runtime can be restarted or rolled after each flag change

### 2. Runtime Table Resolution

The environment must prove all of the following:

- `IDP_IAM_RUNTIME_DDB_TABLE` or `IDP_RUNTIME_DYNAMODB_TABLE` is set
- the resolved table name points to the intended test table
- the API runtime has permissions to read and write that table
- the table key and index shape match the requirements of the runtime repositories being exercised

### 3. Dynamo Client Resolution

The environment must prove all of the following:

- region resolution is correct
- endpoint resolution is correct for local or nonstandard infrastructure
- credentials are valid for the intended environment
- startup does not depend on local-only credential fallback unless the environment is intentionally local

### 4. Noop-Fallback Detection

The environment must prove all of the following before any cutover evidence is accepted:

- startup or preflight validation confirms that the Dynamo-backed runtime repositories were actually constructed
- operators can distinguish a live v2 adapter from a noop fallback path through `/api/v1/iam/operations/health`
- evidence is captured showing that writes land in the runtime table when dual-write is enabled

If the environment cannot prove these points, the cutover must be treated as blocked even if the application appears healthy.

### 5. Execution-Prerequisite Coverage

The environment must also prove all of the following:

- there is at least one executable browser login path
- there are executable password reset, email verification, and MFA enrollment flows if ticket cutover will follow
- there is an executable authenticated session path for session validation
- there are executable OAuth issuance, refresh, introspection, and revocation flows for token validation
- operators can intentionally restart the runtime during a test window
- logs and direct storage evidence are available to the operators running the checklist

## Readiness Decision Matrix

| Readiness area | Ready when | Blocked when |
| --- | --- | --- |
| Runtime flags | flags are independently controlled and restartable | flag changes are coupled, sticky, or not restart-safe |
| Runtime table | table resolves and is writable | table name missing, wrong, or unauthorized |
| AWS client path | region, endpoint, and credentials resolve correctly | runtime cannot access the intended Dynamo target |
| V2 activation proof | operators can prove the v2 repositories are active | service may be running on noop fallback without detection |
| Functional flow coverage | all required validation journeys exist | target environment cannot exercise the checklist scenarios |

## Recommended First Live Gate

Before running the login-transaction live checklist, the first target environment should produce a short preflight record containing:

1. resolved runtime table name
2. resolved AWS region
3. whether a custom Dynamo endpoint is in use
4. the intended values of `IDP_DDB_RUNTIME_DUAL_WRITE` and `IDP_DDB_RUNTIME_READ_V2`
5. `/api/v1/iam/operations/health` output showing the runtime cutover readiness check and the adapter statuses it reflects
6. direct proof that dual-write causes records to appear in the runtime table
7. explicit confirmation that noop fallback was not the active v2 path

The standard operator preflight entrypoint is:

- `scripts/verify-idp-runtime-cutover-readiness.sh`
- `npm run verify:idp:runtime-cutover-readiness`

That script:

- acquires a real admin bearer token through the existing browser-login helper flow,
- calls `/api/v1/iam/operations/health`,
- extracts the `runtime-cutover-readiness` check,
- and fails fast if the environment reports `FAIL` or indicates `NOOP_FALLBACK`.

For evidence collection, operators should prefer:

- `OUTPUT_MODE=json bash scripts/verify-idp-runtime-cutover-readiness.sh`
- `IDP_BASE_URL=https://identity.example.com OUTPUT_MODE=json npm run verify:idp:runtime-cutover-readiness`
- `IDP_BASE_URL=https://identity.example.com IDP_IAM_REALM_ID=realm-idp-default IDP_IAM_CLIENT_ID=admin-console-demo OUTPUT_MODE=json npm run verify:idp:runtime-cutover-readiness`

For evidence-pack formatting, operators can then render the structured preflight into markdown with:

- `npm run render:idp:runtime-cutover-preflight -- /path/to/preflight.json`
- `npm run render:idp:sequence-a-status-matrix -- /path/to/sequence-a-manifest.json`
- `npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json`
- `OUTPUT_MODE=markdown npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json`
- `npm run scaffold:idp:runtime-cutover-evidence -- /path/to/preflight.json <step-number> "<entity-family>" <checklist-path>`
- `npm run scaffold:idp:login-transaction-evidence -- /path/to/preflight.json`
- `npm run scaffold:idp:ticket-evidence -- /path/to/preflight.json`
- `npm run scaffold:idp:session-evidence -- /path/to/preflight.json`
- `npm run scaffold:idp:issued-token-evidence -- /path/to/preflight.json`
- `IDP_BASE_URL=https://identity.example.com npm run prepare:idp:runtime-cutover-evidence -- <slug> <step-number> "<entity-family>" <checklist-path> /path/to/output-dir`
- `IDP_BASE_URL=https://identity.example.com npm run prepare:idp:login-transaction-evidence -- /path/to/output-dir`
- `IDP_BASE_URL=https://identity.example.com IDP_ENV_LABEL=staging npm run prepare:idp:login-transaction-evidence`
- `IDP_BASE_URL=https://identity.example.com npm run prepare:idp:ticket-evidence -- /path/to/output-dir`
- `IDP_BASE_URL=https://identity.example.com npm run prepare:idp:session-evidence -- /path/to/output-dir`
- `IDP_BASE_URL=https://identity.example.com npm run prepare:idp:issued-token-evidence -- /path/to/output-dir`
- `IDP_BASE_URL=https://identity.example.com IDP_ENV_LABEL=staging npm run prepare:idp:sequence-a-evidence -- /path/to/output-dir`

That produces a structured preflight record suitable for attachment to the runtime cutover evidence pack.

The combined preparer now emits an operator bundle containing:

- preflight JSON
- raw `operations-health.json`
- rendered preflight markdown
- scaffolded live evidence markdown for the selected `Sequence A` entity family
- a short bundle `README.md` describing the next execution steps

The `Sequence A` batch preparer additionally emits:

- a parent `README.md` describing the full four-step execution window
- `sequence-a-manifest.json` summarizing the generated bundle layout for reviewers or automation
- `sequence-a-status-matrix.md` so the shared-environment run can be closed with a single formal status and go/no-go document
- `sequence-a-verification.md` and `sequence-a-verification.json` capturing the latest completeness check result for the packet

That status matrix is rendered from the generated manifest and each step preflight artifact, so the parent review surface starts with the real captured readiness posture for the execution window.

The bundle verifier then provides a final completeness gate by failing if the parent status matrix or any step evidence markdown still contains unresolved scaffold placeholders.

If no output directory is supplied, the combined preparer writes to a timestamped bundle directory under:

- `tmp/runtime-cutover-evidence/login-transactions-<environment-label>-<utc-timestamp>`
- `tmp/runtime-cutover-evidence/<slug>-<environment-label>-<utc-timestamp>`

If the target environment does not expose `/api/v1/auth/iam/config`, set both `IDP_IAM_REALM_ID` and `IDP_IAM_CLIENT_ID` so the preflight can authenticate without the compatibility bootstrap route.

## Current Workspace Validation Snapshot

Validation date: 2026-04-11

Target used for local verification:

- `http://127.0.0.1:4101`

Observed local runtime status:

- `/api/v1/auth/iam/config` is now present again and returns the compatibility bootstrap contract expected by the runtime-cutover helper flow
- `/api/v1/iam/operations/health` was exercised successfully against the live workspace API using a real browser-login session plus consent completion
- the live health response currently reports `overall_status=DEGRADED`
- the `runtime-cutover-readiness` check currently reports `WARN`

Current live check summary:

- `Runtime cutover flags are disabled; shared-durable v2 adapter activation has not been proven yet.`

Dual-write validation snapshot:

- a second clean workspace boot was executed with `IDP_DDB_RUNTIME_DUAL_WRITE=true` on `http://127.0.0.1:4110`
- the resulting `/api/v1/iam/operations/health` response moved to `overall_status=FAILED`
- the `runtime-cutover-readiness` check moved to `FAIL`
- the reported cause was explicit and correct:
  - `sessions=NOOP_FALLBACK`
  - `tickets=NOOP_FALLBACK`
  - `login_transactions=NOOP_FALLBACK`
  - `issued_tokens=NOOP_FALLBACK`

That result is important because it proves the current health instrumentation is doing the right thing:

- when cutover flags are off, the runtime reports an unproven but non-failing baseline
- when cutover flags are enabled without a reachable shared-durable repository path, the runtime fails the gate instead of silently claiming progress

Local Dynamo-backed activation snapshot:

- the runtime entity table `idp-iam-runtime-local` was provisioned successfully against the existing local DynamoDB endpoint at `http://127.0.0.1:8000`
- the table now has:
  - primary key: `pk` + `sk`
  - global secondary indexes: `gsi1`, `gsi2`
  - TTL attribute: `expires_at_epoch`
- a clean workspace boot was then executed with:
  - `IDP_DDB_RUNTIME_DUAL_WRITE=true`
  - `IDP_IAM_RUNTIME_DDB_TABLE=idp-iam-runtime-local`
  - `IDP_DYNAMODB_ENDPOINT=http://127.0.0.1:8000`
  - `AWS_REGION=us-east-1`
  - `AWS_ACCESS_KEY_ID=test`
  - `AWS_SECRET_ACCESS_KEY=test`
- the resulting `/api/v1/iam/operations/health` response moved to:
  - `overall_status=DEGRADED`
  - `runtime-cutover-readiness=PASS`
- the live cutover summary was:
  - `Runtime cutover flags are enabled and all Sequence A v2 paths resolved to Dynamo-backed adapters: sessions=DYNAMO_V2_ACTIVE, tickets=DYNAMO_V2_ACTIVE, login_transactions=DYNAMO_V2_ACTIVE, issued_tokens=DYNAMO_V2_ACTIVE.`

Implication:

- the workspace has now proven the full progression from baseline `WARN`, to invalid dual-write `FAIL/NOOP_FALLBACK`, to valid dual-write `PASS/DYNAMO_V2_ACTIVE`
- Phase 1 is no longer blocked on unknown runtime-table behavior in local development
- the remaining gap is governed evidence capture in the intended shared target environment, because local governed evidence now exists for login transactions, tickets, sessions, and issued tokens

Tooling note:

- the scripted verifier entrypoint still cannot complete inside the current Codex sandbox when launched as a child process, even though the live API and direct shell `curl` calls work
- that limitation appears to be an execution-environment restriction of this workspace session rather than a failure of the product runtime or the health gate itself

Additional live warnings currently present in the workspace environment:

- no recovery drill recorded
- no benchmark evidence recorded
- no retained security-audit evidence
- no formal readiness review recorded
- no linked federated identities recorded

Implication for `Sequence A`:

- the local environment is now contract-complete enough to execute the health preflight and browser-login prerequisites
- the environment is now accepted for local cutover proof, and all four `Sequence A` runtime entity families have governed local evidence
- the dual-write rehearsal confirms the next dependency is concrete shared runtime infrastructure, not additional API-surface work
- the local development environment has now satisfied that infrastructure requirement using DynamoDB Local
- the next meaningful environment step is repeating the same activation pattern in the intended shared target environment and recording the formal Sequence A evidence pack

## Exit Condition

This readiness gate is satisfied only when:

- a target environment is named,
- runtime table access is confirmed,
- noop-fallback risk is explicitly controlled,
- and the relevant `Sequence A` cutover checklist can be run as a real evidence exercise rather than a speculative dry-run.
