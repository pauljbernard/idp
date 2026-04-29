---
id: multi-site-posture
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [supported-deployment-profiles, deployment-modes, idp-keycloak-gap-execution-backlog]
support_tier: "profile-specific"
maturity_state: "deferred"
supported_profiles: []
evidence_class: "synthetic"
tags: [implementation, deployment, multi-site]
last_updated: "2026-04-28"
related: [supported-deployment-profiles, roadmap]
---
# Multi-Site Posture

Last updated: 2026-04-28

## Decision

Multi-site and multi-region warm-standby support are explicitly **deferred**.

This includes both active/active and active/passive product claims.

## Current Claim Boundary

The product shall not currently claim:

- multi-site production support
- multi-region warm-standby support
- cross-region failover support
- region-to-region replication correctness as a supported live operating mode

## Why This Is Deferred

The current repository does not yet provide the required evidence or operator surface:

1. no governed multi-site execution suite exists
2. no release gate validates cross-region replication and failover behavior
3. no operator runbook exists for failover, recovery, reconciliation, and return-to-primary
4. no evidence exists for:
   - session correctness after failover
   - token correctness after failover
   - revocation propagation across sites
   - backup and restore interaction with multi-region topology

The existing `AWS_MULTI_REGION_WARM_STANDBY` topology label is therefore a modeled target only, not a supported profile.

## What Is Still Supported

The product currently supports bounded single-region profiles only:

- `local-filesystem-proving-runtime`
- `aws-single-region-cost-optimized`
- `aws-single-region-bounded-multi-instance`

Nothing in those profiles implies cross-region support.

## Required Future Gates Before Promotion

Multi-site posture may only move from deferred to supported when all of the following exist:

1. explicit region-to-region data and key-management design approval
2. governed execution suite for failover and return-to-primary
3. operator runbook coverage for:
   - failover initiation
   - failover validation
   - degraded-mode behavior
   - reconciliation
   - return-to-primary
4. runtime and operational evidence proving:
   - session correctness after failover
   - token correctness after failover
   - revocation propagation after failover
   - recovery drill compatibility with the multi-site profile

## Backlog Mapping

This document closes the decision portion of:

- `T3.2.4` Decide multi-site posture

The implementation work remains deferred until a later HA phase is intentionally opened.
