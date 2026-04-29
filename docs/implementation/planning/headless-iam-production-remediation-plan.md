---
id: headless-iam-production-remediation-plan
type: implementation
domain: planning
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, planning]
last_updated: "2024-04-12"
related: []
---
# Headless IAM Production Remediation Plan (Security + Scale)

Last updated: 2026-03-27

## Priority 1 — Security Hardening (Immediate)

1. **Authentication enforcement**
   - Continue replacing legacy placeholder identities with strict bearer token/session enforcement.
   - Validate token lifecycle for every bearer path (signature, expiry, revocation, active subject) before allowing admin or management operations.
   - Ensure disabled users/service accounts and stale sessions are rejected during auth checks.

2. **Boundary hardening**
   - Keep explicit origin allowlist for CORS and tighten in-session headers.
   - Enforce strong transport/security headers (`helmet`, `x-powered-by` off, request correlation IDs).
   - Add request timeouts and no-store headers for sensitive account/session routes.

3. **Rate limiting and abuse prevention**
   - Keep fast in-memory guardrails for dev/test immediately.
   - Add endpoint-level hard limits for auth, token, login, broker, and token-exchange style paths.
   - Move to shared distributed limiter in production (Redis/DynamoDB) before scale rollout.

4. **Audit + fault handling**
   - Require correlation IDs on all denied/failed auth and session events.
   - Standardize 401/403/429 error payloads and remove verbose internal context.

## Priority 2 — Data/Compute Scalability (Next)

1. **Persistence replacement (critical)**
   - Replace local in-memory/in-file runtime stores for IAM domains with AWS-native backing:
     - `dynamodb` for users/realms/clients/roles/mappings/sessions/tokens
     - `dynamodb` for audit trails and operational ledgers
     - `s3` for large theme/extension artifacts and large profiles
   - Keep current JSON seed compatibility importer for bootstrap and migration tooling.

2. **Execution profile for scale**
   - Front API with API Gateway + Lambda (Node runtime).
   - Keep session/token-heavy and protocol-heavy operations as first-class Lambda functions with separate timeouts and memory sizes.
   - Move high-latency periodic operations (resilience jobs, key rotation, cleanup, readiness scans) into EventBridge/Lambda scheduled tasks.

3. **Performance/data-shape controls**
   - Add pagination/search indexes for list endpoints that can return large sets (realms, users, roles, sessions, audit events, permissions, clients).
   - Add filtering, sort, and projection controls to avoid over-fetching.
   - Cache hot metadata (well-signed public configuration, JWKS, realm capability summaries) at CDN/Lambda layer boundaries.

4. **Multi-tenant isolation**
   - Model access-control and partition keys around `realm_id` and `tenant_id` consistently.
   - Add TTL and lifecycle policies for tokens, authorization grants, refresh entries, and challenge state.

5. **Constrained blast radius**
   - Introduce async bounded worker queues for expensive federation/notification/bulk operations.
   - Use idempotency keys for writes where retriable retries are possible.

## Target Throughput Notes for 22k Realms / 1.2M users / 75k concurrent

- Start with partition-aware DynamoDB table design and secondary indexes for user email/username/session lookups.
- Use adaptive concurrency and burst handling in API Gateway + Lambda reserved capacity for auth spikes.
- Place protocol-sensitive endpoints on dedicated function sets with conservative cold-start mitigations (provisioned concurrency where needed).
- Validate at target scale with stress tests around:
  - login + token exchange,
  - session lookup/update,
  - token introspection/revocation,
  - user/group/role reads,
  - authorization checks.

## Phase 1 Implementation Status (Done now)

- ✅ CORS allowlist + strict origin behavior.
- ✅ Correlation IDs and request-level logging hardening.
- ✅ In-memory token-bucket rate limiting for API-wide and auth-sensitive paths.
- ✅ Bearer token validation replaced by runtime token resolution and active-principal enforcement.
- ✅ Disabled/invalid subject status rejection in bearer context.
- ✅ API host binding and timeout/caching controls for sensitive paths.

## Immediate next items to finish Phase 1

- Expand auth-sensitive path coverage for all interactive login/broker/token endpoints under one central matcher.
- Add distributed rate-limiter adapter interface (Redis/DynamoDB) and wire a swap-in implementation.
- Add list-pagination + index-aware filters for endpoints likely to hit 10k+ row responses.
- Add load-test profiles and latency budgets for target concurrency tiers.
