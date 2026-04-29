---
id: specs-index
type: index
domain: specifications
status: stable
version: "2.0"
dependencies: [platform-constitution, platform-architecture, platform-requirements]
tags: [specifications, requirements, supported-surface]
last_updated: "2026-04-12"
related: [implementation-index, reference-index]
---
# Technical Specifications

This index lists the specifications that are currently present in the repository. It is a map of the maintained spec corpus, not a target-state backlog.

## Canonical Specifications

### Platform-wide

| Specification | Role | Notes |
|---------------|------|-------|
| [Platform Requirements](platform-requirements.md) | Normative product and system requirements | Primary requirements baseline for standalone IAM and IDP work |

### Authentication

| Specification | Role | Notes |
|---------------|------|-------|
| [OAuth 2.1 and OIDC Flows](authentication/oauth-flows.md) | Current protocol flow specification | Use with status matrix before making support claims |

### Operations

| Specification | Role | Notes |
|---------------|------|-------|
| [Deployment Modes](operations/deployment-modes.md) | Deployment posture and operating-mode guidance | Use with readiness docs for release decisions |

### UI

| Specification | Role | Notes |
|---------------|------|-------|
| [Design System](ui/design-system.md) | Visual and component-system baseline | Pair with design principles |
| [Component Specs](ui/component-specs.md) | Component-level expectations | Current UI component behavior |
| [Interaction Patterns](ui/interaction-patterns.md) | Interaction semantics | User flows and interface behavior |
| [Information Architecture](ui/information-architecture.md) | Navigation and structure patterns | UI information hierarchy |
| [Design Tokens](ui/design-tokens.md) | Token vocabulary | Shared UI variables and system tokens |

## Spec Governance

All claim-bearing specifications are governed by:

1. [Platform Constitution](../foundation/constitution.md)
2. [Platform Requirements](platform-requirements.md)
3. [Capability Maturity Standard](../reference/maturity-model.md)

When a feature spec does not explicitly declare support tier, maturity state, supported profiles, or evidence posture, use the current support references in [Reference Materials](../reference/index.md) before treating the spec as a release claim.

## How To Use This Index

- Use [Platform Requirements](platform-requirements.md) for product-surface requirements and adoption gates.
- Use domain specs for design and implementation details.
- Use [Implementation Guides](../implementation/index.md) for sequencing, rollout, and evidence capture.
- Use [Reference Materials](../reference/index.md) for support matrices, readiness posture, and gap tracking.

## Maintenance Rules

- Do not add links here until the document exists.
- Remove or downgrade entries when a document is deprecated or superseded.
- Keep `dependencies` aligned with the actual governing documents for the spec set.
