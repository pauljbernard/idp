---
id: docs-root
type: index
domain: documentation
status: stable
version: "2.1"
dependencies: [foundation-index, specs-index, implementation-index, reference-index, analysis-index]
tags: [documentation, navigation, agentic-development]
last_updated: "2026-04-12"
related: [agent-usage-guide, dependency-map]
---
# IDP Platform Documentation

This repository uses a spec-driven documentation model for the standalone IAM and IDP platform. The documentation is organized around the files that actually exist in this repository today, not a future target-state doc map.

## Canonical Starting Points

### For agents
Read in this order:

1. [Agent Usage Guide](AGENT_USAGE_GUIDE.md)
2. [Platform Constitution](foundation/constitution.md)
3. [Platform Architecture](foundation/architecture.md)
4. [Platform Requirements](specs/platform-requirements.md)
5. [Capability Maturity Standard](reference/maturity-model.md)
6. Follow the current dependency map in [dependency-map.json](dependency-map.json)

### For developers
Start with [Getting Started](implementation/quick-start/getting-started.md), then use [Implementation Guides](implementation/index.md) to move into planning or deployment work.

### For reviewers and planners
Start with [Platform Requirements](specs/platform-requirements.md), [Headless IAM Status Matrix](reference/headless-iam-status-matrix.md), and [Standalone Validation Review Guide](implementation/planning/headless-iam-standalone-validation-review-guide.md).

## Current Documentation Architecture

```text
docs/
├── foundation/
│   ├── constitution.md
│   ├── architecture.md
│   ├── security-model.md
│   ├── design-principles.md
│   └── index.md
├── specs/
│   ├── authentication/oauth-flows.md
│   ├── operations/deployment-modes.md
│   ├── ui/
│   ├── platform-requirements.md
│   └── index.md
├── implementation/
│   ├── quick-start/getting-started.md
│   ├── planning/
│   ├── deployment/
│   └── index.md
├── reference/
│   ├── maturity-model.md
│   ├── headless-iam-status-matrix.md
│   ├── headless-iam-requirements-gap-matrix.md
│   ├── protocol-support-matrix.md
│   ├── federation-support-matrix.md
│   ├── webauthn-support-matrix.md
│   ├── saml-profile-matrix.md
│   ├── platform-manifest.md
│   └── index.md
├── analysis/
│   ├── competitive-analysis.md
│   ├── saas-readiness-assessment.md
│   ├── spec-driven-development.md
│   ├── test-suite-analysis.md
│   └── index.md
├── AGENT_USAGE_GUIDE.md
└── dependency-map.json
```

## Canonical Hierarchy

1. [Platform Constitution](foundation/constitution.md)
2. [Foundation Documents](foundation/index.md)
3. [Domain Specifications](specs/index.md)
4. [Implementation Plans and Runbooks](implementation/index.md)
5. [Support Matrices and Status References](reference/index.md)
6. [Analysis and Assessments](analysis/index.md)

## Metadata Standard

All maintained documents should include frontmatter with at least:

```yaml
---
id: unique-document-id
type: foundation | specification | implementation | reference | analysis | index | guide
domain: documentation-domain
status: draft | review | stable | deprecated
version: "X.Y"
dependencies: [document-ids]
tags: [keywords]
last_updated: "YYYY-MM-DD"
related: [document-ids]
---
```

Claim-bearing maintained specifications must also include these frontmatter keys:

- `support_tier`
- `maturity_state`
- `supported_profiles`
- `evidence_class`

For claim-bearing specifications, the body must also declare:

- support tier
- current maturity state
- supported profiles
- exclusions or deferred variants
- evidence required for advancement

Those requirements are defined normatively in [Platform Constitution](foundation/constitution.md) and [Capability Maturity Standard](reference/maturity-model.md).

## Agentic Development Rules

- Use the existing repository tree as the source of truth.
- Prefer documents that declare support boundaries and evidence posture over narrative-only summaries.
- Treat status matrices and validation guides as operational truth for readiness decisions.
- Treat stale or conflicting links outside the canonical path as migration debt unless a canonical index points to them directly.

## Maintenance

- Run `npm run docs:validate` to validate canonical docs metadata and local links.
- Update `last_updated` whenever a maintained document changes materially.
- Update [dependency-map.json](dependency-map.json) when canonical dependencies change.
- Do not add aspirational links to indexes before the target documents exist.
