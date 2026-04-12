# IDP Platform - Project Context

## Project Overview
Enterprise Identity Provider (IDP) Platform with OAuth 2.1, OIDC, SAML 2.0, federation, and multi-tenant SaaS capabilities.

## Architecture
- **Backend**: Node.js/TypeScript with AWS cloud-native services
- **Frontend**: React/TypeScript with modern component architecture
- **Database**: DynamoDB with tenant isolation
- **Deployment**: AWS ECS Fargate with auto-scaling
- **Monitoring**: CloudWatch with custom metrics

## Key Technologies
- OAuth 2.1 with mandatory PKCE
- OpenID Connect 1.0
- SAML 2.0 Identity Provider
- WebAuthn/FIDO2 passwordless authentication
- Multi-factor authentication (TOTP, SMS, backup codes)
- External identity provider federation

## Security Model
- Zero-trust architecture
- Multi-tenant isolation at database level
- Encryption at rest and in transit
- Comprehensive audit logging
- Rate limiting and DDoS protection

## Documentation Structure
- `docs/foundation/` - Core concepts (START HERE)
- `docs/specs/` - Technical specifications by domain
- `docs/implementation/` - Step-by-step guides
- `docs/reference/` - API docs and troubleshooting
- `docs/analysis/` - Business context and competitive analysis

## Critical Files
- `docs/foundation/architecture.md` - System architecture
- `docs/foundation/security-model.md` - Security requirements
- `docs/AGENT_USAGE_GUIDE.md` - Agent behavior expectations
- `CLAUDE.md` - Claude Code specific instructions

## Development Workflow
1. Read foundation documentation
2. Consult domain-specific specifications
3. Follow implementation guides
4. Validate against reference materials
5. Test with provided test suites

## Quality Standards
- TypeScript for type safety
- >90% test coverage
- Enterprise-grade error handling
- Comprehensive logging
- Performance monitoring