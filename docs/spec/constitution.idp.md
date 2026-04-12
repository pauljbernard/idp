# Constitution

Source: `constitution.md`

## Article I. Purpose

The platform exists to provide a deterministic, auditable, programmable, and economically viable infrastructure layer for identity, authentication, authorization, and tenant administration.

The platform shall:

1. ingest and normalize authoritative identity, policy, and operational data,
2. compute authentication, authorization, and compliance outcomes,
3. support authorization workflows,
4. persist multi-tenant operational state,
5. enable identity and session lifecycle management,
6. provide machine-facing and human-facing administration, login, and account-management surfaces,
7. do so using an infrastructure model that preserves margin under low-to-moderate utilization,
8. remain eligible for regulated external integrations without fundamental architectural redesign,
9. support reusable solution packs, solution-mode overlays, and domain-specific identity governance without fragmenting the shared authentication core,
10. serve as a standalone identity and access management platform, not a bundled business application backend,
11. provide reusable tenant-aware principal context, application-facing authorization context, application binding and projection contracts, and consumer integration tooling for consuming applications without absorbing unrelated business entitlement ownership.

The platform is an:

- a standalone identity intelligence engine,
- an authentication and authorization operations platform,
- a live identity security and audit platform,
- a protocol and integration platform for external systems,
- a headless identity and access management platform,
- and a programmable identity infrastructure layer.

---

### Principle 26. Identity and Access as a Reusable Platform Subsystem

The platform shall provide a first-class reusable identity and access management subsystem that is capable of operating as a full standalone identity provider product for IDP itself and future first-party, partner, or standalone applications.

The target is not merely "better local auth for IDP." The target is a standards-complete, RBAC-native, federated, extensible identity platform that can credibly compete with Keycloak-class systems and, where strategically valuable, exceed them through lower-cost AWS-native operation, stronger OpenAPI-described contracts, better adoption-governance controls, and stronger built-in resilience and readiness-review posture.

For constitutional purposes, "standards-complete" and "Keycloak-class" describe the intended supported product surface across declared supported profiles. They do not authorize implied support for every modeled or future protocol, provider family, or deployment variant before the specification set marks that surface as supported and evidence-backed.

This includes:

- independent identity realms or equivalent security partitions that can serve multiple applications and customers,
- RBAC-native user, group, role, composite-role, client-role, and admin-role management,
- standard authentication and federation protocols including OAuth 2.0, OpenID Connect, SAML 2.0, discovery, authorization, JWKS, token introspection, revocation, logout, dynamic client registration, device authorization, token exchange, and machine identities,
- configurable authentication flows, subflows, authenticators, required actions, MFA, session management, account recovery, self-service account administration, browser-first interactive login semantics including authorization-code and PKCE flows, tenant- or realm-scoped login experience selection, and governed self-service registration modes,
- identity brokering and user federation to external identity providers and directories,
- standards-based federation packaging including trust-store management, metadata import and export, certificate rollover, assertion and attribute mapping, and federation presets for partner, regulated, or high-assurance operating modes,
- application or client registration, client scopes, protocol mapping, service accounts, consent, session or token governance, client policies, and security-profile enforcement,
- privacy-aware identity semantics including identity and profile attribute classification, purpose-bound consent and attribute release, data-minimization controls, and audit-grade protected-record access posture where domain requirements demand them,
- WebAuthn or passkey-capable phishing-resistant authentication, step-up authentication, and modern passwordless or reduced-password login patterns,
- organization-aware and business-to-business identity constructs, invitations, membership lifecycle, and organization-linked federation patterns,
- tenant-aware principal context including active tenant or organization selection, cross-tenant membership resolution, tenant or subdomain alias mapping, selection-source semantics, and stable downstream claim projection for consuming applications,
- cross-organization identity portability including reusable external identifiers, organization-bound relationships, portable relationship links, and proxy or delegate relationship patterns where users operate across organizational boundaries,
- audit-grade authentication and administration events, fine-grained delegated administration, policy-aware admin authorization, tenant or realm binding models, and reusable admin APIs and consoles,
- authorization-services and user-managed-access style capabilities where reusable resource-server and policy-based authorization is required,
- application-facing authorization capabilities including reusable application-binding registries, authorization-profile engines, capability and permission catalogs, effective capability or permission evaluation in tenant context, accessible-surface projection, service-account application projection, application authorization decision APIs, compatibility role projection, and versioned principal-projection contracts for downstream consumers that are not yet fully policy-native,
- external policy-input composition allowing downstream applications to provide tenant features, deployment profiles, regulated-service eligibility, or other non-identity policy inputs for authorization refinement without promoting IAM to ownership of those sources of truth,
- provisioning and synchronization strategy support including direct projection, lazy sync, background sync, and provisioning-adapter patterns for consuming applications that maintain local shadow records,
- consumer SDKs, conformance harnesses, and contract validators so downstream applications can adopt reusable identity and authorization contracts without repeatedly reimplementing integration logic,
- contextual and relationship-aware authorization overlays including policy-decision behavior, subject, resource, environment, temporal, consent, and relationship attributes, guardian or delegate access rules, and age-sensitive access refinement while preserving RBAC as the base model,
- identity-security communication-intent behavior for verification, recovery, MFA, and administrator notices, with channel delivery composed through canonical communications contracts,
- import, export, backup, restore, key rotation, resilience validation, readiness-review evidence, and standalone operating controls,
- extension or provider mechanisms so storage, authenticators, policy engines, federation providers, and themed experiences can evolve without rewriting the subsystem core, beginning with internal runtime contracts and expanding to broader plugin or provider ecosystems only when product-grade execution boundaries are explicit,
- compatibility with low-cost AWS-native operation without requiring always-on cluster-first identity infrastructure by default, with AWS-native service mappings treated as architecture defaults rather than as proof that every intended deployment posture is already production-grade.

The identity and access subsystem governs authentication, authorization, and security-partition identity. It shall not become the canonical source for unrelated business-domain customer records, lifecycle state, or relationship management models.

The identity and access subsystem may compute identity-side authorization context for downstream applications, including tenant-aware principal state, authorization-profile-driven role or permission outcomes, accessible-surface projection, compatibility projection payloads, and service-account application context. It shall not become the canonical source for purchase-driven entitlements, subscription-rights truth, ownership-rights truth, tenant feature truth, deployment-profile truth, or unrelated commerce-domain access determination.

Application-to-IdP connection posture is an application concern, not an IAM ownership concern. IAM shall own realm, client, protocol, flow, and federation configuration as a standalone subsystem, while IDP and other consuming applications shall own their own application-level identity configuration that selects provider mode, realm or tenant context, client identifiers, scopes, authorization-profile settings, service-account projection posture, and external policy-input bindings through their own configuration surfaces.

Where consuming applications require compatibility contracts during migration, IAM may expose client-scoped claim templates, coarse-role projections, tenant-context projections, authenticated bootstrap envelopes, service-account context envelopes, `/me`-style adapter surfaces, and consumer SDK contracts. Those compatibility surfaces must remain explicit, versioned, and application-scoped rather than becoming implicit global behavior.

RBAC is mandatory in this subsystem. Fine-grained policy overlays may refine access, but they shall not replace RBAC as the primary reusable authorization model.

---

### Layer 3. Identity, Access, and Tenant Administration Platform Layer
Includes:

- realm or identity-space registry,
- user and profile management,
- credential, required-action, verification, and recovery flows,
- group, team, organization, and membership hierarchy management,
- RBAC roles, composite roles, client roles, and delegated administration,
- application clients, dynamic client registration, client scopes, client policies, protocol mappers, service accounts, and consent records,
- session, token, authorization-code, PKCE, device-auth, token-exchange, logout, SSO, and machine-identity handling,
- selected-tenant, selected-organization, tenant-alias, tenant-membership-strategy, and principal-context handling for consuming applications,
- configurable authentication flows, authenticators, passkeys or WebAuthn, and recovery posture,
- identity brokering, user federation, provisioning, and tenant or application bindings,
- privacy-classified identity attributes, consent and attribute-release governance, guardian or delegate relationship bindings, and contextual policy evaluation where regulated identity profiles require them,
- authorization services, policy administration, and fine-grained administration boundaries where reusable identity-based authorization is required,
- application-binding registries, authorization-profile engines, application-facing capability or permission catalogs, effective identity-side capability or permission evaluation, accessible-surface projection, service-account projection, compatibility role projection, and migration-safe principal-context adapter surfaces where downstream applications require reusable authorization context,
- external policy-input bindings and evaluation-composition posture for downstream application authorization refinement where IAM consumes but does not own non-identity policy truth,
- provisioning, synchronization, shadow-record, and direct-projection strategy support for consuming applications integrating with the identity platform,
- portable external identifiers, cross-organization relationship models, and federation-broker lifecycle controls for users operating across organization or tenant boundaries,
- identity-security communication-intent events for verification, recovery, MFA, and administrator notices with channel delivery composed through communications contracts,
- tenant- or realm-scoped login, registration, account, and legal-notice presentation surfaces with reusable theme and branding controls,
- and reusable administration, account, and self-service identity surfaces.

This layer must remain reusable and independently multi-tenant, so IDP can consume it as one client among many rather than embedding irreversible app-specific identity logic.

### Identity and Access Platform Standard
All identity and access platform domains must document:

- support tier, current maturity state, supported profiles, exclusions, and required evidence using the capability-maturity standard in `docs/spec/capability-maturity-standard.idp.md`,
- realm or security-partition identity and isolation semantics,
- user, profile, credential, group, role, composite-role, client, client-scope, protocol-mapper, service-account, organization, invitation, and WebAuthn or passkey credential models,
- RBAC inheritance, delegated administration, fine-grained admin-authorization, admin-boundary, and impersonation rules where supported,
- authentication-flow, authenticator, required-action, MFA, recovery, consent, session, token, authorization-code, PKCE, dynamic client registration, device-authorization, token-exchange, and logout lifecycle semantics,
- self-service registration, invite-only registration, approval-required registration, registration-field-schema, registration-verification, and post-registration required-action semantics where supported,
- tenant-aware principal context semantics including tenant or organization membership resolution, alias or subdomain mapping, active-context selection, and downstream claim projection rules where supported,
- federation, brokering, provisioning, and tenant or application binding behavior,
- standards exposure model, including OAuth 2.0, OpenID Connect, SAML 2.0, discovery, authorization, JWKS, introspection, revocation, logout, dynamic client registration, admin API, account-administration behavior, and client-policy enforcement where enabled,
- authorization-services, policy, permission, resource-server, and UMA-style behavior where provided,
- application-binding, authorization-profile, effective capability or permission evaluation, accessible-surface projection, coarse-role projection, compatibility `/me` contract, authenticated bootstrap contract, service-account context contract, and authorization-decision API behavior where provided,
- external policy-input composition behavior, decision-explanation semantics, and ownership boundaries for non-identity policy inputs where provided,
- signing-key, secret, and rotation expectations,
- import, export, backup, restore, realm-clone, promotion, and readiness-review semantics,
- audit, admin-event, and login-event expectations,
- extensibility expectations for authenticators, federation providers, policy providers, storage adapters, and experience theming,
- theme, branding, locale, tenant- or realm-scoped login and registration template resolution, legal-text presentation, and communication-policy or template-binding behavior through canonical communications contracts,
- reuse expectations across IDP, partner, embedded, mobile, command, and future applications,
- consumer SDK, conformance-validator, and migration-harness expectations where reusable integration contracts are offered,
- and explicit boundary expectations separating identity-side authorization context from external purchase, subscription, or ownership-rights truth.
