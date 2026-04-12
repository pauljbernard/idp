---
id: claude-bootstrap
type: guide
domain: agent-bootstrap
status: stable
version: "2.0"
dependencies: [agent-usage-guide, platform-constitution, platform-requirements, maturity-model]
tags: [agents, claude, bootstrap]
last_updated: "2026-04-12"
related: [docs-root, dependency-map]
---
# IDP Platform - Claude Bootstrap

This repository has a maintained documentation system for agentic development. Use it instead of historical assumptions or stale file paths.

## Required Read Order

1. `docs/AGENT_USAGE_GUIDE.md`
2. `docs/foundation/constitution.md`
3. `docs/foundation/architecture.md`
4. `docs/specs/platform-requirements.md`
5. `docs/reference/maturity-model.md`

Then route by task using `docs/dependency-map.json` and the current indexes under `docs/`.

## Critical Rule

For maintained feature specifications, read these frontmatter fields before relying on prose:

- `support_tier`
- `maturity_state`
- `supported_profiles`
- `evidence_class`

When documents conflict:

1. prefer constitution and requirements over summaries,
2. prefer spec metadata over narrative claims,
3. prefer status matrices and validation guides over aspirational planning language.

## Current Canonical References

- `docs/README.md`
- `docs/AGENT_USAGE_GUIDE.md`
- `docs/dependency-map.json`
- `docs/reference/headless-iam-status-matrix.md`
- `docs/reference/headless-iam-requirements-gap-matrix.md`
- `docs/implementation/planning/headless-iam-standalone-validation-review-guide.md`

## Validation

- Run `npm run docs:validate` after changing maintained docs or agent config.
- Do not introduce links to documents that do not exist in the current repository.
