---
id: roadmap
type: implementation
domain: deployment
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, deployment]
last_updated: "2024-04-12"
related: []
---
# IDP Headless Identity and Access Standalone Implementation Roadmap

**Date:** March 17, 2026  
**Purpose:** Convert the `v2.6` Constitution and Requirements updates into a concrete, risk-averse execution roadmap for a reusable headless identity and access management subsystem that is a functional clone of Keycloak-class capabilities while preserving the IDP low-cost AWS-native architecture.

**Status Note:** This roadmap predates the governed maturity-state and support-matrix model. It remains useful as historical sequencing context, but it must not be read as the authoritative source for current capability status, supported profiles, or production-grade claims. Use these governed documents instead:

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

The goal is to build a stand-alone, production-ready identity and access management subsystem before any migration of IDP login, session, RBAC, team, tenant-administration, developer, CMS, or training authentication paths.

This roadmap assumes:

- the IAM subsystem is treated as a product subsystem in its own right,
- the subsystem must be independently testable and operable before IDP adopts it,
- the subsystem must be reusable by future mobile, partner, embedded, external, and standalone applications,
- Keycloak-class capability parity is the functional target,
- RBAC-native identity administration is mandatory,
- and the implementation must remain AWS-native, serverless-first, and economically viable under low utilization.

This is not a IDP identity migration plan. It is a subsystem implementation and validation plan.

---

## 2. Strategic Posture

The correct risk posture is:

1. build the IAM subsystem independently,
2. validate it as a complete product with its own admin, account, token, session, federation, and operations model,
3. prove production readiness with synthetic applications, realms, users, groups, and roles,
4. and only then migrate IDP-owned authentication and authorization surfaces in later programs.

The wrong posture would be:

- bolting realm, client, and RBAC primitives directly into the current IDP tenant/settings implementation,
- treating IDP login replacement as the validation strategy,
- allowing current app-specific user/team assumptions to distort the reusable baseline,
- or coupling the initial release to unrelated product-domain adoption before standalone IAM validation.

---

## 3. Initial Non-Goals

The following are explicitly out of scope for the initial IAM implementation phases:

- replacing current IDP login in the same phase as subsystem creation,
- migrating current IDP user tables, team records, or session ledgers into the new subsystem during the initial validation phases,
- coupling CMS administration to the new IAM subsystem before standalone IAM validation,
- building every advanced enterprise policy feature beyond Keycloak-class baseline parity,
- reproducing Keycloak's exact Java/Quarkus internals rather than matching functional behavior,
- introducing always-on relational or container-heavy infrastructure as the default runtime model,
- and making IDP tenants and IAM realms identical by default.

Those items belong to subsequent adoption phases after subsystem validation.

---

## 4. Product Definition

The IAM subsystem must be able to stand on its own as:

- an identity realm platform,
- an authentication and session platform,
- an RBAC and delegated administration platform,
- an application and client security platform,
- an identity federation and brokering platform,
- an account self-service platform,
- and a reusable access-governance plane.

At minimum, the subsystem must deliver Keycloak-class equivalents for:

- realms or equivalent security partitions,
- realm templates and realm cloning,
- users and user profiles,
- credentials and required actions,
- groups and subgroups,
- realm roles,
- client roles,
- composite roles,
- application clients,
- client scopes,
- protocol mappers,
- OAuth 2.0 and OpenID Connect,
- SAML 2.0,
- discovery, JWKS, introspection, revocation, and logout,
- authentication flows,
- MFA,
- sessions and consents,
- identity brokering,
- user federation,
- service accounts,
- admin console,
- account console,
- theme and localization support,
- admin and auth events,
- realm export and import,
- and standards-based integration for first-party and third-party applications.

---

## 5. Design Rules

1. The IAM subsystem must ship as a self-sufficient subsystem before any IDP authentication migration.
2. The subsystem must have its own admin UX, account UX, API contracts, audit model, and operational test suite.
3. The subsystem must expose standards-based identity contracts first; IDP-specific helper APIs are secondary.
4. RBAC must be the canonical reusable authorization model. Policy overlays may refine it, but not replace it.
5. The subsystem must not require an always-on SQL-first or Kubernetes-first stack by default.
6. Realm, user, group, role, client, scope, mapper, flow, session, consent, broker, federation, and event models must be first-class domain objects.
7. Signing keys, exported realm bundles, notification templates, and theme assets must be S3-backed where large-object economics justify it.
8. Metadata, credentials, session indexes, grants, role mappings, and admin-event indexes must remain DynamoDB-centered by default.
9. The subsystem must support IDP-global default realms and tenant-specific override realms through clone-and-bind semantics.
10. IDP tenants must be able to bind to a default realm, a shared realm template, or a dedicated cloned override realm.
11. Adoption by IDP login, CMS, training, developer portal, or partner surfaces must be gated by formal exit criteria.
12. The initial subsystem must be provable through standalone synthetic applications and synthetic realms rather than by replacing live IDP auth first.

---

## 6. Target Runtime Shape

After this roadmap, the IAM subsystem should have eight internal planes:

1. **Realm Plane**
   - realm registry
   - realm templates
   - realm cloning
   - realm bindings
   - realm localization and branding

2. **Identity Plane**
   - users
   - profiles
   - credentials
   - required actions
   - verification and recovery state

3. **Access Plane**
   - groups and subgroups
   - realm roles
   - client roles
   - composite roles
   - role mappings
   - delegated administration

4. **Client and Protocol Plane**
   - clients
   - client scopes
   - protocol mappers
   - service accounts
   - OAuth 2.0 / OIDC
   - SAML 2.0

5. **Authentication Plane**
   - login flows
   - required actions
   - MFA
   - session lifecycle
   - consent
   - logout and revocation

6. **Federation and Brokering Plane**
   - external IdPs
   - user federation
   - sync and provisioning
   - broker links
   - account linking

7. **Presentation Plane**
   - admin console
   - account console
   - login themes
   - email templates
   - locale-aware UX

8. **Operations Plane**
   - exports and imports
   - key management
   - health
   - telemetry
   - event history
   - backup and restore

---

## 7. New Service Modules

The following modules should be added under `apps/api-server/src/platform`.

### 7.1 Realm Foundation

- `iamFoundation.ts`
- `iamRealms.ts`
- `iamRealmTemplates.ts`
- `iamRealmBindings.ts`
- `iamRealmBranding.ts`

### 7.2 Identity Runtime

- `iamUsers.ts`
- `iamProfiles.ts`
- `iamCredentials.ts`
- `iamRequiredActions.ts`
- `iamRecovery.ts`
- `iamVerification.ts`

### 7.3 Access and RBAC Runtime

- `iamGroups.ts`
- `iamRoles.ts`
- `iamCompositeRoles.ts`
- `iamRoleMappings.ts`
- `iamDelegatedAdmin.ts`

### 7.4 Client and Protocol Runtime

- `iamClients.ts`
- `iamClientScopes.ts`
- `iamProtocolMappers.ts`
- `iamServiceAccounts.ts`
- `iamOidc.ts`
- `iamSaml.ts`

### 7.5 Authentication Runtime

- `iamAuthFlows.ts`
- `iamSessions.ts`
- `iamConsents.ts`
- `iamTokens.ts`
- `iamMfa.ts`
- `iamAccountActions.ts`

### 7.6 Federation and Brokering Runtime

- `iamIdentityProviders.ts`
- `iamUserFederation.ts`
- `iamBrokerLinks.ts`
- `iamProvisioning.ts`
- `iamSync.ts`

### 7.7 Presentation and Notification Runtime

- `iamThemes.ts`
- `iamLocalization.ts`
- `iamEmailTemplates.ts`
- `iamNotifications.ts`
- `iamAccountConsole.ts`
- `iamAdminConsole.ts`

### 7.8 Operations Runtime

- `iamExports.ts`
- `iamImports.ts`
- `iamKeys.ts`
- `iamHealth.ts`
- `iamTelemetry.ts`
- `iamAudit.ts`

---

## 8. API Contract Families

The following contract files should be added under `contracts/api`.

### 8.1 Realm and Binding Contracts

- `iam-realms-api.json`
- `iam-realm-templates-api.json`
- `iam-realm-bindings-api.json`
- `iam-realm-branding-api.json`

### 8.2 User and Profile Contracts

- `iam-users-api.json`
- `iam-user-profiles-api.json`
- `iam-credentials-api.json`
- `iam-required-actions-api.json`

### 8.3 Access and RBAC Contracts

- `iam-groups-api.json`
- `iam-roles-api.json`
- `iam-role-mappings-api.json`
- `iam-delegated-admin-api.json`

### 8.4 Client and Protocol Contracts

- `iam-clients-api.json`
- `iam-client-scopes-api.json`
- `iam-protocol-mappers-api.json`
- `iam-oidc-api.json`
- `iam-saml-api.json`

### 8.5 Authentication and Session Contracts

- `iam-authentication-api.json`
- `iam-sessions-api.json`
- `iam-consents-api.json`
- `iam-token-api.json`
- `iam-account-api.json`

### 8.6 Federation and Provisioning Contracts

- `iam-identity-providers-api.json`
- `iam-user-federation-api.json`
- `iam-provisioning-api.json`
- `iam-sync-api.json`

### 8.7 Operations Contracts

- `iam-export-import-api.json`
- `iam-events-api.json`
- `iam-health-api.json`

---

## 9. Standalone UI Surfaces

The following standalone surfaces should be added under `apps/enterprise-ui/src/pages` or equivalent reusable UI modules.

### 9.1 Admin Surfaces

- `/iam`
  - subsystem overview
  - realm summary
  - validation status
  - migration gate status

- `/iam/realms`
  - realm registry
  - realm template browser
  - create, clone, export, import
  - realm-to-application and realm-to-tenant binding views

- `/iam/users`
  - user search
  - user detail
  - required actions
  - credential state
  - group and role membership

- `/iam/groups`
  - hierarchical group tree
  - group-role mapping
  - delegated admin assignments

- `/iam/roles`
  - realm roles
  - client roles
  - composite roles
  - role-audience and admin-boundary semantics

- `/iam/clients`
  - public/confidential clients
  - redirect URIs
  - scopes
  - protocol mappers
  - service accounts

- `/iam/flows`
  - authentication flows
  - required actions
  - MFA policies
  - recovery and verification policies

- `/iam/federation`
  - brokers
  - external IdPs
  - user federation providers
  - sync state

- `/iam/themes`
  - login themes
  - account themes
  - email templates
  - locale settings

- `/iam/events`
  - authentication events
  - admin events
  - realm export/import jobs

### 9.2 End-User Surfaces

- `/account`
  - profile
  - password
  - MFA
  - sessions
  - linked identities
  - consents

- `/login`
  - standards-based login flow
  - branded realm selection or routing

- `/logout`
  - logout confirmation and global session handling

These must remain subsystem-native and not depend on existing IDP settings flows.

---

## 10. Standalone Validation Domains

Before IDP integration, the IAM subsystem should be validated with synthetic realms and applications such as:

- `idp-default-web`
- `idp-mobile-demo`
- `training-portal-demo`
- `developer-portal-demo`
- `cms-admin-demo`
- `partner-embedded-demo`
- `oidc-test-client`
- `saml-test-sp`
- `machine-api-demo`

These validation domains should prove:

- realm isolation,
- client isolation,
- RBAC behavior,
- delegated administration,
- token issuance and verification,
- account recovery,
- MFA flows,
- federation and brokering,
- client scopes and claims,
- and account/admin console correctness.

---

## 11. Phased Delivery Plan

### Phase 0. Capability Surface and Standalone Shell

Goal:
- establish the IAM subsystem as a visible, isolated platform capability

Deliver:
- `/iam` capability surface
- synthetic subsystem summary
- standalone admin shell
- global IAM super administrator concept
- initial contracts for realms, bindings, and subsystem summary

Exit criteria:
- the subsystem is visible and independently navigable
- no IDP tenant feature depends on it yet
- docs coverage exists for all Phase 0 endpoints

### Phase 1. Realm and RBAC Foundation

Goal:
- implement the reusable authority model

Deliver:
- realms
- realm templates
- clone-and-bind realm overrides
- users
- groups
- roles
- composite roles
- client roles
- delegated admin model
- realm export/import basics

Exit criteria:
- synthetic realms can be created and cloned
- users, groups, and roles can be managed independently of IDP tenants
- RBAC inheritance works end to end
- admin audit exists for all foundation mutations

### Phase 2. Client, Protocol, and Token Runtime

Goal:
- implement standards-based application and machine access

Deliver:
- OIDC endpoints
- OAuth 2.0 grant handling
- SAML service-provider support
- clients
- client scopes
- protocol mappers
- service accounts
- discovery
- JWKS
- introspection
- revocation

Exit criteria:
- synthetic OIDC and SAML applications can authenticate successfully
- tokens validate through standards endpoints
- service accounts and client credentials work
- claims and scopes are mapper-driven rather than hardcoded

### Phase 3. Authentication Flow, MFA, and Session Runtime

Goal:
- implement interactive authentication correctness

Deliver:
- browser login flow
- password reset
- email verification
- required actions
- MFA
- session list and revocation
- consent tracking
- logout and SSO session handling
- account console baseline

Exit criteria:
- interactive login/logout works across multiple clients
- MFA and recovery are end-to-end functional
- account console is usable without IDP-specific dependencies
- security-sensitive actions are fully audited

### Phase 4. Federation and Brokering

Goal:
- make the subsystem production-useful beyond local identity

Deliver:
- external OIDC IdP brokering
- external SAML IdP brokering
- user federation adapters
- import and sync policies
- account linking
- broker-first login flows

Exit criteria:
- external IdP login succeeds into synthetic apps
- user federation sync works
- broker and federation events are visible
- linked account behavior is deterministic and auditable

### Phase 5. Admin Console, Account Console, Theme, and Notification Completion

Goal:
- make the subsystem operator-grade and customer-ready

Deliver:
- production-grade admin console
- production-grade account console
- theming
- localization
- email templates
- notification delivery
- branding and realm UX

Exit criteria:
- a non-developer admin can manage realms, users, roles, groups, clients, and flows
- a normal user can manage profile, password, MFA, sessions, and linked identities
- theming and localization are reusable across realms

### Phase 6. Operations, Hardening, and Production Readiness

Goal:
- certify the subsystem as production-ready on its own terms

Deliver:
- health and diagnostics
- key rotation
- export/import hardening
- backup and restore
- performance and scale validation
- resilience tests
- threat-model and procurement evidence
- standalone runbooks

Exit criteria:
- formal standalone readiness review passes
- subsystem SLOs are defined and met
- procurement/security posture is documented
- no open critical auth, token, session, or federation defects remain

### Phase 7. Adoption Planning Only

Goal:
- prepare downstream consumers without yet forcing migration

Deliver:
- IDP adoption map
- CMS adoption map
- training adoption map
- developer portal adoption map
- staged migration plan by client and surface

Exit criteria:
- migration sequence is documented
- zero-risk-first adoption order is approved
- subsystem remains independently operable even if no consumer migrates immediately

---

## 12. Data Model Foundation

The initial canonical entities should include:

- `IdentityRealm`
- `RealmTemplate`
- `RealmBinding`
- `UserIdentity`
- `UserProfile`
- `UserCredential`
- `Group`
- `GroupMembership`
- `RealmRole`
- `ClientRole`
- `CompositeRole`
- `RoleMapping`
- `DelegatedAdminAssignment`
- `ClientApplication`
- `ClientScope`
- `ProtocolMapper`
- `ServiceAccount`
- `AuthenticationFlow`
- `RequiredAction`
- `IdentitySession`
- `ConsentGrant`
- `IdentityProvider`
- `FederationProvider`
- `BrokerLink`
- `RealmTheme`
- `IdentityEvent`
- `IdentityAdminEvent`
- `RealmExportJob`
- `RealmImportJob`

These entities must exist independently of IDP operational entities such as `Tenant`, `Mission`, `Aircraft`, or `Project`.

---

## 13. Access Model

The subsystem must define three administration scopes:

1. **Platform IAM Super Administrator**
   - global control over all realms, templates, exports, federation providers, and operations

2. **Realm Administrator**
   - control over one realm and its users, groups, roles, clients, flows, and themes

3. **Delegated Administrator**
   - constrained control over configured user, group, role, or application slices inside one realm

RBAC must be the baseline enforcement model for all three scopes.

IDP-specific tenant admins are not automatically IAM super administrators. Any relationship must be explicit through bindings and delegated assignments.

---

## 14. AWS-Native Runtime Posture

The target AWS shape should be:

- API Gateway for standards and admin APIs
- Lambda for protocol handlers, auth flows, token work, federation, and admin mutations
- DynamoDB for identity state and query-oriented indexes
- S3 for exports, themes, templates, and event archives
- KMS for signing and encryption keys
- Step Functions for recovery, sync, import/export, clone, and multi-step identity workflows
- EventBridge for event routing
- CloudFront for static admin/account surfaces and standards metadata distribution
- SES/SNS for verification and notification delivery

The subsystem should avoid:

- always-on cluster-first auth servers,
- relational-first state unless a specific subsystem proves unavoidable,
- and hard dependency on long-running in-memory session nodes.

---

## 15. Validation Gates

The subsystem must not be considered production-ready until all of the following are true:

- all Phase 0 through Phase 6 exit criteria pass,
- admin and account surfaces are usable without IDP dependencies,
- OIDC, OAuth 2.0, and SAML paths are validated against synthetic apps,
- RBAC inheritance and delegated admin are proven in multi-realm tests,
- export/import and clone-and-bind realm overrides are proven,
- MFA, recovery, revocation, and logout are fully functional,
- auth and admin audit coverage is complete,
- OpenAPI coverage is complete for admin and account APIs,
- performance and resilience tests are documented,
- and threat-model, procurement, and operational runbooks are complete.

Only after those gates pass should IDP migration planning begin.

---

## 16. Immediate Next Build Order

The correct first execution slice is:

1. create the isolated IAM capability surface and standalone admin shell,
2. implement realms, realm templates, clone-and-bind realm bindings, and global IAM super administration,
3. implement RBAC foundation with users, groups, realm roles, client roles, and composite roles,
4. publish the first IAM contract set,
5. and prove those capabilities with synthetic realms and synthetic clients before building token/runtime layers.

That preserves the same discipline used for the CMS subsystem:

- standalone first,
- migration later,
- and no dependency on existing IDP auth correctness as the proof strategy.

---

## 17. Sources and Functional Baseline

This roadmap is based on the constitutional and requirements updates in `v2.6`, plus the public Keycloak functional surface, including:

- realms
- users
- groups
- roles
- clients
- client scopes
- protocol mappers
- authentication flows
- required actions
- identity brokering
- user federation
- admin console
- account console
- OIDC/OAuth/SAML support

The target is functional parity in product behavior, not implementation parity in runtime internals.
