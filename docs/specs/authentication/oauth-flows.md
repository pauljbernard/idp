---
id: oauth-flows
type: specification
domain: authentication
status: stable
version: "1.0"
dependencies: [platform-architecture]
support_tier: "core-release"
maturity_state: "supported-for-bounded-profile"
supported_profiles: [oidc-browser-auth-code-pkce, oidc-refresh-token, oidc-client-credentials, oidc-device-authorization-bounded]
evidence_class: "external-interoperability"
tags: [specification, technical, authentication]
last_updated: "2026-04-12"
related: []
---
# OAuth 2.1 & OpenID Connect Authentication Flows

## Support Metadata

- Support tier: `Core release`
- Maturity state: `Supported for a bounded profile`
- Supported profiles:
  - `oidc-browser-auth-code-pkce`
  - `oidc-refresh-token`
  - `oidc-client-credentials`
  - `oidc-device-authorization-bounded`
- Evidence class: `External interoperability`

## Feature Overview

The IDP Platform implements OAuth 2.1 and OpenID Connect 1.0 Core specifications to provide secure, standards-compliant authentication and authorization flows for web applications, mobile apps, and API access.

## User Stories

### Authorization Code Flow with PKCE
**As a** web application developer
**I want** to authenticate users with OAuth 2.1 Authorization Code flow
**So that** I can securely obtain access tokens without exposing client secrets

**Acceptance Criteria:**
- Support PKCE (RFC 7636) for all authorization code flows
- Generate cryptographically secure code verifiers and challenges
- Validate PKCE parameters during token exchange
- Support both S256 and plain code challenge methods (prefer S256)

### Client Credentials Flow
**As a** backend service
**I want** to authenticate using client credentials
**So that** I can access protected APIs without user context

**Acceptance Criteria:**
- Support confidential client authentication
- Validate client certificates or shared secrets
- Issue appropriate scoped access tokens
- Support client certificate authentication (mTLS)

### Device Authorization Grant
**As a** device with limited input capabilities
**I want** to authenticate users through a secondary device
**So that** users can authorize access from their mobile phone or computer

**Acceptance Criteria:**
- Generate device and user codes with appropriate lifetimes
- Provide user-friendly verification URLs
- Support polling for authorization completion
- Handle authorization denials gracefully

## Technical Requirements

### Protocol Compliance
- **OAuth 2.1** (Draft 08) full compliance
- **OpenID Connect Core 1.0** implementation
- **PKCE** (RFC 7636) mandatory for public clients
- **JWT** (RFC 7519) for ID tokens and access tokens
- **JOSE** (RFC 7515-7519) for cryptographic operations

### Token Management
- **Access Token Lifetime**: 1 hour (configurable per client)
- **Refresh Token Lifetime**: 30 days (configurable per client)
- **ID Token Lifetime**: 1 hour
- **Authorization Code Lifetime**: 10 minutes
- **Device Code Lifetime**: 15 minutes

### Security Features
- Refresh token rotation on each use
- Proof Key for Code Exchange (PKCE) for all flows
- State parameter validation for CSRF protection
- Nonce parameter support for replay attack prevention
- Secure redirect URI validation with exact matching

## API Specifications

### Authorization Endpoint
```
GET /api/v1/iam/realms/{realm}/protocol/openid-connect/auth
```

**Parameters:**
- `response_type`: "code" (required)
- `client_id`: OAuth client identifier (required)
- `redirect_uri`: Callback URL (required)
- `scope`: Space-delimited scope list (required)
- `state`: CSRF protection token (recommended)
- `code_challenge`: PKCE challenge (required for public clients)
- `code_challenge_method`: "S256" or "plain" (required with code_challenge)
- `nonce`: Replay protection (required for OpenID Connect)

### Token Endpoint
```
POST /api/v1/iam/realms/{realm}/protocol/openid-connect/token
```

**Grant Types:**
- `authorization_code`: Exchange authorization code for tokens
- `client_credentials`: Service-to-service authentication
- `refresh_token`: Refresh access tokens
- `urn:ietf:params:oauth:grant-type:device_code`: Device flow completion

### Device Authorization Endpoint
```
POST /api/v1/iam/realms/{realm}/protocol/openid-connect/auth/device
```

## UI/UX Specifications

### Authorization Page Design
- **Brand Integration**: Realm-specific branding and colors
- **Consent Interface**: Clear scope descriptions and permissions
- **Security Indicators**: HTTPS lock icon, security badges
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile Optimization**: Responsive design for mobile devices

### Device Flow Interface
- **QR Code Display**: Auto-generated QR codes for device pairing
- **User Code Input**: Large, easy-to-read input fields
- **Progress Indicators**: Real-time status updates during authorization
- **Error Handling**: Clear error messages and retry options

### Admin Console Features
- **Client Management**: CRUD operations for OAuth clients
- **Flow Monitoring**: Real-time authentication flow visibility
- **Token Analytics**: Usage patterns and security metrics
- **Audit Logging**: Comprehensive security event tracking

## Security Considerations

### Threat Model
1. **Authorization Code Interception**: Mitigated by PKCE implementation
2. **Client Impersonation**: Prevented by redirect URI validation
3. **Token Theft**: Limited by short access token lifetimes
4. **Cross-Site Request Forgery**: Prevented by state parameter validation

### Implementation Safeguards
- Rate limiting on all endpoints (100 requests/minute per client)
- Mandatory HTTPS for all OAuth endpoints
- Secure random code generation using cryptographically secure PRNGs
- Client secret hashing using bcrypt with 12 rounds
- Comprehensive audit logging for all authentication events

## Testing Criteria

### Functional Testing
- [ ] Authorization code flow with valid PKCE parameters
- [ ] Client credentials flow with mTLS authentication
- [ ] Device authorization flow with polling
- [ ] Refresh token rotation and validation
- [ ] Error responses for invalid parameters

### Security Testing
- [ ] PKCE downgrade attack prevention
- [ ] Redirect URI validation bypass attempts
- [ ] State parameter CSRF protection
- [ ] Rate limiting enforcement
- [ ] Invalid client authentication rejection

### Performance Testing
- [ ] Authorization endpoint < 100ms response time
- [ ] Token endpoint < 200ms response time
- [ ] Concurrent user load testing (1000+ users)
- [ ] Database connection pooling efficiency

## Implementation Notes

### Database Schema
The OAuth implementation uses the following core entities:

```sql
-- OAuth clients with PKCE support
CREATE TABLE oauth_clients (
  id VARCHAR(255) PRIMARY KEY,
  realm_id VARCHAR(255) NOT NULL,
  client_secret_hash VARCHAR(255),
  redirect_uris TEXT[],
  allowed_scopes TEXT[],
  require_pkce BOOLEAN DEFAULT true,
  access_token_lifetime INTEGER DEFAULT 3600,
  refresh_token_lifetime INTEGER DEFAULT 2592000
);

-- Authorization codes with PKCE validation
CREATE TABLE authorization_codes (
  code VARCHAR(255) PRIMARY KEY,
  client_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  redirect_uri VARCHAR(255) NOT NULL,
  scope VARCHAR(255),
  code_challenge VARCHAR(255),
  code_challenge_method VARCHAR(255),
  expires_at TIMESTAMP NOT NULL
);
```

### Key Components
- **Authorization Server**: `apps/api-server/src/platform/iamAuthFlows.ts`
- **Token Management**: `apps/api-server/src/platform/iamProtocolRuntime.ts`
- **Client Registry**: `apps/api-server/src/platform/iamApplicationConsumers.ts`
- **UI Components**: `apps/enterprise-ui/src/components/iam/IamAuthFlowsPanel.tsx`

### Configuration Examples
```typescript
const oauthConfig = {
  authorizationCodeLifetime: 600, // 10 minutes
  accessTokenLifetime: 3600,      // 1 hour
  refreshTokenLifetime: 2592000,  // 30 days
  requirePkce: true,              // Mandatory for security
  supportedGrantTypes: [
    'authorization_code',
    'client_credentials',
    'refresh_token',
    'urn:ietf:params:oauth:grant-type:device_code'
  ]
};
```
