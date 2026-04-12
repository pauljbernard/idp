# IDP Platform: Test Suite Evidence Assessment

**Analysis Date**: April 11, 2026  
**Assessment Scope**: Internal test-evidence review  
**Evidence Boundary**: Test volume and internal journey coverage do not, by themselves, prove production readiness, standards parity, or competitive superiority. Capability claims must remain aligned to:

- [Capability Maturity Standard](../spec/capability-maturity-standard.idp.md)
- [Formal Status Matrix](../spec/plans/Headless_IAM_Status_Matrix.md)
- [Protocol Support Matrix](../spec/plans/Headless_IAM_Protocol_Support_Matrix.md)
- [Federation Support Matrix](../spec/plans/Headless_IAM_Federation_Support_Matrix.md)

---

## Executive Summary

The current test suite is a meaningful asset. It demonstrates that the platform has substantial internal verification effort across state handling, session behavior, protocol paths, and operational control surfaces.

What the suite currently supports:

- confidence that core IAM and protocol runtimes are not merely modeled
- confidence that several OIDC and browser-facing flows have real executable coverage
- confidence that recovery, readiness, and benchmark runtimes have implementation-level validation

What the suite does not automatically support:

- blanket production-readiness claims
- broad competitive superiority claims
- complete protocol parity claims
- broad federation or SAML support claims outside the declared support matrices

The correct interpretation is that the test suite improves implementation confidence and helps move capabilities from `Implemented` toward `Supported`. It is evidence input, not market proof.

---

## 1. Test Suite Strengths

### 1.1 Core Runtime Verification

The suite appears strongest in validating:

- state reload and persistence behavior
- session and token lineage handling
- distributed or restart-safe transient-state behavior
- operational review, benchmark, and recovery idempotency

This is useful because it reduces the risk that the platform remains purely architectural or synthetic in those areas.

### 1.2 Browser and OIDC Journey Coverage

The journey tests provide especially valuable evidence where they exercise:

- browser login behavior
- authorization-code and PKCE paths
- logout and session semantics
- dynamic client registration paths
- selected advanced OAuth paths already exposed by the runtime

These tests are some of the most relevant evidence for the current bounded release core.

### 1.3 Operational Control Verification

Tests around readiness, recovery, backup, and signing-key management are strategically useful because they support the platform's differentiator track around reviewability and operational governance.

That said, passing these tests is still internal evidence. It is not yet the same as repeated operational drills under declared production profiles.

---

## 2. Current Evidence Limits

### 2.1 Test Presence Is Not Support Breadth

Having a test for a feature does not automatically mean:

- the full profile is supported
- edge cases are covered
- the interoperability boundary is complete
- the feature is production-grade

This matters most for:

- SAML
- passkeys/WebAuthn
- federation providers
- advanced OAuth extensions

### 2.2 Internal Journeys Are Not External Validation

Many tests are highly useful but remain internal or platform-authored. That means they should be treated as:

- implementation evidence
- support-evidence candidates

They should not be treated as:

- neutral third-party proof
- market-validation proof
- full interoperability proof across heterogeneous customer environments

### 2.3 Operational Tests Are Not the Same as Operations

Readiness, benchmark, and recovery tests are important, but they do not yet establish:

- real production SLO attainment
- repeated scale validation
- multi-region proof
- field-proven recovery posture

Those require dedicated evidence work in later phases.

---

## 3. Practical Assessment by Test Category

| Test Category | Current Value | Current Limitation |
|--------------|---------------|--------------------|
| Unit tests for runtime/state logic | Strong implementation confidence | Not proof of supported external behavior |
| Browser/OIDC journeys | Strong release-core evidence | Still bounded to declared supported profiles |
| Advanced OAuth journeys | Useful implementation evidence | Must remain profile-bounded and maturity-bounded |
| SAML journeys | Important early evidence | Not enough for broad SAML support claims |
| Federation journeys | Useful runtime evidence | Provider realism and external proof still limited |
| Benchmark/recovery/readiness tests | Strong operational-model evidence | Not equivalent to production-grade operating proof |
| Security-oriented checks | Useful baseline | Not a substitute for formal security evaluation |

---

## 4. Best Use of the Test Suite in the Maturity Model

The safest and most useful role for the current suite is:

1. proving a capability is real enough to classify as `Implemented`
2. supporting movement to `Supported` when the exact supported profile is narrow and explicitly declared
3. identifying regressions while parity and hardening work continue

The suite should not yet be used as the sole basis to classify broad capability families as:

- `Production-grade`
- `Externally validated`

unless accompanied by the specific evidence required by the maturity standard.

---

## 5. Roadmap Implications

### 5.1 Preserve and Expand the Strongest Evidence Tracks

The highest-value existing test investments are the ones closest to release-core support:

- OIDC/browser interoperability journeys
- session and transient-state durability tests
- account and admin flow verification

### 5.2 Convert Internal Test Assets into Governed Evidence

The next step is not just adding more tests. It is classifying them correctly:

- which tests are implementation evidence
- which tests support declared supported profiles
- which areas still need external interoperability proof
- which areas remain synthetic or partial despite existing tests

### 5.3 Focus Future Test Work on the Highest-Risk Gaps

The most important remaining test-evidence gaps are:

- supported SAML profiles with external service providers
- passkey/WebAuthn browser-based standards validation
- federation-provider execution against realistic external systems
- recovery and scale drills for declared deployment profiles

---

## Conclusion

The IDP test suite is a real strength, but its value is in disciplined evidence building, not in broad superiority claims. It demonstrates that substantial portions of the platform are executable and verifiable. The next step is to map that test evidence cleanly to declared support profiles and maturity states, then close the remaining gaps where protocol breadth, external interoperability, or production-grade operating evidence are still missing.
