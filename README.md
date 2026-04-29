# IDP

This repository contains a standalone IDP-focused codebase.


## Included Scope

- IDP-focused constitutional and requirements specifications:
  - `docs/spec/constitution.idp.md`
  - `docs/spec/requirements.idp.md`
- IAM implementation and validation plans:
  - `docs/spec/plans/*.md` (IAM-specific plan/assessment/review docs)
- IAM API contracts:
  - `contracts/api/auth-api.json`
  - `contracts/api/iam-*.json`
- IAM SDK package:
  - `contracts/sdk-iam/**`
- IAM API runtime code:
  - `apps/api-server/src/platform/iam*.ts`
  - Identity and shared dependency modules required by IAM runtime
- IAM UI code:
  - `apps/enterprise-ui/src/components/iam/**`
  - IAM pages/providers/services/utils and supporting UI dependencies
- IAM verification scripts:
  - `scripts/verify-*-iam-*.sh`
  - `scripts/verify-sdk-iam-contract.js`
  - `scripts/lib/*-auth.sh`

## Notes

- Repository scope is focused on IDP and IAM capabilities.

## Useful Commands

- `npm run verify:sdk:iam-contract`
- `npm run verify:idp:standalone-baseline`
- `npm run verify:idp:runtime-cutover-readiness`
- `npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json`
- `OUTPUT_MODE=markdown npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json`
- `npm run update:idp:sequence-a-bundle-status -- /path/to/sequence-a-manifest.json`
- `npm run render:idp:runtime-cutover-preflight -- /path/to/preflight.json`
- `npm run render:idp:sequence-a-status-matrix -- /path/to/sequence-a-manifest.json`
- `npm run scaffold:idp:runtime-cutover-evidence -- /path/to/preflight.json 2 "Tickets" docs/spec/plans/Headless_IAM_Ticket_Cutover_Checklist.md`
- `npm run scaffold:idp:login-transaction-evidence -- /path/to/preflight.json`
- `npm run scaffold:idp:ticket-evidence -- /path/to/preflight.json`
- `npm run scaffold:idp:session-evidence -- /path/to/preflight.json`
- `npm run scaffold:idp:issued-token-evidence -- /path/to/preflight.json`
- `npm run prepare:idp:runtime-cutover-evidence -- tickets 2 "Tickets" docs/spec/plans/Headless_IAM_Ticket_Cutover_Checklist.md /path/to/output-dir`
- `npm run prepare:idp:login-transaction-evidence -- /path/to/output-dir`
- `npm run prepare:idp:ticket-evidence -- /path/to/output-dir`
- `npm run prepare:idp:session-evidence -- /path/to/output-dir`
- `npm run prepare:idp:issued-token-evidence -- /path/to/output-dir`
- `npm run prepare:idp:sequence-a-evidence -- /path/to/output-dir`
- `IDP_BASE_URL=https://identity.example.com IDP_ENV_LABEL=staging npm run prepare:idp:login-transaction-evidence`
- `IDP_BASE_URL=https://identity.example.com IDP_IAM_REALM_ID=realm-idp-default IDP_IAM_CLIENT_ID=admin-console-demo npm run verify:idp:runtime-cutover-readiness`
- `npm run api:build`
- `npm run ui:build`

## Local Runtime Adapters

- `IDP_PLATFORM_PERSISTENCE_BACKEND=filesystem` keeps state and durable artifacts on the local filesystem for development.
- `IDP_PLATFORM_PERSISTENCE_BACKEND=dynamodb-s3` requires `IDP_PLATFORM_STATE_DYNAMODB_TABLE` and `IDP_PLATFORM_DURABLE_S3_BUCKET` for AWS-backed state and durable artifact storage.
- `IDP_RATE_LIMIT_BACKEND=memory` keeps request throttling in-process for development.
- `IDP_RATE_LIMIT_BACKEND=dynamodb` requires `IDP_RATE_LIMIT_DYNAMODB_TABLE` and uses DynamoDB conditional writes for distributed throttling.
- `IDP_IAM_BOOTSTRAP_DEFAULT_PASSWORD` and `IDP_IAM_BOOTSTRAP_PASSWORD_<TOKEN>` control local seeded user passwords.
- `IDP_IAM_SYNTHETIC_CLIENT_SECRET_DEFAULT` and `IDP_IAM_SYNTHETIC_CLIENT_SECRET_<TOKEN>` control local synthetic confidential-client secrets.
- Production deployments should replace those local backends with AWS-native equivalents instead of sharing local process state.

## Local AWS Clone

- `deploy/iam-standalone/bootstrap.env.example` contains a working LocalStack-oriented environment baseline.
- `deploy/iam-standalone/provision-localstack.sh` creates the DynamoDB tables and S3 buckets needed by the current distributed persistence and throttling paths.
- `deploy/iam-standalone/verify-runtime-cutover.sh` checks that the runtime entity table exists, exposes the expected GSIs, and reports TTL state before enabling the runtime DynamoDB cutover flags.
- if LocalStack is not running but a plain DynamoDB Local endpoint is available, `deploy/iam-standalone/provision-dynamodb-local-runtime-table.sh` can provision just the runtime entity table required for Sequence A cutover rehearsal.

## Runtime DynamoDB Cutover

- The runtime entity path uses `IDP_IAM_RUNTIME_DDB_TABLE` for sessions, tickets, login transactions, and issued-token records.
- Stage the rollout in this order:
  - provision the table with `deploy/iam-standalone/provision-localstack.sh`
  - verify the table and indexes with `deploy/iam-standalone/verify-runtime-cutover.sh`
  - verify the live admin health posture with `scripts/verify-idp-runtime-cutover-readiness.sh`
  - enable `IDP_DDB_RUNTIME_DUAL_WRITE=true`
  - observe the dual-write path in non-production traffic
  - enable `IDP_DDB_RUNTIME_READ_V2=true` only after the runtime table is populated and stable
- `IDP_DDB_RUNTIME_DUAL_WRITE=true` is the safe first step because it keeps legacy reads active while the runtime table is populated.
- `IDP_DDB_RUNTIME_READ_V2=true` should not be enabled unless `IDP_IAM_RUNTIME_DDB_TABLE` points at a provisioned table with `gsi1`, `gsi2`, and TTL on `expires_at_epoch`.
- `scripts/verify-idp-runtime-cutover-readiness.sh` authenticates as an IAM admin, calls `/api/v1/iam/operations/health`, and fails fast if the runtime cutover path is still reporting `NOOP_FALLBACK`.
- if the target environment does not expose `/api/v1/auth/iam/config`, set both `IDP_IAM_REALM_ID` and `IDP_IAM_CLIENT_ID` so the preflight can authenticate directly against the IAM API.
- the local development path has now been proven against DynamoDB Local with:
  - `IDP_DDB_RUNTIME_DUAL_WRITE=true`
  - `IDP_IAM_RUNTIME_DDB_TABLE=idp-iam-runtime-local`
  - `IDP_DYNAMODB_ENDPOINT=http://127.0.0.1:8000`
  - `AWS_REGION=us-east-1`
  - `AWS_ACCESS_KEY_ID=test`
  - `AWS_SECRET_ACCESS_KEY=test`
- `OUTPUT_MODE=json bash scripts/verify-idp-runtime-cutover-readiness.sh` emits a structured preflight record that can be attached to the runtime cutover evidence pack.
- `npm run render:idp:runtime-cutover-preflight -- /path/to/preflight.json` turns that JSON into a markdown section aligned with the formal evidence pack.
- `npm run scaffold:idp:runtime-cutover-evidence -- /path/to/preflight.json <step-number> "<entity-family>" <checklist-path>` produces a first-pass live evidence document for any `Sequence A` entity family.
- `npm run scaffold:idp:login-transaction-evidence -- /path/to/preflight.json` produces a first-pass live evidence document for `Sequence A / Step 1`.
- `npm run scaffold:idp:ticket-evidence -- /path/to/preflight.json`, `npm run scaffold:idp:session-evidence -- /path/to/preflight.json`, and `npm run scaffold:idp:issued-token-evidence -- /path/to/preflight.json` provide the same shorthand scaffolding flow for the remaining `Sequence A` steps.
- `npm run prepare:idp:runtime-cutover-evidence -- <slug> <step-number> "<entity-family>" <checklist-path> /path/to/output-dir` runs the preflight and writes a generic evidence bundle in one step.
- `npm run prepare:idp:login-transaction-evidence -- /path/to/output-dir` runs the preflight and writes both the JSON artifact and the scaffolded live evidence markdown in one step.
- `npm run prepare:idp:ticket-evidence -- /path/to/output-dir`, `npm run prepare:idp:session-evidence -- /path/to/output-dir`, and `npm run prepare:idp:issued-token-evidence -- /path/to/output-dir` provide the same one-command bundle flow for the remaining `Sequence A` steps.
- `npm run prepare:idp:sequence-a-evidence -- /path/to/output-dir` prepares all four `Sequence A` evidence bundles under a single parent directory.
- the combined preparer also writes the raw `operations-health.json`, a rendered preflight markdown section, and a bundle `README.md` so operators have a self-contained execution packet.
- the `Sequence A` batch preparer also writes a parent `README.md`, `sequence-a-manifest.json`, and `sequence-a-status-matrix.md` so the full execution window has a single review and go/no-go surface.
- the batch preparer also writes `sequence-a-verification.md` and `sequence-a-verification.json`, which capture the latest completeness check result at bundle-generation time.
- those persisted verification artifacts are now generated after the manifest lifecycle state is refreshed, so the saved verification output and `bundle_status` stay aligned at bundle-generation time.
- the parent `sequence-a-status-matrix.md` is also re-rendered after that lifecycle refresh, so the matrix, manifest, and persisted verification artifacts stay in sync at bundle-generation time.
- `npm run render:idp:sequence-a-status-matrix -- /path/to/sequence-a-manifest.json` can regenerate the parent status matrix after bundle contents change.
- `npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json` fails if the parent status matrix or any step evidence document still contains unresolved scaffold placeholders.
- the same verifier also reports when `bundle_status` is stale relative to the actual packet contents, so a non-zero result now covers both incomplete evidence and lifecycle-state drift.
- `OUTPUT_MODE=markdown npm run verify:idp:sequence-a-bundle -- /path/to/sequence-a-manifest.json` renders the same completeness result as a review-friendly markdown artifact.
- the generated parent bundle `README.md` now includes the exact regenerate and verify commands plus the expected pass/fail interpretation for the verifier.
- the generated parent bundle `README.md` now also includes a parent artifact index and a per-step artifact map so reviewers can navigate the packet from one file.
- `sequence-a-manifest.json` now also contains explicit parent-artifact and per-step artifact paths so automation can navigate the same packet structure without scraping markdown.
- the parent status-matrix renderer and bundle verifier now consume those manifest-declared artifact paths first, so the machine-readable packet inventory is the authoritative navigation surface.
- the manifest now also carries `manifest_kind`, `manifest_version`, and `bundle_status` so future tooling can identify the packet format and lifecycle state explicitly.
- `bundle_status` is now maintained by `update:idp:sequence-a-bundle-status`, which currently uses `scaffolded`, `in-progress`, and `review-ready` to describe packet maturity.
- if no output directory is passed, the preparer writes to a timestamped bundle directory under `tmp/runtime-cutover-evidence/` and includes the environment label when `IDP_ENV_LABEL` is set.
- when the target environment is not the default local bootstrap, set `IDP_BASE_URL` explicitly before running either the preflight verifier or any bundle preparer.
- when the target environment is API-only and does not expose the compatibility bootstrap route, set `IDP_IAM_REALM_ID` and `IDP_IAM_CLIENT_ID` together with `IDP_BASE_URL`.
- the first governed local proof run is recorded in [Headless_IAM_Login_Transaction_Local_Dynamo_Evidence.md](./docs/spec/plans/Headless_IAM_Login_Transaction_Local_Dynamo_Evidence.md).
- Example live preflight:
  - `IDP_BASE_URL=https://identity.example.com OUTPUT_MODE=json npm run verify:idp:runtime-cutover-readiness`

## License

This repository uses a split licensing model.

- Software and source code are licensed under PolyForm Noncommercial 1.0.0.
- Documentation, specifications, diagrams, contracts documentation, and other non-software content are licensed under
  Creative Commons Attribution-NonCommercial 4.0 International (`CC BY-NC 4.0`).

Commercial use is not permitted under the public repository licenses.

This is a noncommercial source-available posture, not an OSI-approved open-source software
license. See [LICENSE.md](./LICENSE.md).

## Contributions And Commercial Rights

Outside contributions are accepted only under the repository's contributor policy and CLA:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CLA.md](./CLA.md)

In substance:

- all commercial-use rights are reserved under the public repository licenses
- commercial exceptions are granted only by Paul Bernard or his authorized designee
- contributions are accepted only under terms that preserve Paul Bernard's right to offer separate commercial licenses and other commercial exceptions in the future
