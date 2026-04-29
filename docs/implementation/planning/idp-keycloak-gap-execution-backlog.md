---
id: idp-keycloak-gap-execution-backlog
type: implementation
domain: planning
status: stable
version: "1.0"
dependencies: [idp-keycloak-gap-analysis-and-remediation-plan, platform-requirements, headless-iam-status-matrix, headless-iam-requirements-gap-matrix, gap-remediation]
tags: [implementation, planning, backlog, keycloak, parity, execution]
last_updated: "2026-04-28"
related: [implementation-plan, roadmap, gap-remediation, idp-keycloak-gap-analysis-and-remediation-plan]
---
# IDP vs Keycloak Gap Execution Backlog

Last updated: 2026-04-28

## Purpose

This document turns the governed Keycloak gap plan into an execution backlog.

It is intended to:

- define named workstreams,
- break those workstreams into milestones,
- break milestones into issue-sized tasks,
- and provide a practical sequencing model for execution and tracking.

This backlog is execution-facing. Current support claims still come from:

- [Headless IAM Status Matrix](../../reference/headless-iam-status-matrix.md)
- [Headless IAM Requirements Gap Matrix](../../reference/headless-iam-requirements-gap-matrix.md)
- [IDP vs Keycloak Gap Analysis and Remediation Plan](./idp-keycloak-gap-analysis-and-remediation-plan.md)

## Backlog Conventions

### Workstream IDs

- `WS-A` Bounded Protocol Parity
- `WS-B` Federation and Enterprise Connectivity
- `WS-C` Runtime Authority and Operating Credibility
- `WS-D` Extensibility and Provider Runtime
- `WS-E` Product Confidence, QA, and External Proof
- `WS-F` Differentiator Preservation and Promotion

### Milestone IDs

Milestones use `M#.#` where the first number is the workstream index.

Examples:

- `M1.1` first milestone in `WS-A`
- `M3.2` second milestone in `WS-C`

### Task IDs

Tasks use `T#.#.#`.

Examples:

- `T1.1.1`
- `T3.2.4`

### Task Shape

Each issue-sized task includes:

- objective
- primary outputs
- dependencies
- acceptance criteria

## Program Sequence

The recommended execution order is:

1. `WS-C` Runtime Authority and Operating Credibility
2. `WS-A` Bounded Protocol Parity
3. `WS-E` Product Confidence, QA, and External Proof
4. `WS-B` Federation and Enterprise Connectivity
5. `WS-D` Extensibility and Provider Runtime
6. `WS-F` Differentiator Preservation and Promotion

Reason:

- runtime credibility is the current product-trust bottleneck,
- bounded supported-profile parity must come before broad market claims,
- QA and proof infrastructure must advance before expanding supported surface,
- federation depth should be built on top of stable runtime and support posture,
- extension/runtime platform work should follow a clearer supported core,
- differentiator promotion should be evidence-backed, not aspirational.

## Current Execution Posture

As of 2026-04-28:

- `WS-C M3.1`, `WS-C M3.2`, and `WS-C M3.3` are materially closed for the bounded LocalStack-backed single-region profile,
- the next active parity blockers are now protocol support promotion and live federation execution,
- and the next remaining `WS-C` work is no longer bounded-runtime correctness; it is external target-environment evidence and broader HA posture beyond bounded single-region support.

The next active sequence is:

1. `WS-A M1.2` bounded supported SAML
2. `WS-A M1.3` bounded supported WebAuthn / passkeys
3. `WS-B M2.1` first live broker provider families
4. `WS-B M2.2` first live directory family
5. `WS-C M3.4` external target-environment evidence beyond LocalStack-backed validation
6. `WS-C M3.5` broader HA posture beyond bounded single-region support

## Workstream Summary

| Workstream | Purpose | Current urgency |
| --- | --- | --- |
| `WS-A` | Promote bounded protocol surfaces from implemented to supportable | Critical |
| `WS-B` | Close enterprise federation and directory depth gaps | Critical |
| `WS-C` | Prove runtime, topology, and operating credibility | Critical |
| `WS-D` | Build a real provider/extension platform | High |
| `WS-E` | Reach adoption-grade QA and evidence posture | Critical |
| `WS-F` | Preserve and prove differentiators | High |

## WS-C Runtime Authority and Operating Credibility

### Goal

Make the product trustworthy as a standalone operating system, not only a strong local proving runtime.

### Milestone M3.1 Shared Durable Runtime in Target Environment

#### Exit criteria

- runtime cutover Sequence A is proven in the intended shared target environment
- sessions, tickets, login transactions, and issued tokens all resolve as `DYNAMO_V2_ACTIVE`
- rollback from `READ_V2` to dual-write-only is proven

#### Tasks

##### T3.1.1 Prepare shared-environment runtime prerequisites

- Objective: make the target environment pass preflight and cutover readiness checks
- Primary outputs:
  - environment configuration record
  - runtime table and index verification evidence
  - secret/key-source verification evidence
- Dependencies:
  - existing runtime cutover preflight scripts
- Acceptance criteria:
  - target environment passes documented readiness gate
  - no `NOOP_FALLBACK` remains for Sequence A entities

##### T3.1.2 Run shared-environment login-transaction cutover evidence

- Objective: reproduce the local-proven login-transaction evidence in target infrastructure
- Primary outputs:
  - governed evidence document
  - raw health and runtime-table artifacts
- Dependencies:
  - `T3.1.1`
- Acceptance criteria:
  - Stage 0, Stage 1, Stage 2, and rollback are all recorded and pass

##### T3.1.3 Run shared-environment ticket cutover evidence

- Objective: prove password reset, email verification, and pending MFA on target infrastructure
- Primary outputs:
  - governed ticket evidence
  - runtime-table artifacts
- Dependencies:
  - `T3.1.1`
- Acceptance criteria:
  - ticket issuance, consume, restart continuity, and expiry maintenance pass in shared environment

##### T3.1.4 Run shared-environment session cutover evidence

- Objective: prove session create, touch, list, revoke, and revoke-other behavior on target infrastructure
- Primary outputs:
  - governed session evidence
  - runtime-table artifacts
- Dependencies:
  - `T3.1.1`
- Acceptance criteria:
  - all supported session behaviors pass with `READ_V2` enabled

##### T3.1.5 Run shared-environment issued-token cutover evidence

- Objective: prove token issue, refresh, introspection, and revoke on target infrastructure
- Primary outputs:
  - governed issued-token evidence
  - runtime-table artifacts
- Dependencies:
  - `T3.1.1`
- Acceptance criteria:
  - direct revoke, browser-session revoke, and subject revoke pass under target-environment runtime

### Milestone M3.2 Concurrent-Instance and Topology Credibility

#### Exit criteria

- multi-instance session/token correctness is proven for the supported deployment profile
- supported topology docs are published
- unsupported topologies are explicitly deferred

#### Tasks

##### T3.2.1 Add multi-instance runtime correctness suite

- Objective: validate revocation, logout, refresh, and session reads across concurrent instances
- Primary outputs:
  - automated multi-instance integration suite
  - report artifact
- Dependencies:
  - `M3.1`
- Acceptance criteria:
  - suite proves no stale-read or inconsistent-revoke defects across supported operations

##### T3.2.2 Define supported deployment profiles

- Objective: publish the supported runtime topologies
- Primary outputs:
  - deployment profile doc updates
  - support-profile annotations
- Dependencies:
  - `M3.1`
- Acceptance criteria:
  - single-node, bounded production, and any HA profile are explicitly categorized as supported or deferred

##### T3.2.3 Decide rolling-upgrade posture

- Objective: make rolling upgrades either supported or explicitly deferred
- Primary outputs:
  - documented decision
  - if supported, test plan and release gate
- Dependencies:
  - `T3.2.2`
- Acceptance criteria:
  - no ambiguous posture remains

##### T3.2.4 Decide multi-site posture

- Objective: make multi-site either supported or explicitly deferred
- Primary outputs:
  - documented decision
  - if supported, scope and evidence plan
- Dependencies:
  - `T3.2.2`
- Acceptance criteria:
  - no implied multi-site claim remains

### Milestone M3.3 Operational Proof

#### Exit criteria

- backup, restore, readiness, and recovery are backed by operational, not just internal-runtime, evidence

#### Tasks

##### T3.3.1 Execute production-like backup and restore rehearsal

##### T3.3.2 Execute production-like key rotation and recovery drill

##### T3.3.3 Publish supported operator runbook for bounded production profile

##### T3.3.4 Add failure-injection scenarios for runtime dependencies

For `T3.3.1` through `T3.3.4`, acceptance criteria are:

- evidence artifacts are fresh, reproducible, and tied to release gating
- readiness and review surfaces degrade correctly on stale or failed evidence

### Milestone M3.4 External Target-Environment Evidence

#### Exit criteria

- the bounded supported deployment profile is proven in at least one real shared target environment beyond LocalStack-backed validation
- runtime, operator, and readiness evidence are reproducible there

#### Tasks

##### T3.4.1 Select the first external target environment and record prerequisites

##### T3.4.2 Re-run the distributed runtime bundle in the target environment

##### T3.4.3 Re-run bounded-production operator drills in the target environment

##### T3.4.4 Publish target-environment evidence bundle and release gate

Acceptance criteria for `T3.4.*`:

- shared-environment runtime, security, and operational evidence all pass outside LocalStack-backed validation
- the release gate distinguishes LocalStack proof from external target-environment proof

### Milestone M3.5 Broader HA Posture Beyond Bounded Single-Region

#### Exit criteria

- the next HA objective beyond bounded single-region support is either bounded and planned with evidence gates, or explicitly deferred with no ambiguity

#### Tasks

##### T3.5.1 Define the next HA objective beyond bounded single-region support

##### T3.5.2 Add mixed-version and topology continuity test plan

##### T3.5.3 Define failover, rollback, and operator evidence requirements for the next HA objective

##### T3.5.4 Promote the first broader HA profile or preserve explicit deferment with evidence thresholds

Acceptance criteria for `T3.5.*`:

- no implied HA claim exists beyond the currently supported bounded single-region profiles
- the next HA phase has explicit scope, evidence requirements, and release boundaries

## WS-A Bounded Protocol Parity

### Goal

Promote the strongest protocol areas into genuinely supported bounded profiles.

### Milestone M1.1 Requirement-Satisfied Bounded OIDC

#### Exit criteria

- bounded OIDC browser and refresh profile is formally requirement-satisfied
- supported variants and rejection behavior are explicit

#### Tasks

##### T1.1.1 Freeze the supported OIDC browser profile

- Objective: declare the exact supported client/profile matrix
- Primary outputs:
  - updated support matrix
  - explicit exclusions list
- Dependencies:
  - none
- Acceptance criteria:
  - supported browser OIDC profile is unambiguous

##### T1.1.2 Harden distributed introspection and revocation semantics

- Objective: remove remaining ambiguity under shared-durable runtime
- Primary outputs:
  - code fixes if needed
  - integration coverage
- Dependencies:
  - `WS-C M3.1`
- Acceptance criteria:
  - no inconsistency remains for supported token lifecycle paths

##### T1.1.3 Add external client interoperability suite for bounded OIDC

- Objective: prove real supported client interoperability
- Primary outputs:
  - client matrix
  - automated interoperability runs
- Dependencies:
  - `T1.1.1`
- Acceptance criteria:
  - at least the supported browser-client profile is externally validated

##### T1.1.4 Publish supported refresh-policy variants

- Objective: define what refresh behavior is supported and what is not
- Primary outputs:
  - support-matrix updates
  - explicit rejection behavior
- Dependencies:
  - `T1.1.1`
- Acceptance criteria:
  - refresh semantics are documented, tested, and bounded

### Milestone M1.2 Requirement-Satisfied Bounded SAML

#### Exit criteria

- at least one bounded SAML SP profile is promoted from implemented to supported

#### Tasks

##### T1.2.1 Freeze the supported SAML SP profile set

##### T1.2.2 Add third-party SP interoperability suite

##### T1.2.3 Harden SAML logout and response signing edge cases

##### T1.2.4 Publish unsupported SAML variants and rejection behavior

Acceptance criteria for `T1.2.*`:

- at least one supported SP profile is explicit
- evidence includes real SP interoperability, not only internal runtime proof

### Milestone M1.3 Requirement-Satisfied Bounded WebAuthn / Passkeys

#### Exit criteria

- at least one bounded browser/authenticator profile is promoted from implemented to supported

#### Tasks

##### T1.3.1 Freeze supported browser/authenticator matrix

##### T1.3.2 Add real browser passkey interoperability suite

##### T1.3.3 Harden unsupported authenticator and transport rejection behavior

##### T1.3.4 Publish support posture and exclusions

### Milestone M1.4 Advanced OAuth Support Matrix

#### Exit criteria

- device flow, token exchange, dynamic registration, and any retained CIBA/PAR surface have explicit support posture

#### Tasks

##### T1.4.1 Publish advanced OAuth support matrix

##### T1.4.2 Harden dynamic-registration lifecycle and policy semantics

##### T1.4.3 Harden device-flow lifecycle and approval semantics

##### T1.4.4 Harden token-exchange lineage and supported profile semantics

##### T1.4.5 Decide CIBA support or deferment

## WS-E Product Confidence, QA, and External Proof

### Goal

Reach adoption-grade confidence for the supported product surface.

### Milestone M5.1 World-Class Core QA Coverage

#### Exit criteria

- runtime/auth/protocol/admin critical paths have meaningful unit, scenario, integration, and journey coverage
- report artifacts are first-class release inputs

#### Tasks

##### T5.1.1 Finish LocalStack runtime integration lanes

##### T5.1.2 Finish runtime security lanes

##### T5.1.3 Finish runtime performance lanes

##### T5.1.4 Expand admin and account browser journeys

##### T5.1.5 Raise UI and API coverage thresholds after new suite coverage lands

### Milestone M5.2 External Interoperability Evidence

#### Exit criteria

- supported OIDC, SAML, and WebAuthn surfaces have reproducible external interoperability evidence

#### Tasks

##### T5.2.1 Establish OIDC interoperability harness

##### T5.2.2 Establish SAML SP interoperability harness

##### T5.2.3 Establish passkey/browser interoperability harness

##### T5.2.4 Publish evidence bundle format for supported-profile release gates

### Milestone M5.3 Release and Operator Confidence

#### Exit criteria

- release gating, reporting, and operator readiness are adoption-grade

#### Tasks

##### T5.3.1 Expand test-results reporting to include interoperability lanes

##### T5.3.2 Add supported deployment reference architecture docs

##### T5.3.3 Add rollback and upgrade operator checklist

##### T5.3.4 Add release gate dashboard for supported-profile readiness

## WS-B Federation and Enterprise Connectivity

### Goal

Close the biggest enterprise adoption gap with Keycloak by delivering real provider-family execution.

### Milestone M2.1 Live Broker Provider Support

#### Exit criteria

- at least one OIDC broker family and one SAML broker family are supported with live adapters

#### Tasks

##### T2.1.1 Select first supported OIDC broker provider family

##### T2.1.2 Select first supported SAML broker provider family

##### T2.1.3 Implement live OIDC broker adapter path

##### T2.1.4 Implement live SAML broker adapter path

##### T2.1.5 Add broker login, linking, and provider-disable interoperability coverage

### Milestone M2.2 Live Directory Federation

#### Exit criteria

- at least one live directory provider family is supported

#### Tasks

##### T2.2.1 Select initial LDAP/AD support target

##### T2.2.2 Implement directory connection and search path

##### T2.2.3 Implement import, sync, and conflict semantics

##### T2.2.4 Add operator UX and diagnostics for directory provider state

##### T2.2.5 Add interoperability and failure-mode tests for directory federation

### Milestone M2.3 Kerberos / SPNEGO Decision

#### Exit criteria

- Kerberos/SPNEGO is either supported in a bounded profile or explicitly deferred without ambiguity

#### Tasks

##### T2.3.1 Evaluate customer need and constitutional fit for Kerberos/SPNEGO

##### T2.3.2 If in-scope, define bounded supported profile

##### T2.3.3 If out-of-scope, publish formal deferment and remove any ambiguous language

## WS-D Extensibility and Provider Runtime

### Goal

Stop modeling providers as catalogs only and create a supported extension platform.

### Milestone M4.1 Minimal Provider Runtime

#### Exit criteria

- one provider family executes through a supported runtime contract

#### Tasks

##### T4.1.1 Define minimal provider lifecycle contract

##### T4.1.2 Define provider configuration and secret model

##### T4.1.3 Define provider health and failure semantics

##### T4.1.4 Implement first supported provider runtime path

##### T4.1.5 Add provider-runtime admin diagnostics and tests

### Milestone M4.2 Supported Extension Surface

#### Exit criteria

- extension expectations are explicit and testable

#### Tasks

##### T4.2.1 Define supported extension families

##### T4.2.2 Publish compatibility guarantees and lifecycle expectations

##### T4.2.3 Add extension packaging and validation tooling

##### T4.2.4 Add release gate for extension-runtime regressions

## WS-F Differentiator Preservation and Promotion

### Goal

Preserve and prove the product areas where IDP can credibly be stronger than Keycloak.

### Milestone M6.1 Privacy-Aware Identity Governance Productization

#### Exit criteria

- privacy-aware governance is clearly part of the supported product story

#### Tasks

##### T6.1.1 Publish supported regulated-profile governance posture

##### T6.1.2 Expand admin UX for attribute classification and release-policy review

##### T6.1.3 Add audit and explanation views for protected-attribute decisions

### Milestone M6.2 Application-Binding and Consumer Contract Productization

#### Exit criteria

- application-binding is documented, supported, and testable as a differentiator

#### Tasks

##### T6.2.1 Publish supported consumer-contract matrix

##### T6.2.2 Add conformance harness for downstream consumers

##### T6.2.3 Add compatibility and versioning policy for projection contracts

### Milestone M6.3 AWS-Native Economic Proof

#### Exit criteria

- low-idle-cost AWS posture is evidenced, not merely architectural intent

#### Tasks

##### T6.3.1 Define cost benchmark scenarios versus supported deployment profiles

##### T6.3.2 Capture cost and resource evidence for bounded production profile

##### T6.3.3 Publish economic comparison guidance for prospective adopters

## Critical Path

The critical path for adoption-grade bounded parity is:

1. `WS-C M3.1`
2. `WS-C M3.2`
3. `WS-A M1.1`
4. `WS-A M1.2`
5. `WS-A M1.3`
6. `WS-E M5.1`
7. `WS-E M5.2`
8. `WS-B M2.1`
9. `WS-B M2.2`
10. `WS-C M3.4`
11. `WS-C M3.5`

Without those milestones, the product can improve, but it cannot honestly claim low-adoption-risk Keycloak-class bounded parity.

## Suggested First 12 Issues

If execution starts immediately, these are the first 12 issues to open:

1. `T3.1.1` Prepare shared-environment runtime prerequisites
2. `T3.1.2` Run shared-environment login-transaction cutover evidence
3. `T3.1.3` Run shared-environment ticket cutover evidence
4. `T3.1.4` Run shared-environment session cutover evidence
5. `T3.1.5` Run shared-environment issued-token cutover evidence
6. `T3.2.1` Add multi-instance runtime correctness suite
7. `T1.1.1` Freeze the supported OIDC browser profile
8. `T1.1.2` Harden distributed introspection and revocation semantics
9. `T1.2.1` Freeze the supported SAML SP profile set
10. `T1.3.1` Freeze supported browser/authenticator matrix
11. `T5.1.1` Finish LocalStack runtime integration lanes
12. `T5.1.2` Finish runtime security lanes

## Definition of Backlog Success

This backlog is successful only when:

1. workstream completion is measured by milestone exit criteria, not task counts
2. supported-profile claims move forward only after evidence gates pass
3. parity work does not erase differentiator work
4. unsupported or deferred items remain explicit instead of being implied by implementation presence
