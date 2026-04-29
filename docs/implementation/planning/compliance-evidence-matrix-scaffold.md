---
id: compliance-evidence-matrix-scaffold
type: implementation
domain: planning
status: draft
version: "1.0"
dependencies: [platform-requirements, maturity-model, headless-iam-status-matrix]
tags: [compliance, security, evidence, controls, planning]
last_updated: "2026-04-29"
related: [environment-readiness, gap-remediation, headless-iam-status-matrix]
---
# Compliance Evidence Matrix Scaffold

## Purpose

This document is the working scaffold for the external control and evidence program required to support standards-bearing security claims that cannot be closed through repository code changes alone.

It is intended to organize:

- framework control mapping,
- implementation ownership,
- evidence source location,
- target-environment validation status,
- inherited-control boundaries,
- and explicit claim limits for unsupported or partially evidenced areas.

## Claim Boundary

Until each control family below is backed by concrete target-environment evidence, the platform should not claim broad compliance with:

- FIPS 199 Moderate operating posture,
- NIST SP 800-53 Rev. 5 alignment,
- NIST SP 800-171 Rev. 2 alignment,
- ISO/IEC 27001 and ISO/IEC 27002 alignment,
- SOC 2 Type II-oriented control evidence,
- or broad protocol/security-profile completeness outside the supported profiles already declared in the maintained status documents.

## Control Matrix Template

Use one row per control family or requirement cluster.

| Framework | Control family | Requirement summary | Repo implementation reference | Inherited / external dependency | Required evidence | Current status | Owner | Gap / next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NIST 800-53 | Access control | Example placeholder | `apps/api-server/src/...` | AWS IAM / operator process | Policy review, access review records, target-env verification | Not started | TBD | Fill |
| ISO 27001 | Cryptography | Example placeholder | `apps/api-server/src/platform/secretStore.ts` | KMS / secrets management runtime | KMS config, key rotation records, production key-source evidence | Partial | TBD | Replace local fallback evidence with target-env evidence |
| SOC 2 | Logging and monitoring | Example placeholder | `apps/api-server/src/platform/iamHealthRuntime.ts` | SIEM / alerting stack | Alert routing, retention, audit trail review | Partial | TBD | Validate in target environment |

## Required Evidence Domains

### 1. Cryptography and Secret Custody

- production secret-key source in use, not development fallback
- key custody and rotation evidence for signing and encryption keys
- TLS termination posture, certificate lifecycle, and cipher-policy evidence
- KMS configuration and key-policy review where applicable

### 2. Identity, Access, and Administrative Security

- least-privilege administrative authorization review
- privileged access review cadence
- impersonation-control evidence where supported
- delegated administration scope validation

### 3. Logging, Audit, and Monitoring

- immutable or integrity-protected audit-log handling
- alerting and escalation paths
- retention and review evidence
- correlation between runtime audit events and operational monitoring

### 4. Backup, Restore, and Recovery

- target-environment backup execution evidence
- restore rehearsal against current backup lineage
- signing-key rotation drill evidence
- recovery drill evidence in the intended runtime environment

### 5. Network and Environment Security

- network boundary definition
- WAF / rate-limit / ingress policy evidence
- approved geography / data-residency posture
- environment hardening and patch posture

### 6. Protocol and Interoperability Evidence

- supported OIDC profile interoperability evidence
- supported SAML SP profile interoperability evidence
- passkey / WebAuthn browser and authenticator evidence
- federation-provider interoperability evidence for each claimed provider family

## Target-Environment Validation Pack

The external evidence program should collect at minimum:

1. environment architecture diagram and trust-boundary definition
2. live `/api/v1/iam/operations/health` and readiness outputs
3. benchmark runs against the real target environment
4. backup, restore, and key-rotation drill artifacts
5. IAM / network / secret-store policy exports or reviewed summaries
6. TLS, ingress, and certificate configuration evidence
7. audit-retention and alert-routing evidence
8. protocol interoperability artifacts for each supported profile

## Ownership Model

Suggested owners:

- Platform engineering: runtime controls, deployment evidence, benchmark evidence
- Security engineering: framework mapping, control interpretation, gap acceptance
- Operations / SRE: target-environment evidence, recovery drills, monitoring proof
- Product / architecture: claim boundary approval and supported-profile publication

## Exit Criteria

This scaffold becomes a claim-bearing matrix only when:

- every required control family has an explicit status,
- inherited controls are named rather than implied,
- evidence artifacts are linked and dated,
- unsupported or partial areas are explicitly marked,
- and product-facing claims are reduced to the evidenced supported surface.
