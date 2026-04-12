---
id: claude-agent-instructions
type: guide
domain: claude-config
status: stable
version: "2.0"
dependencies: [claude-bootstrap, agent-usage-guide, platform-constitution, platform-requirements]
tags: [claude, instructions, bootstrap]
last_updated: "2026-04-12"
related: [docs-root, dependency-map]
---
# Agent Instructions for IDP Platform

This file is a Claude-specific adapter. Follow the generic bootstrap in `../docs/agent-bootstrap.json` and the repository bootstrap in `../AGENTS.md` when deciding authority.

## Immediate Actions

1. Read `../docs/agent-bootstrap.json`.
2. Read `../CLAUDE.md`.
3. Read `../docs/AGENT_USAGE_GUIDE.md`.
4. Read `../docs/foundation/constitution.md`.
5. Read `../docs/foundation/architecture.md`.
6. Read `../docs/specs/platform-requirements.md`.
7. Read `../docs/reference/maturity-model.md`.
8. Read `../docs/capability-registry.json`.

## How To Reason About Claims

For maintained feature specifications, read these frontmatter keys before relying on any body prose:

- `support_tier`
- `maturity_state`
- `supported_profiles`
- `evidence_class`

Treat:

- constitution and requirements as governing intent,
- status and support matrices as current-state evidence,
- validation guides as adoption and readiness gates.

## Canonical References

- `../docs/agent-bootstrap.json`
- `../docs/README.md`
- `../docs/capability-registry.json`
- `../docs/dependency-map.json`
- `../docs/reference/headless-iam-status-matrix.md`
- `../docs/reference/headless-iam-requirements-gap-matrix.md`
- `../docs/implementation/planning/headless-iam-standalone-validation-review-guide.md`

## Validation

Run `npm run docs:validate` after changing maintained docs or agent configuration.
