# IDP Headless IAM Education Readiness Implementation Plan

**Date:** March 21, 2026  
**Purpose:** Define the detailed IAM-only implementation plan required to satisfy the new constitution and requirements language for education-domain identity readiness without coupling the work to LMS application behavior.

---

## 1. Objective

The objective is to evolve the standalone IAM subsystem so it can credibly support education-domain identity patterns as reusable IAM capabilities, not as LMS-specific custom logic.

This plan addresses the new IAM requirements for:

- education-ready federation packaging,
- privacy-aware identity controls,
- contextual ABAC overlays on top of RBAC,
- guardian or proxy delegation patterns,
- and cross-institution identity portability.

This is not an LMS implementation plan. It is an IAM subsystem plan.

---

## 2. Scope

This plan covers IAM-core architecture, runtime, contracts, policy model, administration, and validation for education-sensitive identity use cases.

This plan does not cover:

- LMS course, cohort, transcript, or gradebook application logic,
- LMS-specific UI flows beyond IAM-owned login, account, and admin surfaces,
- downstream application authorization rewrites outside the IAM contracts they consume,
- or academic-content, assessment, or learner-experience design.

---

## 3. Governing Deltas Being Implemented

This plan implements the new constitutional and requirements expectations now present in:

- [CONSTITUTION.md](/Volumes/data/development/IDP/IDP/CONSTITUTION.md#L491)
- [CONSTITUTION.md](/Volumes/data/development/IDP/IDP/CONSTITUTION.md#L651)
- [requirements.md](/Volumes/data/development/IDP/IDP/requirements.md#L795)
- [requirements.md](/Volumes/data/development/IDP/IDP/requirements.md#L832)
- [requirements.md](/Volumes/data/development/IDP/IDP/requirements.md#L846)
- [requirements.md](/Volumes/data/development/IDP/IDP/requirements.md#L1603)

Those deltas require IAM to treat educational privacy, institutional federation, proxy relationships, contextual policy, and portable identity as reusable subsystem capabilities.

---

## 4. Strategic Design Rules

1. RBAC remains the base authorization model.
2. ABAC and policy-decision behavior refine RBAC; they do not replace it.
3. Education-sensitive semantics belong in IAM primitives and policy, not in downstream application code.
4. Federation helpers must remain generic enough to support other regulated sectors, not only education.
5. Privacy and attribute-release controls must be enforced in IAM before downstream token issuance or federation release.
6. Proxy or guardian access must be relationship-bound, time-bound where configured, auditable, and revocable.
7. Cross-institution identity must preserve stable identifiers and governance boundaries rather than collapsing all institutions into one local user model.
8. Readiness is not achieved until the new identity modes have standalone synthetic validation and review coverage.

---

## 5. Target Capability Outcome

At the end of this program, the IAM subsystem must be able to do all of the following without relying on LMS-local logic:

- onboard an institution through OIDC or SAML with governed trust, metadata, mapping, and attribute-release controls,
- classify identities and profile attributes by privacy sensitivity and release purpose,
- represent minors, guardians, parents, caregivers, sponsors, and other authorized proxies as governed identity relationships,
- evaluate contextual policies based on subject, resource, environment, relationship, consent, and temporal attributes,
- broker or project a user across institutions while retaining portable external identifiers and home-organization bindings,
- expose these controls through IAM admin APIs and admin surfaces,
- and prove the behavior through standalone IAM validation.

---

## 6. Workstreams

### 6.1 Education Posture Templates and Configuration

**Goal:** Make education-sensitive IAM posture configurable instead of hand-built.

**Primary changes**

- Add domain-aware realm templates and posture presets to [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts).
- Introduce preset families for:
  - institutional SSO posture
  - privacy-sensitive profile posture
  - minor-serving account posture
  - guardian or proxy delegation posture
  - portable multi-institution identity posture
- Extend realm configuration to store:
  - enabled posture presets
  - federation packaging defaults
  - privacy enforcement defaults
  - relationship-model defaults
  - contextual-policy defaults

**New or expanded APIs**

- `iam-realm-postures-api.json`
- `iam-realm-templates-api.json`

**Exit criteria**

- New realms can be created from education-capable presets without manual low-level editing.
- Realm exports preserve posture configuration and are portable across environments.

### 6.2 Institutional Federation Packaging

**Goal:** Move from generic federation capability to education-ready federation operability.

**Primary changes**

- Expand [iamFederationRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFederationRuntime.ts) with:
  - trust-store entities
  - metadata ingestion and validation
  - certificate rollover records
  - mapping profiles
  - home-organization binding rules
  - just-in-time and sync-based link policies
- Expand [iamProtocolRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamProtocolRuntime.ts) with:
  - governed assertion release
  - release-policy-aware attribute mapping
  - per-provider mapper bundles
  - SP and IdP federation test harness support
- Expand [iamExtensionRegistry.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamExtensionRegistry.ts) with provider types for:
  - metadata validators
  - attribute mappers
  - trust-chain validators
  - institutional federation presets

**New data models**

- `IamFederationTrustStore`
- `IamFederationCertificate`
- `IamFederationMappingProfile`
- `IamInstitutionBindingRule`

**New or expanded APIs**

- `iam-federation-trust-stores-api.json`
- `iam-federation-mapping-profiles-api.json`
- `iam-federation-providers-api.json`

**Exit criteria**

- IAM admins can onboard an institutional IdP without direct code changes.
- Trust, rollover, and mapping behavior are auditable and exportable.

### 6.3 Privacy-Aware Identity and Attribute Release

**Goal:** Make privacy posture an IAM-core concern instead of an application convention.

**Primary changes**

- Expand [iamUserProfiles.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamUserProfiles.ts) with:
  - attribute classification
  - allowed release purposes
  - consent requirements
  - minimization posture
  - protected-record markers
- Expand [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts) with:
  - identity privacy classifications
  - protected-record categories
  - consent policy references
  - age-band markers where configured
- Add IAM audit records for:
  - protected-record access decisions
  - attribute-release events
  - consent grants, updates, and revocations
- Ensure token and assertion issuance paths consume release policies before emitting claims.

**New data models**

- `IamIdentityClassification`
- `IamAttributeReleasePolicy`
- `IamConsentPurpose`
- `IamProtectedRecordPolicy`

**New or expanded APIs**

- `iam-user-profile-schemas-api.json`
- `iam-attribute-release-policies-api.json`
- `iam-consent-governance-api.json`

**Exit criteria**

- Sensitive profile fields cannot be released without configured purpose and policy.
- Audit output can explain why protected attributes were released or withheld.

### 6.4 Delegated Relationship Authentication and Authorization

**Goal:** Support guardian, proxy, and related education-sensitive access patterns within IAM.

**Primary changes**

- Add relationship and delegation primitives to [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts).
- Add relationship evaluation support to [iamAuthorizationServices.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamAuthorizationServices.ts).
- Add delegated session and consent handling to the authentication runtime.
- Add policy support for:
  - relationship type
  - approval state
  - delegation scope
  - start and end time
  - emergency override or break-glass posture where configured

**New data models**

- `IamRelationship`
- `IamDelegationGrant`
- `IamDelegationApproval`
- `IamAgeBandPolicy`

**New or expanded APIs**

- `iam-relationships-api.json`
- `iam-delegation-grants-api.json`
- `iam-delegation-approvals-api.json`

**Exit criteria**

- IAM can represent a guardian or proxy relationship independently of any application.
- Delegated access is time-bound, auditable, and revocable.

### 6.5 Contextual ABAC and Policy Decision Runtime

**Goal:** Add contextual authorization overlays that work with the existing RBAC model.

**Primary changes**

- Expand or split [iamAuthorizationServices.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamAuthorizationServices.ts) into:
  - base RBAC and permission resolution
  - contextual policy model
  - policy decision evaluation
  - explanation and simulation runtime
- Support condition types for:
  - subject attributes
  - resource attributes
  - environment attributes
  - relationship attributes
  - temporal rules
  - consent state
  - institution context
- Add policy-combining and explanation support so admins can understand decisions.

**New data models**

- `IamPolicyContextSchema`
- `IamPolicyCondition`
- `IamPolicySet`
- `IamPolicyDecisionExplanation`

**New or expanded APIs**

- `iam-policy-context-api.json`
- `iam-policy-decision-api.json`
- `iam-policy-simulation-api.json`

**Exit criteria**

- Policies can deny or refine access based on context without replacing RBAC membership.
- Admins can simulate and explain policy outcomes before rollout.

### 6.6 Cross-Institution Identity Portability

**Goal:** Represent users who move across, belong to, or interact with multiple institutions.

**Primary changes**

- Add portable external-identity and home-organization primitives to [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts).
- Expand federation runtime to maintain:
  - stable external identifiers
  - brokered identity links
  - institution relationship records
  - local projection rules by bound tenant or realm
- Prevent downstream systems from treating every institution-specific link as a wholly separate user when a portable identity relationship exists.

**New data models**

- `IamPortableIdentity`
- `IamExternalIdentityBinding`
- `IamHomeOrganization`
- `IamCrossOrganizationRelationship`

**New or expanded APIs**

- `iam-portable-identities-api.json`
- `iam-external-identity-bindings-api.json`

**Exit criteria**

- A user can be linked to multiple institutional identity sources without collapsing governance boundaries.
- Export, import, and audit artifacts preserve portable identity and institution-binding semantics.

### 6.7 IAM Admin, Account, and Review Surface Enhancements

**Goal:** Make the new capabilities operable and reviewable.

**Primary changes**

- Extend IAM admin surfaces with sections for:
  - federation trust and mapping
  - privacy classification and attribute release
  - delegation relationships
  - contextual policy simulation
  - portable identity relationships
- Extend review and readiness output in [iamReviewRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamReviewRuntime.ts) to assess:
  - institutional federation readiness
  - privacy and attribute-release enforcement
  - delegated relationship control
  - contextual policy behavior
  - cross-institution identity portability

**New or expanded APIs**

- `iam-review-runtime-api.json`
- `iam-admin-simulation-api.json`

**Exit criteria**

- All new IAM education-sensitive capabilities are administratively configurable and independently reviewable.

### 6.8 Standalone Validation and Readiness

**Goal:** Make the new posture provable before downstream adoption.

**Primary changes**

- Add standalone synthetic validation scripts for:
  - institutional SAML onboarding
  - institutional OIDC onboarding
  - certificate rollover
  - privacy-aware claim release
  - consent enforcement
  - guardian or proxy delegation
  - age-based denial or refinement
  - contextual policy decisions
  - cross-institution identity linking and portability
- Extend readiness review to fail if those tests are absent or failing when the relevant posture is enabled.

**Validation artifacts**

- `scripts/verify-iam-education-federation.sh`
- `scripts/verify-iam-education-privacy.sh`
- `scripts/verify-iam-education-delegation.sh`
- `scripts/verify-iam-education-abac.sh`
- `scripts/verify-iam-education-portability.sh`

**Exit criteria**

- Education-sensitive IAM profiles cannot be described as ready until standalone synthetic validation passes.

---

## 7. Phase Plan

### Phase 1. Foundation and Configuration Model

**Objective:** Establish the reusable data model and configuration posture required by later phases.

**Deliverables**

- realm posture presets
- identity classification model
- relationship model
- portable identity primitives
- configuration contracts and export support

**Primary files**

- [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts)
- [iamUserProfiles.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamUserProfiles.ts)
- new IAM configuration contracts under `contracts/api`

**Dependencies**

- none

**Gate to Phase 2**

- new posture settings persist, export, import, and validate cleanly

### Phase 2. Institutional Federation Packaging

**Objective:** Make federation administratively usable for institutional deployments.

**Deliverables**

- trust stores
- metadata import and validation
- certificate rollover
- assertion and attribute mapping bundles
- institutional federation presets

**Primary files**

- [iamFederationRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFederationRuntime.ts)
- [iamProtocolRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamProtocolRuntime.ts)
- [iamExtensionRegistry.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamExtensionRegistry.ts)

**Dependencies**

- Phase 1

**Gate to Phase 3**

- institutional federation can be configured entirely through IAM-administered contracts

### Phase 3. Privacy and Delegated Relationship Controls

**Objective:** Add the identity-governance model required for protected and minor-serving environments.

**Deliverables**

- privacy classifications
- attribute-release policies
- consent enforcement
- guardian or proxy relationship primitives
- delegated approval and revocation workflows

**Primary files**

- [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts)
- [iamUserProfiles.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamUserProfiles.ts)
- authentication and token issuance runtime modules

**Dependencies**

- Phase 1
- Phase 2 for federation-aware attribute release

**Gate to Phase 4**

- protected attributes and delegated access decisions are audited and explainable

### Phase 4. Contextual ABAC and Policy Decisioning

**Objective:** Add contextual policy refinement on top of RBAC.

**Deliverables**

- policy context schemas
- policy conditions and sets
- PDP evaluation runtime
- simulation and explanation endpoints

**Primary files**

- [iamAuthorizationServices.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamAuthorizationServices.ts)
- new policy runtime modules under `apps/api-server/src/platform`

**Dependencies**

- Phase 1
- Phase 3 for consent and relationship attributes

**Gate to Phase 5**

- IAM can evaluate contextual policies using relationship, temporal, and consent attributes

### Phase 5. Cross-Institution Identity Portability

**Objective:** Let IAM model identities that span institutions while preserving governance boundaries.

**Deliverables**

- portable identity records
- home-organization bindings
- cross-organization relationship records
- brokered identity portability rules

**Primary files**

- [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts)
- [iamFederationRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFederationRuntime.ts)

**Dependencies**

- Phase 1
- Phase 2
- Phase 4

**Gate to Phase 6**

- cross-institution identity behavior is exportable, auditable, and synthetic-testable

### Phase 6. Admin Surface, Review, and Readiness Completion

**Objective:** Make the new capabilities operable and ready for formal IAM review.

**Deliverables**

- admin UI and API coverage
- readiness-review checks
- standalone synthetic validation suite
- formal review checklist for education-sensitive postures

**Primary files**

- [iamReviewRuntime.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamReviewRuntime.ts)
- IAM admin/account surfaces
- standalone verification scripts

**Dependencies**

- Phases 1 through 5

**Program exit**

- education-sensitive IAM posture is independently reviewable and validated without relying on LMS behavior

---

## 8. Detailed Backlog by Module Family

### 8.1 Foundation and Persistence

- extend realm template schema
- add portable identity and relationship entities
- add privacy and consent posture entities
- add trust-store and federation-packaging entities
- add migration and export support

### 8.2 Federation and Protocol Runtime

- implement metadata validation and import workflows
- implement rollover-aware certificate handling
- add reusable mapping bundles
- add policy-aware attribute-release enforcement

### 8.3 Authorization Runtime

- add context schemas and evaluators
- add relationship-aware conditions
- add temporal and consent conditions
- add explanation output

### 8.4 Admin and Account Surfaces

- add policy configuration screens
- add federation setup helpers
- add relationship and delegation management
- add policy simulation and audit review views

### 8.5 Review and Validation

- add new standalone verifiers
- expand readiness review categories
- add failure posture when enabled capability families are unvalidated

---

## 9. Risks and Guardrails

### Risk 1. Education logic leaks into application code

**Guardrail:** All relationship, privacy, and federation semantics must be represented in IAM contracts and runtime first.

### Risk 2. ABAC replaces RBAC by accident

**Guardrail:** Policy evaluation must consume RBAC-derived entitlements and refine them, not bypass them.

### Risk 3. Federation helpers become school-specific one-offs

**Guardrail:** Presets and mapping bundles must be provider- and domain-configurable rather than hardcoded to a single institution pattern.

### Risk 4. Portable identity collapses tenant boundaries

**Guardrail:** Separate stable external identity, home-organization, and tenant-projection models explicitly.

### Risk 5. Privacy controls exist only in documentation

**Guardrail:** No readiness pass without token, assertion, audit, and admin-simulation proof.

---

## 10. Recommended Execution Order

1. Phase 1 foundation and configuration model
2. Phase 2 institutional federation packaging
3. Phase 3 privacy and delegated relationship controls
4. Phase 4 contextual ABAC and policy decisioning
5. Phase 5 cross-institution identity portability
6. Phase 6 admin surface and readiness completion

This order is deliberate:

- federation packaging without privacy controls would release claims too loosely,
- delegated relationship logic without base relationship entities would be brittle,
- ABAC before context schemas would produce ad hoc policy logic,
- and cross-institution identity before federation and policy would create unstable projection rules.

---

## 11. Exit Criteria

The IAM subsystem may be described as education-ready only when all of the following are true:

- institutional SAML and OIDC federation can be configured through IAM posture and provider settings,
- trust stores, metadata, and certificate rollover are implemented and auditable,
- privacy classifications and attribute-release policies are enforced in token and assertion issuance,
- guardian or proxy delegation is modeled, enforced, time-bound where configured, and revocable,
- contextual ABAC overlays can evaluate relationship, temporal, consent, and institutional attributes,
- cross-institution identity portability exists with stable identifiers and governed projection rules,
- admin APIs and surfaces expose the new capabilities,
- standalone synthetic validation for all enabled posture families passes,
- and formal IAM review accepts the subsystem independently of LMS or IDP application adoption.

---

## 12. Next Correct Step

The next correct implementation step is **Phase 1: Foundation and Configuration Model**.

That phase should begin with changes to:

- [iamFoundation.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamFoundation.ts)
- [iamUserProfiles.ts](/Volumes/data/development/IDP/IDP/apps/api-server/src/platform/iamUserProfiles.ts)
- the IAM OpenAPI contract set under [contracts/api](/Volumes/data/development/IDP/IDP/contracts/api)

Those changes define the primitives that every later federation, delegation, privacy, and ABAC feature depends on.
