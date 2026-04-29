---
id: implementation-index
type: index
domain: implementation
status: stable
version: "2.0"
dependencies: [platform-requirements, specs-index, reference-index]
tags: [implementation, planning, deployment, readiness]
last_updated: "2026-04-12"
related: [specs-index, reference-index]
---
# Implementation Guides

This index covers the implementation and execution documents that are actually present in the repository. The implementation corpus is planning-heavy and readiness-heavy; it is not a generic tutorial library.

## Fastest Useful Entry Points

- [Getting Started](quick-start/getting-started.md) for local orientation
- [Implementation Plan](deployment/implementation-plan.md) for program structure
- [Roadmap](deployment/roadmap.md) for sequencing
- [Standalone Validation Review Guide](planning/headless-iam-standalone-validation-review-guide.md) for adoption gates

## Quick Start

| Guide | Role |
|-------|------|
| [Getting Started](quick-start/getting-started.md) | Local setup and initial repository orientation |

## Planning Documents

| Document | Role |
|----------|------|
| [Headless IAM Standalone Product Assessment](planning/headless-iam-standalone-product-assessment.md) | Assessment of current standalone IAM product posture |
| [IDP vs Keycloak Gap Analysis and Remediation Plan](planning/idp-keycloak-gap-analysis-and-remediation-plan.md) | Detailed parity-gap analysis and remediation plan against Keycloak |
| [IDP vs Keycloak Gap Execution Backlog](planning/idp-keycloak-gap-execution-backlog.md) | Workstream, milestone, and issue-sized execution backlog for closing Keycloak gaps |
| [Headless IAM Standalone Validation Review Guide](planning/headless-iam-standalone-validation-review-guide.md) | Minimum validation gate before downstream adoption |
| [Headless IAM Production Remediation Plan](planning/headless-iam-production-remediation-plan.md) | Production-hardening remediation tracking |
| [Headless IAM Education Readiness Implementation Plan](planning/headless-iam-education-readiness-implementation-plan.md) | Education-readiness implementation planning |
| [Headless IAM State Foundation Baseline](planning/headless-iam-state-foundation-baseline.md) | State-baseline analysis |
| [Headless IAM State Authority Audit](planning/headless-iam-state-authority-audit.md) | State-authority review |
| [Crew IDP Authorization Replacement Plan](planning/crew-idp-authorization-replacement-plan.md) | Authorization replacement planning |
| [CMS IAM Integration Assessment](planning/cms-iam-integration-assessment.md) | CMS integration assessment |
| [SaaS CMS Governance Extraction Plan](planning/saas-cms-governance-extraction-plan.md) | Governance extraction planning |

## Deployment and Readiness Documents

| Document | Role |
|----------|------|
| [Implementation Plan](deployment/implementation-plan.md) | Main implementation and workstream plan |
| [Roadmap](deployment/roadmap.md) | Phase sequencing and program posture |
| [Gap Remediation](deployment/gap-remediation.md) | Gap-driven remediation plan |
| [Environment Readiness](deployment/environment-readiness.md) | Environment readiness criteria |
| [Supported Deployment Profiles](deployment/supported-deployment-profiles.md) | Current supported, bounded, and deferred deployment topology definitions |
| [Rolling-Upgrade Posture](deployment/rolling-upgrade-posture.md) | Explicit current decision for rolling-upgrade support |
| [Multi-Site Posture](deployment/multi-site-posture.md) | Explicit current decision for multi-site and warm-standby support |
| [Bounded Production Operator Runbook](deployment/bounded-production-operator-runbook.md) | Operator workflow for the currently supported bounded production profiles |
| [Cutover Runbook](deployment/cutover-runbook.md) | Cutover operations guide |
| [Migration from Keycloak](deployment/migration-from-keycloak.md) | Migration planning reference |
| [Headless IAM Adapter Cutover Sequence](deployment/headless-iam-adapter-cutover-sequence.md) | Adapter cutover sequencing |

## Evidence and Cutover Artifacts

These are implementation artifacts, not broad onboarding guides:

- [Headless IAM Runtime Cutover Evidence Pack](deployment/headless-iam-runtime-cutover-evidence-pack.md)
- [Headless IAM Login Transaction Cutover Checklist](deployment/headless-iam-login-transaction-cutover-checklist.md)
- [Headless IAM Login Transaction Dry Run Evidence](deployment/headless-iam-login-transaction-dry-run-evidence.md)
- [Headless IAM Login Transaction Local Dynamo Evidence](deployment/headless-iam-login-transaction-local-dynamo-evidence.md)
- [Headless IAM Ticket Cutover Checklist](deployment/headless-iam-ticket-cutover-checklist.md)
- [Headless IAM Ticket Local Dynamo Evidence](deployment/headless-iam-ticket-local-dynamo-evidence.md)
- [Headless IAM Session Cutover Checklist](deployment/headless-iam-session-cutover-checklist.md)
- [Headless IAM Session Local Dynamo Evidence](deployment/headless-iam-session-local-dynamo-evidence.md)
- [Headless IAM Issued Token Cutover Checklist](deployment/headless-iam-issued-token-cutover-checklist.md)
- [Headless IAM Issued Token Local Dynamo Evidence](deployment/headless-iam-issued-token-local-dynamo-evidence.md)

## How To Use This Index

- For product readiness questions, start with planning docs and the reference status matrix.
- For release sequencing, start with [Implementation Plan](deployment/implementation-plan.md) and [Roadmap](deployment/roadmap.md).
- For operational proof, use the evidence and checklist documents under `deployment/`.

## Deliberate Exclusions

This repository does not currently contain the broad integration and developer workflow guides that older indexes referenced. Those paths have been removed from this index until corresponding documents exist.
