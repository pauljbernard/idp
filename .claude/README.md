# Claude Code Agent Configuration

This directory contains specialized configuration files for Claude Code and other AI agents working on the IDP Platform.

## Files Overview

| File | Purpose | Usage |
|------|---------|-------|
| `agent_instructions.md` | **START HERE** - Immediate actions and overview | First read for new agents |
| `project_context.md` | Project overview and key information | Context establishment |
| `agent_config.json` | Machine-readable behavioral configuration | Automated agent setup |
| `documentation_map.json` | Complete documentation navigation | Agent-optimized guidance |

## Quick Start for Agents

1. **Read** `agent_instructions.md` (this provides immediate context)
2. **Read** `../CLAUDE.md` (Claude Code specific instructions)
3. **Read** `../docs/AGENT_USAGE_GUIDE.md` (comprehensive behavioral guide)
4. **Follow** the foundation reading sequence in `agent_config.json`

## Configuration Integration

These files are designed to be automatically detected and used by:

- **Claude Code**: Via `.claude` directory convention
- **GitHub Copilot**: Via workspace settings and documentation
- **Custom AI tools**: Via JSON configuration files
- **IDE integrations**: Via VSCode settings and recommendations

## Agent Behavior Standards

All agents working on this platform must:
- Follow documentation-first approach
- Prioritize security requirements
- Maintain enterprise-grade quality
- Validate against multiple sources
- Never compromise on security for convenience

## Documentation Architecture

The IDP Platform documentation is rated **9/10 for agent-friendliness** with:
- Structured metadata in all documents
- Clear dependency relationships
- Domain-based organization
- Progressive context building
- Zero information loss during migration

## Security Priority

⚠️ **CRITICAL**: This is an enterprise identity platform handling authentication and authorization for sensitive systems. Security requirements are non-negotiable.

### Mandatory Security Patterns
- OAuth 2.1 with mandatory PKCE
- Zero-trust architecture
- Multi-tenant isolation
- Comprehensive audit logging
- Rate limiting and DDoS protection

### Prohibited Patterns
- OAuth 2.0 implicit flow (deprecated)
- Optional PKCE (always required)
- Unencrypted data storage
- Single-tenant designs
- Bypassed security controls

## Quality Assurance

All agent implementations must meet:
- >90% test coverage
- TypeScript type safety
- Enterprise performance standards
- Comprehensive error handling
- Operational monitoring

## Support and Escalation

For configuration issues or questions:
1. Consult `../docs/reference/troubleshooting.md`
2. Review agent behavioral expectations in documentation
3. Escalate to platform architects for architectural questions
4. Contact security team for security-related concerns

---

**Last Updated**: 2024-04-12
**Maintained By**: IDP Platform Team
**Configuration Version**: 1.0