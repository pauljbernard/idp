# Test Results Report

Generated: 2026-04-29T01:34:36.679Z

## Overview

- Status: failed
- Suites recorded: 21
- Suites passed: 20
- Suites failed: 1
- Suites not run: 0

## Suite Status

| Suite | Kind | Status | Artifact | Last Modified |
| --- | --- | --- | --- | --- |
| api-unit-coverage | coverage | passed | apps/api-server/coverage/coverage-summary.json | 2026-04-05T17:46:31.000Z |
| ui-unit-coverage | coverage | passed | apps/enterprise-ui/coverage/coverage-summary.json | 2026-04-28T02:05:24.000Z |
| runtime-cutover-localstack | integration | passed | tests/integration/latest-runtime-cutover-localstack.json | 2026-04-28T18:32:36.000Z |
| runtime-distributed-bundle | integration | passed | tests/integration/latest-runtime-distributed-bundle.json | 2026-04-28T18:34:44.000Z |
| runtime-distributed-bundle-verification | integration | passed | tests/integration/latest-runtime-distributed-bundle-verification.json | 2026-04-28T18:34:44.000Z |
| runtime-session-maintenance-localstack | integration | passed | tests/integration/latest-runtime-session-maintenance-localstack.json | 2026-04-28T18:33:01.000Z |
| runtime-multi-instance-localstack | integration | passed | tests/integration/latest-runtime-multi-instance-localstack.json | 2026-04-28T18:34:11.000Z |
| runtime-token-revocation-localstack | integration | passed | tests/integration/latest-runtime-token-revocation-localstack.json | 2026-04-28T18:33:25.000Z |
| bounded-production-backup-restore-rehearsal | integration | passed | tests/integration/latest-bounded-production-backup-restore-rehearsal.json | 2026-04-28T22:19:47.000Z |
| bounded-production-key-rotation-drill | integration | passed | tests/integration/latest-bounded-production-key-rotation-drill.json | 2026-04-28T22:25:08.000Z |
| bounded-production-runtime-dependency-failure-drill | integration | passed | tests/integration/latest-bounded-production-runtime-dependency-failure-drill.json | 2026-04-28T23:57:09.000Z |
| bounded-saml-sp-interoperability | integration | passed | tests/integration/latest-bounded-saml-sp-interoperability.json | 2026-04-29T00:49:44.000Z |
| bounded-saml-sp-target-harness | integration | passed | tests/integration/latest-bounded-saml-sp-target-harness.json | 2026-04-29T00:57:45.000Z |
| bounded-saml-sp-family-shape-calibration | integration | passed | tests/integration/latest-bounded-saml-sp-family-shape-calibration.json | 2026-04-29T01:01:06.000Z |
| bounded-saml-sp-live-external-target | integration | passed | tests/integration/latest-bounded-saml-sp-live-external-target.json | 2026-04-29T01:34:29.000Z |
| performance-baseline | performance | passed | tests/performance/latest-report.json | 2026-04-04T20:25:36.000Z |
| performance-runtime-auth | performance | failed | tests/performance/latest-runtime-auth-report.json | 2026-04-29T00:37:04.000Z |
| performance-runtime-token | performance | passed | tests/performance/latest-runtime-token-report.json | 2026-04-29T00:35:36.000Z |
| security-baseline | security | passed | tests/security/latest-report.json | 2026-04-29T00:33:53.000Z |
| security-authz | security | passed | tests/security/latest-authz-report.json | 2026-04-29T00:34:10.000Z |
| security-token-abuse | security | passed | tests/security/latest-token-abuse-report.json | 2026-04-28T18:34:39.000Z |

## Coverage

### api-unit-coverage

- Lines: 94.91% (168/177)
- Statements: 95% (171/180)
- Functions: 95.91% (47/49)
- Branches: 85.88% (140/163)
- Thresholds: lines 70%, statements 70%, functions 70%, branches 60%

### ui-unit-coverage

- Lines: 42.45% (1482/3491)
- Statements: 38.72% (1541/3979)
- Functions: 23.73% (441/1858)
- Branches: 41.04% (926/2256)
- Thresholds: lines 42%, statements 38%, functions 23%, branches 40%

## Available Artifacts

### api-unit-coverage

- Kind: coverage
- Artifact: apps/api-server/coverage/coverage-summary.json
- Last modified: 2026-04-05T17:46:31.000Z

### ui-unit-coverage

- Kind: coverage
- Artifact: apps/enterprise-ui/coverage/coverage-summary.json
- Last modified: 2026-04-28T02:05:24.000Z

### runtime-cutover-localstack

- Kind: integration
- Artifact: tests/integration/latest-runtime-cutover-localstack.json
- Last modified: 2026-04-28T18:32:36.000Z

```json
{
  "health_status": 200,
  "realm_id": "realm-idp-default",
  "client_id": "admin-console-demo",
  "session_id": "iam-session-b87bc791-6a15-4783-97ae-9a1db5e6e997.iXfCPxB3VapNSwL5I5yrQQpHkMYG2dX2",
  "account_session_user_id": "iam-user-idp-super-admin",
  "password_reset_ticket_id": "iam-password-reset-89ce5f0f-a810-4485-bf92-584d3759ddf8",
  "password_reset_user_id": "iam-user-idp-super-admin",
  "introspection_active": true,
  "userinfo_subject": "iam-user-idp-super-admin",
  "logout_revoked": true
}
```

### runtime-distributed-bundle

- Kind: integration
- Artifact: tests/integration/latest-runtime-distributed-bundle.json
- Last modified: 2026-04-28T18:34:44.000Z

```json
{
  "total_steps": 6,
  "passed_steps": 6,
  "failed_steps": 0,
  "all_steps_passed": true
}
```

### runtime-distributed-bundle-verification

- Kind: integration
- Artifact: tests/integration/latest-runtime-distributed-bundle-verification.json
- Last modified: 2026-04-28T18:34:44.000Z

```json
{
  "bundle_stale": false,
  "missing_step_count": 0,
  "failed_step_count": 0,
  "missing_artifact_count": 0,
  "stale_artifact_count": 0,
  "slow_convergence_count": 0,
  "slow_token_abuse_diagnostic_count": 0,
  "overall_pass": true
}
```

### runtime-session-maintenance-localstack

- Kind: integration
- Artifact: tests/integration/latest-runtime-session-maintenance-localstack.json
- Last modified: 2026-04-28T18:33:01.000Z

```json
{
  "realm_id": "realm-idp-default",
  "current_session_id": "iam-session-b57763a8-c3da-47ee-ad48-2dde7bea46de",
  "revoked_session_id": "iam-session-b58366bc-4238-4286-b986-90cc8225393d.moGqbtNcy4oMMcwClPRFTrg0J1FOBJxu",
  "sessions_before_count": 20,
  "sessions_after_count": 20,
  "active_sessions_after_count": 1,
  "revoked_lookup_status": 401,
  "current_lookup_status": 200
}
```

### runtime-multi-instance-localstack

- Kind: integration
- Artifact: tests/integration/latest-runtime-multi-instance-localstack.json
- Last modified: 2026-04-28T18:34:11.000Z

```json
{
  "realm_id": "realm-idp-default",
  "first_session_id": "iam-session-fc5d3a2d-a239-420d-8930-96ef23a524aa",
  "second_session_id": "iam-session-fb891637-dd46-4981-b583-6de24336ae68",
  "first_token_present": true,
  "second_token_present": true,
  "sessions_before_revoke_count": 23,
  "revoke_others_current_session_id": "iam-session-fb891637-dd46-4981-b583-6de24336ae68",
  "revoke_others_revoked_count": 2,
  "logout_revoked": true,
  "cross_instance_first_session_visible": true,
  "cross_instance_first_token_active_before_revoke": true,
  "cross_instance_first_session_revoked": true,
  "cross_instance_first_token_inactive_after_revoke": true,
  "cross_instance_second_session_visible": true,
  "cross_instance_second_token_active_before_revoke": true,
  "cross_instance_second_session_still_active_after_revoke_others": true,
  "cross_instance_second_token_still_active_after_revoke_others": true,
  "cross_instance_second_session_revoked_after_logout": true,
  "cross_instance_second_token_inactive_after_logout": true
}
```

### runtime-token-revocation-localstack

- Kind: integration
- Artifact: tests/integration/latest-runtime-token-revocation-localstack.json
- Last modified: 2026-04-28T18:33:25.000Z

```json
{
  "realm_id": "realm-idp-default",
  "session_id": "iam-session-ce7f07b6-8e28-4db7-bc4c-71a1e95c232a.63e-Y0U_FKyKshx3vBW6n-m5NqoObb42",
  "access_token_present": true,
  "introspection_active_before_logout": true,
  "introspection_active_after_logout": false,
  "userinfo_subject_before_logout": "iam-user-idp-super-admin",
  "userinfo_status_after_logout": 401,
  "logout_revoked": true
}
```

### bounded-production-backup-restore-rehearsal

- Kind: integration
- Artifact: tests/integration/latest-bounded-production-backup-restore-rehearsal.json
- Last modified: 2026-04-28T22:19:47.000Z

```json
{
  "all_steps_passed": true,
  "overall_pass": true,
  "realm_id": "realm-idp-default",
  "backup_id": "iam-backup-98b68c27-073f-4cd1-a685-8c22e693f1fc",
  "backup_replay_same_id": true,
  "backup_count_before": 0,
  "backup_count_after": 1,
  "restore_dry_run_id": "iam-restore-53ee5f15-acd3-42b8-a085-de06e0e65092",
  "restore_dry_run_status": "VALIDATED",
  "restore_dry_run_replay_same_id": true,
  "restore_execute_id": "iam-restore-3f72a78c-fc5f-4704-81f5-d93c3f2a81e7",
  "restore_execute_status": "APPLIED",
  "restore_execute_replay_same_id": true,
  "restore_count_before": 0,
  "restore_count_after": 2,
  "restore_active_run_cleared": true
}
```

### bounded-production-key-rotation-drill

- Kind: integration
- Artifact: tests/integration/latest-bounded-production-key-rotation-drill.json
- Last modified: 2026-04-28T22:25:08.000Z

```json
{
  "all_steps_passed": true,
  "overall_pass": true,
  "realm_id": "realm-idp-default",
  "rotation_id": "iam-key-rotation-c641bbfa-4732-4695-bf79-a9954e9fe94a",
  "rotation_replay_same_id": true,
  "activated_key_record_id": "iam-key-9ba24caa-36e4-41ca-8f67-b1c2be34bbab",
  "activated_key_id": "kid-5d8c4f13-646",
  "pre_rotation_token_kid": "kid-e9c0a99a-aef",
  "post_rotation_token_kid": "kid-5d8c4f13-646",
  "old_token_still_active_after_rotation": true,
  "new_token_active_after_rotation": true,
  "jwks_contains_old_kid": true,
  "jwks_contains_new_kid": true,
  "active_run_cleared": true,
  "rotation_count_before": 1,
  "rotation_count_after": 2,
  "first_token_subject_before_rotation": "iam-user-idp-super-admin",
  "first_token_subject_after_rotation": "iam-user-idp-super-admin",
  "second_token_subject_after_rotation": "iam-user-idp-super-admin"
}
```

### bounded-production-runtime-dependency-failure-drill

- Kind: integration
- Artifact: tests/integration/latest-bounded-production-runtime-dependency-failure-drill.json
- Last modified: 2026-04-28T23:57:09.000Z

```json
{
  "all_steps_passed": true,
  "overall_pass": true,
  "realm_id": "realm-idp-default",
  "baseline_backup_id": "iam-backup-25a8c6fe-5620-4490-a387-ac7c473f6935",
  "baseline_recovery_drill_id": "iam-recovery-drill-dde7db05-d913-40e3-9bef-76fa9758a221",
  "injected_backup_id": "iam-backup-2673e766-e6e2-45de-ad29-d5d8586d3494",
  "injected_object_key_corrupted": true,
  "failed_restore_status": 500,
  "failed_recovery_status": 500,
  "readiness_restore_lineage_before": "PASS",
  "readiness_restore_lineage_after": "WARN",
  "readiness_recovery_lineage_before": "PASS",
  "readiness_recovery_lineage_after": "WARN",
  "recorded_readiness_decision_after_failure": "BLOCKED"
}
```

### bounded-saml-sp-interoperability

- Kind: integration
- Artifact: tests/integration/latest-bounded-saml-sp-interoperability.json
- Last modified: 2026-04-29T00:49:44.000Z

```json
{
  "overall_pass": true,
  "metadata_status": 200,
  "metadata_declares_redirect_request_binding": true,
  "metadata_declares_post_response_binding": true,
  "metadata_declares_exact_acs_match": true,
  "support_matrix_profile_id": "saml-sp-bounded-redirect-post-v1",
  "support_matrix_request_bindings": [
    "REDIRECT"
  ],
  "support_matrix_response_bindings": [
    "POST"
  ],
  "anonymous_request_status": 400,
  "anonymous_request_rejected": true,
  "unsupported_request_status": 400,
  "unsupported_request_rejected": true,
  "supported_request_xml_accepted": true,
  "tracked_request_status": 200,
  "tracked_request_binding": "REDIRECT",
  "tracked_request_id": "sp-interop-supported-request-1",
  "login_status": 200,
  "login_contains_signature": true,
  "login_contains_expected_audience": true,
  "login_contains_expected_authn_context": true,
  "login_echoes_relay_state": true,
  "login_contains_in_response_to_supported_request": true,
  "logout_status": 200,
  "logout_contains_signature": true,
  "logout_contains_in_response_to": true,
  "uncorrelated_logout_status": 400,
  "uncorrelated_logout_rejected": true,
  "idp_initiated_status": 200,
  "idp_initiated_request_id_present": true,
  "idp_initiated_mode": "IDP_INITIATED",
  "idp_initiated_login_status": 200,
  "idp_initiated_login_echoes_request_id": true,
  "idp_initiated_login_echoes_relay_state": true,
  "idp_initiated_response_contains_destination": true,
  "idp_initiated_request_completed": true
}
```

### bounded-saml-sp-target-harness

- Kind: integration
- Artifact: tests/integration/latest-bounded-saml-sp-target-harness.json
- Last modified: 2026-04-29T00:57:45.000Z

```json
{
  "overall_pass": true,
  "metadata_status": 200,
  "metadata_declares_redirect_request_binding": true,
  "metadata_declares_post_response_binding": true,
  "metadata_declares_exact_acs_match": true,
  "support_matrix_profile_id": "saml-sp-bounded-redirect-post-v1",
  "support_matrix_request_bindings": [
    "REDIRECT"
  ],
  "support_matrix_response_bindings": [
    "POST"
  ],
  "anonymous_request_status": 400,
  "anonymous_request_rejected": true,
  "unsupported_request_status": 400,
  "unsupported_request_rejected": true,
  "supported_request_xml_accepted": true,
  "request_fixture_path": "tests/fixtures/saml/bounded-sp-authn-request.xml",
  "tracked_request_status": 200,
  "tracked_request_binding": "REDIRECT",
  "tracked_request_id": "sp-interop-supported-request-1",
  "login_status": 200,
  "login_contains_signature": true,
  "login_contains_expected_audience": true,
  "login_contains_expected_authn_context": true,
  "login_echoes_relay_state": true,
  "login_contains_in_response_to_supported_request": true,
  "logout_status": 200,
  "logout_contains_signature": true,
  "logout_contains_in_response_to": true,
  "uncorrelated_logout_status": 400,
  "uncorrelated_logout_rejected": true,
  "idp_initiated_status": 200,
  "idp_initiated_request_id_present": true,
  "idp_initiated_mode": "IDP_INITIATED",
  "idp_initiated_login_status": 200,
  "idp_initiated_login_echoes_request_id": true,
  "idp_initiated_login_echoes_relay_state": true,
  "idp_initiated_response_contains_destination": true,
  "idp_initiated_request_completed": true
}
```

### bounded-saml-sp-family-shape-calibration

- Kind: integration
- Artifact: tests/integration/latest-bounded-saml-sp-family-shape-calibration.json
- Last modified: 2026-04-29T01:01:06.000Z

```json
{
  "overall_pass": true,
  "metadata_status": 200,
  "metadata_declares_redirect_request_binding": true,
  "metadata_declares_post_response_binding": true,
  "metadata_declares_exact_acs_match": true,
  "support_matrix_profile_id": "saml-sp-bounded-redirect-post-v1",
  "support_matrix_request_bindings": [
    "REDIRECT"
  ],
  "support_matrix_response_bindings": [
    "POST"
  ],
  "anonymous_request_status": 400,
  "anonymous_request_rejected": true,
  "unsupported_request_status": 400,
  "unsupported_request_rejected": true,
  "supported_request_xml_accepted": true,
  "request_fixture_path": "tests/fixtures/saml/simplesamlphp-bounded-authn-request.xml",
  "tracked_request_status": 200,
  "tracked_request_binding": "REDIRECT",
  "tracked_request_id": "simplesamlphp-request-1",
  "login_status": 200,
  "login_contains_signature": true,
  "login_contains_expected_audience": true,
  "login_contains_expected_authn_context": true,
  "login_echoes_relay_state": true,
  "login_contains_in_response_to_supported_request": true,
  "logout_status": 200,
  "logout_contains_signature": true,
  "logout_contains_in_response_to": true,
  "uncorrelated_logout_status": 400,
  "uncorrelated_logout_rejected": true,
  "idp_initiated_status": 200,
  "idp_initiated_request_id_present": true,
  "idp_initiated_mode": "IDP_INITIATED",
  "idp_initiated_login_status": 200,
  "idp_initiated_login_echoes_request_id": true,
  "idp_initiated_login_echoes_relay_state": true,
  "idp_initiated_response_contains_destination": true,
  "idp_initiated_request_completed": true
}
```

### bounded-saml-sp-live-external-target

- Kind: integration
- Artifact: tests/integration/latest-bounded-saml-sp-live-external-target.json
- Last modified: 2026-04-29T01:34:29.000Z

```json
{
  "overall_pass": true,
  "metadata_status": 200,
  "metadata_declares_redirect_request_binding": true,
  "metadata_declares_post_response_binding": true,
  "metadata_declares_exact_acs_match": true,
  "support_matrix_profile_id": "saml-sp-bounded-redirect-post-v1",
  "support_matrix_request_bindings": [
    "REDIRECT"
  ],
  "support_matrix_response_bindings": [
    "POST"
  ],
  "anonymous_request_status": 400,
  "anonymous_request_rejected": true,
  "unsupported_request_status": 400,
  "unsupported_request_rejected": true,
  "supported_request_xml_accepted": true,
  "request_fixture_path": ".tmp/integration/bounded-saml-sp-live-external-target/generated-live-external-authn-request.xml",
  "tracked_request_status": 200,
  "tracked_request_binding": "REDIRECT",
  "tracked_request_id": "simplesamlphp-live-request-1",
  "login_status": 200,
  "login_contains_signature": true,
  "login_contains_expected_audience": true,
  "login_contains_expected_authn_context": true,
  "login_echoes_relay_state": true,
  "login_contains_in_response_to_supported_request": true,
  "logout_status": 200,
  "logout_contains_signature": true,
  "logout_contains_in_response_to": true,
  "uncorrelated_logout_status": 400,
  "uncorrelated_logout_rejected": true,
  "idp_initiated_status": 200,
  "idp_initiated_request_id_present": true,
  "idp_initiated_mode": "IDP_INITIATED",
  "idp_initiated_login_status": 200,
  "idp_initiated_login_echoes_request_id": true,
  "idp_initiated_login_echoes_relay_state": true,
  "idp_initiated_response_contains_destination": true,
  "idp_initiated_request_completed": true
}
```

### performance-baseline

- Kind: performance
- Artifact: tests/performance/latest-report.json
- Last modified: 2026-04-04T20:25:36.000Z

| Detail | Value |
| --- | --- |
| iam-public-catalog | {"name":"iam-public-catalog","requests_total":3061,"latency_p99_ms":35,"errors":0,"non2xx":0,"timeouts":0} |
| iam-login | {"name":"iam-login","requests_total":24,"latency_p99_ms":2243,"errors":0,"non2xx":0,"timeouts":0} |

### performance-runtime-auth

- Kind: performance
- Artifact: tests/performance/latest-runtime-auth-report.json
- Last modified: 2026-04-29T00:37:04.000Z

| Detail | Value |
| --- | --- |
| iam-public-catalog-runtime | {"name":"iam-public-catalog-runtime","requests_total":2002,"latency_p99_ms":98,"errors":0,"non2xx":0,"timeouts":0} |
| iam-login-runtime | {"name":"iam-login-runtime","requests_total":24,"latency_p99_ms":9639,"errors":1,"non2xx":10,"timeouts":0} |

### performance-runtime-token

- Kind: performance
- Artifact: tests/performance/latest-runtime-token-report.json
- Last modified: 2026-04-29T00:35:36.000Z

| Detail | Value |
| --- | --- |
| iam-userinfo-runtime | {"name":"iam-userinfo-runtime","requests_total":2004,"latency_p99_ms":73,"errors":0,"non2xx":0,"timeouts":0} |
| iam-introspection-runtime | {"name":"iam-introspection-runtime","requests_total":139,"latency_p99_ms":390,"errors":0,"non2xx":0,"timeouts":0} |

### security-baseline

- Kind: security
- Artifact: tests/security/latest-report.json
- Last modified: 2026-04-29T00:33:53.000Z

```json
{
  "http_checks": {
    "health_status": 200,
    "public_catalog_status": 200,
    "protected_clients_status": 401,
    "account_session_status": 401,
    "x_powered_by_present": false,
    "x_content_type_options": "nosniff",
    "x_frame_options": "SAMEORIGIN",
    "account_session_cache_control": "no-store"
  },
  "dependency_audit": {
    "vulnerabilities": {
      "info": 0,
      "low": 0,
      "moderate": 0,
      "high": 0,
      "critical": 0,
      "total": 0
    },
    "moderate_or_higher_count": 0
  },
  "diagnostics": null
}
```

### security-authz

- Kind: security
- Artifact: tests/security/latest-authz-report.json
- Last modified: 2026-04-29T00:34:10.000Z

```json
{
  "http_checks": {
    "realm_id": "realm-idp-default",
    "session_id": "iam-session-d07fe338-58e9-4d49-adf9-c635af9a616a.T9lomBxP8IY3V7Yyy8FfBj5k-9TX3QpF",
    "unauthenticated_clients_status": 401,
    "unauthenticated_account_session_status": 401,
    "unauthenticated_revoke_others_status": 401,
    "valid_session_lookup_status": 200,
    "cross_realm_session_lookup_status": 401,
    "cross_realm_revoke_others_status": 400
  },
  "dependency_audit": null,
  "diagnostics": null
}
```

### security-token-abuse

- Kind: security
- Artifact: tests/security/latest-token-abuse-report.json
- Last modified: 2026-04-28T18:34:39.000Z

```json
{
  "http_checks": {
    "realm_id": "realm-idp-default",
    "session_id": "iam-session-19d8f050-8c14-4725-bef4-10e59875d76b.KEHEC6YJT6kUtMreEVH31314pohQHv0o",
    "token_active_before_logout": true,
    "token_active_after_logout": false,
    "userinfo_subject_before_logout": "iam-user-idp-super-admin",
    "refresh_grant_before_logout_status": 200,
    "refresh_grant_after_logout_status": 400,
    "logout_revoked": true,
    "replayed_userinfo_status": 401,
    "password_reset_ticket_id": "iam-password-reset-288def46-fa0b-4e2c-8949-cf84d4879cfe",
    "password_reset_user_id": "iam-user-idp-super-admin",
    "replayed_password_reset_status": 400,
    "wrong_code_password_reset_status": 400
  },
  "dependency_audit": null,
  "diagnostics": {
    "login_with_consent_ms": 1832,
    "issue_browser_token_ms": 2233,
    "introspect_before_logout_ms": 128,
    "userinfo_before_logout_ms": 128,
    "refresh_grant_before_logout_ms": 849,
    "logout_ms": 2690,
    "introspect_after_logout_ms": 133,
    "refresh_grant_after_logout_ms": 141,
    "replayed_userinfo_ms": 139,
    "password_reset_request_ms": 236,
    "password_reset_confirm_ms": 1341,
    "password_reset_replay_ms": 188,
    "password_reset_wrong_code_ms": 177
  }
}
```

## Missing Artifacts


