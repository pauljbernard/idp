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

Then use `docs/dependency-map.json` and the maintained indexes under `docs/` to route into the current corpus.

## Task Routing

### Platform boundaries, architecture, or ownership

Read:

1. `docs/foundation/constitution.md`
2. `docs/foundation/architecture.md`
3. `docs/specs/platform-requirements.md`

### Support, readiness, parity, or production claims

Read:

1. `docs/reference/maturity-model.md`
2. `docs/reference/headless-iam-status-matrix.md`
3. `docs/reference/headless-iam-requirements-gap-matrix.md`
4. `docs/implementation/planning/headless-iam-standalone-validation-review-guide.md`

### Implementation sequencing or remediation work

Read:

1. `docs/implementation/index.md`
2. `docs/implementation/deployment/implementation-plan.md`
3. `docs/implementation/deployment/roadmap.md`
4. `docs/implementation/deployment/gap-remediation.md`

### Authentication or protocol behavior

Read:

1. `docs/specs/authentication/oauth-flows.md`
2. `docs/specs/platform-requirements.md`
3. current support references in `docs/reference/`

### UI or UX behavior

Read:

1. `docs/specs/ui/design-system.md`
2. `docs/specs/ui/component-specs.md`
3. `docs/specs/ui/interaction-patterns.md`
4. `docs/specs/ui/information-architecture.md`
5. `docs/specs/ui/design-tokens.md`

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

When describing system state, separate:

- `intent`: what the constitution and requirements require
- `implemented behavior`: what the spec and code-facing docs describe
- `supported posture`: what the matrices and status docs currently justify
- `adoption gate`: what the validation and readiness docs currently allow

## Conflict Resolution

If documents conflict, resolve in this order:

1. `docs/foundation/constitution.md`
2. `docs/specs/platform-requirements.md`
3. maintained specification frontmatter
4. current status and support references in `docs/reference/`
5. planning and analysis documents

Call out conflicts explicitly instead of guessing.

## Legacy Path Guardrail

Do not treat these as canonical unless they are mirrored by current files under `docs/`:

- `docs/spec/*.idp.md`
- `docs/spec/plans/*`
- deleted or aspirational docs referenced by older planning text

Prefer current maintained paths under `docs/`.

## Current Canonical References

- `docs/README.md`
- `docs/dependency-map.json`
- `docs/reference/headless-iam-status-matrix.md`
- `docs/reference/headless-iam-requirements-gap-matrix.md`
- `docs/implementation/planning/headless-iam-standalone-validation-review-guide.md`

## Update Rules

If you change maintained specs:

- preserve `support_tier`
- preserve `maturity_state`
- preserve `supported_profiles`
- preserve `evidence_class`

If you add a maintained spec, include those fields from the start.

If you change canonical navigation, update:

- `docs/README.md`
- `docs/AGENT_USAGE_GUIDE.md`
- `docs/dependency-map.json`

## Validation

Run `npm run docs:validate` after changing maintained docs or agent bootstrap/config files.
