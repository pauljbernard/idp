---
id: headless-iam-requirements-gap-matrix
type: reference
domain: headless-iam-requirements-gap-matrix.md
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, headless-iam-requirements-gap-matrix.md]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Requirements Gap Matrix

Last updated: 2026-04-11

## Purpose

This document provides a refreshed holistic assessment of the standalone IAM system against the current governed requirements model.

It is intended to answer four questions:

1. which requirement families are already satisfied,
2. which requirement families are implemented but not yet requirement-satisfied,
3. which requirement families remain absent, modeled, or deferred,
4. and what the next concrete action is for each family.

This document is a companion to:

- [constitution.idp.md](../constitution.idp.md)
- [requirements.idp.md](../requirements.idp.md)
- [capability-maturity-standard.idp.md](../capability-maturity-standard.idp.md)
- [Headless_IAM_Status_Matrix.md](./Headless_IAM_Status_Matrix.md)
- [Headless_IAM_Gap_Remediation_Plan.md](./Headless_IAM_Gap_Remediation_Plan.md)

## Assessment Method

This matrix uses the current requirement and maturity model, not a raw feature-count standard.

A requirement family is treated as:

- `Satisfied` when the capability is present at a level that is consistent with the current requirement language, declared support boundary, and evidence expectations for the intended near-term product posture.
- `Implemented but not yet requirement-satisfied` when the runtime path exists, but the current maturity, support matrix, evidence class, or operational hardening still falls short of what the requirement language actually demands.
- `Not yet implemented / deferred` when the capability remains modeled, synthetic, explicitly deferred, or absent.

## Executive Readout

The system is no longer blocked by lack of IAM surface area in general.

The system is now primarily blocked by:

- shared-durable runtime and production-grade state credibility,
- support-boundary completion for SAML and WebAuthn,
- live broker and directory execution depth,
- and evidence quality moving from local/internal proof to externally or operationally validated proof.

That means the product is:

- strongly aligned with the constitution and requirements in direction,
- substantially implemented across the `Core release` and part of the `Parity track`,
- still short of a clean requirement-complete standalone IAM release,
- and still not at the point where broad Keycloak-class parity claims would be honest.

## Bucket Summary

| Bucket | Count | Meaning |
| --- | --- | --- |
| Satisfied | 10 | Capability family is currently in acceptable shape for the governed requirement model and near-term product posture |
| Implemented but not yet requirement-satisfied | 11 | Runtime exists, but the requirement is not yet honestly met because support, evidence, or operational posture is still insufficient |
| Not yet implemented / deferred | 6 | Capability remains modeled, deferred, or absent |

## Formal Gap Matrix

| Requirement family | Tier | Current bucket | Why this is the current bucket | Primary evidence | Next concrete action |
| --- | --- | --- | --- | --- | --- |
| Realms, users, groups, roles, clients, scopes, mappers | Core release | Satisfied | The core IAM control-plane model is real, broad, and coherent, and it already supports serious standalone operation | [server.ts](../../../apps/api-server/src/server.ts), [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts), [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts) | Preserve the model and continue moving the backing state plane to shared-durable runtime authority |
| Organizations, memberships, invitations | Core release | Satisfied | B2B and organization lifecycle support are implemented as first-class runtime behavior, not just planned artifacts | [server.ts](../../../apps/api-server/src/server.ts), organization runtime modules under `apps/api-server/src/platform` | Add externally validated org-linked federation scenarios later, but no major model gap blocks the requirement family now |
| User profile schema and privacy governance | Core release | Satisfied | Profile schemas, validation, privacy classification, release-purpose semantics, and minimization posture are materially real and align strongly with the requirements | [iamUserProfiles.ts](../../../apps/api-server/src/platform/iamUserProfiles.ts), [iam-identity-governance-api.json](../../../contracts/api/iam-identity-governance-api.json) | Preserve as a differentiator and align future support matrices to regulated-profile variants |
| Account console, password, MFA, sessions, linked-identity administration | Core release | Satisfied | Self-service account behavior is broad and coherent enough to count as real release surface, not just proving-runtime scaffolding | [server.ts](../../../apps/api-server/src/server.ts), [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts) | Continue session and ticket hardening on the shared-durable path rather than redesigning the account plane |
| Tenant-aware principal context and downstream compatibility projections | Core release | Satisfied | The subsystem already computes reusable tenant-aware context and downstream compatibility projections as explicit subsystem behavior | [server.ts](../../../apps/api-server/src/server.ts), application-binding and consumer-contract runtime under `apps/api-server/src/platform` | Preserve as part of the supported differentiator surface and keep the contracts explicit and versioned |
| Administration APIs and reusable admin surface | Core release | Satisfied | Admin APIs are broad, reusable, and structurally standalone rather than app-local auth helpers | [server.ts](../../../apps/api-server/src/server.ts), [contract-manifest.json](../../../contracts/sdk-iam/contract-manifest.json) | Keep tightening authorization and state semantics without reopening the basic admin surface shape |
| Fine-grained admin authorization and impersonation | Parity track | Satisfied | This parity-track family is materially implemented and meaningfully beyond toy form even if broader evidence can still improve | [iamAdminAuthorization.ts](../../../apps/api-server/src/platform/iamAdminAuthorization.ts), [server.ts](../../../apps/api-server/src/server.ts) | Expand scenario coverage and resource-bound evaluation proof |
| Authorization services and UMA-facing capabilities | Parity track | Satisfied | Resource, policy, permission, evaluation, and UMA-facing surfaces exist as real runtime paths and satisfy the requirement family at an implementation level | [iamAuthorizationServices.ts](../../../apps/api-server/src/platform/iamAuthorizationServices.ts), [tests/journeys/oidc-uma.spec.ts](../../../tests/journeys/oidc-uma.spec.ts) | Harden semantics for supported protected-resource profiles and add more explicit support boundaries |
| Application-binding and consumer contract surfaces | Differentiator track | Satisfied | This is one of the strongest completed differentiator families in the repo and is already a real product asset | application-binding and consumer runtime under `apps/api-server/src/platform`, related tests under `apps/api-server/test` | Preserve and document as a supported differentiator rather than letting it drift into implicit behavior |
| Privacy-aware identity governance and projection controls | Differentiator track | Satisfied | Attribute classification, release-purpose logic, and governed profile semantics are already meaningfully implemented | [iamUserProfiles.ts](../../../apps/api-server/src/platform/iamUserProfiles.ts), identity governance contracts under `contracts/api` | Keep the semantics explicit and align future support matrices for regulated modes |
| Deferred requirement families being explicitly marked deferred | Deferred | Satisfied | DPoP, Kerberos/SPNEGO, and multi-site posture are not implemented, but they are also not being hidden; the requirement model explicitly allows deferment when declared clearly | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [Headless_IAM_Keycloak_Parity_Plan.md](./Headless_IAM_Keycloak_Parity_Plan.md) | Keep them explicitly deferred until intentionally promoted |
| OIDC discovery, token, introspection, revocation, userinfo | Core release | Implemented but not yet requirement-satisfied | The bounded OIDC surface is strong, but the requirement language expects explicit supported profiles and broader operational credibility than feature presence alone | [server.ts](../../../apps/api-server/src/server.ts), [tests/journeys/oidc-browser.spec.ts](../../../tests/journeys/oidc-browser.spec.ts), [tests/journeys/oidc-refresh.spec.ts](../../../tests/journeys/oidc-refresh.spec.ts) | Publish and govern the supported OIDC profile set as a formal requirement-satisfying boundary |
| Browser auth-code plus PKCE | Core release | Implemented but not yet requirement-satisfied | This is the strongest support story today, but still bounded and not yet enough for broad protocol-product claims by itself | [tests/journeys/oidc-browser.spec.ts](../../../tests/journeys/oidc-browser.spec.ts), [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Elevate the current bounded browser profile formally and close any remaining session/logout edge cases |
| OAuth 2.0, OIDC, and SAML support for explicitly supported profiles | Core release | Implemented but not yet requirement-satisfied | The requirement is broader than raw endpoint presence. OIDC has bounded support, but SAML and WebAuthn posture still prevent clean requirement completion for the overall standards family | [requirements.idp.md](../requirements.idp.md), [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Finish explicit support matrices and promote only the profiles that now have real rejection behavior and evidence |
| SAML IdP lifecycle including supported SP profiles | Core release | Implemented but not yet requirement-satisfied | SAML has advanced significantly: exact ACS, signed response/logout, request-shape enforcement, and focused external-SP journey proof exist, but the governed support profile still marks it below supported status | [iamProtocolRuntime.ts](../../../apps/api-server/src/platform/iamProtocolRuntime.ts), [tests/journeys/saml-idp.spec.ts](../../../tests/journeys/saml-idp.spec.ts), [iamSamlSupportMatrixRuntime.ts](../../../apps/api-server/src/platform/iamSamlSupportMatrixRuntime.ts) | Promote the bounded supported SP profile in the formal support matrix and add real third-party SP interoperability evidence |
| WebAuthn, passkeys, and phishing-resistant auth for supported browser/authenticator profiles | Core release | Implemented but not yet requirement-satisfied | The runtime is real and recently hardened, but the requirement explicitly demands supported browser/authenticator profiles and the current support record still says `IMPLEMENTED_NOT_SUPPORTED` | [iamWebAuthn.ts](../../../apps/api-server/src/platform/iamWebAuthn.ts), [iamPasskeySupportMatrixRuntime.ts](../../../apps/api-server/src/platform/iamPasskeySupportMatrixRuntime.ts), [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Build the real browser/authenticator support matrix and prove the supported profile set through interoperability evidence |
| Configurable auth flows, authenticators, required actions, MFA, recovery | Core release | Implemented but not yet requirement-satisfied | The runtime exists, but the requirements want declared supported execution combinations and auditable completeness for the supported release scope | [iamAuthenticationRuntime.ts](../../../apps/api-server/src/platform/iamAuthenticationRuntime.ts), [server.ts](../../../apps/api-server/src/server.ts) | Publish supported flow combinations and verify them through explicit scenario coverage |
| Backup, restore, key rotation, resilience, readiness-review controls | Core release | Implemented but not yet requirement-satisfied | This operations surface is real and unusually strong, but the requirement needs operational evidence, not just internal/runtime instrumentation and local rehearsals | [iamOperationsRuntime.ts](../../../apps/api-server/src/platform/iamOperationsRuntime.ts), [Headless_IAM_Status_Matrix.md](./Headless_IAM_Status_Matrix.md) | Repeat the local-proven recovery and cutover evidence in the intended shared target environment and convert it into operational evidence |
| Shared-durable runtime and standalone operating controls | Core release | Implemented but not yet requirement-satisfied | Local Stage 2 cutover and Dynamo-backed entity-family proof now exist, but the requirement bar is target-environment credibility and production-grade state authority | [Headless_IAM_Gap_Remediation_Plan.md](./Headless_IAM_Gap_Remediation_Plan.md), [Headless_IAM_Runtime_Cutover_Environment_Readiness.md](./Headless_IAM_Runtime_Cutover_Environment_Readiness.md) | Execute the full proven local Sequence A evidence path in the target shared environment |
| Dynamic client registration and client policies | Parity track | Implemented but not yet requirement-satisfied | This area is real and partly journey-backed, but still governed as bounded support rather than parity-grade support | [iamAdvancedOAuthRuntime.ts](../../../apps/api-server/src/platform/iamAdvancedOAuthRuntime.ts), [tests/journeys/oidc-dynamic-registration.spec.ts](../../../tests/journeys/oidc-dynamic-registration.spec.ts) | Tighten lifecycle and policy semantics and promote only the bounded supported profile |
| PAR, device authorization, token exchange, CIBA | Parity track | Implemented but not yet requirement-satisfied | The surfaces exist, but the requirement language requires explicit enabled profiles and evidence discipline rather than generic feature claims | [server.ts](../../../apps/api-server/src/server.ts), [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), journey tests under `tests/journeys` | Publish a precise advanced-OAuth support matrix and close remaining interoperability gaps one profile at a time |
| Identity brokering for supported OIDC and SAML provider families | Core release | Implemented but not yet requirement-satisfied | Broker/runtime paths exist, but the requirements ask for supported provider-family execution, not synthetic-first proving paths | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts), [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Replace at least the primary supported provider-family path with live-backed adapters and validation evidence |
| Federation onboarding, trust-store management, rollover, mapping, JIT/sync | Core release | Implemented but not yet requirement-satisfied | Modeled and partly implemented, but the requirement is stronger than catalog presence and synthetic lifecycle records | [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts), federation support-matrix documents in `docs/spec/plans` | Promote a narrow supported onboarding profile and prove it against real provider material |
| Live federation execution paths for broker and directory families | Parity track | Not yet implemented / deferred | The requirements explicitly call for live execution paths. Current brokering remains experimental and directory families are still modeled | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts) | Implement one live broker family and one live directory family before claiming parity-grade federation depth |
| Extension and provider runtime execution model | Parity track | Not yet implemented / deferred | Catalogs and registry metadata exist, but there is still no product-grade runtime execution boundary for providers | [iamExtensionRegistry.ts](../../../apps/api-server/src/platform/iamExtensionRegistry.ts), [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Define and implement the first real provider runtime contract with bounded execution semantics |
| LDAP and directory federation | Parity track | Not yet implemented / deferred | Still represented as provider family intent rather than live supported runtime behavior | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts), [iamFederationRuntime.ts](../../../apps/api-server/src/platform/iamFederationRuntime.ts) | Deliver the first live LDAP/AD adapter or keep the family explicitly outside the supported surface |
| SCIM-style federation or provisioning differentiation | Profile-specific / Differentiator track | Not yet implemented / deferred | The requirement only makes this mandatory when promoted. Today it remains modeled and intentionally non-live | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Make an explicit promote-or-defer decision and only then start implementation |
| AWS-native low-idle-cost operating posture | Differentiator track | Not yet implemented / deferred | The architecture intent is clear, but the requirement is not satisfied by intent or document language alone | [requirements.idp.md](../requirements.idp.md), [constitution.idp.md](../constitution.idp.md), [iamDeploymentRuntime.ts](../../../apps/api-server/src/platform/iamDeploymentRuntime.ts) | Produce real deployment and cost evidence for the intended AWS-native posture |
| DPoP | Deferred | Not yet implemented / deferred | Explicitly absent and appropriately deferred | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Leave deferred until intentionally promoted |
| Kerberos / SPNEGO | Deferred | Not yet implemented / deferred | Explicitly absent and appropriately deferred | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Leave deferred until intentionally promoted |
| Multi-site / rolling-upgrade posture | Deferred | Not yet implemented / deferred | Explicitly absent and appropriately deferred | [iamSupportProfileRuntime.ts](../../../apps/api-server/src/platform/iamSupportProfileRuntime.ts) | Leave deferred until intentionally promoted |

## Highest-Priority Requirement Gaps

The most important requirement gaps are not the broadest list of missing features. They are the blockers that currently prevent honest release or parity claims.

### Priority 1

- shared-durable runtime credibility in the intended target environment
- bounded support promotion for SAML
- bounded support promotion for WebAuthn/passkeys

### Priority 2

- live federation adapter depth for at least the declared supported provider families
- operational evidence for backup, restore, resilience, and readiness posture
- explicit advanced-OAuth support matrices

### Priority 3

- provider runtime execution model
- LDAP federation
- AWS-native operating evidence

### Priority 4

- promoted-or-deferred decision on SCIM-style differentiation
- any future reconsideration of currently deferred items

## Recommended Next Review Baseline

The next holistic assessment should treat the following as the primary release gates:

1. `Requirement-satisfied bounded OIDC`
2. `Requirement-satisfied bounded SAML`
3. `Requirement-satisfied bounded WebAuthn`
4. `Shared-durable runtime proven outside local development`
5. `At least one live supported federation provider family`
6. `Operational evidence for backup/restore/readiness`

Until those gates are closed, the repo should continue to describe itself as:

- serious standalone IAM implementation,
- bounded-support in selected protocol areas,
- still maturing toward broad release credibility,
- and not yet broadly parity-credible against Keycloak-class systems.
