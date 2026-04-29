---
id: idp-keycloak-gap-analysis-and-remediation-plan
type: implementation
domain: planning
status: stable
version: "1.0"
dependencies: [platform-requirements, headless-iam-status-matrix, headless-iam-requirements-gap-matrix, protocol-support-matrix, federation-support-matrix, webauthn-support-matrix, saml-profile-matrix, gap-remediation]
tags: [implementation, planning, keycloak, parity, gap-analysis, remediation]
last_updated: "2026-04-28"
related: [implementation-plan, roadmap, gap-remediation]
---
# IDP vs Keycloak Gap Analysis and Remediation Plan

Last updated: 2026-04-28

## Purpose

This document converts the current competitive comparison with Keycloak into a governed remediation plan.

It is intended to:

- preserve the product areas where IDP already has meaningful strategic differentiation,
- identify the specific dimensions where Keycloak is materially ahead today,
- separate true parity blockers from optional future breadth,
- and define the work required before broad "Keycloak-class" or "better than Keycloak" claims would be honest.

This document is not the source of truth for current support posture. Current support and maturity posture remain governed by:

- [Headless IAM Status Matrix](../../reference/headless-iam-status-matrix.md)
- [Headless IAM Requirements Gap Matrix](../../reference/headless-iam-requirements-gap-matrix.md)
- [Protocol Support Matrix](../../reference/protocol-support-matrix.md)
- [Federation Support Matrix](../../reference/federation-support-matrix.md)
- [WebAuthn Support Matrix](../../reference/webauthn-support-matrix.md)
- [SAML Profile Matrix](../../reference/saml-profile-matrix.md)

## Comparison Baseline

Internal governed sources:

- [Platform Constitution](../../foundation/constitution.md)
- [Platform Requirements](../../specs/platform-requirements.md)
- [Capability Maturity Standard](../../reference/maturity-model.md)
- [Headless IAM Status Matrix](../../reference/headless-iam-status-matrix.md)
- [Headless IAM Requirements Gap Matrix](../../reference/headless-iam-requirements-gap-matrix.md)

Current official Keycloak sources reviewed on 2026-04-27:

- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [Keycloak OIDC and OAuth 2.0 layers](https://www.keycloak.org/securing-apps/oidc-layers)
- [Keycloak Client Registration Service](https://www.keycloak.org/securing-apps/client-registration)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html)
- [Keycloak Server Developer Guide](https://www.keycloak.org/docs/latest/server_development/index.html)
- [Keycloak High Availability Overview](https://www.keycloak.org/high-availability/introduction)
- [Keycloak Operator Rolling Updates](https://www.keycloak.org/operator/rolling-updates)
- [Keycloak Release Notes](https://www.keycloak.org/docs/latest/release_notes/)

## Program Decision

The current IDP implementation is a serious standalone IAM system, but it is not yet a broadly parity-credible Keycloak alternative.

The most important conclusion is not "build everything Keycloak has." The most important conclusion is:

1. preserve the areas where IDP is already directionally stronger,
2. close the credibility gaps that prevent adoption of a standalone IAM product,
3. and only then widen into optional parity breadth.

The current system should not be positioned as "better than Keycloak" across the market. The credible near-term target is:

- stronger than Keycloak in selected differentiator areas,
- parity-credible in a bounded supported profile set,
- and operationally trustworthy enough that adoption risk is low for those supported profiles.

## Progress Since Publication

Since this plan was first published, the largest bounded-profile credibility gaps in `WS-C` have narrowed materially:

- shared-durable runtime credibility is now proven for the bounded LocalStack-backed deployment profile,
- multi-instance correctness is now proven for the supported bounded single-region profile,
- backup, restore, signing-key rotation, and dependency-failure drills are now executed and release-gated,
- evidence-driven readiness posture is now materially stronger and freshness-gated,
- and AWS-native bounded deployment posture is now explicit rather than architectural intent only.

That changes the remaining primary gaps.

The most important remaining gaps are now:

1. supported SAML, not just implemented surface
2. supported WebAuthn/passkeys
3. at least one real live federation family and one real directory family
4. stronger HA posture beyond bounded single-region support
5. external target-environment evidence beyond LocalStack-backed validation

## What Must Be Preserved

The following areas are already strategically stronger or more opinionated than Keycloak and must not be diluted while closing parity gaps:

1. privacy-aware identity governance and attribute-release posture
2. application-binding and consumer projection contracts
3. explicit readiness, recovery, and evidence-driven operations posture
4. low-idle-cost AWS-native operating intent
5. tenant-aware principal context and downstream compatibility surfaces

Rule:

- parity work must not collapse these differentiators into generic feature-matching work
- any parity-phase design that weakens these areas is a regression

## Executive Gap Summary

The gaps fall into six categories.

### Category A: Protocol Credibility

IDP has broad protocol surface area, but too much of it is still `Implemented` instead of `Supported`, or `Supported` only for bounded profiles.

Primary gaps:

- SAML support is still below supported product-claim level
- WebAuthn and passkeys are still below supported product-claim level
- advanced OAuth profiles need explicit supported-profile hardening
- external interoperability evidence still needs to catch up with the improved runtime proof

### Category B: Federation and Enterprise Connectivity

Keycloak has materially stronger real-world federation depth.

Primary gaps:

- live OIDC and SAML broker provider-family depth
- live directory federation
- LDAP / AD support
- Kerberos / SPNEGO support
- federation onboarding, trust, rollover, and mapping proof against real providers

### Category C: Runtime Authority and High Availability

Keycloak is substantially ahead on operational topology and failure-mode credibility.

Primary gaps:

- target-environment proof still does not exist beyond LocalStack-backed shared validation
- broader HA posture beyond bounded single-region support is still absent
- no supported multi-site or rolling-upgrade posture yet
- external operational evidence is still too internal

### Category D: Extensibility and Ecosystem

Keycloak has a large real extension ecosystem and stable SPI surface. IDP does not yet.

Primary gaps:

- no product-grade provider runtime boundary
- no supported authenticator/provider/plugin lifecycle
- no ecosystem-grade extension contract
- limited external integration posture relative to Keycloak

### Category E: Product Confidence and Adoption Risk

Keycloak wins heavily on buyer confidence.

Primary gaps:

- insufficient external interoperability proof
- insufficient operational evidence in shared target environments beyond LocalStack-backed validation
- insufficient breadth in admin- and browser-level regression coverage
- no externally proven reference architecture or target-environment deployment evidence yet

### Category F: Scope Discipline

Keycloak is broad. IDP cannot win by copying breadth without discipline.

Primary risk:

- attempting full feature-count parity before supported-profile, runtime, and evidence gates are closed

## Critical Comparison Matrix

| Dimension | IDP current governed posture | Keycloak current posture | Gap severity | Required action |
| --- | --- | --- | --- | --- |
| Core IAM model | Strong and broadly coherent | Strong and mature | Low | Preserve and harden |
| OIDC browser auth-code + PKCE | Supported for bounded profile | Mature and broad | Medium | Expand supported-profile evidence |
| Refresh, userinfo, discovery | Supported for bounded profile | Mature and broad | Medium | Promote supported deployment profile |
| Introspection and revocation | Implemented with internal proof | Mature and proven | High | Add scale and distributed-runtime proof |
| Dynamic client registration | Supported for bounded profile | Mature and broad | Medium | Harden lifecycle and policy semantics |
| PAR / CIBA / token exchange / device flow | Implemented to narrowly supported | Broader and stronger | High | Publish and harden per-profile support |
| SAML IdP | Implemented, not yet supported | Mature and established | Critical | Promote bounded SAML support with external SP proof |
| WebAuthn / passkeys | Implemented, not yet supported | More mature and documented | Critical | Promote bounded browser/authenticator support |
| Identity brokering | Experimental / bounded | Mature and broad | Critical | Add live provider-family support |
| LDAP / AD / Kerberos | Modeled or deferred | Real support | Critical | Deliver first live enterprise directory path |
| Organizations | Supported | Real and maturing | Low | Preserve and deepen org-linked federation |
| Authorization services / UMA | Implemented | Mature | Medium | Harden protected-resource profile support |
| Admin authorization / impersonation | Implemented | Mature | Medium | Increase resource-bound semantics and evidence |
| Extensibility / provider runtime | Modeled | Large SPI ecosystem | Critical | Build bounded provider runtime contract |
| HA / rolling updates / multi-site | Deferred or absent | Officially documented and supported profiles exist | Critical | Define and prove supported deployment profiles |
| Operations / recovery posture | Strong internal runtime model | Strong real-world credibility | Medium | Convert internal rigor into operational evidence |
| Buyer confidence / ecosystem | Low external confidence | High | Critical | Improve QA, evidence, docs, deployment guides, interoperability proof |

## Non-Negotiable Gap-Closure Principles

1. Do not widen unsupported surface area while core supported-profile credibility is still weak.
2. Do not claim parity from endpoint presence alone.
3. Do not treat synthetic provider families as product support.
4. Do not trade away differentiator work to chase shallow feature-count parity.
5. Do not open a multi-site or operator-grade claim before the single supported deployment profile is production-grade.

## Remediation Workstreams

## Workstream 1: Bounded Protocol Parity

### Objective

Move the strongest standards surfaces from `Implemented` or narrowly `Supported` to genuinely supportable, adoption-grade profiles.

### Scope

- OIDC browser profile hardening
- advanced OAuth support-matrix hardening
- SAML bounded supported profile
- WebAuthn/passkey bounded supported profile

### Required deliverables

1. supported-profile documents for:
   - OIDC browser clients
   - dynamic registration
   - device flow
   - token exchange
   - CIBA if retained
   - bounded SAML SP profiles
   - bounded browser/authenticator passkey profiles
2. explicit rejection behavior for unsupported variants
3. real interoperability evidence against external clients, browsers, and service providers
4. threat-model and failure-mode review for:
   - logout
   - token replay
   - introspection consistency
   - passkey ceremony edge cases
   - SAML request, response, and logout correctness

### Execution sequence

1. freeze the exact near-term supported OIDC profile set
2. harden introspection, revocation, and refresh semantics against distributed-runtime expectations
3. promote the bounded SAML profile from implemented to supported
4. promote the bounded WebAuthn profile from implemented to supported
5. explicitly defer any advanced profile that cannot be proven in the current release window

### Exit criteria

- bounded OIDC support is requirement-satisfied
- bounded SAML support is requirement-satisfied
- bounded WebAuthn support is requirement-satisfied
- all supported variants have real rejection behavior for unsupported requests
- support claims are backed by external interoperability evidence

## Workstream 2: Live Federation and Directory Depth

### Objective

Close the largest enterprise adoption gap with Keycloak by delivering real provider-family execution instead of modeled or synthetic families.

### Scope

- OIDC brokering
- SAML brokering
- directory federation
- LDAP / AD
- optional Kerberos / SPNEGO decision

### Required deliverables

1. one supported live OIDC broker family
2. one supported live SAML broker family
3. one supported live LDAP or AD directory provider
4. explicit decision on Kerberos / SPNEGO:
   - deliver a bounded supported profile, or
   - keep deferred and state that clearly
5. federation trust-store, rollover, mapping, and JIT/sync evidence against real providers

### Execution sequence

1. select the first supported provider families
2. implement live adapters and remove synthetic-first claim posture for those families
3. prove broker login, account linking, logout implications, and provider-disable cleanup
4. prove import, sync, update, and conflict semantics for directory federation

### Exit criteria

- at least one live supported broker provider family exists
- at least one live supported directory provider family exists
- synthetic provider families no longer dominate the supported claim surface
- federation support matrix cleanly distinguishes supported, experimental, and deferred families

## Workstream 3: Runtime Authority, HA, and Operating Credibility

### Objective

Make the system trustworthy as a standalone operating product, not just a locally proven runtime.

### Scope

- shared durable runtime activation in target environments
- multi-instance correctness
- scale behavior
- rolling-upgrade and deployment posture
- HA declarations

### Required deliverables

1. target-environment proof for runtime cutover Sequence A and successor paths
2. multi-instance session/token correctness evidence
3. explicit supported deployment profiles:
   - single-node development
   - bounded production profile
   - HA profile if supported
4. rolling-upgrade posture:
   - supported, or
   - explicitly deferred
5. multi-site posture:
   - supported, or
   - explicitly deferred

### Execution sequence

1. finish target-environment proof for durable runtime
2. run concurrent-instance correctness tests for sessions, tokens, revocation, and login transactions
3. publish supported deployment topology documents
4. decide whether rolling upgrades and HA are Phase N support or explicit deferments

### Exit criteria

- shared durable runtime is proven outside local development
- a production deployment profile is defined and validated
- session and token behavior are scale-credible for that profile
- HA and rolling-upgrade claims are either proven or explicitly absent

## Workstream 4: Extensibility and Provider Runtime

### Objective

Create a product-grade extension story rather than a modeled provider story.

### Scope

- provider runtime boundary
- storage adapters
- authenticators
- federation providers
- policy providers
- themes and experience extension points

### Required deliverables

1. first supported provider runtime contract
2. lifecycle and isolation model for providers
3. bounded extension packaging model
4. test and compatibility expectations for supported providers
5. admin and operations visibility into provider state and failure

### Execution sequence

1. define minimal provider runtime contract
2. apply it first to one high-value extension family
3. publish compatibility rules and failure semantics
4. expand only after the first provider family is production-grade

### Exit criteria

- at least one provider family runs through a supported extension boundary
- extension failure modes are observable
- the provider model is not merely a registry/catalog abstraction

## Workstream 5: Product Confidence, QA, and External Proof

### Objective

Reduce adoption risk to a level where a serious buyer can evaluate the product without relying on goodwill.

### Scope

- QA breadth and depth
- interoperability proof
- performance proof
- security proof
- operator documentation and deployment references

### Required deliverables

1. world-class QA posture across:
   - protocol flows
   - browser journeys
   - admin workflows
   - distributed runtime integration
   - performance lanes
   - security lanes
2. external interoperability suites for supported profiles
3. release-grade test reporting and evidence bundling
4. reference deployment docs and supported-operating-profile docs
5. migration, rollback, and upgrade guidance

### Execution sequence

1. finish the current QA remediation program
2. add conformance and external interoperability lanes for supported profiles
3. publish operator runbooks for the supported production profile
4. establish release gates that block unsupported marketing claims

### Exit criteria

- supported profiles have reproducible test evidence
- security and performance gates are first-class release blockers
- release reporting is explicit about what ran, what passed, and what remains out of scope

## Workstream 6: Preserve and Promote Differentiators

### Objective

Make sure closing parity gaps does not erase the product’s stronger long-term position.

### Scope

- privacy-aware identity governance
- application-binding / consumer contracts
- readiness and recovery evidence posture
- AWS-native low-idle-cost posture
- tenant-aware projection and downstream compatibility

### Required deliverables

1. supported product narrative for differentiator surfaces
2. architecture proof that parity work does not bypass those capabilities
3. benchmark and operator evidence for low-idle-cost AWS posture
4. stronger admin and API UX around privacy and projection controls

### Exit criteria

- differentiator capabilities are part of the supported product story
- they are not sidelined as internal-only features
- AWS cost posture is proven with evidence, not aspiration

## Recommended Phase Plan

### Phase A: Claim Hygiene and Bounded Support Promotion

Goal:

- make the currently strongest protocol surfaces honestly supportable

Must complete:

- OIDC bounded support promotion
- SAML bounded profile hardening
- WebAuthn bounded profile hardening
- advanced OAuth support-matrix publication

### Phase B: Runtime and Operating Credibility

Goal:

- make the runtime and deployment posture trustworthy

Must complete:

- target-environment durable runtime proof
- concurrent-instance runtime proof
- supported deployment profile publication
- operational evidence for backup, restore, readiness, and recovery

### Phase C: Live Federation and Enterprise Connectivity

Goal:

- close the biggest enterprise connectivity gaps with Keycloak

Must complete:

- supported live broker family
- supported live directory family
- trust, rollover, and mapping evidence

### Phase D: Extensibility and Platform Surface

Goal:

- stop being a closed implementation and become a platform

Must complete:

- first real provider runtime
- supported extension contract
- bounded ecosystem story

### Phase E: Differentiator Consolidation

Goal:

- prove the product is not only parity-capable, but strategically better in selected areas

Must complete:

- privacy-aware governance productization
- application-binding productization
- AWS cost posture evidence
- adoption-grade operator and review tooling

## Priority Ranking

### Priority 0: Current release blockers

1. bounded SAML support
2. bounded WebAuthn/passkey support
3. shared durable runtime proof outside local development
4. distributed token/session correctness proof

### Priority 1: Enterprise adoption blockers

1. live federation provider family
2. live LDAP / AD family
3. production deployment profile and HA posture
4. stronger interoperability and operator evidence

### Priority 2: Platform credibility blockers

1. extension/provider runtime
2. stronger admin and policy evaluation semantics
3. performance and scale proof

### Priority 3: Strategic differentiator promotion

1. AWS-native low-idle-cost proof
2. privacy-aware identity governance positioning
3. application-binding and downstream compatibility productization

## Things Not To Do

1. Do not chase SCIM, Kerberos, or multi-site breadth before the current bounded supported profiles are production-grade.
2. Do not broaden advanced OAuth claims faster than the support matrices and interoperability evidence can justify.
3. Do not treat "implemented route exists" as a market-facing capability claim.
4. Do not spend major effort on generic theming or cosmetic admin enhancements while runtime authority, SAML, passkeys, and federation remain below threshold.
5. Do not let Keycloak comparison pressure erase the differentiator tracks.

## Adoption-Grade Success Criteria

The product becomes credibly adoptable against Keycloak for bounded use cases only when all of the following are true:

1. bounded OIDC, SAML, and WebAuthn surfaces are requirement-satisfied
2. shared durable runtime is proven in target environments
3. sessions and tokens are distributed-runtime credible
4. at least one live broker family and one live directory family are supported
5. the supported deployment profile is operationally documented and validated
6. QA, security, performance, and interoperability evidence are release-grade
7. differentiator surfaces are explicit, supported, and operationally useful

## Final Positioning Guidance

Until the gates above are met, IDP should be positioned as:

- a serious standalone IAM product in active hardening,
- stronger than many bespoke internal auth systems,
- promising in privacy-aware identity governance, application-binding, and evidence-driven operations,
- but not yet broadly interchangeable with Keycloak.

Once the bounded support, runtime credibility, federation depth, and operational-proof gates are complete, the product can credibly claim:

- bounded Keycloak-class parity in declared supported profiles,
- stronger governance and downstream-integration semantics in selected domains,
- and a differentiated AWS-native operating model where proven.
