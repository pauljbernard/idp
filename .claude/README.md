---
id: claude-config-readme
type: guide
domain: claude-config
status: stable
version: "2.0"
dependencies: [claude-bootstrap, agent-usage-guide]
tags: [claude, configuration, bootstrap]
last_updated: "2026-04-12"
related: [docs-root]
---
# Claude Configuration

This directory contains repo-local bootstrap files for Claude-style agents.

## Files

- `agent_instructions.md`: immediate bootstrap steps
- `project_context.md`: short repository context
- `agent_config.json`: machine-readable behavior and claim model
- `documentation_map.json`: canonical documentation routing

## Source of Truth

These files defer to the maintained documentation system under `docs/`.

Start with:

1. `../CLAUDE.md`
2. `../docs/AGENT_USAGE_GUIDE.md`
3. `../docs/README.md`

## Validation

Run `npm run docs:validate` after changing any maintained docs or agent config.
