---
id: agent-usage-guide
type: guide
domain: meta-documentation
status: stable
version: "2.0"
dependencies: [platform-constitution, platform-architecture, platform-requirements, maturity-model]
tags: [agents, documentation, navigation, verification]
last_updated: "2026-04-12"
related: [docs-root, dependency-map, headless-iam-status-matrix]
---
# Agent Usage Guide for IDP Platform Documentation

This guide defines how agents should navigate the current documentation corpus in this repository. It is intentionally constrained to real documents that exist now.

If token efficiency is important, start with [agent-bootstrap.json](agent-bootstrap.json) and use this guide only when you need the fuller narrative interpretation rules.

This guide is tool-agnostic. Root-level agent files such as `AGENTS.md` should point here, while tool-specific config directories should be treated as adapters onto this documentation model rather than separate authorities.

## Primary Directive

Agents must not infer product support from architecture intent alone. Implementation guidance must be grounded in:

1. constitutional requirements,
2. current specifications,
3. support and maturity references,
4. and current planning or readiness artifacts.

For capability-bearing work, agents must also consult the machine-readable [capability-registry.json](capability-registry.json) so support posture is derived from structured metadata instead of narrative summaries.

## Canonical Read Order

### Platform orientation

For the lowest-token bootstrap, read [agent-bootstrap.json](agent-bootstrap.json) first.

1. [Platform Constitution](foundation/constitution.md)
2. [Platform Architecture](foundation/architecture.md)
3. [Security Model](foundation/security-model.md) when the task affects auth, security, federation, or operations
4. [Platform Requirements](specs/platform-requirements.md)
5. [Capability Maturity Standard](reference/maturity-model.md)
6. [Capability Registry](capability-registry.json)

### Readiness and delivery context

After platform orientation, choose the relevant current-state references:

- [Headless IAM Status Matrix](reference/headless-iam-status-matrix.md)
- [Headless IAM Requirements Gap Matrix](reference/headless-iam-requirements-gap-matrix.md)
- [Standalone Validation Review Guide](implementation/planning/headless-iam-standalone-validation-review-guide.md)
- [Implementation Plan](implementation/deployment/implementation-plan.md)
- [Roadmap](implementation/deployment/roadmap.md)

### Domain-specific documents currently available

- Authentication: [OAuth 2.1 and OIDC Flows](specs/authentication/oauth-flows.md)
- Platform requirements: [Platform Requirements](specs/platform-requirements.md)
- Deployment posture: [Deployment Modes](specs/operations/deployment-modes.md)
- UI system: [Design System](specs/ui/design-system.md), [Component Specs](specs/ui/component-specs.md), [Interaction Patterns](specs/ui/interaction-patterns.md), [Information Architecture](specs/ui/information-architecture.md), [Design Tokens](specs/ui/design-tokens.md)

## Required Verification Steps

Before giving implementation or readiness advice, verify all of the following:

1. The document you are relying on exists in the current repo.
2. The document status is not `deprecated`.
3. Any claim about support, production readiness, or parity is backed by [Capability Maturity Standard](reference/maturity-model.md) language and current evidence in [Headless IAM Status Matrix](reference/headless-iam-status-matrix.md).
4. Any migration or downstream adoption advice is checked against [Standalone Validation Review Guide](implementation/planning/headless-iam-standalone-validation-review-guide.md).
5. If documents conflict, prefer constitution and requirements over summaries, and prefer status matrices and validation guides over aspirational index language.
6. For maintained feature specifications, read `support_tier`, `maturity_state`, `supported_profiles`, and `evidence_class` from frontmatter before relying on prose.
7. For capability-family questions, resolve the governing specifications and current-state references from [capability-registry.json](capability-registry.json) before broadening or narrowing a support claim.

## Interpretation Rules

### Support claims

- `Modeled` and `Implemented` do not mean generally supported.
- `Supported` and `Production-grade` require explicit profile boundaries and evidence posture.
- If a feature spec lacks support-tier or maturity language, use the status matrix before making a claim.
- If prose and structured metadata conflict, prefer maintained spec frontmatter and [capability-registry.json](capability-registry.json), then confirm against status matrices.

### Missing or stale docs

- Do not follow links that are not present in the repository.
- Treat historical references to `docs/spec/*.idp.md` or `docs/spec/plans/*` as legacy path references unless they are mirrored by current files under `docs/`.
- Treat stray root-level summary documents as non-canonical unless a maintained index explicitly adopts them; planning material belongs under `implementation/planning/` or `implementation/deployment/`, and status material belongs under `reference/`.
- Use `last_updated` as a signal, but when body text and metadata conflict, call out the conflict explicitly and defer to the most concrete current evidence.

## Task Routing

### Architecture or platform-boundary questions

Read:

1. [Platform Constitution](foundation/constitution.md)
2. [Platform Architecture](foundation/architecture.md)
3. [Platform Requirements](specs/platform-requirements.md)

### Readiness, parity, or support questions

Read:

1. [Capability Maturity Standard](reference/maturity-model.md)
2. [Headless IAM Status Matrix](reference/headless-iam-status-matrix.md)
3. [Headless IAM Requirements Gap Matrix](reference/headless-iam-requirements-gap-matrix.md)
4. Relevant planning docs under [implementation/planning](implementation/planning/)

### Implementation sequencing questions

Read:

1. [Implementation Guides](implementation/index.md)
2. [Implementation Plan](implementation/deployment/implementation-plan.md)
3. [Roadmap](implementation/deployment/roadmap.md)
4. Relevant cutover or readiness docs under [implementation/deployment](implementation/deployment/)

## Response Expectations

When answering from this documentation set:

- cite the governing document and the current-state document,
- cite the capability id from [capability-registry.json](capability-registry.json) when the answer is feature- or support-related,
- state whether you are describing intent, implemented behavior, or supported posture,
- and call out missing evidence rather than filling gaps with assumptions.

## Validation

Run `npm run docs:validate` when changing maintained index or governance documents.
