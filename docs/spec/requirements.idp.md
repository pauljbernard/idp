# Requirements

Source: `requirements.md`

## 1. Overview

The platform shall provide an economically viable, serverless-first, AWS-native foundation for standalone identity and access operations, including authentication workflows, authorization workflows, multi-tenant identity administration, live security and session monitoring, reusable solution-pack composition, and standards-based identity integration with first-party and partner applications.

The system must support eighteen product modes:

1. Direct-to-Consumer Identity Access
2. Business-to-Business Identity Access
3. Enterprise Workforce Identity
4. Public-Sector Identity Access
5. Partner and Embedded Identity Access
6. Customer Self-Service Account Operations
7. Administrative Console Operations
8. Authentication Runtime Operations
9. Authorization and Policy Operations
10. Identity Federation and Brokering Operations
11. Tenant and Realm Administration
12. Organization, Team, and Delegation Operations
13. Client and Application Registration Operations
14. Security Event and Audit Operations
15. Recovery, Verification, and Required-Action Operations
16. Identity Extension and Provider Operations
17. Identity Analytics and Reporting Operations
18. Identity Communications and Notification Operations

The platform must be architected such that:

- low utilization produces low infrastructure cost,
- demand growth scales primarily through pay-as-you-go services,
- regulated program requirements can be met without fundamental redesign,
- regulated identity operations can be embedded without bespoke forks,
- segment-specific solution packs can be composed without bespoke forks,
- operational policy and readiness workflows can be tied to operational permissions and lifecycle controls,
- identity-related policies, content, and operational posture can be governed through identity configuration surfaces rather than app-embedded identity stacks,
- identification, authentication, authorization, user profile, and group or team management can be provided by a dedicated identity subsystem that remains independent from application business-domain models,
- downstream applications can consume tenant-aware principal context, effective identity-side authorization context, and compatibility projections from the identity subsystem without forcing the identity subsystem to become the source of purchase or subscription entitlement truth,
- and first-party, partner, and command-style surfaces share common identity platform contracts wherever feasible.

The platform shall preserve the ability to operate in one or more of the following regulatory and commercial participation models:

- direct regulated-integration mode,
- partner-mediated integration mode,
- identity-only mode where external authorization is not yet active,
- single-tenant or multi-tenant operational mode,
- and embedded or partner-platform mode.

Direct regulated-integration eligibility remains the target architectural posture. Partner-mediated operation may be used tactically, but shall not create a dead-end architecture.

---

## 2.18 Headless Identity and Access Platform

The platform shall provide a reusable identity and access management subsystem that can operate as a full standalone identity-provider product and that can power IDP, partner, and future applications from shared governed identity primitives.

The target is at least mainstream Keycloak-class parity for a standalone IdP across explicitly declared supported profiles, with strategic differentiation through lower-cost AWS-native operation, stronger OpenAPI-described administration and delivery contracts, stronger subsystem adoption governance, stronger communications-composition boundaries, and stronger built-in resilience and readiness-review evidence.

All standalone IAM requirements in this section shall be interpreted using the capability-maturity and claim-boundary rules in `docs/spec/capability-maturity-standard.idp.md`.

### Requirement Tiers

This section separates:

- `Core release` requirements needed for a credible standalone IAM product release,
- `Parity track` requirements needed before broad Keycloak-class parity claims are justified,
- `Differentiator track` requirements that may exceed mainstream IAM products once productionized,
- and `Profile-specific` requirements that apply only when the relevant operating mode is enabled.

Unless a requirement is explicitly marked otherwise, broad product claims shall be limited to the supported profiles that have been declared and validated.

### Core Release Requirements

The system shall support, at minimum, the following `Core release` capabilities:

- identity realms or equivalent security partitions as first-class isolation units independent of product-tenant records,
- default realm templates, realm cloning, and realm-to-application or realm-to-tenant binding semantics,
- user identities, service accounts, profiles, profile-schema management, credentials, required actions, recovery state, and account lifecycle handling,
- groups, subgroups, teams, organizations, and membership hierarchy management,
- RBAC-native management with realm roles, client roles, composite roles, group-role inheritance, service-account roles, and delegated administration roles,
- applications or clients with redirect URIs, post-logout URIs, web-origin policies, public and confidential client handling, machine-to-machine service accounts, and explicit declaration of whether dynamic client registration is supported for the current release scope,
- client scopes, claim or protocol mapping, consent policies, token-exchange rules, and application-specific scope composition,
- OAuth 2.0, OpenID Connect, and SAML 2.0 support for the explicitly supported interactive and machine-access profiles,
- authorization, authorization-code, PKCE, client-credentials, refresh-token, token-exchange, introspection, revocation, logout, discovery, and JWKS endpoints for the supported profiles,
- configurable browser, broker, registration, password-reset, account-recovery, step-up authentication, and authenticator-composition flows, including self-service, invite-only, approval-required, and disabled registration modes where configured,
- MFA requirements, password policies, WebAuthn, passkeys, TOTP or equivalent second factor support, email verification, and required actions for the supported browser and authenticator profiles,
- user self-service account management for profile, password, MFA, sessions, devices, and linked-identity administration,
- tenant- or realm-scoped login and registration experience selection, including branded login screens, localized copy, legal text, and governed identity-provider option presentation by tenant, realm, alias, or subdomain binding where configured,
- registration schema and registration-policy controls including required fields, validation rules, email-verification posture, invitation enforcement, approval workflows, anti-abuse controls, and post-registration required actions,
- administration APIs and administration surfaces for global and delegated administrators,
- identity brokering to external identity providers for the explicitly supported provider families,
- federation onboarding for supported OIDC and SAML identity providers, including metadata import or export, trust-store management, certificate rollover, attribute and assertion mapping, and just-in-time or sync-based identity linking where those profiles are supported,
- SP-initiated and IdP-initiated SAML interaction patterns, SAML logout, assertion lifecycle handling, and federated logout behavior for the explicitly supported SAML service-provider profiles,
- cross-organization identity binding with portable external identifiers, organization metadata, relationship records, brokered identity-link portability, and governed tenant-bound projection rules where configured,
- tenant-aware principal context including active tenant or organization selection in sessions and tokens, cross-tenant membership resolution, tenant or subdomain alias mapping, and stable downstream claim projection,
- import, export, promotion, and environment portability for realms, clients, roles, flows, themes, and bindings,
- event and admin-audit streams for login, logout, failure, token, consent, federation, user, group, role, client, and realm-administration activity,
- theming, branding, localization, identity-message template bindings through canonical communications contracts, reusable login or account UX assets, and tenant- or realm-specific login and registration UX assets,
- support for IDP-global identity administration with optional tenant-bound override realms,
- support for tenant-specific override identity posture through clone-and-bind semantics rather than bespoke per-application auth stacks,
- support for standard bearer-token access, federated interactive sign-in, and reusable account sessions across multiple applications,
- downstream service integration through standardized tokens and claims rather than direct user-table coupling,
- client-scoped compatibility role projection and legacy adapter contracts, including coarse role aliases, administrative flags, compatibility `/me` payloads, and versioned claim templates for migration consumers,
- mapping and adapter layers for application-specific tenant, membership, or group semantics where consuming applications require them and where those semantics should not mutate the generic IAM core model,
- role and group assignment workflows sufficient to maintain application-facing authorization state, hierarchy-aware membership patterns, delegated admin boundaries, and migration-safe actor assignment operations,
- consumer SDKs, compatibility harnesses, and conformance validators where reusable downstream integration contracts are intentionally offered,
- and standalone operational controls for backup, restore, key rotation, resilience validation, and readiness-review evidence before downstream adoption.

### Parity Track Requirements

The following capabilities are in-scope for `Parity track` treatment and shall be required before claiming broad Keycloak-class parity for the relevant product surface:

- domain-specific realm templates and posture presets, including privacy-sensitive identity posture, guardian or proxy delegation, and optional high-assurance operating modes where enabled,
- dynamic client registration with registration policies, initial-access-token posture, and supported client-policy enforcement,
- OAuth 2.1-, FAPI-, and security-profile-oriented client-policy enforcement where those profiles are enabled,
- device authorization grant, CIBA, PAR, and other standards-based authorization-server capabilities where enabled for supported client profiles,
- authorization-services and UMA-style capabilities for resources, scopes, permissions, policies, permission tickets, and reusable policy decision behavior where downstream protected-resource use cases require them,
- fine-grained administrator authorization, including restricted admin scopes, client or realm management boundaries, impersonation controls, and auditable evaluation behavior,
- provider or extension mechanisms for authenticators, federation providers, policy providers, storage adapters, event listeners, and themed experiences, at least to the degree required for a product-grade runtime execution model,
- standards-grade passkey or WebAuthn behavior and standards-grade SAML behavior for the explicitly supported browser, authenticator, and service-provider profiles,
- and live federation execution paths for the explicitly supported broker and directory-provider families.

### Differentiator Track Requirements

The following capabilities are `Differentiator track` capabilities. They remain strategically valuable, but they shall not be used as baseline release blockers unless a release scope explicitly promotes them:

- application-facing capability registries and evaluation behavior for arbitrary downstream namespaces such as `cap.*`, including effective identity-side capability computation in tenant context and auditable authorization-decision APIs,
- application-binding registries and authorization-profile engines so downstream applications can declare provider mode, realm binding, tenant-membership strategy, claim-match rules, role or permission projection rules, service-account projection posture, and compatibility-contract versions without embedding those rules in app code,
- application-facing permission and surface projection behavior for both global and tenant-scoped permissions, role labels, accessible surfaces, and auditable decision explanations for downstream consumers,
- versioned principal projection contracts for token claims, `/me`, authenticated bootstrap, tenant-context, and service-account context envelopes where downstream applications require reusable migration-safe or direct-consumption contracts,
- external policy-input composition for non-identity gates such as tenant features, deployment profiles, or regulated-service eligibility, while keeping those sources of truth outside IAM ownership,
- provisioning and synchronization strategy support including direct projection, lazy sync, background sync, and provisioning adapters for consuming applications that maintain local shadow identities or memberships,
- contextual ABAC or policy-decision overlays that evaluate subject, resource, environment, relationship, temporal, and consent attributes while retaining RBAC as the required base authorization model,
- privacy-aware identity controls including attribute classification, purpose-bound attribute release, consent capture and enforcement, data-minimization rules, protected-record access audit trails, and age- or guardian-sensitive account posture where enabled,
- delegated relationship authentication and authorization patterns including guardian, parent, caregiver, sponsor, or authorized-proxy access, time-bound delegation, age-based access controls, approval or consent workflows, and revocation behavior where enabled,
- and stronger application-facing migration, compatibility, and authorization-evaluation surfaces where those create reusable subsystem adoption advantages.

### Profile-Specific Requirements

The following capabilities are `Profile-specific` and are only mandatory when the relevant product mode, customer commitment, or regulated profile is enabled:

- institutional or high-assurance federation presets,
- guardian, proxy, caregiver, or sponsor delegation modes,
- protected-record identity posture and attribute-release minimization controls,
- stronger isolation and assurance modes for high-risk tenants,
- regulator- or procurement-specific evidence obligations,
- SCIM-style provisioning or directory-federation differentiation when that provider family is promoted from modeled or experimental state into the supported product surface,
- and any standards profile that is intentionally restricted to a designated client or deployment class.

### Support-Matrix Requirements

The standalone IAM specification set shall maintain explicit support matrices for at least the following areas:

- protocol support,
- federation and provider-family support,
- browser and authenticator support for passkeys or WebAuthn,
- SAML service-provider profile support,
- and deployment-mode support.

Each support matrix shall identify:

- supported profiles,
- unsupported or deferred profiles,
- current maturity state,
- required evidence for advancement,
- and explicit rejection behavior for unsupported requests where applicable.

### Design Constraints

- RBAC is mandatory; ABAC or policy overlays may refine access but shall not replace RBAC as the base reusable authorization model.
- The identity subsystem shall be independently multi-tenant and reusable outside IDP.
- IDP shall consume the subsystem through standard protocols and admin APIs rather than privileged bypass paths.
- IDP and any other consuming application shall own application-level identity connection configuration (provider mode, realm or tenant context, client identifiers, scopes, and app authorization-profile mapping) rather than relying on IAM to infer or push application binding state.
- Generic application-binding, authorization-profile, principal-projection, and compatibility-contract capabilities shall be reusable across many consuming applications and shall not be implemented as Crew-specific, FlightOS-specific, or other single-application hardcoded adapters inside the IAM core.
- The subsystem shall support one-to-many and override binding relationships between IDP tenants and identity realms.
- OAuth/OIDC/SAML application-client registration within IAM shall remain a security and protocol concern and shall not be treated as business customer/client management ownership.
- The subsystem may compute identity-side authorization context for downstream applications, but purchase-driven entitlements, subscription-rights truth, ownership-rights truth, and commerce-derived access truth shall remain external concerns unless explicitly promoted by a later constitutional change.
- External policy-input composition may refine downstream application authorization decisions, but IAM shall not become the authoritative store for tenant features, deployment-profile truth, regulated-service eligibility truth, or similar non-identity policy inputs.
- Privacy- and delegated-relationship-specific identity semantics shall be implemented as reusable IAM capabilities rather than pushed into downstream application-specific authorization code.
- Client-scoped compatibility projections, tenant-context adapters, authenticated bootstrap envelopes, service-account context contracts, `/me`-style migration contracts, and consumer SDKs are valid IAM responsibilities when required for migration or direct consumption, but they must remain explicit, versioned, and application-scoped rather than becoming implicit global behavior.
- The communications subsystem remains authoritative for channel dispatch execution, delivery-attempt tracking, suppression handling, and preference enforcement for IAM-triggered verification, recovery, MFA, and administrator communication events.
- The IAM subsystem shall compose communications contracts for reusable external channel delivery rather than coupling identity messaging flows directly to channel providers.
- Institutional federation, attribute-release, contextual policy, and proxy-delegation posture shall be configurable through governed realm, provider, and policy settings rather than per-client hardcoding.
- The IAM administration surface shall use consistent platform navigation and information-architecture conventions rather than ad hoc page-local navigation patterns.
- The subsystem shall be designed to be capable of competing with and strategically exceeding Keycloak-class capabilities while preserving the constitutional AWS-native, serverless-first operating model of IDP.
- The subsystem shall not be considered production-complete as a full standalone IdP while authorization-code plus PKCE, fuller SAML lifecycle support for the supported profiles, configurable auth flows, passkeys or WebAuthn for the supported browser and authenticator profiles, fine-grained admin authorization, and authorization-services capabilities required by the declared release scope remain absent.
- No capability may be described as supported, production-grade, or parity-credible unless its maturity state and evidence class satisfy the capability-maturity standard.
- Unsupported provider families, protocol variants, or deployment profiles shall be explicitly marked unsupported, deferred, or experimental rather than implied by roadmap-oriented language.

### Adoption Gate

The IAM subsystem shall not become the migration target for non-identity application domains until all of the following are true:

- OIDC authorization endpoint, authorization-code flow, PKCE, logout, and standards-based browser-session semantics are complete,
- SAML metadata, login, logout, and service-provider lifecycle support are complete for the supported standalone operating modes,
- configurable auth-flow, authenticator, required-action, MFA, and recovery behavior is complete and auditable,
- dynamic client registration, device authorization, token exchange, and enabled advanced protocol behaviors are complete where required by the targeted product posture,
- fine-grained administrator authorization, impersonation controls, and restricted-admin evaluation are complete,
- tenant-aware principal context, application binding and authorization-profile evaluation, service-account projection, application capability or permission evaluation, and downstream compatibility projection contracts required by the targeted migration consumer are complete,
- standalone backup, restore, key rotation, resilience, security audit, and readiness-review controls are complete,
- synthetic standalone validation across realms, clients, users, browser flows, federation flows, service-account flows, and recovery flows has passed,
- where protected-record identity profiles are enabled, synthetic standalone validation across federation, delegated guardian or proxy access, contextual policy evaluation, consent enforcement, attribute-release minimization, and protected-record access audit behavior has passed,
- and a formal standalone IAM review has accepted the subsystem independently of any IDP migration proof.

### Claim Boundary

Broad standalone IAM product claims shall be limited to capabilities that are both:

- within the declared supported product surface for the release or review in question,
- and backed by the maturity state and evidence class required by `docs/spec/capability-maturity-standard.idp.md`.

Modeled, synthetic, experimental, or profile-restricted capabilities may remain in-scope for implementation and future planning, but they shall not be presented as baseline product support until their support matrices and evidence posture are advanced accordingly.

### AWS Implementation Default

The AWS implementation default is an architecture reference posture rather than a claim that every listed service mapping is already production-complete.

The default target shape is:

- API Gateway for OIDC, OAuth, SAML, admin, account, and client-registration APIs
- Lambda for authentication flows, token issuance and exchange, federation, brokering, admin operations, authorization-code and PKCE handling, client-policy evaluation, and policy evaluation
- DynamoDB for realms, users, groups, roles, clients, sessions, grants, consents, authentication flows, required actions, organizations, invitations, device-authorization state, backchannel-auth state, and admin-event indexes
- S3 for theme assets, realm exports, email templates, import or export bundles, admin archives, and static account or admin UI assets
- KMS for signing keys, encryption keys, secret protection, and key rotation
- Step Functions for multi-step verification, recovery, federation sync, device and backchannel auth orchestration, import or export, and realm-clone workflows
- EventBridge for authentication, administration, federation, and provisioning events
- CloudFront for admin, account, and login surfaces, discovery documents, JWKS distribution, and themed static assets
- SES and/or SNS via communications subsystem provider adapters for verification, recovery, MFA, and administrator notification delivery
- OpenSearch optional for large-scale user search and event search where justified

---

## 3.5 Security, Privacy, Residency, and Assurance

The system shall support:

- strong tenant isolation,
- OIDC/SAML federation where required,
- RBAC-native authorization with optional attribute-based overlays where justified,
- delegated administration and MFA,
- encryption at rest and in transit,
- least-privilege IAM,
- secrets isolation,
- auditable access patterns,
- explicit compliance-boundary definition for regulated integrations,
- U.S.-resident storage, access, and processing for regulated data where required,
- framework-aligned security controls for regulated integrations,
- regulated data encryption at collection, in transit, and at rest using accepted cryptographic controls,
- documented vendor and subprocessor obligation flow-down,
- a Data Protection Plan or equivalent documented handling model for regulated data,
- tenant-scoped or customer-owned integration credentials where required,
- stronger isolation and assurance modes for high-risk tenants and high-value workloads,
- and vendor-assurance evidence suitable for procurement and high-assurance review.

### Regulated Integration Security Requirements

For regulated external-integration systems, the platform shall be capable of:

- operating within a FIPS 199 Moderate boundary,
- aligning to NIST SP 800-53 Rev. 5, NIST SP 800-171 Rev. 2, or ISO/IEC 27001 with ISO/IEC 27002 controls, as required by the governing agreement,
- supporting regulator audit, remediation, and evidence requests,
- and keeping regulated data within approved geography and handling boundaries unless explicit approval states otherwise.

### Enterprise and High-Assurance Assurance Requirements

The platform shall be capable of supporting:

- SOC 2 Type II and ISO/IEC 27001-oriented control evidence where commercially required,
- high-assurance deployment profiles where strategically required,
- and customer-scoped credential ownership with stronger isolation for sensitive integrations.

---

## 4.7 Headless Identity and Access Platform Configuration

The platform shall support configuration for, at minimum:

- realm identity, template lineage, and scope,
- domain-specific realm templates and posture presets, including institutional SSO, guardian or proxy delegation, and privacy-sensitive account modes where enabled,
- realm-to-application and realm-to-tenant binding rules,
- application-owned consumer binding expectations so downstream products (including IDP) configure their own provider mode, realm selection, client identifiers, scopes, and app-level authorization mapping independently of IAM realm administration,
- tenant-context alias, subdomain, active-context selection, and client-specific projection rules for downstream consumers,
- application binding registries, authorization-profile definitions, claim-match rules, tenant-membership strategy rules, platform-admin projection rules, service-account projection rules, and projection-contract versioning for downstream consumers,
- user-profile schema, required attributes, and validation rules,
- group, subgroup, team, and organization hierarchy rules,
- realm-role, client-role, composite-role, and delegated-administration catalogs,
- application capability catalogs, permission catalogs, capability-binding rules, surface catalogs, coarse-role projection templates, compatibility `/me` templates, authenticated bootstrap templates, service-account context templates, and authorization-decision explanation settings for downstream consumers,
- client types, redirect URIs, logout URIs, web origins, scopes, protocol-mapper settings, dynamic client registration posture, and client-policy configuration,
- token, authorization-code, PKCE, device-authorization, token-exchange, session, consent, refresh, rotation, and revocation policies,
- authentication flows, authenticators, required actions, MFA policies, password policies, WebAuthn and passkey policies, recovery settings, self-service registration modes, invitation-only and approval-required registration policies, registration field schemas, and post-registration action settings,
- identity brokering, user federation, sync cadence, and provisioning rules,
- federation trust-store, metadata-import, certificate-rollover, attribute-mapping, assertion-release, and home-organization mapping policies,
- organizations, invitations, membership rules, and organization-linked federation posture,
- guardian, parent, caregiver, sponsor, or authorized-delegate relationship rules, age-band policies, approval posture, and time-bound delegation policies where enabled,
- external identifier, cross-organization relationship, brokered home-organization, and portable identity-link rules,
- authorization-services resources, scopes, policies, permissions, and permission-ticket rules where enabled,
- external policy-input bindings, evaluation-composition settings, and ownership-boundary declarations for non-identity policy inputs consumed during authorization refinement,
- direct-projection, lazy-sync, background-sync, and provisioning-adapter settings for downstream applications that keep local shadow users or memberships,
- contextual policy attribute catalogs, subject, resource, environment, relationship, temporal, and consent-condition rules, PDP bindings, and evaluation-explanation settings,
- privacy classification, consent-capture, attribute-release, data-minimization, and protected-record audit policies,
- signing-key, encryption-key, JWKS, secret-storage, and rotation policies,
- administrator roles, audit retention, event routing, and identity-communication policy bindings through canonical communications contracts,
- localization, branding, theme, tenant- or realm-scoped login and registration template-resolution rules, account, legal-text, and identity-message template-binding settings through canonical communications contracts,
- import, export, clone, promotion, and environment portability policies,
- backup, restore, resilience, and readiness-review policies,
- consumer SDK, compatibility-harness, and conformance-validator publication settings where reusable downstream integration tooling is offered,
- and extension or provider registration policies where enabled
