---
id: crew-idp-authorization-replacement-plan
type: implementation
domain: planning
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, planning]
last_updated: "2024-04-12"
related: []
---
# Reusable Application Authorization Platform and Crew Migration Plan

## Objective

Enable the IDP to provide a reusable application-authorization platform for concern A only:
- identification
- authentication
- authorization

This plan keeps concern B outside the IAM core:
- purchase-driven entitlements
- subscription rights
- ownership and commerce-derived access rights
- other business-domain rights truth

The target is not a Crew-specific adapter stack.

The target is a generic, reusable application-authorization platform that can be used by Crew, FlightOS, IDP, and future applications with application-scoped configuration rather than repeated bespoke authorization implementations.

Crew is the first migration consumer in this plan, not the architectural boundary of the plan.

The intended long-term composition remains:

`effective_access = identity_authorization_from_idp ∩ external_business_rights_or_policy_inputs`

## Program Decision

Do not pollute the core IAM subsystem with application-specific business semantics.

Instead, add a dedicated reusable application-authorization layer on top of the existing IAM substrate:
- reuse core users, groups, roles, sessions, token, admin, and federation infrastructure
- add application bindings, authorization profiles, tenant-context projection, capability and permission projection, service-account projection, and compatibility contracts as explicit reusable platform layers
- allow downstream applications to contribute non-identity policy inputs for authorization refinement without making IAM the source of truth for those inputs
- provide SDK and conformance tooling so downstream applications consume the same contracts instead of rebuilding the same glue repeatedly

## Expanded Gap Summary

The current plan already covered several important gaps for Crew. The architecture review widened the scope of what should become reusable platform capability.

The IDP now needs generic support for:

1. Application binding registry
2. Authorization profile engine
3. Tenant-aware principal context and membership strategies
4. Application capability and permission catalogs
5. Accessible surface projection
6. Versioned principal projection contracts
7. Service-account application projection
8. External policy-input composition
9. Provisioning and synchronization strategy framework
10. Consumer SDKs and conformance validators

## Architectural Boundary

The reusable IDP platform should own:
- identity and session truth
- tenant-aware principal context
- identity-side role, permission, and capability projection
- application authorization profiles and evaluation behavior
- principal projection contracts and migration-safe compatibility envelopes
- service-account projection behavior
- reusable integration SDKs and conformance harnesses

The consuming application should own:
- business-domain resource models
- purchase or subscription entitlement truth
- tenant feature truth unless explicitly externalized elsewhere
- deployment profile truth
- regulated-service eligibility truth when it is business- or platform-owned rather than identity-owned
- resource-specific authorization that depends on non-identity business facts

## Phase Sequence

### Phase A0 - Contract Freeze and Generic Model Baseline

Goal:
Freeze the reusable consumer contract before runtime implementation starts.

Deliverables:
1. Canonical consumer auth contract inventory
   - token claims in use
   - `/me` shapes in use
   - bootstrap and tenant-context envelopes in use
   - service-account auth context in use
   - tenant alias, header, and subdomain expectations
2. Canonical generic model decision document
   - application binding model
   - authorization profile model
   - tenant membership strategy model
   - external policy-input composition boundary
   - provisioning and sync strategy model
3. Compatibility target matrix
   - exact claims to emit
   - exact `/me` and bootstrap fields to expose
   - exact evaluation endpoints to provide
   - exact conformance checks to publish

Acceptance criteria:
- all known downstream auth-context dependencies are enumerated
- ownership boundaries are explicit
- no unresolved ambiguity remains around tenant context, profile mapping, or projection contracts

### Phase A1 - Application Binding Registry

Goal:
Introduce a first-class application binding model so each consuming application can declare how it integrates with IAM without hardcoding those rules in app code.

Deliverables:
1. Application binding registry records
2. Provider-mode selection per consumer
3. Realm binding and client binding rules
4. Authorization profile assignment per consumer
5. Projection contract version assignment per consumer
6. Service-account projection posture per consumer

Required capabilities:
1. A consuming application can declare its IAM binding independently of IAM realm admin state
2. Bindings are versioned and auditable
3. Multiple applications can reuse the same realm with different projection behavior

Recommended implementation shape:
1. Add `iamApplicationBindings.ts`
2. Extend admin APIs and server routes for application binding CRUD
3. Ensure bindings are referenced by client id and application binding id, not inferred globally

Acceptance criteria:
- applications can be configured without app-local authorization rule hardcoding
- binding resolution is deterministic and auditable
- bindings support multiple consumer types without branching core IAM behavior by application name

### Phase A2 - Authorization Profile Engine

Goal:
Provide a reusable claim-to-application-authorization projection engine.

Deliverables:
1. Authorization profile definitions
2. Claim-match rules for roles, groups, scopes, and membership markers
3. Global role projection rules
4. Tenant membership role projection rules
5. Permission projection rules
6. Platform-admin and tenant-membership strategy rules
7. Conflict-resolution and precedence rules

Recommended implementation shape:
1. Add `iamAuthorizationProfiles.ts`
2. Support profile-scoped rules for:
   - platform administrator determination
   - managed membership role mapping
   - global permission projection
   - global role projection
   - service-account projection
3. Keep profiles consumer-scoped, not realm-global hacks

Acceptance criteria:
- multiple applications can project different auth contexts from the same IAM claims
- profile resolution is deterministic and explainable
- projected auth context is reproducible from the same identity inputs

### Phase A3 - Tenant-Aware Principal Context Plane

Goal:
Introduce first-class tenant context into identity resolution, session state, and projection contracts.

Deliverables:
1. Selected tenant or organization context in sessions and tokens
2. Cross-tenant membership resolution for a single subject
3. Tenant or subdomain alias registry
4. Selection-source semantics:
   - `requested`
   - `default`
   - `fallback`
5. Membership strategy support:
   - explicit membership only
   - platform-admin all-tenants
   - org-derived membership
   - external-identity membership mapping

Recommended implementation shape:
1. Add `iamTenantContextRuntime.ts`
2. Persist:
   - tenant alias records
   - subject tenant memberships
   - selected tenant context per session
   - membership strategy metadata where needed
3. Extend session and token projection

Acceptance criteria:
- a principal with multiple memberships can authenticate once and select active context
- active tenant context is projected consistently in tokens and APIs
- tenant selection behavior is deterministic and auditable

### Phase A4 - Application Capability, Permission, and Surface Plane

Goal:
Provide a reusable app-facing authorization model independent of IAM admin authorization.

Deliverables:
1. Arbitrary capability namespaces such as `cap.*`
2. Application permission catalogs
3. Global and tenant-scoped permission projection
4. Accessible surface catalogs and projection rules
5. Effective authorization evaluation in tenant context
6. Audit-friendly decision explanations

Program boundary:
- IDP computes identity-side authorization only
- external business rights remain outside IAM ownership

Recommended implementation shape:
1. Add `iamApplicationAuthorization.ts`
2. Model:
   - capability definitions
   - permission definitions
   - role-to-capability bindings
   - role-to-permission bindings
   - surface-to-permission bindings
   - optional subject or group grants
3. Add evaluation functions:
   - `getEffectiveCapabilities(subject, tenantContext, applicationBinding)`
   - `getEffectivePermissions(subject, tenantContext, applicationBinding)`
   - `getAccessibleSurfaces(subject, tenantContext, applicationBinding)`
   - `evaluateAuthorization(subject, tenantContext, request)`

Acceptance criteria:
- downstream applications can evaluate reusable identity-side auth context without app-local claim matching
- projected permissions and surfaces are auditable and reproducible
- catalogs and bindings are reusable across more than one consumer application

### Phase A5 - Principal Projection Contracts and Consumer APIs

Goal:
Expose application-scoped contracts for direct consumption and migration-safe compatibility.

Deliverables:
1. Versioned token claim templates per consumer
2. Versioned `/me` contracts per consumer
3. Authenticated bootstrap contracts per consumer
4. Tenant-context contracts per consumer
5. Service-account context contracts per consumer
6. App-facing authorization APIs

Proposed endpoints:
1. `GET /api/v1/iam/applications/:bindingId/me`
2. `GET /api/v1/iam/applications/:bindingId/principal-context`
3. `GET /api/v1/iam/applications/:bindingId/tenant-context`
4. `GET /api/v1/iam/applications/:bindingId/effective-roles`
5. `GET /api/v1/iam/applications/:bindingId/effective-permissions`
6. `GET /api/v1/iam/applications/:bindingId/effective-surfaces`
7. `POST /api/v1/iam/applications/:bindingId/evaluate-authorization`

Acceptance criteria:
- a consuming application can obtain its full identity-side auth context from IDP APIs alone
- projections are explicit, versioned, and application-scoped
- direct consumers and migration consumers use the same governed contract model

### Phase A6 - Service-Account Projection and External Policy Input Composition

Goal:
Support app-facing machine identities and composition with non-identity policy inputs without collapsing architectural boundaries.

Deliverables:
1. Service-account projection rules per authorization profile
2. Tenant-scoped service-account membership projection
3. Global service-account permission projection
4. External policy-input composition contract
5. Decision explanation including identity-side and external-policy-input factors

Program boundary:
- IAM may consume external policy inputs
- IAM shall not own the source of truth for those inputs

Recommended implementation shape:
1. Extend `iamAuthorizationProfiles.ts`
2. Add `iamApplicationPolicyInputs.ts`
3. Support optional input categories such as:
   - tenant features
   - deployment profiles
   - regulated-service eligibility flags
   - application-defined policy attributes

Acceptance criteria:
- service accounts can receive application-scoped projected authorization context without app-local custom code
- authorization decisions can include external policy inputs without making IAM their owner
- the ownership boundary remains explicit and auditable

### Phase A7 - Provisioning and Synchronization Strategy Framework

Goal:
Allow downstream applications to choose how much local shadow identity state they keep.

Deliverables:
1. Direct-projection mode
2. Lazy sync on login or token exchange mode
3. Background synchronization mode
4. Provisioning-adapter mode
5. Governance around shadow-record authority and conflict handling

Recommended implementation shape:
1. Add `iamProvisioningStrategies.ts`
2. Define strategy contracts for:
   - direct IDP-backed projection with no shadow state
   - local shadow user sync
   - local shadow membership sync
   - provisioning callback or queue integration

Acceptance criteria:
- downstream apps can integrate without inventing ad hoc sync logic
- sync authority and conflict behavior are explicit
- IDP can support both direct-consumption and shadow-record consumers cleanly

### Phase A8 - Consumer SDK, Conformance, and Validation Harness

Goal:
Reduce repeated integration work across many applications.

Deliverables:
1. Consumer SDK for auth context retrieval and authorization evaluation
2. Contract validators for projection envelopes
3. Conformance harness for tenant context, service-account context, and authorization decisions
4. Migration validation scripts for downstream cutovers

Acceptance criteria:
- a new application can adopt IDP contracts with minimal custom auth glue
- regressions in projection contracts are caught by reusable conformance tests
- migration consumers can validate cutover without one-off scripts for every application

### Phase A9 - Crew Compatibility and Cutover

Goal:
Use Crew as the first migration consumer of the generalized platform.

Deliverables:
1. Crew application binding
2. Crew authorization profile
3. Crew projection contracts
4. Crew migration validation path
5. Crew cutover plan

Recommended implementation shape:
1. Configure Crew using the generic application-binding and projection model
2. Add only Crew-specific mapping records that cannot yet be expressed in generic bindings or profiles
3. Keep any remaining Crew-only adapters thin and temporary

Acceptance criteria:
- Crew consumes the reusable platform rather than driving app-specific IAM code into the core
- Crew can authenticate and authorize from IDP-derived context for concern A
- Crew-specific glue is materially smaller than the current embedded implementation

## Workstreams

### WS-A1 Consumer Binding Plane
Covers:
- application bindings
- provider mode selection
- client and realm binding
- projection contract selection

### WS-A2 Authorization Profile Plane
Covers:
- claim-match rules
- role and permission projection
- membership strategies
- service-account projection rules

### WS-A3 Principal Context Plane
Covers:
- tenant memberships
- alias mapping
- active tenant selection
- selection-source semantics
- cross-tenant resolution

### WS-A4 Application Authorization Plane
Covers:
- capability registry
- permission registry
- surface projection
- effective evaluation
- authorization audit records

### WS-A5 Projection Contract Plane
Covers:
- token claim templates
- `/me` templates
- bootstrap templates
- tenant-context templates
- service-account context templates

### WS-A6 Policy Input and Provisioning Plane
Covers:
- external policy-input composition
- provisioning modes
- sync strategies
- shadow-record governance

### WS-A7 SDK and Conformance Plane
Covers:
- consumer SDKs
- validators
- conformance harnesses
- migration validation tooling

### WS-A8 Crew Migration Plane
Covers:
- Crew binding and profile
- Crew compatibility projection
- dual-run comparison
- phased Crew cutover

## Recommended Order

1. Phase A0
2. Phase A1
3. Phase A2
4. Phase A3
5. Phase A4
6. Phase A5
7. Phase A6
8. Phase A7
9. Phase A9

Reasoning:
- application bindings and authorization profiles define the reusable shape
- tenant context and permission projection are foundational
- projection contracts and APIs must stabilize before consumer migration
- external policy-input composition and provisioning modes belong in the platform before broad downstream adoption
- Crew should validate the generic platform after the generic layers exist

## Initial Sprint Backlog

### Sprint A1
1. Freeze consumer token, `/me`, bootstrap, and tenant-context contracts
2. Define generic application-binding and authorization-profile schemas
3. Define tenant membership strategy model
4. Define external policy-input boundary

### Sprint A2
1. Create application binding runtime
2. Create authorization profile runtime
3. Add binding and profile admin APIs
4. Add deterministic resolution tests

### Sprint A3
1. Add tenant alias and active-tenant session records
2. Add membership strategy resolution
3. Emit stable tenant context in tokens and APIs
4. Add tenant switching and selection-source validation

### Sprint A4
1. Create capability, permission, and surface registries
2. Add role-to-permission and role-to-surface bindings
3. Add effective evaluation and decision APIs
4. Add decision explanation and audit records

### Sprint A5
1. Create versioned principal projection contracts
2. Emit coarse role aliases and admin flags where configured
3. Add `/me`, bootstrap, tenant-context, and service-account contract endpoints
4. Validate projections against Crew and future-consumer expectations

### Sprint A6
1. Add service-account projection rules
2. Add external policy-input composition contract
3. Add decision-composition explanations
4. Validate boundary behavior when external inputs are absent or stale

### Sprint A7
1. Add provisioning and sync strategy framework
2. Implement direct-projection and lazy-sync modes first
3. Add background-sync and provisioning-adapter hooks
4. Define shadow-record conflict semantics

### Sprint A8
1. Publish consumer SDK primitives
2. Publish contract validators and conformance harnesses
3. Add migration validation scripts
4. Validate cross-application reuse with at least two consumers

### Sprint A9
1. Configure Crew against the generalized platform
2. Run Crew in compatibility mode against IDP
3. Compare embedded Crew authorization to IDP-derived authorization outputs
4. Plan final Crew-side cutover and implementation retirement

## Claim Gates

### Gate 1 - Binding and Profile Platform Ready
Pass when:
- application bindings are implemented
- authorization profiles are implemented
- projection contract versions are assignable per consumer

### Gate 2 - Principal and Authorization Projection Ready
Pass when:
- tenant-aware principal context is implemented
- effective capabilities, permissions, and surfaces can be resolved in tenant context
- service-account projection is implemented
- decisions are auditable and reproducible

### Gate 3 - Consumer Contract Ready
Pass when:
- token, `/me`, bootstrap, and tenant-context contracts are versioned and stable
- consumer APIs are implemented
- consumer SDK and contract validation are usable for at least one nontrivial consumer

### Gate 4 - External Composition and Provisioning Ready
Pass when:
- external policy-input composition is implemented without ownership confusion
- direct-projection and at least one sync mode are implemented
- boundary and conflict behavior are documented and tested

### Gate 5 - Crew Replacement Ready For Concern A
Pass when:
- Crew can authenticate through IDP
- Crew can resolve tenant context through IDP
- Crew can obtain effective roles, permissions, and surfaces from IDP
- Crew no longer requires its embedded A-side implementation for runtime correctness
- Crew-specific glue is reduced to application binding and migration compatibility only

## Explicit Non-Goals

This plan does not add:
1. subscription entitlement evaluation
2. purchase-derived rights ownership
3. commerce lifecycle orchestration
4. tenant feature truth ownership inside IDP
5. deployment profile truth ownership inside IDP
6. regulated-service eligibility truth ownership inside IDP

Those belong to external business or platform systems, or to later composition layers above the IDP.
