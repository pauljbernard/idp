---
id: platform-manifest
type: reference
domain: platform-manifest
status: stable
version: "2.0"
dependencies: [platform-constitution, platform-requirements, maturity-model]
tags: [reference, manifest, governance]
last_updated: "2026-04-12"
related: [reference-index, implementation-index]
---
# IDP Platform Manifest

This manifest maps the canonical governance and implementation artifacts used for spec-driven development in the current repository.

## Governing Documents

- Constitution: [foundation/constitution.md](../foundation/constitution.md)
- Architecture: [foundation/architecture.md](../foundation/architecture.md)
- Security model: [foundation/security-model.md](../foundation/security-model.md)
- Requirements: [specs/platform-requirements.md](../specs/platform-requirements.md)
- Capability maturity standard: [reference/maturity-model.md](./maturity-model.md)

## Current State and Planning

- Status matrix: [headless-iam-status-matrix.md](./headless-iam-status-matrix.md)
- Requirements gap matrix: [headless-iam-requirements-gap-matrix.md](./headless-iam-requirements-gap-matrix.md)
- Validation review guide: [implementation/planning/headless-iam-standalone-validation-review-guide.md](../implementation/planning/headless-iam-standalone-validation-review-guide.md)
- Implementation plan: [implementation/deployment/implementation-plan.md](../implementation/deployment/implementation-plan.md)
- Roadmap: [implementation/deployment/roadmap.md](../implementation/deployment/roadmap.md)

## Code and Contract Sources

- Contracts and SDK: `contracts/`
- API runtime modules: `apps/api-server/src/platform/`
- UI runtime modules: `apps/enterprise-ui/src/`
- Verification and helper scripts: `scripts/`

## Notes

- Historical references to `docs/spec/*.idp.md` and `docs/spec/plans/*` are legacy path names and are not the canonical source in this repo.
- New docs should link to the current `docs/` paths listed above.
