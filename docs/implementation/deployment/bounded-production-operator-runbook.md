---
id: bounded-production-operator-runbook
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [supported-deployment-profiles, environment-readiness, cutover-runbook, rolling-upgrade-posture, multi-site-posture]
support_tier: "profile-specific"
maturity_state: "supported-for-bounded-production"
supported_profiles: [aws-single-region-cost-optimized, aws-single-region-bounded-multi-instance]
evidence_class: "internal-runtime"
tags: [implementation, deployment, runbook, operations]
last_updated: "2026-04-28"
related: [roadmap, implementation-plan]
---
# Bounded Production Operator Runbook

Last updated: 2026-04-28

## Purpose

This runbook defines the operator workflow for the currently supported bounded production deployment profiles.

It exists to make the current support claim executable and reviewable. The product now has:

- explicit supported deployment profiles,
- explicit rolling-upgrade deferment,
- explicit multi-site deferment,
- and passing runtime, security, and performance evidence for the shared-durable bounded profile.

This runbook turns that posture into an operator sequence.

## Supported Scope

This runbook applies to:

- `aws-single-region-cost-optimized`
- `aws-single-region-bounded-multi-instance`

It does not apply to:

- rolling-upgrade execution
- multi-site or multi-region warm-standby execution
- any deployment that depends on unsupported federation, protocol, or provider claims

## Operator Outcomes

Using this runbook, operators should be able to:

1. verify the bounded production profile is the active intended posture
2. prove runtime cutover health for the supported Sequence A families
3. verify current security, readiness, and benchmark evidence
4. perform controlled restart-style deployment activity
5. execute bounded backup/restore and recovery review steps
6. produce a reviewable evidence packet for release or go/no-go review

## Preconditions

Before using this runbook, all of the following must be true:

1. the active deployment profile is one of the supported bounded production profiles
2. the environment passes [Environment Readiness](./environment-readiness.md)
3. rolling-upgrade and multi-site expectations are understood as deferred:
   - [Rolling-Upgrade Posture](./rolling-upgrade-posture.md)
   - [Multi-Site Posture](./multi-site-posture.md)
4. runtime distributed bundle verification is current and passing
5. security baseline and token-abuse evidence are current and passing
6. runtime auth and runtime token performance evidence are current and passing

## Required Evidence Inputs

Operators must have access to:

- `/api/v1/iam/operations/health`
- `/api/v1/iam/operations/deployment`
- the runtime distributed bundle artifacts
- the runtime distributed bundle verification artifact
- the consolidated test report
- current backup, restore, recovery-drill, and readiness-review artifacts

## Standard Execution Sequence

### 1. Confirm active support posture

Verify:

- supported deployment profile documentation matches the intended environment
- active topology is single-region only
- no operator or reviewer assumes rolling-upgrade or multi-site support

Primary checks:

- [Supported Deployment Profiles](./supported-deployment-profiles.md)
- [Rolling-Upgrade Posture](./rolling-upgrade-posture.md)
- [Multi-Site Posture](./multi-site-posture.md)

### 2. Run bounded production preflight

Run:

- `npm run verify:idp:distributed-test-env`
- `npm run verify:idp:runtime-distributed-bundle`

Expected result:

- shared state table reachable
- runtime table reachable with required GSIs and TTL
- rate-limit table reachable
- durable bucket reachable
- bundle artifacts present and fresh

### 3. Verify runtime and security evidence

Run or confirm freshness of:

- `npm run verify:idp:runtime-distributed-bundle-full`
- `npm run test:security`
- `node scripts/report-test-results.mjs`

Expected result:

- runtime cutover, session maintenance, token revocation, multi-instance, and token-abuse lanes all pass
- repo test report status is `passed`

### 4. Verify bounded performance posture

Run or confirm freshness of:

- `npm run test:performance:runtime-auth`
- `npm run test:performance:runtime-token`

Expected result:

- public catalog, login, userinfo, and introspection remain within bounded production budgets

### 5. Perform controlled restart-style deployment activity

Allowed bounded production deployment activity is:

- explicit restart
- explicit node replacement
- explicit cutover with no mixed-version claim

Not allowed:

- rolling upgrade
- mixed-version live traffic
- multi-region failover

After restart or controlled replacement:

- rerun runtime distributed bundle verification
- rerun security token-abuse evidence
- rerun performance auth/token evidence if the release gate requires fresh benchmark proof

### 6. Execute bounded production operational checks

Operators must also confirm:

- current backup artifact lineage is present
- restore rehearsal is current
- recovery drill is current
- readiness review is current

If any of those are stale or failed, bounded production posture must be treated as blocked for release review.

### 7. Prepare operator evidence packet

Prepare:

- runtime distributed bundle JSON
- runtime distributed bundle verification JSON
- rendered runtime distributed bundle summary
- consolidated `test-results-report.md`
- backup/restore/recovery evidence
- readiness review evidence

This evidence packet is the minimum bounded production review packet.

## Failure Rules

Operators must stop and escalate if any of the following occur:

1. `NOOP_FALLBACK` appears for any Sequence A runtime family
2. runtime distributed bundle verification fails
3. runtime auth or token performance gates fail
4. security baseline or token-abuse gates fail
5. backup, restore, recovery, or readiness evidence is stale or failed
6. anyone attempts to treat this runbook as authorization for rolling upgrade or multi-site operation

## Explicit Non-Claims

This runbook does not authorize claims about:

- rolling-upgrade support
- multi-site support
- multi-region warm standby
- general HA parity with Keycloak

It only supports the bounded single-region production posture currently documented.

## Release Review Gate

The bounded production profile may be presented as the current supported operating posture only when:

1. this runbook is followed
2. the current evidence packet is fresh
3. the consolidated report remains `passed`
4. no deferred topology claim is implied

## Backlog Mapping

This document closes the documentation portion of:

- `T3.3.3` Publish supported operator runbook for bounded production profile

The remaining `M3.3` work is still open:

- `T3.3.1` production-like backup and restore rehearsal
- `T3.3.2` production-like key rotation and recovery drill
- `T3.3.4` failure-injection scenarios for runtime dependencies
