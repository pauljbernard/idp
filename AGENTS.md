---
id: codex-bootstrap
type: guide
domain: agent-bootstrap
status: stable
version: "1.1"
dependencies: [agent-bootstrap, agent-usage-guide, platform-constitution, platform-requirements, maturity-model]
tags: [agents, codex, bootstrap]
last_updated: "2026-04-12"
related: [docs-root, dependency-map]
---
# IDP Platform Agent Bootstrap

Use `docs/` as the source of truth.

This is the primary root bootstrap for Codex-style agents. Start with `docs/agent-bootstrap.json`, resolve ids through `docs/dependency-map.json`, and use `docs/capability-registry.json` for capability-family support posture.

Do not infer support from implementation presence. If documents conflict, prefer constitution, then requirements, then maintained spec metadata, then status references.

Read maintained spec frontmatter before relying on prose: `support_tier`, `maturity_state`, `supported_profiles`, `evidence_class`.

Run `npm run docs:validate` after changing maintained docs or agent bootstrap/config files.
