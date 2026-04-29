---
id: deployment-modes
type: specification
domain: operations
status: stable
version: "1.0"
dependencies: [platform-architecture]
support_tier: "profile-specific"
maturity_state: "supported-for-bounded-production"
supported_profiles: [local-filesystem-proving-runtime, aws-single-region-cost-optimized, aws-single-region-bounded-multi-instance]
evidence_class: "internal-runtime"
tags: [specification, technical, operations]
last_updated: "2026-04-12"
related: []
---
# Headless IAM Deployment Mode Matrix

Last updated: 2026-04-11

## Support Metadata

- Support tier: `Profile-specific`
- Maturity state: `Mixed by deployment mode`
- Supported profiles:
  - `local-filesystem-proving-runtime`
  - `aws-single-region-cost-optimized`
  - `aws-single-region-bounded-multi-instance`
- Evidence class: `Internal runtime`

## Purpose

This document is the Phase 0 support matrix for deployment and operating-mode claims.

## Deployment Matrix

| Deployment mode | Current maturity | Evidence class | Current posture | Support decision | Next gate |
| --- | --- | --- | --- | --- | --- |
| Local filesystem proving runtime | Supported | Internal runtime | Real and actively used for development and validation | Supported for local proving and development use only | Preserve |
| AWS single-region cost-optimized bounded production | Supported | Internal runtime | Shared-durable runtime and runtime evidence now support a bounded single-region production claim | Supported for bounded production | Add operator runbook and release-gate evidence |
| AWS single-region bounded multi-instance production | Supported | Internal runtime | Multi-instance runtime correctness is now evidence-backed for the bounded shared-durable runtime path | Supported for bounded production | Publish rolling-upgrade and operator posture explicitly |
| AWS-native serverless-first reference architecture beyond bounded profiles | Modeled | Synthetic | Strong target posture in spec and deployment modeling remains broader than current supported claims | Architecture target only | Operational deployment and cost/resilience evidence |
| Rolling-upgrade single-region production profile | Deferred explicitly | Synthetic | Governed deferment exists; no governed rolling-upgrade evidence exists | Deferred | Reopen only in a later HA phase |
| Multi-site or multi-region warm-standby production profile | Deferred explicitly | Synthetic | Governed deferment exists; no governed multi-region operating evidence exists | Deferred | Reopen only in a later HA phase |

## Current Claim Boundary

The product may claim:

- a strong local proving runtime,
- bounded single-region AWS production support,
- bounded single-region multi-instance runtime support,
- a clear AWS-native/serverless-first architecture target,
- and ongoing migration beyond those bounded profiles toward broader operating credibility.

The product shall not yet claim:

- rolling-upgrade support,
- multi-site or multi-region warm-standby support,
- or general HA parity outside the explicitly declared bounded single-region profiles.
