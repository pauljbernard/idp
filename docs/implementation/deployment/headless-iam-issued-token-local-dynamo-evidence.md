---
id: headless-iam-issued-token-local-dynamo-evidence
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Issued Token Local Dynamo Evidence

Last updated: 2026-04-11

## Purpose

This document records the first governed local execution of `Sequence A / Step 4` for issued tokens against the Dynamo-backed runtime table.

It establishes local viability for:

- access-token issuance through both direct and browser-bound flows,
- refresh-token exchange under `read_v2=true`,
- direct token revocation,
- browser-session-linked token revocation,
- subject-wide token revocation,
- persisted v2 token rows for the affected subject,
- and restart continuity for both active and revoked tokens.

## Execution Metadata

| Field | Value |
| --- | --- |
| Sequence step | `Sequence A / Step 4` |
| Entity family | Issued tokens |
| Target environment | Local development |
| Execution mode | `live` |
| Execution date | 2026-04-11 |
| Operator | Codex |
| Runtime build / commit | Workspace state on 2026-04-11 |
| Runtime table name | `idp-iam-runtime-local` |
| Related checklist | [Headless_IAM_Issued_Token_Cutover_Checklist.md](./headless-iam-issued-token-cutover-checklist.md) |

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

## Token Flow Results

### Browser Authorization-Code Issuance

A real browser-bound authorization request was created for `admin-console-demo` and continued through the live account-session path:

- authorization request:
  - `iam-auth-request-8028618b-b20a-46ee-8d11-9c32b9f3a749`
- browser login session:
  - `iam-session-f693808a-a4a7-4666-b98e-671ebf05eede`
- authorization code:
  - `9a5b2406712c43c699d76510ba0dffc7`

Exchanging that authorization code returned a valid OIDC token set for `standalone.super.admin`, including:

- `access_token`
- `refresh_token`
- `id_token`
- `scope=openid profile email roles`

This proves the Stage 2 read path still issues session-bound browser tokens correctly.

### Password-Grant Issuance and Active Introspection

A direct token set was issued for `alex.morgan@northstar.example` through the live token endpoint using:

- `grant_type=password`
- `client_id=admin-console-demo`

Immediate introspection of the resulting access token returned:

- `active=true`
- `username=alex.morgan`
- `sub=iam-user-tenant-admin`
- `realm_id=realm-idp-default`

### Refresh Exchange

Refreshing the first `alex.morgan` token set returned a fresh token set with:

- a new `access_token`
- a new `refresh_token`
- unchanged scope and realm identity

This confirms refresh-token read and write behavior remains correct on the Stage 2 runtime path.

### Direct Token Revocation

Revoking the original password-grant access token through:

- `POST /protocol/openid-connect/revoke`

was followed by introspection returning:

- `active=false`

This confirms direct revocation state is honored through the v2-backed token read path.

### Browser-Session-Linked Revocation

Revoking the live browser session:

- `iam-session-f693808a-a4a7-4666-b98e-671ebf05eede`

through:

- `POST /account/sessions/:sessionId/revoke`

returned:

- `revoked=true`
- `revoked_at=2026-04-11T15:38:03.706Z`

Post-condition:

- introspection of the browser-issued access token returned `active=false`

This proves session-linked token ownership and revocation remained intact under Stage 2.

### Subject-Wide Revocation

A fresh admin token for `standalone.super.admin` was then used to execute:

- `POST /api/v1/iam/users/iam-user-tenant-admin/revoke-sessions`

with `revoke_tokens=true`.

The successful response returned:

- `realm_id=realm-idp-default`
- `user_id=iam-user-tenant-admin`
- `revoked_session_count=0`
- `revoked_token_count=2`
- `revoked_at=2026-04-11T15:40:27.876Z`

Post-condition:

- introspection of the second `alex.morgan` access token returned `active=false`

This confirms subject-wide token revocation also works through the async runtime store.

### Direct v2 Runtime Table Evidence

Using SigV4-backed `curl` against the local DynamoDB endpoint, a `gsi1` query for:

- `SUBJECT#USER#iam-user-tenant-admin`

with the `TOKEN#` prefix returned:

- `Count=3`
- `ScannedCount=3`

This confirms the affected issued-token rows were present in the v2 runtime table during the Stage 2 run.

### Restart Continuity

The Stage 2 runtime was intentionally stopped and restarted on the same flags and port.

After restart:

- introspection of the fresh admin token still returned:
  - `active=true`
  - `username=standalone.super.admin`
- introspection of the revoked `alex.morgan` token still returned:
  - `active=false`

This confirms both active and revoked token states persisted correctly across runtime reload.

## Checklist Assessment

| Validation scenario | Result | Notes |
| --- | --- | --- |
| Authorization-code token issuance | `Pass` | Real browser-bound authorization request and code exchange succeeded |
| Password-grant issuance | `Pass` | Direct token endpoint issued a live token set for `alex.morgan` |
| Active introspection | `Pass` | Fresh password-grant access token resolved as active |
| Refresh exchange | `Pass` | Refresh token produced a new token set with expected semantics |
| Direct revoke | `Pass` | Introspection returned `active=false` after revoke |
| Browser-session-linked revoke | `Pass` | Revoking the bound browser session inactivated the browser-issued token |
| Subject-wide revoke | `Pass` | Admin revoke call invalidated the target user token set |
| Persisted v2 evidence | `Pass` | Dynamo `gsi1` query returned token rows for the target subject |
| Restart with active and revoked tokens | `Pass` | Active admin token stayed active and revoked user token stayed inactive |

## Decision

| Decision item | Outcome |
| --- | --- |
| Local positive-path proof | `Accepted` |
| Shared-environment claim gate | `Still blocked` |
| Local issued-token cutover viability | `Accepted` |
| Next step | `Close local Sequence A and repeat the same evidence in the intended shared target environment` |

Decision notes:

- the issued-token family is now locally viable on the Dynamo-backed Stage 2 runtime
- all four `Sequence A` runtime entity families now have governed local proof
- the remaining Phase 1 gap is shared-environment repetition and claim-gate evidence, not unresolved local token semantics
