---
id: rolling-upgrade-posture
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [supported-deployment-profiles, deployment-modes, idp-keycloak-gap-execution-backlog]
support_tier: "profile-specific"
maturity_state: "deferred"
supported_profiles: []
evidence_class: "synthetic"
tags: [implementation, deployment, rolling-upgrade]
last_updated: "2026-04-28"
related: [supported-deployment-profiles, roadmap]
---
# Rolling-Upgrade Posture

Last updated: 2026-04-28

## Decision

Rolling-upgrade support is explicitly **deferred**.

This is not a soft absence. It is a governed product decision for the current release posture.

## Current Claim Boundary

The product shall not currently claim:

- zero-downtime rolling deployment support
- mixed-version node support during live traffic
- production-safe rolling restart semantics
- release-gated rolling-upgrade operator procedure

## Why This Is Deferred

The current repository does not yet provide the evidence required for a supported rolling-upgrade claim:

1. no governed rolling-upgrade execution suite exists
2. no release gate validates mixed-version runtime behavior
3. no operator runbook exists for draining, version skew, rollback, and restart order
4. no bounded production evidence proves that active sessions, login transactions, tickets, and issued tokens remain correct across version-mixed nodes

The current bounded production claim is single-region and shared-durable, but not rolling-upgrade capable.

## What Is Still Supported

The current supported deployment profiles remain:

- `local-filesystem-proving-runtime`
- `aws-single-region-cost-optimized`
- `aws-single-region-bounded-multi-instance`

Those profiles support bounded production operation only under explicit restart and deployment control. They do not imply rolling upgrade safety.

## Required Future Gates Before Promotion

Rolling-upgrade posture may only move from deferred to supported when all of the following exist:

1. an explicit rolling-upgrade test plan
2. a governed release gate for version-mixed runtime traffic
3. operator runbook coverage for:
   - preflight
   - drain/disable new login traffic
   - node replacement order
   - rollback
   - post-upgrade validation
4. runtime evidence proving:
   - session continuity
   - token continuity
   - revocation correctness
   - recovery and rollback correctness

## Backlog Mapping

This document closes the decision portion of:

- `T3.2.3` Decide rolling-upgrade posture

The implementation work remains deferred until a later HA phase is intentionally opened.
