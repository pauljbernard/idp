---
id: reference-index
type: index
domain: reference
status: stable
version: "2.0"
dependencies: [platform-requirements, maturity-model]
tags: [reference, support-matrix, readiness, status]
last_updated: "2026-04-12"
related: [specs-index, implementation-index]
---
# Reference Materials

This index covers the current reference corpus used to evaluate support posture, maturity, and readiness.

## Canonical References

### Governance and source mapping

| Document | Role |
|----------|------|
| [Capability Maturity Standard](maturity-model.md) | Normative maturity, support-tier, and evidence vocabulary |
| [Platform Manifest](platform-manifest.md) | Canonical mapping between governing docs, contracts, runtime code, and scripts |

### Current-state support references

| Document | Role |
|----------|------|
| [Headless IAM Status Matrix](headless-iam-status-matrix.md) | Current implementation maturity and evidence posture |
| [Headless IAM Requirements Gap Matrix](headless-iam-requirements-gap-matrix.md) | Requirement-to-gap view for remediation planning |

### Support matrices

| Matrix | Role |
|--------|------|
| [Protocol Support Matrix](protocol-support-matrix.md) | Supported and deferred protocol surface |
| [Federation Support Matrix](federation-support-matrix.md) | Federation provider-family posture |
| [WebAuthn Support Matrix](webauthn-support-matrix.md) | Browser and authenticator support posture |
| [SAML Profile Matrix](saml-profile-matrix.md) | SAML support posture by profile |

## Usage Rules

- Use these references for support and readiness claims.
- Prefer these documents over older narrative summaries when they conflict.
- Treat them as the current-state layer beneath the constitution and requirements.

## Legacy Path Handling

Some maintained documents still refer to historical paths such as `docs/spec/*.idp.md` or `docs/spec/plans/*`. Unless those paths exist, resolve them through the current canonical files in this index and [Implementation Guides](../implementation/index.md).
