import React from 'react'
import { Link } from 'react-router-dom'
import { Code, Database, Shield, Network, Key, Users, Settings, CheckCircle, Info, Globe } from 'lucide-react'

export default function ApiReferencePage() {
  return (
    <div className="prose">
      <h1>API Reference and Integration Guide</h1>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Code className="w-8 h-8 text-blue-600 mr-4 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-3">Comprehensive API Reference</h2>
            <p className="text-blue-800 mb-3">
              IDP Platform provides a complete REST API for all functionality, from realm management
              to authentication flows. All endpoints support OpenAPI 3.0 specification with
              interactive documentation and SDKs for major programming languages.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-blue-900">REST API with OpenAPI 3.0</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-blue-900">Interactive documentation</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-blue-900">Multi-language SDKs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>API Overview</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">Base URL and Authentication</p>
            <p className="text-blue-800 text-sm mb-2">
              All API endpoints are available at <code>https://your-idp.example.com/api/v1</code>
            </p>
            <p className="text-blue-800 text-sm">
              Most endpoints require Bearer token authentication using admin tokens or client credentials.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Base URL structure
Base URL: https://your-idp.example.com/api/v1

# Authentication header for most endpoints
Authorization: Bearer YOUR_ACCESS_TOKEN

# Content type for POST/PUT requests
Content-Type: application/json`}</code></pre>
      </div>

      <h2>API Categories</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Authentication & Protocol APIs</h3>
          <p className="text-sm text-gray-600 mb-3">
            OAuth 2.1, OIDC, and SAML endpoints for authentication flows,
            token management, and protocol compliance.
          </p>
          <ul className="text-sm space-y-1">
            <li>• <code>/auth</code> - Authorization endpoints</li>
            <li>• <code>/token</code> - Token management</li>
            <li>• <code>/userinfo</code> - User information</li>
            <li>• <code>/saml</code> - SAML IdP endpoints</li>
          </ul>
        </div>

        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Realm Management</h3>
          <p className="text-sm text-gray-600 mb-3">
            Complete realm lifecycle management including configuration,
            users, clients, and policies.
          </p>
          <ul className="text-sm space-y-1">
            <li>• <code>/realms</code> - Realm CRUD operations</li>
            <li>• <code>/realms/{`{id}`}/users</code> - User management</li>
            <li>• <code>/realms/{`{id}`}/clients</code> - Client applications</li>
            <li>• <code>/realms/{`{id}`}/roles</code> - Role management</li>
          </ul>
        </div>

        <div className="feature-card">
          <Network className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Federation APIs</h3>
          <p className="text-sm text-gray-600 mb-3">
            External identity provider integration, health monitoring,
            and failover management.
          </p>
          <ul className="text-sm space-y-1">
            <li>• <code>/identity-providers</code> - IdP configuration</li>
            <li>• <code>/user-federation</code> - User federation</li>
            <li>• <code>/federation/health</code> - Health monitoring</li>
            <li>• <code>/federation/failover</code> - Failover control</li>
          </ul>
        </div>

        <div className="feature-card">
          <Settings className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Administration APIs</h3>
          <p className="text-sm text-gray-600 mb-3">
            Platform administration, monitoring, configuration management,
            and operational controls.
          </p>
          <ul className="text-sm space-y-1">
            <li>• <code>/admin</code> - Administrative operations</li>
            <li>• <code>/health</code> - System health</li>
            <li>• <code>/metrics</code> - Performance metrics</li>
            <li>• <code>/audit</code> - Audit logs</li>
          </ul>
        </div>
      </div>

      <h2>Authentication and Authorization APIs</h2>

      <h3>OAuth 2.1 Authorization Code Flow</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Authorization endpoint
GET /api/v1/iam/realms/{realm_id}/protocol/openid-connect/auth
Parameters:
  client_id: string (required)
  redirect_uri: string (required)
  response_type: "code" (required)
  scope: string (required, e.g., "openid profile email")
  state: string (required)
  code_challenge: string (required for PKCE)
  code_challenge_method: "S256" (required for PKCE)

# Token endpoint
POST /api/v1/iam/realms/{realm_id}/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
Body:
  grant_type: "authorization_code"
  client_id: string
  code: string (authorization code)
  redirect_uri: string
  code_verifier: string (PKCE verifier)

# Response
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email"
}`}</code></pre>
      </div>

      <h3>Token Management</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Token introspection
POST /api/v1/iam/realms/{realm_id}/protocol/openid-connect/token/introspect
Authorization: Bearer CLIENT_CREDENTIALS_TOKEN
Content-Type: application/x-www-form-urlencoded
Body: token=ACCESS_TOKEN_TO_VALIDATE

# Response
{
  "active": true,
  "sub": "user-uuid",
  "client_id": "my-client",
  "scope": "openid profile email",
  "exp": 1640995200,
  "iat": 1640991600
}

# Refresh token
POST /api/v1/iam/realms/{realm_id}/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
Body:
  grant_type: "refresh_token"
  client_id: string
  refresh_token: string

# Revoke token
POST /api/v1/iam/realms/{realm_id}/protocol/openid-connect/logout
Content-Type: application/x-www-form-urlencoded
Body:
  client_id: string
  refresh_token: string`}</code></pre>
      </div>

      <h2>Realm Management APIs</h2>

      <h3>Realm Operations</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Create realm
POST /api/v1/iam/realms
Authorization: Bearer ADMIN_TOKEN
{
  "realm_id": "my-company",
  "realm_name": "My Company",
  "enabled": true,
  "configuration": {
    "require_ssl": true,
    "registration_allowed": false,
    "session_timeout_seconds": 3600
  }
}

# Get realm
GET /api/v1/iam/realms/{realm_id}
Authorization: Bearer ADMIN_TOKEN

# Update realm
PUT /api/v1/iam/realms/{realm_id}
Authorization: Bearer ADMIN_TOKEN
{
  "realm_name": "Updated Company Name",
  "configuration": {
    "session_timeout_seconds": 7200
  }
}

# Delete realm
DELETE /api/v1/iam/realms/{realm_id}
Authorization: Bearer ADMIN_TOKEN`}</code></pre>
      </div>

      <h3>User Management</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Create user
POST /api/v1/iam/realms/{realm_id}/users
Authorization: Bearer ADMIN_TOKEN
{
  "username": "john.doe",
  "email": "john.doe@company.com",
  "first_name": "John",
  "last_name": "Doe",
  "enabled": true,
  "email_verified": true,
  "attributes": {
    "department": "Engineering",
    "employee_id": "EMP001"
  }
}

# Get users with pagination
GET /api/v1/iam/realms/{realm_id}/users
Parameters:
  first: 0 (offset)
  max: 100 (page size)
  search: "john" (optional)
  email: "john@company.com" (optional)

# Update user
PUT /api/v1/iam/realms/{realm_id}/users/{user_id}
{
  "first_name": "John",
  "last_name": "Smith",
  "attributes": {
    "department": "Product"
  }
}

# Set user password
PUT /api/v1/iam/realms/{realm_id}/users/{user_id}/reset-password
{
  "type": "password",
  "value": "new_password",
  "temporary": false
}`}</code></pre>
      </div>

      <h3>Client Application Management</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Create client application
POST /api/v1/iam/realms/{realm_id}/clients
Authorization: Bearer ADMIN_TOKEN
{
  "client_id": "my-web-app",
  "name": "My Web Application",
  "protocol": "openid-connect",
  "public_client": true,
  "standard_flow_enabled": true,
  "redirect_uris": ["http://localhost:3000/*"],
  "web_origins": ["http://localhost:3000"],
  "default_scopes": ["openid", "profile", "email"],
  "pkce_required": true
}

# Get client details
GET /api/v1/iam/realms/{realm_id}/clients/{client_id}

# Update client configuration
PUT /api/v1/iam/realms/{realm_id}/clients/{client_id}
{
  "redirect_uris": ["https://app.company.com/*"],
  "web_origins": ["https://app.company.com"]
}

# Get client secret (for confidential clients)
GET /api/v1/iam/realms/{realm_id}/clients/{client_id}/client-secret

# Regenerate client secret
POST /api/v1/iam/realms/{realm_id}/clients/{client_id}/client-secret`}</code></pre>
      </div>

      <h2>Federation APIs</h2>

      <h3>Identity Provider Configuration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Add OIDC identity provider
POST /api/v1/iam/realms/{realm_id}/identity-providers
Authorization: Bearer ADMIN_TOKEN
{
  "alias": "corporate-sso",
  "provider_id": "oidc",
  "display_name": "Corporate SSO",
  "enabled": true,
  "config": {
    "authorization_url": "https://sso.company.com/auth",
    "token_url": "https://sso.company.com/token",
    "userinfo_url": "https://sso.company.com/userinfo",
    "client_id": "idp-platform",
    "client_secret": "secret",
    "scopes": "openid profile email"
  }
}

# Add SAML identity provider
POST /api/v1/iam/realms/{realm_id}/identity-providers
{
  "alias": "enterprise-saml",
  "provider_id": "saml",
  "config": {
    "sso_service_url": "https://idp.enterprise.com/sso/saml",
    "entity_id": "https://idp.enterprise.com",
    "signing_certificate": "-----BEGIN CERTIFICATE-----\\n..."
  }
}

# Get federation health status
GET /api/v1/iam/realms/{realm_id}/federation/health
Authorization: Bearer ADMIN_TOKEN

# Response
{
  "summary": {
    "total_providers": 2,
    "healthy_providers": 2,
    "degraded_providers": 0,
    "failed_providers": 0
  },
  "providers": [
    {
      "provider_id": "corporate-sso",
      "status": "HEALTHY",
      "response_time_ms": 150,
      "last_check_at": "2026-04-04T10:30:00Z"
    }
  ]
}`}</code></pre>
      </div>

      <h2>Administrative APIs</h2>

      <h3>System Health and Monitoring</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Basic health check
GET /health
# No authorization required

# Detailed health information
GET /health/detailed
Authorization: Bearer ADMIN_TOKEN

# Response
{
  "status": "HEALTHY",
  "version": "1.0.0",
  "checks": [
    {
      "id": "database-connectivity",
      "status": "PASS",
      "response_time_ms": 12
    },
    {
      "id": "federation-failover",
      "status": "PASS",
      "summary": "2 healthy providers"
    }
  ]
}

# Performance metrics
GET /metrics/performance
Authorization: Bearer ADMIN_TOKEN

# Usage statistics
GET /api/v1/iam/realms/{realm_id}/usage
Authorization: Bearer ADMIN_TOKEN`}</code></pre>
      </div>

      <h3>Audit and Logging</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Get audit events
GET /api/v1/iam/realms/{realm_id}/audit/events
Parameters:
  from: "2026-04-01T00:00:00Z" (ISO 8601)
  to: "2026-04-04T23:59:59Z"
  event_type: "LOGIN" (optional)
  user_id: "user-uuid" (optional)
  client_id: "my-client" (optional)
  first: 0
  max: 100

# Response
{
  "events": [
    {
      "id": "audit-123",
      "timestamp": "2026-04-04T10:30:00Z",
      "event_type": "LOGIN_SUCCESS",
      "realm_id": "my-realm",
      "user_id": "user-456",
      "client_id": "my-client",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": {
        "authentication_method": "password",
        "mfa_used": true
      }
    }
  ],
  "total": 1
}`}</code></pre>
      </div>

      <h2>SDKs and Client Libraries</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Code className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">JavaScript/TypeScript SDK</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>npm install @idp-platform/client-js</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Browser and Node.js support</li>
            <li>• TypeScript definitions included</li>
            <li>• OAuth 2.1 with PKCE</li>
            <li>• Automatic token refresh</li>
          </ul>
        </div>

        <div className="feature-card">
          <Code className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Python SDK</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>pip install idp-platform-python</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Django and Flask integrations</li>
            <li>• AsyncIO support</li>
            <li>• Admin API client</li>
            <li>• Token validation utilities</li>
          </ul>
        </div>

        <div className="feature-card">
          <Code className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Java SDK</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>&lt;dependency&gt;idp-platform-java&lt;/dependency&gt;</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Spring Security integration</li>
            <li>• Reactive WebFlux support</li>
            <li>• Admin client with pagination</li>
            <li>• JWT validation filters</li>
          </ul>
        </div>

        <div className="feature-card">
          <Code className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">.NET SDK</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>dotnet add package IdpPlatform.Client</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• ASP.NET Core integration</li>
            <li>• Dependency injection support</li>
            <li>• Configuration-driven setup</li>
            <li>• Claims transformation</li>
          </ul>
        </div>
      </div>

      <h3>SDK Usage Example (JavaScript)</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`import { IdpPlatformClient } from '@idp-platform/client-js'

// Initialize client
const idpClient = new IdpPlatformClient({
  baseUrl: 'https://your-idp.example.com',
  realm: 'my-company',
  clientId: 'my-web-app'
})

// Initiate login
async function login() {
  const authUrl = await idpClient.createAuthorizationUrl({
    scope: 'openid profile email',
    redirectUri: 'https://myapp.com/callback'
  })
  window.location.href = authUrl
}

// Handle callback
async function handleCallback() {
  const tokens = await idpClient.exchangeCodeForTokens({
    code: new URLSearchParams(window.location.search).get('code'),
    redirectUri: 'https://myapp.com/callback'
  })

  // Store tokens securely
  localStorage.setItem('access_token', tokens.access_token)
}

// Make authenticated API calls
async function getUserInfo() {
  const userInfo = await idpClient.getUserInfo()
  return userInfo
}

// Admin API client
const adminClient = new IdpPlatformAdminClient({
  baseUrl: 'https://your-idp.example.com',
  accessToken: 'ADMIN_ACCESS_TOKEN'
})

// Create user
const newUser = await adminClient.users.create('my-realm', {
  username: 'john.doe',
  email: 'john@company.com',
  enabled: true
})`}</code></pre>
      </div>

      <h2>Interactive API Documentation</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Globe className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">Swagger/OpenAPI Documentation</p>
            <p className="text-blue-800 text-sm mb-2">
              Interactive API documentation is available at <code>/api/docs</code> with
              live testing capabilities and code generation.
            </p>
            <a
              href="https://your-idp.example.com/api/docs"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Interactive API Docs →
            </a>
          </div>
        </div>
      </div>

      <h2>Rate Limiting and Error Handling</h2>

      <h3>Rate Limiting</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Rate limit headers in responses
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200

# Rate limit exceeded response (429 Too Many Requests)
{
  "error": "rate_limit_exceeded",
  "error_description": "Too many requests. Limit: 1000 per hour.",
  "retry_after": 3600
}`}</code></pre>
      </div>

      <h3>Error Response Format</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Standard error response format
{
  "error": "invalid_request",
  "error_description": "The request is missing a required parameter.",
  "error_uri": "https://docs.idp-platform.com/errors#invalid_request",
  "error_details": {
    "missing_parameter": "client_id",
    "request_id": "req-12345"
  }
}

# Common error codes
400 Bad Request - Invalid request format
401 Unauthorized - Authentication required
403 Forbidden - Insufficient permissions
404 Not Found - Resource not found
409 Conflict - Resource already exists
422 Unprocessable Entity - Validation errors
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Server error
503 Service Unavailable - Service temporarily down`}</code></pre>
      </div>

      <h2>Webhook APIs</h2>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Configure webhooks for realm events
POST /api/v1/iam/realms/{realm_id}/webhooks
Authorization: Bearer ADMIN_TOKEN
{
  "url": "https://myapp.com/webhooks/idp",
  "events": ["USER_CREATED", "USER_UPDATED", "LOGIN_SUCCESS", "LOGIN_FAILURE"],
  "secret": "webhook_signing_secret",
  "enabled": true
}

# Webhook payload example
{
  "event_type": "USER_CREATED",
  "realm_id": "my-company",
  "timestamp": "2026-04-04T10:30:00Z",
  "data": {
    "user_id": "user-123",
    "username": "john.doe",
    "email": "john.doe@company.com"
  },
  "signature": "sha256=abcdef123456..."
}`}</code></pre>
      </div>

      <h2>Next Steps</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/authentication"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Authentication Guide</h3>
          <p className="text-sm text-gray-600">
            Learn about authentication flows and integration patterns
          </p>
        </Link>
        <Link
          to="/quick-start"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Quick Start Tutorial</h3>
          <p className="text-sm text-gray-600">
            Step-by-step guide to build your first integration
          </p>
        </Link>
      </div>
    </div>
  )
}