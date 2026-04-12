---
id: headless-iam-session-local-dynamo-evidence
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Session Local Dynamo Evidence

Last updated: 2026-04-11

## Purpose

This document records the first governed local execution of `Sequence A / Step 3` for browser account sessions against the Dynamo-backed runtime table.

It establishes local viability for:

- session creation through the real login plus MFA flow,
- session touch and listing behavior under `read_v2=true`,
- targeted session revocation,
- revoke-other-sessions behavior,
- restart continuity for an active current session,
- and expired-session rejection against the v2-backed session read path.

## Execution Metadata

| Field | Value |
| --- | --- |
| Sequence step | `Sequence A / Step 3` |
| Entity family | Browser account sessions |
| Target environment | Local development |
| Execution mode | `live` |
| Execution date | 2026-04-11 |
| Operator | Codex |
| Runtime build / commit | Workspace state on 2026-04-11 |
| Runtime table name | `idp-iam-runtime-local` |
| Related checklist | [Headless_IAM_Session_Cutover_Checklist.md](./Headless_IAM_Session_Cutover_Checklist.md) |

## Runtime Configuration

Flags used for the successful Stage 2 run:

- `PORT=4116`
- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`
- `IDP_IAM_RUNTIME_DDB_TABLE=idp-iam-runtime-local`
- `IDP_DYNAMODB_ENDPOINT=http://127.0.0.1:8000`
- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`

## Session Flow Results

### Session Creation

Two live MFA-backed browser sessions were created for `alex.morgan@northstar.example` through the real login flow:

- login created `MFA_REQUIRED` transactions:
  - `iam-login-68afcab7-37df-492d-8661-18d26095ac92`
  - `iam-login-6a8fee3d-9279-48a8-9dab-afc98923c65b`
- MFA completion issued sessions:
  - `iam-session-c260ce81-f75b-4d9e-90fa-08a52771be48`
  - `iam-session-d6ae02a8-0eea-4ca7-928f-ecaa4ee0749b`

### Session Touch and Listing

`GET /account/session` for `iam-session-c260ce81-f75b-4d9e-90fa-08a52771be48` returned:

- `status=ACTIVE`
- `assurance_level=MFA`
- an updated `last_seen_at`

`GET /account/sessions` from the same current session returned both new sessions and marked:

- the current session as `ACTIVE` with `is_current=true`
- the peer session as `ACTIVE` with `is_current=false`

Direct DynamoDB query by `USER#iam-user-tenant-admin` also showed the new session rows in the runtime table.

### Targeted Revocation

Revoking the peer session:

- request:
  - `POST /account/sessions/iam-session-d6ae02a8-0eea-4ca7-928f-ecaa4ee0749b.../revoke`
- response:
  - `revoked=true`
  - `revoked_at=2026-04-11T15:24:31.817Z`

Post-condition:

- `GET /account/sessions` marked the peer session as `REVOKED`
- `GET /account/session` using the revoked peer session returned `Account session is no longer active`

### Revoke Other Sessions

After creating a third MFA-backed session:

- `iam-session-3a7e9698-1cfa-46b8-8c1c-0cbb47f06da0`

running `POST /account/sessions/revoke-others` from the current session returned:

- `revoked_count=3`
- `current_session_id=iam-session-c260ce81-f75b-4d9e-90fa-08a52771be48`

Sequential follow-up validation confirmed:

- the current session remained `ACTIVE`
- the newly created session was now `REVOKED`
- the earlier password-based sessions for the same user were also `REVOKED`
- `GET /account/session` with the revoked third session returned `Account session is no longer active`

### Restart Continuity

The runtime was restarted on the same Stage 2 flags and port.

After restart:

- `GET /account/session` using `iam-session-c260ce81-f75b-4d9e-90fa-08a52771be48` still returned `ACTIVE`
- `GET /account/sessions` still showed the current session as active and the other sessions as revoked

### Expired Session Rejection

The v2 session row for `iam-session-c260ce81-f75b-4d9e-90fa-08a52771be48` was forced to:

- `expires_at=2026-04-11T15:00:00.000Z`

After a rebuild and restart with the same Stage 2 flags:

- `GET /account/session` with that session returned `Account session is no longer active`

This confirms the route now honors the v2 read path for current-session resolution.

## Local Implementation Gaps Found and Closed

Two read-path gaps were discovered during the live session run.

### Gap 1. Session Listing Was Still Legacy-Bound

Problem:

- `/account/sessions` still resolved through the sync session path even when runtime cutover flags were enabled

Remediation:

- added `listAccountSessionsAsync()` to the authentication runtime
- switched `/api/v1/iam/realms/:realmId/account/sessions` to use the async path

### Gap 2. Current Session Resolution Was Still Legacy-Bound

Problem:

- `/account/session` still resolved through the sync session path even when runtime cutover flags were enabled

Remediation:

- added `resolveAccountSessionAsync()` to the authentication runtime
- switched `/api/v1/iam/realms/:realmId/account/session` to use the async path

## Checklist Assessment

| Validation scenario | Result | Notes |
| --- | --- | --- |
| Successful session creation | `Pass` | Real login plus MFA flow issued live sessions |
| Session touch / last-seen behavior | `Pass` | `last_seen_at` advanced on authenticated current-session access |
| Session listing | `Pass` | Listing now reads through the v2-aware path |
| Two active sessions for one user | `Pass` | Both new MFA sessions appeared together |
| Targeted revoke | `Pass` | Peer session became unusable while current session stayed active |
| Revoke other sessions | `Pass` | Sequential follow-up confirmed only the current session remained active |
| Restart with active session | `Pass` | Current Stage 2 session survived runtime restart |
| Expired-session rejection | `Pass` | Route rejected an expired v2-backed current session after the async resolver fix |

## Decision

| Decision item | Outcome |
| --- | --- |
| Local positive-path proof | `Accepted` |
| Shared-environment claim gate | `Still blocked` |
| Local session cutover viability | `Accepted` |
| Next step | `Advance to issued tokens after shared-environment planning or local token proof` |

Decision notes:

- the session family is now locally viable on the Dynamo-backed Stage 2 runtime
- the remaining work is shared-environment repetition and issued-token execution, not unresolved local session semantics
