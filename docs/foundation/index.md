---
id: foundation-index
type: index
domain: foundation
status: stable
version: "2.0"
dependencies: [platform-constitution]
tags: [foundation, architecture, governance]
last_updated: "2026-04-12"
related: [specs-index, implementation-index, reference-index]
---
# Foundation

The foundation layer defines platform intent, architecture boundaries, security posture, and design principles.

## Core Foundation Documents

| Document | Role |
|----------|------|
| [Platform Constitution](constitution.md) | Non-negotiable product and governance principles |
| [Platform Architecture](architecture.md) | System architecture and boundary model |
| [Security Model](security-model.md) | Security assumptions and controls |
| [Design Principles](design-principles.md) | Experience and interface principles |

## Recommended Reading Order

1. [Platform Constitution](constitution.md)
2. [Platform Architecture](architecture.md)
3. [Security Model](security-model.md) for security-sensitive work
4. [Design Principles](design-principles.md) for UI-facing work

## Usage

- Use foundation docs to establish system boundaries before reading feature-level specifications.
- Use the constitution and architecture to resolve conflicts between implementation convenience and platform intent.
- Use the security model and design principles to refine implementation choices within those boundaries.
