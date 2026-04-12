---
id: getting-started
type: implementation
domain: quick-start
status: stable
version: "1.0"
dependencies: [platform-architecture]
tags: [implementation, guide, quick-start]
last_updated: "2024-04-12"
related: []
---
# IDP Platform User Manual

Welcome to the **IDP Platform** documentation. IDP is a headless identity and access management platform with a strong core IAM implementation, bounded supported protocol surface, and active parity and hardening roadmap.

## Status and Claim Boundary

This wiki is a product and implementation guide. It is not the governing source for support, maturity, or production-grade claims. Those are defined in:

- [Capability Maturity Standard](../spec/capability-maturity-standard.idp.md)
- [Formal Status Matrix](../spec/plans/Headless_IAM_Status_Matrix.md)
- [SaaS CMS Governance Extraction Plan](../spec/plans/SaaS_CMS_Governance_Extraction_Plan.md)
- [Protocol Support Matrix](../spec/plans/Headless_IAM_Protocol_Support_Matrix.md)
- [Federation Support Matrix](../spec/plans/Headless_IAM_Federation_Support_Matrix.md)
- [Passkey Support Matrix](../spec/plans/Headless_IAM_Passkey_Support_Matrix.md)
- [SAML Profile Matrix](../spec/plans/Headless_IAM_SAML_Profile_Matrix.md)
- [Deployment Mode Matrix](../spec/plans/Headless_IAM_Deployment_Mode_Matrix.md)

At present, the strongest supported claim is the bounded core release surface around core IAM administration and selected OIDC/browser-authentication journeys. Other areas remain on parity, differentiator, or deferred tracks depending on the specific profile.

## What Is IDP Platform?

IDP Platform is a standalone, multi-tenant-capable IAM system that currently provides a strong foundation in:

- core realm, user, group, role, and client management
- account and administration surfaces
- organization-aware identity modeling
- privacy and profile-governance concepts
- operational review, readiness, and recovery tooling

The platform is designed to evolve toward broader enterprise parity, but support claims should always be read through the formal status matrices rather than inferred from implementation surface alone.

## Quick Start

1. [Installation Guide](Installation-and-Setup) for local setup and AWS-oriented deployment paths
2. [Quick Start Tutorial](Quick-Start-Tutorial) for a first realm, user, and authentication flow
3. [API Overview](API-Reference-Overview) for the service surface and major API domains

## Documentation Sections

### Getting Started

- [Installation and Setup](Installation-and-Setup)
- [Quick Start Tutorial](Quick-Start-Tutorial)
- [Configuration Guide](Configuration-Guide)
- [Architecture Overview](Architecture-Overview)

### Authentication and Authorization

- [Authentication Flows](Authentication-Flows)
- [User Management](User-Management)
- [Client Management](Client-Management)
- [Session Management](Session-Management)

### Federation and Enterprise Features

- [Identity Federation](Identity-Federation)
- [Federation Failover](Federation-Failover)
- [Multi-Tenant Management](Multi-Tenant-Management)
- [Privacy and Governance](Privacy-and-Governance)

### API Documentation

- [API Reference Overview](API-Reference-Overview)
- [Authentication APIs](Authentication-APIs)
- [Administration APIs](Administration-APIs)
- [Federation APIs](Federation-APIs)

### Deployment and Operations

- [AWS Deployment Guide](AWS-Deployment-Guide)
- [Monitoring and Health](Monitoring-and-Health)
- [Backup and Recovery](Backup-and-Recovery)
- [Performance Tuning](Performance-Tuning)

### Integration Guides

- [SDK and Integration](SDK-and-Integration)
- [Standards Compliance](Standards-Compliance)
- [Migration Guides](Migration-Guides)

### Advanced Topics

- [Security Architecture](Security-Architecture)
- [Customization and Extensions](Customization-and-Extensions)
- [Troubleshooting](Troubleshooting)
- [FAQ](FAQ)

## Current Capability Shape

### Core Release Strengths

- core IAM data model and administration
- bounded OIDC and browser-authentication journeys
- account self-service and session surfaces
- organization-aware modeling and profile governance
- readiness, review, and recovery control surfaces

### Active Parity Tracks

- broader OAuth/OIDC parity
- SAML supported profiles
- passkey and WebAuthn maturity
- federation-provider realism and interoperability
- user federation and provisioning breadth

### Differentiator Tracks

- privacy-aware identity governance
- operator review and readiness workflows
- recovery evidence and remediation control loops
- AWS-oriented deployment posture for teams that want that model

## Using This Wiki Safely

When reading feature pages in this wiki:

- treat implementation presence as proof only of `Implemented`, unless a support matrix says otherwise
- treat protocol pages as bounded to their declared supported profiles
- treat AWS-oriented deployment guidance as reference architecture, not universal deployment proof
- use the formal matrices before making roadmap, sales, or launch claims

## Quick Links

### For Developers

- [Quick Start Tutorial](Quick-Start-Tutorial)
- [API Reference Overview](API-Reference-Overview)
- [SDK and Integration](SDK-and-Integration)
- [Authentication Flows](Authentication-Flows)

### For System Administrators

- [Installation and Setup](Installation-and-Setup)
- [AWS Deployment Guide](AWS-Deployment-Guide)
- [Monitoring and Health](Monitoring-and-Health)
- [Multi-Tenant Management](Multi-Tenant-Management)

### For Enterprise Architects

- [Architecture Overview](Architecture-Overview)
- [Security Architecture](Security-Architecture)
- [Identity Federation](Identity-Federation)
- [Standards Compliance](Standards-Compliance)

### For Product and Planning

- [Formal Status Matrix](../spec/plans/Headless_IAM_Status_Matrix.md)
- [Gap Remediation Plan](../spec/plans/Headless_IAM_Gap_Remediation_Plan.md)
- [Keycloak Parity Plan](../spec/plans/Headless_IAM_Keycloak_Parity_Plan.md)

## Prerequisites

Before using IDP Platform, ensure you have:

- Node.js 18+ for local development
- an AWS account for AWS-oriented deployment work
- Docker for containerized local workflows where applicable
- working knowledge of OAuth 2.0, OIDC, and IAM administration concepts

## Getting Help

- Browse this wiki for implementation and operational guidance
- Report bugs or feature requests on [GitHub Issues](https://github.com/pauljbernard/idp/issues)
- Use the formal status and plan documents when assessing support or roadmap state

## Start Here

1. New users should begin with [Installation and Setup](Installation-and-Setup).
2. Integrators should review [API Reference Overview](API-Reference-Overview) and [Authentication Flows](Authentication-Flows).
3. Product and architecture review should begin with the [Formal Status Matrix](../spec/plans/Headless_IAM_Status_Matrix.md).
