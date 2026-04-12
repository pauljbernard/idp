# Headless IAM Standalone Validation Review Guide

## Purpose

This guide defines how the standalone IAM subsystem must be reviewed before any IDP migration, IDP authentication integration, or downstream adoption work is allowed to begin.

The current rule remains strict:

- the IAM subsystem is validated as its own product,
- IDP remains a separate consumer candidate,
- no migration or binding work should be treated as approved until this review passes.

## Review Scope

The review must cover the standalone IAM plane only:

- multi-realm foundation and clone-and-bind model
- RBAC and delegated administration
- client and protocol runtime
- browser authentication and account security
- federation and brokering
- branding and notification runtime
- hardening and security operations

The review must explicitly exclude:

- IDP auth cutover
- tenant-directory replacement
- CMS migration onto IAM
- training or developer-portal migration onto IAM

## Required Validation Tracks

### 1. Authentication and Session Control

- successful browser login
- failed credential attempts
- lockout after repeated credential failures
- lockout after repeated MFA failures
- session creation and session revocation
- token issuance and token revocation
- password reset and required-action enforcement

### 2. Administrative Security Operations

- administrative password reset
- generated temporary-password flow
- forced user session invalidation
- forced issued-token invalidation
- lockout clearance
- user login-history review

### 3. Request-Level Audit Review

- every standalone IAM request recorded in the request ledger
- failed requests recorded with path, method, status, and correlation ID
- security review can filter by realm and outcome
- no IDP tenant audit dependency required

### 4. Realm Isolation

- validation realms remain standalone
- IDP tenant bindings are not treated as integration approval
- destructive tests occur only in validation realms
- exported realm snapshots are captured before broader testing

## Agentic Development Rules

- Agents must only use standalone validation realms and standalone validation users.
- Agents must not rebind IDP production-meaningful consumers to standalone IAM without explicit approval.
- Generated passwords, reset previews, and lockout state are synthetic artifacts and must be treated as disposable test data.
- Review should prefer explicit security-ledger verification over inferring success from UI changes alone.
- Any future adoption work must define rollback, snapshot, and blast-radius controls before the first integration task starts.

## Minimum Exit Criteria Before Any Integration Review

- request-level security audit ledger is active and reviewable
- failed-login telemetry and lockout are demonstrated
- administrative reset and forced invalidation controls are demonstrated
- validation checklist is reviewed and accepted
- standalone behavior is verified through documented tests, not ad hoc inspection
- no unresolved critical auth, token, session, or federation defects remain open

## Current Posture

As of the current implementation pass:

- the IAM subsystem remains standalone
- migration remains blocked pending review and validation
- Phase 6 hardening is in progress
- IDP has not been migrated onto the subsystem
