---
id: claude-project-context
type: guide
domain: claude-config
status: stable
version: "2.0"
dependencies: [claude-bootstrap, platform-constitution, platform-requirements, maturity-model]
tags: [claude, context, project]
last_updated: "2026-04-12"
related: [docs-root, dependency-map]
---
# IDP Platform - Project Context

## Project Overview

Standalone IAM and IDP platform with bounded supported protocol surfaces, explicit claim boundaries, and spec-driven delivery.

## Canonical Documentation Model

- Foundation and governance: `docs/foundation/`
- Specifications: `docs/specs/`
- Implementation planning and evidence: `docs/implementation/`
- Status and support references: `docs/reference/`
- Analysis and assessments: `docs/analysis/`

Start with:

1. `docs/AGENT_USAGE_GUIDE.md`
2. `docs/foundation/constitution.md`
3. `docs/foundation/architecture.md`
4. `docs/specs/platform-requirements.md`
5. `docs/reference/maturity-model.md`

## Claim Boundary Model

Maintained specifications expose these structured fields:

- `support_tier`
- `maturity_state`
- `supported_profiles`
- `evidence_class`

Use them before relying on prose summaries.

## Current Operational Truth

- `docs/reference/headless-iam-status-matrix.md`
- `docs/reference/headless-iam-requirements-gap-matrix.md`
- `docs/implementation/planning/headless-iam-standalone-validation-review-guide.md`

## Validation

- `npm run docs:validate`
- `node scripts/verify-governance.js`
