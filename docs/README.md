# IDP Platform Documentation

**Agent-Optimized Documentation System**

This documentation is structured for optimal consumption by both human developers and AI agents, with machine-readable metadata, clear dependency graphs, and standardized information architecture.

## Quick Navigation

### 🔍 **For AI Agents**
**REQUIRED**: [`AGENT_USAGE_GUIDE.md`](AGENT_USAGE_GUIDE.md) → [`foundation/architecture.md`](foundation/architecture.md) → Follow dependency chains

### 👨‍💻 **For Developers**
Start here: [`implementation/quick-start/getting-started.md`](implementation/quick-start/getting-started.md)

### 🛠️ **For Operators**
Start here: [`implementation/deployment/overview.md`](implementation/deployment/overview.md)

### 🎨 **For Designers**
Start here: [`specs/ui/design-system.md`](specs/ui/design-system.md)

## Documentation Architecture

```
docs/
├── foundation/          # Core concepts and principles
│   ├── architecture.md     # System architecture overview
│   ├── design-principles.md # Design and UX principles
│   ├── security-model.md    # Security architecture
│   └── index.md            # Foundation index
├── specs/              # Technical specifications
│   ├── authentication/     # Auth flows and protocols
│   ├── federation/         # Identity federation
│   ├── operations/         # Ops and monitoring specs
│   ├── ui/                # Design system specs
│   ├── api/               # API specifications
│   └── index.md           # Specs index
├── implementation/     # Step-by-step guides
│   ├── quick-start/       # Getting started guides
│   ├── deployment/        # Infrastructure deployment
│   ├── integration/       # Application integration
│   ├── development/       # Development workflows
│   └── index.md          # Implementation index
├── reference/          # Quick lookup materials
│   ├── api-reference.md   # Complete API reference
│   ├── troubleshooting.md # Problem resolution
│   ├── glossary.md        # Term definitions
│   └── index.md          # Reference index
└── analysis/           # Business and technical analysis
    ├── competitive-analysis.md
    ├── market-assessment.md
    └── index.md
```

## Metadata Standard

All documents include structured frontmatter:

```yaml
---
id: unique-document-id
type: foundation | specification | implementation | reference | analysis
domain: authentication | federation | operations | ui | api | deployment
status: draft | review | stable | deprecated
version: "1.0"
dependencies: [other-document-ids]
tags: [oauth, security, enterprise]
last_updated: "2024-04-12"
related: [related-document-ids]
---
```

## Document Types

| Type | Purpose | Structure | Agent Usage |
|------|---------|-----------|-------------|
| **Foundation** | Core concepts that inform everything else | Principle → Context → Application | Context building |
| **Specification** | Detailed technical requirements | Requirements → Design → Validation | Implementation guidance |
| **Implementation** | Step-by-step procedures | Overview → Steps → Verification | Process execution |
| **Reference** | Quick facts and lookups | Index → Details → Examples | Fact checking |
| **Analysis** | Business context and decisions | Context → Analysis → Recommendations | Strategic understanding |

## Navigation Patterns

### Dependency-Based Navigation
Documents declare dependencies, enabling agents to build context progressively:
```yaml
dependencies: [architecture, security-model]  # Read these first
related: [api-reference, troubleshooting]     # Useful related content
```

### Domain-Based Navigation
Content organized by functional domain for focused exploration:
- **Authentication**: OAuth, SAML, WebAuthn, MFA
- **Federation**: External IdP integration, protocol mapping
- **Operations**: Deployment, monitoring, backup/recovery
- **UI**: Design system, components, patterns
- **API**: OpenAPI specs, SDK documentation

### Task-Based Navigation
Implementation guides organized by user goals:
- **Quick Start**: Get running in < 30 minutes
- **Deployment**: Production infrastructure setup
- **Integration**: Connect applications to IDP
- **Development**: Extend and customize platform

## Quality Standards

### For Agents
- 🚨 **CRITICAL**: Read [`AGENT_USAGE_GUIDE.md`](AGENT_USAGE_GUIDE.md) for behavior expectations
- ✅ Structured metadata in all documents
- ✅ Consistent document structure within types
- ✅ Explicit dependency relationships
- ✅ Standardized file naming (kebab-case)
- ✅ Cross-reference validation

### For Humans
- ✅ Clear headings and scannable structure
- ✅ Code examples with language indicators
- ✅ Consistent terminology (see glossary)
- ✅ Visual diagrams where helpful
- ✅ Step-by-step procedures for tasks

## Maintenance

- **Automated Validation**: Links and cross-references checked in CI
- **Version Control**: All changes tracked with rationale
- **Review Process**: Technical accuracy validated against implementation
- **Dependency Updates**: Automated notification of upstream changes
- **Usage Analytics**: Track most-accessed paths for optimization

---

**Last Updated**: 2024-04-12
**Version**: 2.0 (Agent-Optimized)
**Maintainers**: IDP Platform Team