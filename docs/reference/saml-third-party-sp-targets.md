---
id: saml-third-party-sp-targets
type: reference
domain: saml-third-party-sp-targets
status: stable
version: "1.0"
dependencies: [saml-profile-matrix, protocol-support-matrix, headless-iam-status-matrix]
tags: [reference, saml, interoperability, targets]
last_updated: "2026-04-29"
related: [saml-profile-matrix, protocol-support-matrix]
---
# SAML Third-Party SP Targets

Last updated: 2026-04-29

## Purpose

This document records the bounded SAML service-provider targets used to move the product from:

- runtime-enforced bounded SAML profile,

to:

- externally validated bounded SAML interoperability.

It exists to keep the target set explicit and narrow. The product should not claim broad SAML interoperability while target selection is still ambiguous.

## Current Posture

The repository now has two distinct SAML evidence lanes:

1. [latest-bounded-saml-sp-interoperability.json](../../tests/integration/latest-bounded-saml-sp-interoperability.json)
   - purpose: prove the bounded Redirect/Post profile end to end inside the repo-controlled runtime
   - evidence class: internal runtime

2. [latest-bounded-saml-sp-target-harness.json](../../tests/integration/latest-bounded-saml-sp-target-harness.json)
   - purpose: prove the target-driven SAML interoperability harness is aligned to the same bounded profile
   - evidence class: target harness

The second lane is a harness-calibration artifact. It is not by itself third-party interoperability proof.

There is now also a third lane:

3. [latest-bounded-saml-sp-live-external-target.json](../../tests/integration/latest-bounded-saml-sp-live-external-target.json)
   - purpose: prove the bounded Redirect/Post profile against a real live external SimpleSAMLphp deployment
   - evidence class: external interoperability candidate

## Active Harness Target

The active target manifest is [third-party-sp-targets.json](../../tests/fixtures/saml/third-party-sp-targets.json).

Current active target:

- Target ID: `reference-bounded-fixture`
- Target kind: `fixture-calibration`
- Validation mode: `target-harness`
- Bound profile: `saml-sp-bounded-redirect-post-v1`
- Request binding: `REDIRECT`
- Response binding: `POST`
- Request fixture: [bounded-sp-authn-request.xml](../../tests/fixtures/saml/bounded-sp-authn-request.xml)

This target exists to verify that a target-driven execution harness can consume a declared SAML SP contract without drifting from the runtime-enforced bounded profile.

## First Family-Shape Candidate

The first SP-family candidate now present in the manifest is:

- Target ID: `simplesamlphp-bounded-profile-candidate`
- Target kind: `family-shape-calibration`
- Validation mode: `target-harness`
- Bound profile: `saml-sp-bounded-redirect-post-v1`
- Request fixture: [simplesamlphp-bounded-authn-request.xml](../../tests/fixtures/saml/simplesamlphp-bounded-authn-request.xml)

The corresponding artifact is:

- [latest-bounded-saml-sp-family-shape-calibration.json](../../tests/integration/latest-bounded-saml-sp-family-shape-calibration.json)

This artifact is still synthetic family-shape evidence. It proves the bounded profile accepts a SimpleSAMLphp-shaped `AuthnRequest` fixture through the target harness. It is not yet live interoperability with an actual SimpleSAMLphp deployment.

## First Live External Candidate

The first live external target contract now present in the manifest is:

- Target ID: `simplesamlphp-live-bounded-profile`
- Target kind: `live-external-candidate`
- Validation mode: `live-external`
- Bound profile: `saml-sp-bounded-redirect-post-v1`
- Expected SP family: `SimpleSAMLphp`

The corresponding execution lane is:

- `npm run test:integration:bounded-saml-sp-live-external-target`

The required environment verifier is:

- `npm run verify:idp:saml-live-external-env`

And the corresponding artifact path is:

- [latest-bounded-saml-sp-live-external-target.json](../../tests/integration/latest-bounded-saml-sp-live-external-target.json)

This lane is intentionally separate from the fixture and family-shape calibration lanes.

The repository now has a passing artifact for this lane in [latest-bounded-saml-sp-live-external-target.json](../../tests/integration/latest-bounded-saml-sp-live-external-target.json). That artifact is valid because it was executed against a real live external SimpleSAMLphp deployment with live metadata discovery.

Required environment for a real run:

- `IDP_SAML_SP_TARGET_BASE_URL`
- `IDP_SAML_SP_CLIENT_ID`
- `IDP_SAML_SP_METADATA_URL`
- optional `IDP_SAML_SP_REQUEST_ID`

For the live external lane, the runner generates the `AuthnRequest` fixture dynamically from those deployed SP coordinates. That avoids treating a synthetic static issuer or ACS value as if it represented a real external deployment.

## Next Real External Targets

The next targets should be real external SP families constrained to the same bounded profile. The first additions should stay narrow and reproducible:

- one PHP SP family target
- one .NET SP family target
- one standards-heavy SP target

Those targets should only be promoted into this matrix once:

- the exact profile mapping is declared,
- request and ACS expectations are frozen,
- and the harness can execute against them reproducibly.

## Claim Boundary

The product may currently claim:

- a declared bounded SAML SP profile,
- a repo-controlled SP-facing artifact for that profile,
- a target-driven harness calibrated to the same contract,
- and a first live external SimpleSAMLphp interoperability candidate artifact for that bounded profile.

The product shall not yet claim:

- third-party SAML SP interoperability,
- supported SAML SP family breadth,
- or Keycloak-class SAML maturity.

The current live external artifact is meaningful, but still narrow. It proves one bounded external SP family target, not broad SAML support.
