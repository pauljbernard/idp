---
id: spec-driven-development
type: analysis
domain: spec-driven-development.md
status: stable
version: "1.0"
dependencies: []
tags: [analysis, business, spec-driven-development.md]
last_updated: "2024-04-12"
related: []
---
# We Didn’t Start by Writing Auth Code. We Started by Defining the Product: Building an IDP with Spec-Driven Development

Most teams do not decide to build an identity provider all at once.

They arrive there gradually.

First, there is a login page. Then a user table. Then roles. Then a few tokens. Then an admin screen. Then federation becomes urgent. Then audit becomes mandatory. Then someone asks whether the system can support multiple tenants, delegated administration, passkeys, SAML, or a regulated customer without rewriting the whole stack.

That is the moment when a lot of internal authentication systems reveal what they really are: not identity platforms, but collections of tactical decisions.

We wanted to avoid that trap.

So when we set out to build our IDP, we did something that felt slower at first and turned out to be much faster later: we treated identity as a product before we treated it as code.

That choice shaped everything that followed.

## The first decision was architectural, not technical

We were not trying to add “better auth” to one application. We were trying to build a standalone identity and access platform that our own product could consume, and that future first-party or partner applications could also use without special-case logic.

That distinction mattered.

If the goal is just to get users signed in, the shortest path is to wire credentials into the application and keep moving. But if the goal is to build a real identity provider, the problem is much broader. You need realms, clients, scopes, protocol mappers, service accounts, browser login flows, recovery flows, delegated administration, federation, audit, rate limiting, account self-service, and eventually the hard parts everyone postpones: PKCE, SAML lifecycle support, passkeys, authorization services, and readiness review.

In our case, we wrote that down explicitly.

The constitution and requirements for the system set the bar early: this platform had to be standalone, multi-tenant, RBAC-native, standards-based, auditable, and economically viable in an AWS-native, serverless-first model. Just as important, the documents also made clear what the system was not allowed to become. It was not supposed to collapse into app-specific identity logic. It was not supposed to quietly turn into a business-domain customer database. It was not supposed to rely on privileged backdoors just because the host product and the identity subsystem lived in the same broader environment.

That level of clarity sounds heavy until you try to build identity without it.

## Spec-driven development changed the order of work

The usual flow in software is code first, documentation later. We inverted that.

The product definition came first. Then the requirements. Then the implementation plan. Then the OpenAPI contracts. Then the SDK contract manifest. Only after those layers were in place did the codebase start filling in around them.

This was not documentation for documentation’s sake. The specs were the operating constraints for the build.

They told us:

- what the identity subsystem had to own,
- what consuming applications had to own,
- which standards mattered,
- which capabilities were mandatory before we could honestly call it a full IDP,
- and what evidence would be required before downstream adoption was allowed.

That last point was especially important.

We explicitly did not allow “it works for our app” to count as proof that the identity platform was complete. The review guides in the project made that boundary very clear: the IAM subsystem had to be validated as its own product before any migration effort could use adoption as cover for unfinished platform work.

That is one of the biggest advantages of spec-driven development on infrastructure-heavy systems. It prevents success theater.

## Contracts gave the system its shape

Once the specs were stable enough, the OpenAPI contracts became the map of the platform.

Instead of a single vague “auth API,” the system was decomposed into contract families that reflected real identity domains:

- authentication,
- realms,
- clients and client policies,
- authorization runtime,
- organizations and invitations,
- user profile schemas,
- WebAuthn,
- federation,
- security operations,
- deployment and health,
- review and readiness,
- and a long list of protocol and administration surfaces around them.

That decomposition had a surprisingly strong effect on implementation quality.

When the contracts are explicit, hand-wavy architecture has fewer places to hide. You can see where a capability belongs. You can see when two concerns are being mixed together. You can tell when a feature is still “conceptually present” but not actually modeled. And because the contracts were numerous and specific, the system naturally evolved as a platform made of bounded domains rather than a monolithic authentication blob.

Even the internal SDK was tied back to those contracts. We added a verification step that checked whether SDK operations still aligned with the OpenAPI contract set. That seems like a small detail, but it reinforced a bigger rule: interfaces were not allowed to drift just because implementation moved quickly.

## The code followed the spec boundaries

One of the more satisfying parts of the project was seeing the module structure mirror the planning artifacts.

The implementation plan called out the major gap domains needed to reach a full standalone IDP: advanced OAuth and OIDC behavior, SAML completion, an authentication flow engine, modern authentication, fine-grained admin authorization, authorization services, extensibility, standalone productization, and production hardening.

Those domains then showed up in the runtime as concrete modules:

- `iamAuthenticationRuntime`
- `iamAuthorizationRuntime`
- `iamAdvancedOAuthRuntime`
- `iamAuthFlows`
- `iamWebAuthn`
- `iamOrganizations`
- `iamAdminAuthorization`
- `iamAuthorizationServices`
- `iamExtensionRegistry`
- `iamDeploymentRuntime`
- `iamHealthRuntime`
- `iamReviewRuntime`

That may sound obvious, but it is not how identity systems usually grow. More often, they accrete in a few overloaded files until “auth” becomes a catch-all category for everything from login to tenant mapping to email recovery to admin privilege checks.

Spec-driven development gave us a different discipline. We were not asking, “Where can we fit this feature?” We were asking, “Which declared capability is this implementing?”

That small difference kept the architecture legible.

## The platform was designed as a product, not just a runtime

Another lesson from the process was that identity platforms are not just protocol engines.

If you want a real IDP, you need more than token issuance. You need operational posture.

That is why the system included review surfaces, security audit paths, resilience validation, readiness evidence, and deployment-oriented runtime modules alongside protocol features. It also explains why the local development model and the production model were both described up front. For development, the platform could run with filesystem persistence and in-memory rate limiting. For production-oriented operation, the same interfaces could switch to DynamoDB and S3-backed persistence and distributed throttling.

That was a direct consequence of the original spec: the platform had to stay economically viable under low-to-moderate utilization, which pushed us toward an AWS-native, serverless-first architecture instead of a default cluster-heavy design.

In other words, the specs did not just describe features. They described operating economics.

## Validation was part of the build, not something saved for the end

A spec-driven system only works if the team is willing to verify against the spec continuously.

So we built validation into the project in several layers.

There were contract verification scripts to catch SDK drift. There were Playwright journey tests for real sign-in and sign-out flows. There were security evaluation checks that verified protected routes stayed protected, key headers were set, and production dependencies did not introduce high or critical vulnerabilities. There were performance smoke tests that exercised the public catalog and login paths against defined latency budgets. And there were review guides that spelled out the minimum exit criteria before the identity platform could be considered ready for any meaningful downstream adoption.

That changed the tone of the project.

Instead of debating readiness abstractly, we could point to evidence. Instead of saying “the platform feels close,” we could ask whether the required validation tracks were passing. Instead of letting integration pressure redefine completeness, we could compare the current state against the previously written acceptance bar.

This matters a lot in identity work because identity systems rarely fail as demos. They fail at the edges: on logout semantics, on audit gaps, on token lifecycle mistakes, on weak recovery controls, on missing rate limits, on administrative overreach, and on assumptions that were never written down.

Specs are how you surface those assumptions before production does it for you.

## The hardest discipline was refusing premature victory

One of the most useful documents in the project was not a success document. It was the assessment that said, in plain language, that the subsystem was architecturally serious but not yet a true Keycloak-class standalone product.

That kind of honesty is rare and extremely valuable.

By that point, the platform already had real strengths: realms, roles, groups, clients, discovery, JWKS, token issuance, introspection, revocation, browser login, MFA, self-service account flows, federation, experience customization, security audit, and operational validation. Many teams would have stopped there and declared the problem solved.

But the specs had already defined a higher bar.

A full standalone IDP still required stronger browser authorization flows, richer standards coverage, more complete SAML lifecycle behavior, configurable authentication flows, passkeys, finer-grained admin authorization, extensibility, and stronger standalone product neutrality. Because those expectations were written in advance, the team could not quietly redefine “done” to mean “good enough for the current demo.”

That is another underrated benefit of spec-driven development: it protects the integrity of the roadmap.

## What I would carry forward from this approach

If I had to reduce the experience to a few principles, they would be these.

First, define the product boundary before you implement the first endpoint. Identity systems become messy when no one decides what the platform owns and what consuming applications own.

Second, write the constraints down in language that is hard to misread. “Reusable,” “standalone,” and “secure” mean very little until they are translated into explicit operational and architectural requirements.

Third, let contracts drive decomposition. A platform with dozens of explicit surfaces is easier to reason about than a vague service with one oversized auth controller.

Fourth, make validation part of the architecture. Tests, contract checks, performance budgets, and review gates should not be add-ons. They are part of the product definition.

Finally, be willing to document the gap between “working” and “complete.” For infrastructure products, that gap is where most of the real engineering lives.

## Closing thought

Building an IDP with spec-driven development did not make the work smaller. It made the work visible.

That visibility changed the outcome.

It forced us to separate product intent from implementation convenience. It pushed us to treat standards, operations, economics, and validation as first-class concerns. It gave the codebase a structure that reflected the problem we were actually solving. And it created a shared language for deciding what had been built, what still mattered, and what evidence would count as proof.

Identity is one of those domains where shortcuts compound silently until they become architecture. Spec-driven development was our way of making sure the architecture was intentional from the start.
