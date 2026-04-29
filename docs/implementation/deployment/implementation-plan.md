---
id: implementation-plan
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# IDP Headless IAM Full IDP Implementation Plan

**Date:** March 19, 2026  
**Purpose:** Define the implementation plan for evolving the current standalone IAM proving runtime into a full standalone identity-provider product that can credibly compete with, and strategically exceed, Keycloak-class systems while preserving the IDP AWS-native, serverless-first architecture.

**Status Note:** This document is a roadmap input, not the governing source for current capability state or support claims. Statements here describe intended direction and historical planning posture. Current release/support truth is defined by:

- [Capability Maturity Standard](../../reference/maturity-model.md)
- [Headless IAM Status Matrix](../../reference/headless-iam-status-matrix.md)
- [Protocol Support Matrix](../../reference/protocol-support-matrix.md)
- [Federation Support Matrix](../../reference/federation-support-matrix.md)
- [WebAuthn Support Matrix](../../reference/webauthn-support-matrix.md)
- [SAML Profile Matrix](../../reference/saml-profile-matrix.md)
- [Deployment Modes](../../specs/operations/deployment-modes.md)
- [Headless IAM Gap Remediation Plan](./gap-remediation.md)

---

## 1. Objective

The objective is no longer only to prove that IDP can externalize identity. The objective is to build a **full standalone IAM and IdP product** that:

- operates independently of IDP,
- delivers Keycloak-class capability breadth,
- reaches standards-complete browser and machine identity behavior,
- supports enterprise, partner, embedded, and B2B identity patterns,
- remains RBAC-native,
- remains AWS-native and cost-efficient under low-to-moderate utilization,
- and can later be adopted by IDP and other systems through standards-based contracts.

This plan supersedes the narrower interpretation of the earlier standalone IAM roadmap as only a proving-runtime program. The earlier roadmap remains the baseline for what has already been built; this plan defines the work required to reach the `v2.8` full-IDP bar.

---

## 2. Current Baseline

The subsystem already provides:

- standalone realms, templates, bindings, users, groups, roles, composite roles, and delegated administration,
- clients, scopes, mappers, service accounts, discovery, JWKS, token issuance, introspection, revocation, and userinfo,
- browser login, required actions, consent, MFA, recovery, sessions, and account self-service,
- federation, brokering, sync jobs, linked identities, and experience customization,
- request-level IAM security audit, user-security operations, backup and restore rehearsal, key rotation, resilience validation, and readiness review.

That baseline is sufficient for:

- standalone validation,
- proof of architecture,
- proving future IDP adoption,
- and early subsystem administration.

It is not sufficient for a full Keycloak-competitive IDP.

---

## 3. Strategic Constraints

This implementation plan preserves the following constraints:

1. The IAM subsystem remains standalone until explicit adoption approval.
2. IDP login, session, user, team, and tenant identity flows are **not** migrated during the initial execution of this plan.
3. The IAM subsystem must become more product-neutral over time, not more IDP-shaped.
4. Standards-based protocols must remain primary. IDP convenience APIs are secondary.
5. The implementation must remain economically viable in AWS without defaulting to always-on container or relational-heavy infrastructure.

---

## 4. Success Criteria

The subsystem may be described as a **full standalone IDP** only when all of the following are true:

- OIDC browser authorization-code and PKCE flows are complete.
- OIDC advanced capabilities required by the product posture are present, including dynamic client registration and modern client-policy controls.
- SAML covers real SP-initiated and logout lifecycles, not only metadata and synthetic login.
- Authentication is flow-driven and authenticator-composable rather than hardcoded.
- WebAuthn and passkeys are implemented.
- Fine-grained admin authorization exists beyond coarse delegated admin.
- Authorization services and UMA-style policy-driven resource authorization exist.
- Organizations and richer profile-schema behavior exist.
- The subsystem has a formal extension model.
- The subsystem can be deployed and operated as a product independently of IDP.
- Standalone validation, performance, resilience, and security review are all complete.

The subsystem may be described as **strategically better than Keycloak** only when the above is true **and** it demonstrates differentiators such as:

- lower-cost AWS-native deployment and operation,
- stronger OpenAPI-described administrative contracts,
- stronger built-in resilience/readiness evidence,
- better subsystem adoption governance,
- and a cleaner serverless operational model for low-to-medium scale customers.

---

## 5. Major Gap Domains

The work falls into nine major gap domains:

1. OIDC and OAuth 2.x standards completion
2. SAML standards completion
3. Authentication flow engine and authenticator model
4. Modern authentication and profile/organization model
5. Fine-grained administrative authorization
6. Authorization services and UMA
7. Extensibility and provider architecture
8. Product-neutral re-foundation and standalone packaging
9. Standalone production hardening and market-readiness validation

---

## 6. New or Expanded Service Modules

The following modules should be added or split from the current IAM runtime modules under `apps/api-server/src/platform`.

### 6.1 OIDC / OAuth Runtime

- `iamAuthorizationRuntime.ts`
- `iamPkce.ts`
- `iamDeviceAuthorization.ts`
- `iamBackchannelAuth.ts`
- `iamTokenExchange.ts`
- `iamClientRegistration.ts`
- `iamClientPolicies.ts`
- `iamClientProfiles.ts`

### 6.2 SAML Runtime

- `iamSamlRuntime.ts`
- `iamSamlSessions.ts`
- `iamSamlBindings.ts`
- `iamSamlLogout.ts`

### 6.3 Authentication Flow Engine

- `iamAuthFlows.ts`
- `iamAuthenticators.ts`
- `iamAuthExecutions.ts`
- `iamConditionalAuth.ts`
- `iamBrowserSessions.ts`

### 6.4 Modern Authentication and User Model

- `iamWebAuthn.ts`
- `iamPasskeys.ts`
- `iamUserProfiles.ts`
- `iamProfileSchemas.ts`
- `iamOrganizations.ts`
- `iamOrganizationInvitations.ts`

### 6.5 Fine-Grained Admin Authorization

- `iamAdminAuthorization.ts`
- `iamAdminPermissions.ts`
- `iamImpersonation.ts`
- `iamRestrictedAdminScopes.ts`

### 6.6 Authorization Services

- `iamAuthorizationServices.ts`
- `iamProtectedResources.ts`
- `iamAuthorizationPolicies.ts`
- `iamAuthorizationPermissions.ts`
- `iamUmaRuntime.ts`

### 6.7 Extensibility

- `iamExtensionRegistry.ts`
- `iamProviderRuntime.ts`
- `iamAuthenticatorProviders.ts`
- `iamStorageProviders.ts`
- `iamPolicyProviders.ts`
- `iamEventListeners.ts`

### 6.8 Standalone Productization and Operations

- `iamDeploymentRuntime.ts`
- `iamHealthRuntime.ts`
- `iamBenchmarkRuntime.ts`
- `iamRecoveryRuntime.ts`
- `iamStandaloneBootstrap.ts`

---

## 7. New API Contract Families

New OpenAPI contracts should be added under `contracts/api`.

### 7.1 OIDC / OAuth Contracts

- `iam-authorization-api.json`
- `iam-pkce-api.json`
- `iam-device-authorization-api.json`
- `iam-ciba-api.json`
- `iam-token-exchange-api.json`
- `iam-dynamic-client-registration-api.json`
- `iam-client-policies-api.json`

### 7.2 SAML Contracts

- `iam-saml-runtime-api.json`
- `iam-saml-logout-api.json`

### 7.3 Flow Engine Contracts

- `iam-auth-flows-api.json`
- `iam-authenticators-api.json`
- `iam-auth-executions-api.json`

### 7.4 Profile / Organization Contracts

- `iam-user-profile-schemas-api.json`
- `iam-organizations-api.json`
- `iam-organization-invitations-api.json`
- `iam-webauthn-api.json`

### 7.5 Admin Authorization Contracts

- `iam-admin-permissions-api.json`
- `iam-impersonation-api.json`

### 7.6 Authorization Services Contracts

- `iam-resource-servers-api.json`
- `iam-protected-resources-api.json`
- `iam-authz-policies-api.json`
- `iam-authz-permissions-api.json`
- `iam-uma-api.json`

### 7.7 Extensibility and Operations Contracts

- `iam-extension-registry-api.json`
- `iam-provider-runtime-api.json`
- `iam-standalone-health-api.json`
- `iam-benchmarks-api.json`

---

## 8. UI Surface Expansion

The `/iam` workspace must evolve from a subsystem administration surface into a full operator console for a standalone product.

### 8.1 New Admin Areas

- `Flows`
  - auth-flow graph
  - authenticator catalog
  - realm/client flow assignment
  - required-action policy

- `Clients`
  - client registration policies
  - client profiles
  - advanced grant settings
  - token-exchange posture
  - device/CIBA enablement

- `Organizations`
  - organization registry
  - invitations
  - member lifecycle
  - organization-linked IdPs

- `Authz Services`
  - resource servers
  - resources
  - scopes
  - policies
  - permissions
  - permission evaluation

- `Extensions`
  - installed providers
  - authenticator providers
  - event listeners
  - policy providers

- `Operations`
  - health
  - backups
  - restore
  - keys
  - resilience
  - readiness review
  - benchmarks

### 8.2 New End-User Areas

- standards-based login UI supporting:
  - authorization-code redirect flows
  - PKCE-aware public clients
  - passkey and passwordless paths
  - SAML realm choice where relevant

- richer account console supporting:
  - profile attributes
  - organizations
  - linked identities
  - devices and passkeys
  - active sessions
  - consent
  - security posture

---

## 9. Phased Delivery Plan

## Phase A. Protocol Completion Foundation

**Goal**
- move the subsystem from proving-token runtime to real standards-based IdP runtime

**Deliver**
- OIDC authorization endpoint
- authorization-code flow
- PKCE support
- redirect and state validation
- standards-based browser session handoff
- RP-initiated logout baseline
- formal route and contract coverage

**Exit criteria**
- public and confidential OIDC clients can complete authorization-code flow
- PKCE works for public clients
- browser login is no longer centered on password grant semantics
- `/iam` route blockers no longer mention missing auth-code or PKCE

## Phase B. Advanced OAuth and Client Governance

**Goal**
- complete the key missing OAuth 2.x and client-governance capabilities

**Deliver**
- dynamic client registration
- client policies
- client profiles
- device authorization grant
- token exchange
- PAR
- CIBA where enabled for supported profiles
- stronger logout/session semantics

**Exit criteria**
- third-party clients can register dynamically under policy
- device and machine clients can use supported advanced flows
- client governance is policy-driven rather than only admin-form-driven

## Phase C. Full SAML IdP Runtime

**Goal**
- convert SAML from a proving path into a real supported protocol lane

**Deliver**
- SP-initiated login
- session lifecycle
- logout flow
- richer assertion configuration
- binding management
- mapper coverage improvement

**Exit criteria**
- supported SAML clients can complete login and logout without synthetic-only shortcuts
- `/iam` route blockers no longer mention incomplete SAML lifecycle

## Phase D. Authentication Flow Engine

**Goal**
- remove hardcoded browser-login orchestration and replace it with a true flow engine

**Deliver**
- flow registry
- subflows
- execution graph
- authenticator executions
- conditional execution
- per-client/per-realm flow assignment
- required-action orchestration through flows

**Exit criteria**
- login behavior is configuration-driven
- new auth patterns do not require route-specific hardcoding
- admin UX can inspect and edit flow structure

## Phase E. WebAuthn, Passkeys, and Modern Authentication

**Goal**
- reach modern phishing-resistant login parity

**Deliver**
- WebAuthn registration
- passkey login
- passwordless-capable flow paths
- fallback and recovery
- device inventory in account console

**Exit criteria**
- users can enroll and use passkeys
- passkeys can participate in configurable login flows
- the subsystem is no longer TOTP-only for strong auth

## Phase F. Organizations and User Profile Schema

**Goal**
- complete B2B and richer identity data modeling

**Deliver**
- user profile schemas
- attribute validation and edit/view rules
- organizations
- invitations
- membership lifecycle
- organization-linked identity-provider semantics

**Exit criteria**
- realms can support B2B organization models without tenant-binding hacks
- profile behavior is schema-driven rather than fixed-field only

## Phase G. Fine-Grained Administrative Authorization

**Goal**
- move beyond coarse delegated admin into product-grade admin governance

**Deliver**
- admin permission objects
- scoped admin policies
- restricted admin roles
- impersonation controls
- admin evaluation audit

**Exit criteria**
- admin rights can be scoped by managed realm/client/resource domain
- restricted admin use cases do not require full realm-admin rights

## Phase H. Authorization Services and UMA

**Goal**
- add policy-driven resource authorization so the subsystem can compete as a full IAM platform

**Deliver**
- resource servers
- protected resources
- protected scopes
- policies
- permissions
- policy evaluation
- UMA / permission-ticket runtime

**Exit criteria**
- the subsystem can serve downstream resource authorization use cases, not only identity and token issuance

## Phase I. Extensibility and Provider Framework

**Goal**
- make the subsystem product-extensible instead of code-fork-extensible

**Deliver**
- extension registry
- authenticator-provider interface
- federation-provider interface
- storage-provider interface
- policy-provider interface
- event-listener interface
- theme packaging model

**Exit criteria**
- new auth/policy/federation/storage behaviors can be added through bounded provider contracts

## Phase J. Product-Neutral Re-Foundation

**Goal**
- remove remaining IDP-specific assumptions from the core

**Deliver**
- standalone admin bootstrap independent of IDP user store
- neutral realm and binding taxonomy
- standalone application registry semantics not centered on IDP clients
- packaging and runtime assumptions suitable for external product use

**Exit criteria**
- the subsystem can be described and operated without treating IDP as its host identity authority
- IDP becomes only one downstream consumer

## Phase K. AWS-Native Standalone Productionization

**Goal**
- convert the current proving runtime into a deployable product runtime

**Deliver**
- DynamoDB and S3 production state model
- KMS-backed key and secret model
- Step Functions orchestration where needed
- health and diagnostics endpoints
- backup/restore hardening
- benchmark suite
- production runbooks
- failure-domain and capacity testing

**Exit criteria**
- the subsystem can be deployed independently in AWS as a real product environment
- local JSON proving state is no longer the defining runtime

## Phase L. Standalone Readiness and Market-Position Review

**Goal**
- decide whether the subsystem can honestly be described as a full standalone IDP and Keycloak competitor

**Deliver**
- standards validation matrix
- protocol interoperability validation
- performance benchmark evidence
- security and operations review
- differentiation review
- adoption recommendation

**Exit criteria**
- formal review can state whether the subsystem is:
  - standalone validation complete
  - standalone production ready
  - Keycloak-competitive
  - strategically differentiated

## Phase M. Adoption Planning Only

**Goal**
- plan downstream adoption only after the subsystem is independently accepted

**Deliver**
- IDP migration strategy
- CMS adoption strategy
- training adoption strategy
- developer/partner adoption strategy
- agentic-development operating model for ongoing safe use of the subsystem

**Exit criteria**
- downstream adoption is separately approved
- no adoption is used as substitute proof for subsystem quality

---

## 10. Validation Program

Each major phase must add or expand standalone validation domains.

Required validation families:

- OIDC browser redirect validation
- PKCE public-client validation
- confidential client validation
- service-account validation
- dynamic client registration validation
- SAML SP validation
- brokered login validation
- federation import validation
- organization invitation validation
- passkey validation
- auth-flow branching validation
- authorization-services evaluation validation
- admin authorization validation
- backup/restore validation
- performance and resilience validation

The validation program must remain standalone and must not depend on migrating IDP as proof.

---

## 11. Recommended Immediate Build Order

The next correct build order is:

1. **Phase A**
   - OIDC authorization endpoint
   - authorization-code flow
   - PKCE
   - redirect-based login handoff

2. **Phase C**
   - SAML SP-initiated login and logout completion

3. **Phase D**
   - auth-flow registry and execution engine

4. **Phase E**
   - WebAuthn and passkeys

5. **Phase G**
   - fine-grained admin authorization

6. **Phase H**
   - authorization services and UMA

7. **Phase F**
   - organizations and profile schema

8. **Phase I through K**
   - extensibility, de-IDP productization, and production runtime hardening

This order is intentional:

- standards-complete browser and SAML runtime closes the most visible protocol gaps first,
- auth flows and passkeys prevent the protocol runtime from hardening around brittle assumptions,
- admin authz and authz services are the biggest product-competitiveness gaps,
- organizations and profile schema complete the B2B identity shape,
- and only then does it make sense to finish full product-neutral packaging and standalone product hardening.

---

## 12. Final Direction

This plan should be treated as the **authoritative IAM full-product roadmap** under Constitution `v2.8` and Requirements `v2.8`.

The earlier standalone IAM roadmap remains valuable as the record of how the subsystem became a credible proving runtime. This plan defines what remains before the subsystem can honestly be called:

- a full standalone IDP,
- a serious Keycloak competitor,
- or a strategically better identity product in its target market.
