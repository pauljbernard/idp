---
id: saas-cms-governance-extraction-plan
type: implementation
domain: planning
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, planning]
last_updated: "2024-04-12"
related: []
---
# SaaS CMS Governance Extraction Plan

Last updated: 2026-04-11

## Purpose

This document defines the next extraction step after the IDP boundary correction work.

The goal is to move governance-workflow and governance-access implementation ownership into the `saas-cms` product boundary while keeping the IDP responsible only for generic identity and control-plane contracts.

This plan answers four questions:

1. what stays in the IDP,
2. what moves to `saas-cms`,
3. what transitional compatibility is acceptable,
4. and what can be deleted from this repo after cutover.

## Current Corrected IDP Boundary

The IDP repo now exposes neutral public surfaces instead of product-specific ones:

- shared governance workflow routes are exposed at `/governance/workflows/...`
- shared governance access routes are exposed at `/governance/access/...`
- app-specific LMS, scheduling, and workforce identity-binding contracts have been replaced with the generic IAM contract [iam-external-identity-bindings-api.json](../../../contracts/api/iam-external-identity-bindings-api.json)
- server composition now depends on [governanceWorkflowRuntime.ts](../../../apps/api-server/src/platform/governanceWorkflowRuntime.ts) and [governanceAccessRuntime.ts](../../../apps/api-server/src/platform/governanceAccessRuntime.ts) rather than importing CMS-named runtime modules directly

This is the correct public boundary, but the underlying implementation still remains physically hosted in this repo through:

- [cmsWorkflowRuntime.ts](../../../apps/api-server/src/platform/cmsWorkflowRuntime.ts)
- [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts)

That is the remaining extraction target.

## What Must Stay In The IDP

The IDP should retain only generic identity and control-plane responsibilities:

- IAM-authenticated principal issuance and bearer validation
- application-binding contracts and identity bootstrap metadata
- generic external identity-binding contracts and any truly generic binding policy
- user, group, role, session, federation, token, and governance-related identity facts
- support matrices, readiness, recovery, and operational evidence owned by the IAM product itself

The IDP should not own:

- CMS editorial workflow lifecycle semantics
- CMS review-stage definitions
- CMS release-safety decisions
- CMS editorial role-assignment semantics
- application-specific adapter APIs for LMS, scheduling, workforce, or CMS

## What Must Move To `saas-cms`

The following implementation responsibility should move to the `saas-cms` repo and application boundary:

### Governance workflow engine

Move ownership of:

- workflow summary computation
- workflow listing and detail resolution
- release-safety evaluation
- submit / decision / comment lifecycle
- workflow history and comments persistence
- workflow stage definitions and editorial semantics

Current source in this repo:

- [cmsWorkflowRuntime.ts](../../../apps/api-server/src/platform/cmsWorkflowRuntime.ts)

Target state:

- a governance workflow module in `saas-cms`
- or a shared governance service deployed and owned with the CMS/application tier

### Governance access model

Move ownership of:

- governance/editorial role catalog
- governance assignment model
- editorial access evaluation
- governance API token model, if retained as a CMS-owned machine credential plane
- space-aware governance access policies

Current source in this repo:

- [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts)

Target state:

- a governance access module in `saas-cms`
- or a shared governance access service owned with the CMS/application tier

### CMS-facing client service naming

The CMS application should own CMS-domain naming. It is acceptable for the CMS repo to keep names like:

- `getCmsInstructionalWorkflowSummary`
- `submitCmsInstructionalWorkflow`
- editorial role labels
- release-safety semantics

Those are application-owned concepts and should not be normalized away inside the CMS/application boundary.

## Transitional Target Architecture

The correct near-term target is:

1. `saas-cms` owns governance workflow and governance access implementation
2. `saas-cms` exposes either:
   - its own product-domain routes, or
   - a shared governance service that it owns operationally
3. the IDP consumes or references only generic identity facts and generic binding contracts

If a shared governance service is retained, its contract should stay neutral:

- `/governance/workflows/...`
- governance actor context
- governance stage decisions
- governance release-safety metadata

If the shared service is not retained, then these routes should exist only in `saas-cms`, not in the IDP.

## IDP Compatibility Posture During Migration

During migration, the following compatibility posture is acceptable:

- the IDP may continue to host the neutral `/governance/workflows/...` route family temporarily
- the IDP may continue to carry facade modules:
  - [governanceWorkflowRuntime.ts](../../../apps/api-server/src/platform/governanceWorkflowRuntime.ts)
  - [governanceAccessRuntime.ts](../../../apps/api-server/src/platform/governanceAccessRuntime.ts)
- downstream clients may switch first to the neutral contracts before the physical implementation moves

This allows a two-step migration:

1. boundary correction
2. physical extraction

The repo has completed step 1 and has begun step 2 through neutral runtime facades.

## `saas-cms` Work Items

The `saas-cms` repo should implement the following sequence:

1. Create a governance workflow module or service using the current workflow semantics from [cmsWorkflowRuntime.ts](../../../apps/api-server/src/platform/cmsWorkflowRuntime.ts) as the temporary source model.
2. Create a governance access module or service using the current access semantics from [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts) as the temporary source model.
3. Move persistence ownership for workflow and editorial access state into `saas-cms`.
4. Move CMS/governance OpenAPI ownership into `saas-cms`.
5. Repoint any CMS-facing UI and backend clients to the `saas-cms`-owned governance surface.
6. Validate tenant-aware governance workflow operations and governance access evaluation end-to-end in `saas-cms`.

## Delete List For This Repo After Cutover

Once `saas-cms` owns the implementation and traffic is cut over, the following should be removed from this repo:

- [cmsWorkflowRuntime.ts](../../../apps/api-server/src/platform/cmsWorkflowRuntime.ts)
- [cmsAccessRuntime.ts](../../../apps/api-server/src/platform/cmsAccessRuntime.ts)
- [governanceWorkflowRuntime.ts](../../../apps/api-server/src/platform/governanceWorkflowRuntime.ts)
- [governanceAccessRuntime.ts](../../../apps/api-server/src/platform/governanceAccessRuntime.ts)
- `/governance/workflows/...` server routes in [server.ts](../../../apps/api-server/src/server.ts)
- governance workflow OpenAPI path entries in [openapi.ts](../../../apps/api-server/src/openapi.ts)

Delete only after:

- `saas-cms` exposes the replacement runtime,
- clients are repointed,
- and route-level verification is green in the owning repo.

## Contracts The IDP Should Continue To Own

Even after extraction, the IDP should continue to own:

- [iam-external-identity-bindings-api.json](../../../contracts/api/iam-external-identity-bindings-api.json)
- IAM application-binding contracts
- IAM auth bootstrap and identity bootstrap contracts
- IAM realm-binding and identity-projection contracts

The generic external identity-binding contract should remain neutral and generic.
Application-specific shapes belong in application-owned adapter layers, not in the IDP repo.

## Verification Required Before Deletion

Before deleting the remaining governance runtime from this repo, confirm:

1. `saas-cms` has a green route-level suite for workflow summary, list, detail, release safety, submit, stage decision, and comments
2. editorial/governance access evaluation is green in `saas-cms`
3. no remaining clients in this repo target the deleted governance routes
4. the IDP still passes route and docs verification after route removal

## Bottom Line

The IDP-side correction is largely complete.

The remaining implementation ownership for governance workflow and governance access should move to `saas-cms`.

Additional heavy refactoring inside this repo is no longer the highest-value step unless it directly supports:

- temporary migration facades,
- cutover safety,
- or final deletion after `saas-cms` takes ownership.
