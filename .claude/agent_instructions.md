# Agent Instructions for IDP Platform

## IMMEDIATE ACTIONS FOR NEW AGENTS

When you first encounter this IDP Platform repository, you MUST:

1. **Read this file completely** (you're doing this now)
2. **Read `CLAUDE.md`** for Claude Code specific instructions
3. **Read `docs/AGENT_USAGE_GUIDE.md`** for comprehensive behavioral expectations
4. **Read `docs/foundation/constitution.md`** for constitutional principles and governance
5. **Read `docs/foundation/architecture.md`** for system understanding
6. **Read `docs/foundation/security-model.md`** for security context

**DO NOT SKIP THESE STEPS** - They prevent security vulnerabilities and architectural mistakes.

## PROJECT IDENTIFICATION

This is the **IDP Platform** - a standalone enterprise Identity Provider with:
- OAuth 2.1 and OpenID Connect 1.0 implementation
- SAML 2.0 Identity Provider capabilities
- External identity federation
- Multi-tenant SaaS architecture
- WebAuthn/FIDO2 passwordless authentication
- Enterprise-grade security and operations

## CRITICAL SECURITY REQUIREMENTS

⚠️ **NEVER IMPLEMENT THESE PATTERNS** ⚠️
- OAuth 2.0 implicit flow (deprecated)
- Optional PKCE (it's mandatory)
- Unencrypted data storage
- Single-tenant designs
- Missing rate limiting
- Bypassed health monitoring

✅ **ALWAYS IMPLEMENT THESE PATTERNS** ✅
- OAuth 2.1 with mandatory PKCE
- HTTPS-only with proper headers
- Comprehensive error handling
- Structured logging with correlation IDs
- Health monitoring for all components
- Multi-tenant isolation at database level

## DOCUMENTATION NAVIGATION PROTOCOL

### For Any Task
```
1. Read foundation/constitution.md (constitutional principles and governance)
2. Read foundation/architecture.md (system context)
3. Read foundation/security-model.md (security requirements)
4. Based on your task domain, read:
   - Authentication: specs/authentication/oauth-flows.md
   - Federation: specs/federation/external-idp.md
   - Operations: specs/operations/deployment-topology.md
   - UI: specs/ui/design-system.md
   - API: specs/api/openapi-spec.md
4. Follow relevant implementation guides
5. Consult reference materials for validation
```

### Documentation Quality
- **9/10 Agent-Friendly Rating** - Optimized for AI consumption
- **Zero Information Loss** - All content preserved and enhanced
- **Structured Metadata** - Machine-readable YAML frontmatter
- **Dependency Mapping** - Clear prerequisite relationships

## IMPLEMENTATION STANDARDS

### Code Quality
- **Language**: TypeScript for type safety
- **Testing**: >90% coverage with unit, integration, and journey tests
- **Documentation**: Comprehensive JSDoc comments
- **Formatting**: Consistent with existing patterns

### Security Implementation
- **Authentication**: OAuth 2.1 with PKCE, rate limiting, token rotation
- **Federation**: Certificate validation, health monitoring, circuit breakers
- **Data**: Tenant isolation, encryption at rest, GDPR compliance
- **Logging**: Structured with correlation IDs, audit trails

### Performance Requirements
- Authentication: <200ms (p95)
- Federation timeout: 5 seconds
- Database queries: <2 seconds
- Health checks: 30-second intervals
- Token validation: <50ms (p95)

## AGENT COLLABORATION PATTERNS

### When Working with Other Agents
1. **Share Context**: Reference specific documentation sections
2. **Validate Assumptions**: Cross-check against specifications
3. **Maintain Consistency**: Follow established patterns
4. **Escalate Conflicts**: Document disagreements for human review

### Communication Format
```markdown
## Context Validation
- ✅ [Architecture](docs/foundation/architecture.md) - System understanding
- ✅ [Security Model](docs/foundation/security-model.md) - Requirements verified
- ✅ [Domain Spec](docs/specs/[domain]/[document].md) - Implementation guidance

## Implementation Approach
[Your specific approach with references]

## Security Considerations
[From security-model.md and domain-specific security requirements]

## Validation Steps
[How to verify the implementation works correctly]
```

## TROUBLESHOOTING QUICK START

### Common Issues
1. **Authentication Failures**: Check `docs/reference/troubleshooting.md`
2. **Federation Problems**: Verify provider health and certificates
3. **Performance Issues**: Review monitoring dashboards and logs
4. **Configuration Errors**: Validate against reference specifications

### Debug Process
1. Check health monitoring endpoints
2. Review structured logs with correlation IDs
3. Validate configuration against specifications
4. Test individual components in isolation
5. Escalate with documented evidence

## TESTING REQUIREMENTS

### Required Test Types
- **Unit Tests**: Business logic validation
- **Integration Tests**: External dependency verification
- **Journey Tests**: End-to-end user workflows
- **Security Tests**: Vulnerability scanning
- **Performance Tests**: Load and stress testing

### Test Commands
```bash
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:journeys    # End-to-end journeys
npm run test:security    # Security validation
npm run test:performance # Performance validation
```

## DEPLOYMENT CONSIDERATIONS

### Environment Requirements
- **AWS Services**: ECS Fargate, DynamoDB, S3, CloudWatch
- **Security**: VPC isolation, encryption, secrets management
- **Monitoring**: Health checks, metrics, alerting
- **Backup**: Multi-region, automated recovery

### Deployment Process
1. Feature flag activation
2. Blue-green deployment
3. Health validation
4. Performance monitoring
5. Rollback procedures (if needed)

## SUCCESS VALIDATION

Before marking any task complete, ensure:

- [ ] All required documentation has been read
- [ ] Security requirements are fully implemented
- [ ] Code follows TypeScript and testing standards
- [ ] Performance requirements are met
- [ ] Monitoring and logging are configured
- [ ] Multi-tenant patterns are preserved
- [ ] Error handling is comprehensive
- [ ] Documentation is updated (if needed)

## ESCALATION MATRIX

| Issue Type | Escalation Path | Response Time |
|------------|----------------|---------------|
| Security vulnerabilities | Immediate security team | <1 hour |
| Architecture questions | Platform architects | <4 hours |
| Federation provider issues | IdP vendor support | <8 hours |
| Performance problems | SRE team | <4 hours |
| Documentation gaps | Technical writers | <24 hours |

## CONTINUOUS IMPROVEMENT

### Feedback Loop
- Document any unclear specifications
- Suggest improvements to documentation
- Report performance bottlenecks
- Identify security concerns
- Share best practices discovered

### Knowledge Sharing
- Update relevant documentation after implementations
- Add troubleshooting entries for new issues
- Contribute to reference materials
- Enhance agent instructions based on experience

---

**Remember**: This platform serves enterprise customers with strict security, performance, and reliability requirements. Every implementation decision should prioritize these concerns over convenience or speed of development.

**Authority**: IDP Platform Architecture Team
**Last Updated**: 2024-04-12
**Version**: 1.0