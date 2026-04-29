---
id: cms-iam-integration-assessment
type: implementation
domain: planning
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, planning]
last_updated: "2024-04-12"
related: []
---
# CMS IAM Integration Assessment

Last updated: 2026-04-11

## Scope

This document reviews whether the standalone CMS subsystem is integrated with the identity and access subsystem in the manner intended by the constitution and requirements.

This is an integration assessment, not an LMS or CMS implementation plan.

Boundary note:

- the IDP repo has now corrected the public boundary by replacing the former CMS-specific workflow route family with the neutral `/governance/workflows/...` surface
- the IDP repo has also replaced the former CMS-specific governance-access route family with the neutral `/governance/access/...` surface
- the IDP contract set no longer publishes application-specific LMS, scheduling, and workforce binding APIs; those have been replaced by the generic IAM contract [iam-external-identity-bindings-api.json](../../../contracts/api/iam-external-identity-bindings-api.json)
- the remaining physical extraction of governance workflow and governance access implementation is tracked in [SaaS CMS Governance Extraction Plan](./saas-cms-governance-extraction-plan.md)

## Intended Model

The governing documents require the CMS subsystem to support:

- federated user authentication for interactive administration
- API tokens for machine-to-machine administration and delivery
- RBAC and permission policy enforcement for schemas, entries, environments, media, releases, and workflows
- identity- and entitlement-aware content resolution using canonical user, role, group, tenant, application, segment, solution-pack, subscription, purchase, add-on, and grant context
- explicit ownership boundaries where IAM remains authoritative for users, groups, roles, realms, sessions, and authentication posture

Primary anchors:

- [Platform Constitution](../../foundation/constitution.md)
- [Platform Requirements](../../specs/platform-requirements.md)

The intended architecture is not:

- a completely standalone CMS user directory
- a local CMS auth silo
- or a global super-admin-only gate masquerading as CMS-native editorial RBAC

The intended architecture is:

- IAM-authenticated principals
- CMS-native role and policy semantics
- CMS consuming IAM identity and permission context without becoming the source of truth for those identities

## Current State Summary

### What is already correct

The CMS subsystem is not disconnected from IAM.

- `/api/v1/cms` is gated through IDP global permission checks using `cms.read` and `cms.manage` in [server.ts](../../../apps/api-server/src/server.ts).
- Those global permissions are projected from standalone IAM bearer identity through the same IDP authorization projection path used for other subsystems in [server.ts](../../../apps/api-server/src/server.ts).
- A CMS-specific client role `cms-admin` exists in IAM seed data in [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts).
- CMS API tokens are implemented for machine-to-machine access in [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts).
- CMS role families and CMS role assignments exist as standalone CMS domain objects in [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts).

That means the CMS is partially integrated with IAM already.

### What is not yet correct

The integration is still coarse and incomplete.

The current design still behaves like:

- IAM grants access to the CMS surface at a global subsystem level
- CMS maintains its own internal editorial RBAC records
- but the interactive CMS user path does not actually enforce those internal CMS roles and space scopes

That is weaker than the intended model.

The recent IDP-side boundary correction fixed route naming and contract ownership. It did not yet move the underlying governance workflow and governance access implementation into `saas-cms`.

## Findings

### P1. Interactive CMS or governance authorization does not currently evaluate CMS-native role assignments

The strongest remaining defect is in [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts) and the server composition layer in [server.ts](../../../apps/api-server/src/server.ts), even though the public route namespace has been neutralized.

`cmsAccessRuntime.ts` defines:

- CMS roles
- CMS role assignments
- CMS principal types including `USER`, `GROUP`, `SERVICE`, and `EXTERNAL_IDENTITY`
- space-scoped roles

But the only real authorization evaluator implemented in that file is `authorizeApiToken(...)`, which only evaluates CMS API tokens.

The interactive user gate for CMS or governance operations does not call any CMS principal authorization evaluator. It only does:

- CMS API token authorization if `x-cms-api-token` or bearer token matches a CMS token
- otherwise global IDP permission checks for `cms.read` or `cms.manage`

That means CMS-native interactive roles are persisted but not enforced for actual user-side authorization.

**Impact**

- authors, reviewers, publishers, instructional designers, and assessment reviewers are modeled but not actually used to authorize interactive CMS operations
- CMS is effectively relying on outer global subsystem access instead of its own intended editorial RBAC plane

### P1. Space-scoped CMS roles and `allowed_space_ids` are not enforced

[cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts) stores:

- `scope`
- `allowed_space_ids`
- `SPACE_SCOPED` roles

But there is no user-side evaluator consuming those fields for interactive authorization or scoped delivery access.

I found `allowed_space_ids` being created and updated, but not enforced anywhere meaningful outside token metadata storage. The route gate is still effectively global. The CMS or governance APIs do not appear to reduce accessible spaces or entries based on CMS space-scoped assignments.

**Impact**

- a space-scoped CMS authoring model exists on paper but not in effective runtime policy
- CMS cannot yet claim correct enforcement for per-space editorial delegation

### P1. Seeded IAM CMS editor roles are not projected into real CMS access

The IAM seed data defines:

- a CMS validation realm in [iamFoundation.ts](../../../apps/api-server/src/platform/iamFoundation.ts)
- `cms-admin`
- `content-editor`
- seeded CMS users including `cms.editor`

But the IDP IAM projection layer only maps `cms-admin` into global CMS access. The outer CMS gate is still based on IDP global permissions `cms.read` and `cms.manage`.

I did not find a projection path that turns the seeded IAM `content-editor` role into effective CMS interactive permissions. The current CMS UI also keys mutation behavior off `hasPermission('cms.manage')`, which is the global platform permission, not a CMS-native editor or reviewer capability.

**Impact**

- the intended IAM-to-CMS editorial role integration is incomplete
- CMS validation personas exist in IAM but are not actually first-class interactive CMS actors in the IDP consumer surface

### P2. CMS interactive UX is still effectively gated by platform-global CMS authority

The current CMS page determines management capability with `hasPermission('cms.manage')`.

That is a coarse subsystem-level check, not a CMS-native editorial access model. The page copy also still frames CMS mutation as restricted by global administrative posture rather than clearly reflecting the CMS-native author, reviewer, publisher, instructional designer, and assessment reviewer roles that the backend models.

**Impact**

- the user experience does not reflect the intended delegated editorial role model
- CMS administrative posture is still closer to a platform-admin console than a fully realized editorial workspace integrated with IAM-backed actors

### P2. CMS delivery is not yet truly identity- and entitlement-aware in the intended sense

The requirements promised identity- and entitlement-aware content resolution using canonical user, role, group, tenant, application, segment, subscription, purchase, add-on, and grant context.

The current public delivery endpoints in [server.ts](../../../apps/api-server/src/server.ts) pass mostly query-driven inputs such as:

- `target_tenant_id`
- `locale`
- `audience`
- `space_id`

The delivery runtime resolves locale and audience, and personalization can apply audience branches, but this is not yet the same as full canonical IAM- and entitlement-aware content resolution.

I did not find delivery runtime resolution that directly evaluates:

- canonical IAM role or group context
- identity context from `req.identityContext`
- canonical commerce or entitlement context
- grant or subscription context

**Impact**

- CMS delivery is headless and targeted, but not yet fully integrated with IAM and entitlement context as intended
- current targeting is closer to audience-key routing than real identity-aware delivery policy

### P3. CMS API tokens are real, but they are a local CMS token model rather than IAM service accounts

This is not necessarily a defect. The requirements explicitly allow API tokens. A standalone CMS token plane is acceptable.

However, it means the current machine-to-machine path is:

- workable
- local to CMS
- but not unified with IAM service-account governance

That may be acceptable as a product decision, but it should be treated as a deliberate architectural choice, not mistaken for full IAM unification.

## Assessment

The CMS is **partially integrated** with IAM, but it is **not yet fully integrated in the intended manner**.

### Current maturity judgment

- outer subsystem entry and bearer-auth posture: `mostly correct`
- CMS-native interactive editorial RBAC integrated with IAM principals: `not complete`
- per-space CMS delegation and scope enforcement: `not complete`
- identity-aware and entitlement-aware CMS delivery: `not complete`

If scored narrowly for intended CMS/IAM integration completeness, I would rate it approximately:

- `6/10`

That is enough to prove subsystem coupling exists, but not enough to claim the intended model is finished.

## Recommended Remediation Sequence

### 1. Add a real CMS principal authorization evaluator

Create a user-side evaluator in [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts) that can resolve:

- IAM-backed users
- IAM-backed groups
- service accounts
- external identities

into effective CMS permissions and allowed-space scopes.

The `/api/v1/cms` route family should use that evaluator for interactive authorization, not only global `cms.read` and `cms.manage`.

### 2. Map IAM identities into CMS-native editorial roles

Define the intended projection between IAM identities and CMS-native editorial roles:

- author
- reviewer
- publisher
- instructional designer
- assessment reviewer
- super administrator

That can be done through:

- CMS role assignments against IAM principal ids
- IAM group mapping
- or IAM client or realm role mapping into CMS-native roles

But the mapping needs to be real and enforced, not only seeded.

### 3. Enforce `SPACE_SCOPED` roles and `allowed_space_ids`

Space-scoped authoring needs runtime enforcement across:

- spaces
- schemas
- entries
- media
- workflows
- releases

Without that, delegated editorial governance is structurally incomplete.

### 4. Extend delivery to consume real identity and entitlement context

CMS delivery should gain a resolved policy-input layer that can consume:

- IAM user and group context
- tenant context
- application binding context
- commerce and entitlement context where relevant

The current audience query approach can remain as a surface input, but it should not be the full policy model.

### 5. Add explicit verification for CMS/IAM integration

The system needs live proof scripts for:

- IAM-backed CMS editor read and write behavior
- reviewer vs publisher permission separation
- space-scoped enforcement
- external-identity principal assignments
- identity-aware delivery resolution

## Bottom Line

The CMS is not disconnected from IAM. The outer bearer-auth and global permission integration is real.

However, the repository should now be read in two layers:

- the IDP public boundary has been corrected so the platform no longer advertises CMS-specific workflow routes or app-specific adapter contracts as IDP-owned public surface
- the remaining workflow and access implementation still needs to move into `saas-cms`, as defined in [SaaS CMS Governance Extraction Plan](./saas-cms-governance-extraction-plan.md)

But the intended model was stronger than that. The current CMS still behaves like a globally gated subsystem with a partially implemented internal editorial RBAC model. To be fully integrated as intended, CMS-native editorial roles, principal assignments, space scopes, and identity-aware delivery need to be enforced through real IAM-backed principal resolution rather than only through platform-global `cms.read` and `cms.manage`.
