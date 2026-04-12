# IDP Platform - Claude Code Integration

## CRITICAL AGENT INSTRUCTIONS

**MANDATORY**: All Claude Code agents working on the IDP Platform MUST follow these instructions to ensure accurate, secure, and complete guidance.

### 🎯 PRIMARY DIRECTIVES

1. **Documentation-First Approach**: ALWAYS consult documentation before implementation
2. **Security-First**: Never compromise security for convenience
3. **Enterprise Standards**: Maintain enterprise-grade quality in all recommendations
4. **Zero-Trust Validation**: Verify all information against multiple sources

### 📚 REQUIRED READING SEQUENCE

When working on IDP Platform tasks, agents MUST read documents in this dependency order:

#### Foundation Phase (MANDATORY)
1. `docs/foundation/constitution.md` - Constitutional principles and governance
2. `docs/foundation/architecture.md` - System understanding
3. `docs/foundation/security-model.md` - Security context
4. `docs/foundation/design-principles.md` - UX and development principles

#### Domain-Specific Phase (Based on Task)
- **Authentication Tasks**: `docs/specs/authentication/oauth-flows.md`
- **Federation Tasks**: `docs/specs/federation/external-idp.md`
- **Operations Tasks**: `docs/specs/operations/deployment-topology.md`
- **UI Tasks**: `docs/specs/ui/design-system.md`
- **API Tasks**: `docs/specs/api/openapi-spec.md`

#### Implementation Phase
- `docs/implementation/[relevant-guides]/`
- `docs/reference/troubleshooting.md`

### 🚫 PROHIBITED BEHAVIORS

- ❌ Recommending OAuth 2.0 implicit flow (deprecated - use authorization code + PKCE)
- ❌ Suggesting optional PKCE (it's MANDATORY for all OAuth flows)
- ❌ Implementing authentication without rate limiting
- ❌ Storing secrets in environment variables (use AWS Secrets Manager)
- ❌ Creating single-tenant solutions (platform is multi-tenant by design)
- ❌ Bypassing health monitoring requirements
- ❌ Ignoring federation failover procedures

### ✅ REQUIRED BEHAVIORS

- ✅ Always implement OAuth 2.1 with mandatory PKCE
- ✅ Include comprehensive error handling and logging
- ✅ Implement proper session management with distributed coordination
- ✅ Follow zero-trust security principles
- ✅ Use structured logging with correlation IDs
- ✅ Implement health monitoring for all components
- ✅ Follow multi-tenant isolation patterns

### 🔐 SECURITY REQUIREMENTS

#### Authentication & Authorization
- OAuth 2.1 with mandatory PKCE for all public clients
- HTTPS-only with HSTS headers
- State parameter for CSRF protection
- Token rotation for refresh tokens
- Rate limiting: 10 requests/minute for auth endpoints

#### Federation & Trust
- Certificate validation for all external IdPs
- Attribute mapping validation before token issuance
- Health monitoring for federated providers
- Circuit breaker pattern for provider failures

#### Data Protection
- Tenant isolation at database level
- Encryption at rest for all sensitive data
- PII handling according to GDPR requirements
- Audit logging for all authentication events

### 📋 VALIDATION CHECKLIST

Before providing implementation guidance, agents MUST verify:

```yaml
validation_checklist:
  documentation_read:
    - foundation_architecture: true
    - security_model: true
    - domain_specifications: true
  security_validated:
    - oauth_21_compliance: true
    - pkce_mandatory: true
    - https_only: true
    - rate_limiting: true
  implementation_complete:
    - error_handling: true
    - logging: true
    - health_monitoring: true
    - testing_strategy: true
  enterprise_ready:
    - multi_tenant_support: true
    - scalability_considered: true
    - operational_procedures: true
    - disaster_recovery: true
```

### 🏗️ IMPLEMENTATION PATTERNS

#### Code Quality Standards
- TypeScript for all new code
- Comprehensive unit tests (>90% coverage)
- Integration tests for external dependencies
- Journey tests for end-to-end workflows

#### Architecture Patterns
- Domain-driven design with bounded contexts
- Event sourcing for audit trails
- CQRS for read/write separation
- Microservices with service mesh

#### Deployment Patterns
- Blue-green deployments with automated rollback
- Feature flags for gradual rollouts
- Circuit breakers for resilience
- Observability with metrics, traces, and logs

### 🔍 TROUBLESHOOTING PROTOCOLS

When encountering issues:

1. **Check Health Monitoring**: `docs/reference/troubleshooting.md`
2. **Review Logs**: Structured logging with correlation IDs
3. **Validate Configuration**: Against reference specifications
4. **Test Federation**: Provider health and certificate validity
5. **Escalate**: Document unknown issues for team review

### 🚀 PERFORMANCE REQUIREMENTS

- Authentication response time: <200ms (p95)
- Federation provider timeout: 5 seconds
- Database query timeout: 2 seconds
- Health check interval: 30 seconds
- Token validation: <50ms (p95)

### 📊 MONITORING & OBSERVABILITY

Required metrics for all implementations:
- Request/response times
- Error rates by type
- Authentication success/failure rates
- Federation provider health
- Database connection pool status
- Memory and CPU utilization

### 🔄 CHANGE MANAGEMENT

When implementing changes:
1. Update relevant documentation first
2. Implement with feature flags
3. Test in development environment
4. Validate security implications
5. Deploy with monitoring
6. Document lessons learned

### 📞 ESCALATION PATHS

For complex issues:
- **Security Concerns**: Escalate to security team immediately
- **Architecture Questions**: Consult platform architects
- **Federation Issues**: Contact IdP vendor support
- **Performance Problems**: Engage SRE team

### 🎯 SUCCESS METRICS

Agent performance measured by:
- Documentation dependency compliance: 100%
- Security requirement adherence: 100%
- Implementation completeness: >95%
- Code quality standards: >90%
- Operational readiness: 100%

## CLAUDE CODE SPECIFIC CONFIGURATIONS

### Tool Usage Priorities
1. **Read**: Always read documentation before implementation
2. **Grep**: Search for existing patterns and implementations
3. **Write**: Create code following established patterns
4. **Bash**: Test implementations with provided test suites
5. **WebSearch**: Only for external standards validation

### File Organization
- Follow existing directory structure
- Use kebab-case for new files
- Include comprehensive JSDoc comments
- Maintain consistent code formatting

### Testing Requirements
- Unit tests for all business logic
- Integration tests for external dependencies
- Journey tests for user workflows
- Performance tests for critical paths

---

**Compliance Note**: Deviation from these instructions may result in security vulnerabilities, performance issues, or architectural inconsistencies. When in doubt, read more documentation rather than less.

**Last Updated**: 2024-04-12
**Version**: 1.0
**Authority**: IDP Platform Architecture Team