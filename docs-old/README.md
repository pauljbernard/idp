# IDP Platform Documentation

This documentation system is optimized for both human readers and AI agents, providing structured, machine-readable information about the Identity Provider platform.

## Documentation Architecture

The documentation follows a **layered architecture** designed for agentic development:

### Layer 1: Foundation (`/foundation/`)
Core platform concepts, architecture, and principles that inform all other documentation.

### Layer 2: Specifications (`/specs/`)
Detailed technical specifications with machine-readable metadata.

### Layer 3: Implementation (`/implementation/`)
Implementation guides, APIs, and integration patterns.

### Layer 4: Operations (`/operations/`)
Deployment, monitoring, and operational procedures.

### Layer 5: Reference (`/reference/`)
Quick reference materials, glossaries, and lookup tables.

## Agent-Friendly Features

### Structured Metadata
All documents include frontmatter with:
```yaml
---
type: specification | guide | reference | analysis
domain: authentication | federation | operations | ui
status: draft | review | stable | deprecated
version: "1.0"
dependencies: [other-doc-ids]
tags: [oauth, security, api]
last_updated: "2024-04-12"
---
```

### Standardized Document Structure
1. **Purpose**: What this document accomplishes
2. **Scope**: What's included and excluded
3. **Dependencies**: Required knowledge/documents
4. **Content**: Main documentation content
5. **Implementation**: How to apply this information
6. **Validation**: How to verify correct implementation

### Cross-Reference System
- Unique document IDs for reliable linking
- Dependency graphs for understanding relationships
- Bidirectional linking for context discovery

## Navigation Guide

### For AI Agents
Start with `/foundation/architecture.md` for system understanding, then navigate by dependency graph.

### For Developers
Quick start: `/implementation/quick-start.md` → `/specs/api/` → `/reference/`

### For Operators
Begin with `/operations/deployment.md` → `/operations/monitoring.md` → `/reference/troubleshooting.md`

### For Designers
Start with `/foundation/design-principles.md` → `/specs/ui/` → `/implementation/components.md`

## Document Types

| Type | Purpose | Location | Agent Usage |
|------|---------|----------|-------------|
| **Foundation** | Core concepts | `/foundation/` | Context building |
| **Specification** | Technical details | `/specs/` | Implementation guidance |
| **Guide** | Step-by-step instructions | `/implementation/` | Process execution |
| **Reference** | Quick lookup | `/reference/` | Fact checking |
| **Analysis** | Business context | `/analysis/` | Strategic understanding |

## Maintenance

This documentation is:
- **Version controlled**: All changes tracked in git
- **Tested**: Code examples validated in CI
- **Linked**: Cross-references maintained automatically
- **Reviewed**: Regular accuracy validation against implementation