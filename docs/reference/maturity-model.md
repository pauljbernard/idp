---
id: maturity-model
type: reference
domain: governance
status: stable
version: "1.0"
dependencies: []
tags: [reference, lookup, maturity-model.md]
last_updated: "2026-04-12"
related: []
---
# Capability Maturity Standard

Source: current canonical maturity standard for the repository documentation set

## Purpose

This standard defines how the IDP specification set describes capability scope, support posture, and evidence quality.

The goal is to prevent three different ideas from being conflated:

- architectural intent,
- implemented capability,
- and market-credible or externally validated support.

This standard is normative for standalone IAM requirements, parity plans, review artifacts, and feature specifications.

## Capability States

Every significant standalone IAM capability family shall declare one of the following current maturity states:

1. `Modeled`
   - The capability is represented in architecture, contracts, seed records, or internal runtime shapes, but does not yet execute through a supported runtime path suitable for product claims.
2. `Implemented`
   - The capability executes in the product runtime, but is not yet declared supported for external production use.
3. `Supported`
   - The capability is intentionally offered for defined profiles and operating modes, with explicit acceptance criteria and rejection behavior for unsupported variants.
4. `Production-grade`
   - The capability has durable-state, failure-mode, security, and operational hardening sufficient for the intended supported operating modes.
5. `Externally validated`
   - The capability is backed by reproducible interoperability, conformance, integration, scale, or recovery evidence produced outside purely synthetic local validation.

Capabilities may advance through these states over time. A capability shall not be described as parity-credible unless it is at least `Supported`, materially hardened for the relevant profile, and backed by the evidence required by the applicable parity or release gate.

## Support Tiers

Standalone IAM requirements shall identify each major capability family using one of the following support tiers:

- `Core release`
  Required for a credible standalone IAM product release.
- `Parity track`
  Required before claiming meaningful Keycloak-class parity for the relevant product surface.
- `Differentiator track`
  Strategically valuable and potentially superior capabilities, but not required to establish baseline standalone IAM credibility.
- `Profile-specific`
  Capabilities required only when particular deployment profiles, customer commitments, or regulated operating modes are enabled.
- `Deferred`
  Intentionally not in the current supported product surface and not to be implied by broad roadmap language.

## Supported Profiles

Every externally visible protocol or federation capability family shall declare:

- supported profiles,
- supported operating modes,
- unsupported variants,
- and explicit rejection behavior for unsupported requests where applicable.

Examples include:

- OIDC browser flows,
- advanced OAuth grant types,
- SAML service-provider profiles,
- browser and authenticator combinations for passkeys or WebAuthn,
- identity-provider families,
- directory-federation families,
- and provisioning adapter families.

The specification set shall prefer "supported profiles" language over broad generic claims when only a subset is hardened.

## Evidence Classes

Evidence used in review, readiness, parity, or release claims shall be classified as one of:

- `Synthetic`
  Internal seeded, simulated, or modeled evidence used for design validation or local diagnostics.
- `Internal runtime`
  Evidence from real runtime execution inside the product, but not yet independently reproduced against production-like infrastructure.
- `External interoperability`
  Evidence from real clients, browsers, service providers, or external systems operating against supported profiles.
- `Operational`
  Evidence from backup, restore, scale, failure, resilience, or security evaluations against production-like infrastructure.

Synthetic evidence is useful, but it shall not be presented as production proof or parity proof by itself.

## Claim Boundary Rules

The specification set shall apply the following claim rules:

1. A capability may be described as "present" when it is `Implemented`, but not yet as "supported" unless its supported profiles are explicit.
2. A capability may be described as "supported" only when unsupported variants are either rejected explicitly or clearly documented as unsupported.
3. A capability may be described as "production-grade" only when its persistence, concurrency, security, and operational behavior are credible for the intended operating mode.
4. A capability may be described as "parity-credible" only when it is `Supported`, profile-bounded, and backed by external or operational evidence appropriate to the claim.
5. Modeled or synthetic provider families shall not be described in product-facing language as if live adapter execution already exists.

## Feature-Spec Expectations

Each standalone IAM feature specification shall document, at minimum:

- capability name,
- support tier,
- current maturity state,
- supported profiles and exclusions,
- primary runtime path,
- required evidence for advancement,
- and release or adoption gates affected by the capability.

## Governance Expectations

Planning documents, parity analyses, readiness reviews, and dashboards shall use the same maturity vocabulary as this standard.

No document in the standalone IAM specification set shall imply broader support than the explicit support tier, maturity state, supported profile list, and evidence class justify.
