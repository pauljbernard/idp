# Headless IAM Deployment Mode Matrix

Last updated: 2026-04-11

## Purpose

This document is the Phase 0 support matrix for deployment and operating-mode claims.

## Deployment Matrix

| Deployment mode | Current maturity | Evidence class | Current posture | Support decision | Next gate |
| --- | --- | --- | --- | --- | --- |
| Local filesystem proving runtime | Supported | Internal runtime | Real and actively used for development and validation | Supported for local proving and development use | Preserve |
| Shared durable runtime repositories under runtime flags | Implemented | Internal runtime | Significant migration work exists, but the state plane is not yet fully authoritative across major IAM domains | Not yet production-grade | Complete Phase 1 state-plane work |
| AWS-native serverless-first reference architecture | Modeled | Synthetic | Strong target posture in spec and deployment modeling | Architecture target only | Operational deployment and cost/resilience evidence |
| Multi-instance concurrent runtime | Implemented in parts, not yet credible overall | Internal runtime | Some async reload and propagation tests exist, but not enough for full product support | Not yet supported as a broad product claim | Concurrent-instance proof for major IAM domains |
| Rolling-upgrade / multi-site / HA topology | Modeled absent | Synthetic | No meaningful runtime evidence | Deferred | Explicit defer or later HA work |

## Current Claim Boundary

The product may claim:

- a strong local proving runtime,
- a clear AWS-native/serverless-first architecture target,
- and ongoing migration toward shared durable runtime repositories.

The product shall not yet claim:

- production-grade shared durable state,
- multi-instance HA credibility,
- or multi-site / rolling-upgrade support.
