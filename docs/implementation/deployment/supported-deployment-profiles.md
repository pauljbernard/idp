---
id: supported-deployment-profiles
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [deployment-modes, environment-readiness, headless-iam-status-matrix, idp-keycloak-gap-execution-backlog]
support_tier: "profile-specific"
maturity_state: "supported-for-bounded-production"
supported_profiles: [local-filesystem-proving-runtime, aws-single-region-cost-optimized, aws-single-region-bounded-multi-instance]
evidence_class: "operational"
tags: [implementation, deployment, support-profiles]
last_updated: "2026-04-28"
related: [roadmap, implementation-plan]
---
# Supported Deployment Profiles

Last updated: 2026-04-28

## Purpose

This document publishes the deployment profiles that are currently supported, bounded, or explicitly deferred for the standalone IAM product.

It closes the gap where the repository had strong architecture intent and growing runtime proof, but no single governed document that stated:

- which deployment profiles are currently supported,
- which are supported only in bounded form,
- and which remain explicitly deferred.

## Support Metadata

- Support tier: `Profile-specific`
- Maturity state: `Supported for bounded production`
- Supported profiles:
  - `local-filesystem-proving-runtime`
  - `aws-single-region-cost-optimized`
  - `aws-single-region-bounded-multi-instance`
- Evidence class: `Operational` for the bounded LocalStack-backed supported profiles; external target-environment evidence remains pending

## Current Supported Profiles

### 1. `local-filesystem-proving-runtime`

Purpose:

- local development
- local validation
- fast proving-runtime execution

Support decision:

- supported for development and proving only

Not a valid claim basis for:

- production durability
- HA posture
- rolling upgrade posture

### 2. `aws-single-region-cost-optimized`

Purpose:

- bounded production deployment in a single AWS region
- shared-durable state through DynamoDB and S3
- lower-cost operating posture than the multi-instance bounded profile

Support decision:

- supported as a bounded production profile

Required boundaries:

- single region only
- shared-durable runtime path required
- no rolling-upgrade claim
- no multi-site claim

### 3. `aws-single-region-bounded-multi-instance`

Purpose:

- bounded production deployment in a single AWS region
- concurrent API instances against shared-durable runtime state
- explicit session/token correctness across instances

Support decision:

- supported as a bounded production profile

Required boundaries:

- single region only
- shared-durable runtime path required
- multi-instance correctness evidence required
- no rolling-upgrade claim
- no multi-site claim

This is the strongest currently supportable deployment profile in the repository.

## Explicitly Deferred Profiles

The following profiles are not supported and must not be implied:

### 1. Rolling-upgrade production profile

Status:

- deferred

Reason:

- no governed rolling-upgrade execution proof exists
- no release gate currently validates zero-downtime or controlled-version-mix behavior

### 2. Multi-site or multi-region warm-standby profile

Status:

- deferred

Reason:

- no governed operational evidence exists for multi-region recovery operation as a supported live topology
- the current runtime and operator posture are not yet strong enough to claim this as a supported deployment mode

## Runtime and Operator Boundaries

The supported bounded production profiles require:

- shared-durable runtime entity storage enabled for the Sequence A runtime families
- no `NOOP_FALLBACK` for sessions, tickets, login transactions, or issued tokens
- current distributed runtime bundle evidence passing
- current runtime security token-abuse evidence passing
- current runtime performance evidence passing for the bounded profile gates

The supported bounded production profiles do not currently authorize claims about:

- rolling updates
- multi-site operation
- multi-region warm standby
- production-grade directory federation depth
- production-grade SAML or passkey support outside their separately declared supported profiles

## Relationship To Runtime Topology Labels

The runtime deployment API currently uses these topology labels:

- `AWS_SINGLE_REGION_COST_OPTIMIZED`
- `AWS_SINGLE_REGION_HA`

Within the current governed support posture, those labels map to:

- `AWS_SINGLE_REGION_COST_OPTIMIZED` => `aws-single-region-cost-optimized`
- `AWS_SINGLE_REGION_HA` => `aws-single-region-bounded-multi-instance`

`AWS_MULTI_REGION_WARM_STANDBY` is explicitly deferred and must not be treated as a supported active deployment profile.

## Release Claim Boundary

The product may currently claim:

- strong local proving-runtime support
- bounded single-region AWS production support
- bounded multi-instance single-region runtime correctness

The product shall not currently claim:

- general HA parity with Keycloak
- rolling-upgrade support
- multi-site support
- multi-region warm-standby support

## Next Gates

The next deployment/HA work after the current bounded-profile publication and rehearsal completion is:

1. repeat the bounded-production runtime and operator evidence in a real shared target environment beyond LocalStack-backed validation
2. define the first broader HA objective beyond bounded single-region support
3. keep rolling-upgrade posture explicitly deferred until that later HA phase is intentionally opened
4. keep multi-site posture explicitly deferred until that later HA phase is intentionally opened

That sequence matches:

- `T3.4.*`
- `T3.5.*`

from [IDP vs Keycloak Gap Execution Backlog](../planning/idp-keycloak-gap-execution-backlog.md).

The explicit deferment decisions themselves are published in:

- [Rolling-Upgrade Posture](./rolling-upgrade-posture.md)
- [Multi-Site Posture](./multi-site-posture.md)

The supported bounded production operator workflow is published in:

- [Bounded Production Operator Runbook](./bounded-production-operator-runbook.md)
