---
id: headless-iam-ticket-local-dynamo-evidence
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Ticket Local Dynamo Evidence

Last updated: 2026-04-11

## Purpose

This document records the first governed local execution of `Sequence A / Step 2` for runtime ticket entities against a real Dynamo-backed runtime table.

It does not satisfy the shared-environment claim gate, but it does establish that the current local runtime can:

- issue and consume password reset tickets while `read_v2=true`,
- issue and consume email verification tickets while `read_v2=true`,
- create and verify MFA enrollment against the Dynamo-backed runtime path,
- survive a runtime restart with the same Stage 2 flags and preserved account/session state,
- and expose the resulting runtime artifacts in the shared runtime table.

## Execution Metadata

| Field | Value |
| --- | --- |
| Sequence step | `Sequence A / Step 2` |
| Entity family | Password reset tickets, email verification tickets, pending MFA enrollments |
| Target environment | Local development |
| Execution mode | `live` |
| Execution date | 2026-04-11 |
| Operator | Codex |
| Runtime build / commit | Workspace state on 2026-04-11 |
| Runtime table name | `idp-iam-runtime-local` |
| Related checklist | [Headless_IAM_Ticket_Cutover_Checklist.md](./Headless_IAM_Ticket_Cutover_Checklist.md) |

## Runtime Configuration

Flags used for the successful Stage 2 run:

- `PORT=4115`
- `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- `IDP_DDB_RUNTIME_READ_V2=true`
- `IDP_IAM_RUNTIME_DDB_TABLE=idp-iam-runtime-local`
- `IDP_DYNAMODB_ENDPOINT=http://127.0.0.1:8000`
- `AWS_REGION=us-east-1`
- `AWS_ACCESS_KEY_ID=test`
- `AWS_SECRET_ACCESS_KEY=test`

Bootstrap contract verification:

- `GET /api/v1/auth/iam/config` returned `200`
- the standalone realm remained `realm-idp-default`

## Functional Results

### Login and Session Acquisition

Browser-style login on `http://127.0.0.1:4115` succeeded for:

- user: `alex.morgan@northstar.example`
- password: `StandaloneIAM!TenantAdmin2026`
- client: `admin-console-demo`

Observed runtime outputs:

- `login_transaction_id=iam-login-8ba5f525-31aa-46c0-baf4-a83e0fe6d3c7`
- `session_id=iam-session-067e966c-eb9e-4643-ba84-1a0e5423a6b6.pKZ0p9AGeSQjE2kPlKeLpYxK4PQmkcvY`
- `next_step=AUTHENTICATED`

### Password Reset Ticket

Issuance:

- `ticket_id=iam-password-reset-e4b348f6-e82a-4778-836a-1c7d80e7c709`
- `code_preview=502912`
- `delivery_mode=LOCAL_VALIDATION_PREVIEW`

Redemption:

- redeemed successfully with `new_password=StandaloneIAM!TenantAdmin2026`
- response recorded `password_updated_at=2026-04-11T15:01:51.914Z`

### Email Verification Ticket

Issuance:

- `ticket_id=iam-email-verify-db170d50-3b4b-4672-9579-405d1fd55e85`
- `code_preview=320199`
- `delivery_mode=LOCAL_VALIDATION_PREVIEW`

Redemption:

- redeemed successfully with the preview code
- response recorded `email_verified_at=2026-04-11T15:01:49.328Z`

### MFA Enrollment

Enrollment start:

- `enrollment_id=iam-mfa-enrollment-8b9c9b39-bf5d-4ec1-a447-fa08a7d87932`
- `shared_secret=HXMCKX4WFLLRMMCJYLFA`

Enrollment verification:

- TOTP generated from the local runtime algorithm and accepted by `/account/mfa/verify`
- response reported:
  - `mfa_enabled=true`
  - `totp_reference_id=secret-4c6ceb05c392e72c`
  - `backup_codes_reference_id=secret-eebd36516f2a4a6f`

Post-restart validation:

- the Stage 2 runtime was restarted on the same port with the same flags
- the previously issued session remained valid after restart
- `GET /api/v1/iam/realms/realm-idp-default/account/security` then returned:
  - `mfa_enabled=true`
  - the same `totp_reference_id`
  - the same `backup_codes_reference_id`

## Runtime Table Evidence

Direct DynamoDB Local table inspection through the signed `Scan` path confirmed the runtime-backed v2 rows for this run.

Observed artifacts included:

- login transaction row:
  - `pk=TICKET#iam-login-8ba5f525-31aa-46c0-baf4-a83e0fe6d3c7`
  - `entity_type=LOGIN_TRANSACTION`
  - `status=COMPLETE`
- account session row:
  - `pk=SESSION#iam-session-067e966c-eb9e-4643-ba84-1a0e5423a6b6`
  - `entity_type=ACCOUNT_SESSION`
- password reset ticket row:
  - `pk=TICKET#iam-password-reset-e4b348f6-e82a-4778-836a-1c7d80e7c709`
  - `entity_type=PASSWORD_RESET_TICKET`
  - `status=CONSUMED`
  - `consumed_at=2026-04-11T15:01:51.914Z`
- email verification ticket row:
  - `pk=TICKET#iam-email-verify-db170d50-3b4b-4672-9579-405d1fd55e85`
  - `entity_type=EMAIL_VERIFICATION_TICKET`
  - `status=CONSUMED`
  - `consumed_at=2026-04-11T15:01:49.333Z`
- pending MFA enrollment row:
  - `pk=TICKET#iam-mfa-enrollment-8b9c9b39-bf5d-4ec1-a447-fa08a7d87932`
  - `entity_type=PENDING_MFA_ENROLLMENT`
  - `consumed_at=2026-04-11T15:02:24.950Z`

## Additional Local Checklist Closure

Two remaining ticket-checklist scenarios were then executed directly against the built runtime in isolated filesystem-backed state roots with runtime cutover flags enabled.

### Active Ticket After Reload

Scenario:

- create a password reset ticket with `IDP_DDB_RUNTIME_DUAL_WRITE=true`
- clear the loaded module
- reload the authentication runtime from the built `dist` output
- redeem the same ticket after the reload

Observed result:

- `ticket_id=iam-password-reset-1cb6ae28-f60f-4603-ac28-37394bdce4fa`
- `confirmed_user_id=iam-user-tenant-admin`
- persisted status after reload and redemption: `CONSUMED`
- `consumed_at=2026-04-11T15:11:20.676Z`

Interpretation:

- an active password reset ticket remains readable and completable after a runtime reload under cutover flags

### Expiry Maintenance Under Runtime Flags

Scenario:

- seed expired pending password reset, email verification, and pending MFA entities
- enable:
  - `IDP_DDB_RUNTIME_DUAL_WRITE=true`
  - `IDP_DDB_RUNTIME_READ_V2=true`
- execute `runTransientStateMaintenanceAsync()`

Observed result:

- `expired_password_reset_ticket_count=1`
- `expired_email_verification_ticket_count=1`
- `expired_pending_mfa_enrollment_count=1`
- resulting state:
  - password reset ticket status: `EXPIRED`
  - email verification ticket status: `EXPIRED`
  - pending MFA enrollment `consumed_at` set to its expiry timestamp

Interpretation:

- the runtime’s ticket expiry path behaves correctly under cutover flags for the three ticket families covered by `Sequence A / Step 2`

## Local Gaps Identified During Execution

One local v2 semantic gap was discovered during the evidence run:

- the Dynamo-backed `replacePendingMfaEnrollmentForUser()` path did not remove earlier active enrollments for the same user

Remediation completed in the same work cycle:

- `DynamoDbTicketRepository` now queries the user ticket index, deletes prior active pending MFA rows for the same realm and user, and then writes the replacement enrollment
- targeted regression coverage was added in `apps/api-server/test/dynamoDbTicketRepository.test.ts`

## Checklist Assessment

| Validation scenario | Result | Notes |
| --- | --- | --- |
| Password reset issuance | `Pass` | Live Stage 2 issuance succeeded |
| Password reset redemption | `Pass` | Consumed row visible in v2 table |
| Email verification issuance | `Pass` | Live Stage 2 issuance succeeded |
| Email verification redemption | `Pass` | Consumed row visible in v2 table |
| Pending MFA enrollment creation | `Pass` | Enrollment row created in v2 table |
| Pending MFA enrollment verification | `Pass` | TOTP accepted and account security reflected enabled MFA after restart |
| Restart with preserved runtime state | `Pass` | Same Stage 2 session resolved after restart |
| Pending MFA replacement semantics in v2 | `Pass in code/test` | Bug found locally, fixed, and regression-tested; live rerun still pending |
| Expiry-path rehearsal | `Pass` | Direct runtime verification under cutover flags marked expired ticket entities correctly |
| Restart-while-ticket-still-active | `Pass` | Direct runtime verification proved active password reset redemption after runtime reload |

## Decision

| Decision item | Outcome |
| --- | --- |
| Local positive-path proof | `Accepted` |
| Shared-environment claim gate | `Still blocked` |
| Ticket-path adapter design | `Accepted with follow-up evidence` |
| Next step | `Repeat in shared target environment, then advance to sessions` |

Decision notes:

- the local Dynamo-backed runtime now has governed positive-path evidence for all three ticket families
- the remaining ticket-path work is not basic viability
- the remaining work is shared-environment repetition rather than unresolved local ticket semantics
