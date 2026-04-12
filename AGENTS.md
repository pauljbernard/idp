---
id: codex-bootstrap
type: guide
domain: agent-bootstrap
status: stable
version: "1.0"
dependencies: [agent-usage-guide, platform-constitution, platform-requirements, maturity-model]
tags: [agents, codex, bootstrap]
last_updated: "2026-04-12"
related: [docs-root, dependency-map]
---
# IDP Platform Agent Bootstrap

Use the documentation in `docs/` as the source of truth for this repository.

## Required Read Order

1. `docs/AGENT_USAGE_GUIDE.md`
2. `docs/foundation/constitution.md`
3. `docs/foundation/architecture.md`
4. `docs/specs/platform-requirements.md`
5. `docs/reference/maturity-model.md`

## Claim Boundary Rule

Before relying on any maintained feature specification, read these fields from its frontmatter:

- `support_tier`
- `maturity_state`
- `supported_profiles`
- `evidence_class`

Do not infer support, production readiness, or parity from implementation prose alone. Prefer:

1. constitution and requirements for governing intent,
2. spec frontmatter for declared support posture,
3. status and support matrices for current evidence,
4. planning and validation guides for sequencing and adoption gates.

## Current Canonical References

- `docs/README.md`
- `docs/dependency-map.json`
- `docs/reference/headless-iam-status-matrix.md`
- `docs/reference/headless-iam-requirements-gap-matrix.md`
- `docs/implementation/planning/headless-iam-standalone-validation-review-guide.md`

## Validation

Run `npm run docs:validate` after changing maintained docs or agent bootstrap/config files.
