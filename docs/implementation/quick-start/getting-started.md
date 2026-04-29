---
id: getting-started
type: implementation
domain: quick-start
status: stable
version: "2.0"
dependencies: [platform-constitution, platform-architecture, platform-requirements]
tags: [implementation, quick-start, onboarding]
last_updated: "2026-04-12"
related: [implementation-index, reference-index, headless-iam-status-matrix]
---
# Getting Started

This guide is the current quick-start entry point for the repository. It is intentionally narrow: it orients you to the real docs, current support posture, and the main implementation plans.

## Read This First

Before treating any feature as supported or production-grade, read:

1. [Platform Constitution](../../foundation/constitution.md)
2. [Platform Requirements](../../specs/platform-requirements.md)
3. [Capability Maturity Standard](../../reference/maturity-model.md)
4. [Headless IAM Status Matrix](../../reference/headless-iam-status-matrix.md)

## Repository Orientation

- API runtime: `apps/api-server/`
- UI runtime: `apps/enterprise-ui/`
- Contracts and SDK manifests: `contracts/`
- Verification and helper scripts: `scripts/`
- Maintained documentation entry points: [docs/README.md](../../README.md)

## Current Useful Paths

### For implementation sequencing

- [Implementation Guides](../index.md)
- [Implementation Plan](../deployment/implementation-plan.md)
- [Roadmap](../deployment/roadmap.md)
- [Gap Remediation Plan](../deployment/gap-remediation.md)

### For readiness and adoption gating

- [Standalone Validation Review Guide](../planning/headless-iam-standalone-validation-review-guide.md)
- [Headless IAM Requirements Gap Matrix](../../reference/headless-iam-requirements-gap-matrix.md)
- [Protocol Support Matrix](../../reference/protocol-support-matrix.md)
- [Federation Support Matrix](../../reference/federation-support-matrix.md)
- [WebAuthn Support Matrix](../../reference/webauthn-support-matrix.md)
- [SAML Profile Matrix](../../reference/saml-profile-matrix.md)

### For current domain specs

- [OAuth 2.1 and OIDC Flows](../../specs/authentication/oauth-flows.md)
- [Deployment Modes](../../specs/operations/deployment-modes.md)
- [Design System](../../specs/ui/design-system.md)

## Practical Start Sequence

1. Read the constitution and requirements so you understand claim boundaries.
2. Read the status matrix to understand what is implemented versus supported.
3. Read the implementation plan and roadmap for active workstreams.
4. Use the relevant support matrix before making protocol or parity claims.

## Notes

- Older wiki-style links and historical `docs/spec/*.idp.md` references are not the canonical path in this repository.
- Use the maintained indexes and current `docs/` paths instead.
