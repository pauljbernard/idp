---
id: claude-bootstrap
type: guide
domain: agent-bootstrap
status: stable
version: "2.1"
dependencies: [agent-bootstrap, agent-usage-guide, platform-constitution, platform-requirements, maturity-model]
tags: [agents, claude, bootstrap]
last_updated: "2026-04-12"
related: [docs-root, dependency-map]
---
# IDP Platform - Claude Bootstrap

This file is a Claude-specific adapter. The canonical repository bootstrap is `AGENTS.md` plus the generic documents under `docs/`.

Start with `docs/agent-bootstrap.json`, resolve ids through `docs/dependency-map.json`, and use `docs/capability-registry.json` for capability-family support posture.

Do not infer support from implementation presence. If documents conflict, prefer constitution, then requirements, then maintained spec metadata, then status references.

Run `npm run docs:validate` after changing maintained docs or agent config.
