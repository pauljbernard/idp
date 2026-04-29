import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Key, Users, Globe, ArrowRight, CheckCircle, AlertCircle, Info, Code } from 'lucide-react'

export default function AuthenticationPage() {
  return (
    <div className="prose">
      <h1>Authentication and Authorization</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-2">Standards-First Design</p>
            <p className="text-blue-800 text-sm">
              IDP Platform implements OAuth 2.1 natively with comprehensive PKCE support,
              SAML 2.0 Identity Provider capabilities, and OpenID Connect 1.0 compliance.
            </p>
          </div>
        </div>
      </div>

      <h2>Supported Authentication Flows</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">OAuth 2.1 with PKCE</h3>
          <p className="text-sm text-gray-600 mb-3">
            Native OAuth 2.1 implementation with mandatory PKCE for enhanced security.
            Supports authorization code flow with state parameter validation.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Authorization Code + PKCE (recommended)</li>
            <li>• Client Credentials for service-to-service</li>
            <li>• Device Authorization Flow</li>
            <li>• Token Exchange (RFC 8693)</li>
          </ul>
        </div>

        <div className="feature-card">
          <Key className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">OpenID Connect 1.0</h3>
          <p className="text-sm text-gray-600 mb-3">
            Full OIDC implementation with comprehensive scope support and
            flexible claims configuration.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Standard scopes (openid, profile, email)</li>
            <li>• Custom claims and scope mapping</li>
            <li>• ID Token with configurable expiry</li>
            <li>• UserInfo endpoint compliance</li>
          </ul>
        </div>

        <div className="feature-card">
          <Globe className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">SAML 2.0 Identity Provider</h3>
          <p className="text-sm text-gray-600 mb-3">
            Enterprise SAML 2.0 IdP with automated certificate management
            and flexible attribute mapping.
          </p>
          <ul className="text-sm space-y-1">
            <li>• SSO and SLO support</li>
            <li>• Automated certificate rotation</li>
            <li>• Custom attribute assertions</li>
            <li>• Multiple SP configurations</li>
          </ul>
        </div>

        <div className="feature-card">
          <Users className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">WebAuthn & MFA</h3>
          <p className="text-sm text-gray-600 mb-3">
            Modern passwordless authentication with WebAuthn and
            comprehensive multi-factor authentication support.
          </p>
          <ul className="text-sm space-y-1">
            <li>• FIDO2/WebAuthn compliance</li>
            <li>• TOTP and SMS verification</li>
            <li>• Conditional authentication policies</li>
            <li>• Risk-based authentication</li>
          </ul>
        </div>
      </div>

      <h2>Quick Start: OAuth 2.1 Flow</h2>

      <h3>1. Client Registration</h3>

      <p>Register your client application with the IDP Platform:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/clients \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "client_id": "my-web-app",
    "client_name": "My Web Application",
    "client_type": "public",
    "redirect_uris": ["http://localhost:3000/callback"],
    "grant_types": ["authorization_code"],
    "response_types": ["code"],
    "pkce_required": true,
    "scopes": ["openid", "profile", "email"]
  }'`}</code></pre>
      </div>

      <h3>2. Authorization Request</h3>

      <p>Redirect users to the authorization endpoint with PKCE parameters:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`// Generate PKCE parameters
const codeVerifier = generateCodeVerifier()
const codeChallenge = generateCodeChallenge(codeVerifier)
const state = generateRandomString()

// Build authorization URL
const authUrl = new URL('http://localhost:4000/api/v1/iam/realms/my-realm/protocol/openid-connect/auth')
authUrl.searchParams.set('client_id', 'my-web-app')
authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/callback')
authUrl.searchParams.set('response_type', 'code')
authUrl.searchParams.set('scope', 'openid profile email')
authUrl.searchParams.set('state', state)
authUrl.searchParams.set('code_challenge', codeChallenge)
authUrl.searchParams.set('code_challenge_method', 'S256')

// Redirect user
window.location.href = authUrl.toString()`}</code></pre>
      </div>

      <h3>3. Token Exchange</h3>

      <p>Exchange the authorization code for tokens:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/protocol/openid-connect/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code&" \\
  -d "client_id=my-web-app&" \\
  -d "code=YOUR_AUTHORIZATION_CODE&" \\
  -d "redirect_uri=http://localhost:3000/callback&" \\
  -d "code_verifier=YOUR_CODE_VERIFIER"

# Response includes:
# {
#   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "scope": "openid profile email"
# }`}</code></pre>
      </div>

      <h2>SAML 2.0 Integration</h2>

      <h3>Service Provider Configuration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/saml/service-providers \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "entity_id": "https://myapp.example.com",
    "acs_url": "https://myapp.example.com/saml/acs",
    "sls_url": "https://myapp.example.com/saml/sls",
    "name_id_format": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
    "attribute_mapping": {
      "email": "user.email",
      "firstName": "user.first_name",
      "lastName": "user.last_name",
      "roles": "user.realm_roles"
    }
  }'`}</code></pre>
      </div>

      <h3>SAML Metadata Discovery</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Get SAML metadata for your realm
curl http://localhost:4000/api/v1/iam/realms/my-realm/saml/metadata

# Use this metadata to configure your SP
# The metadata includes:
# - Entity ID and endpoints
# - X.509 certificates for signature verification
# - Supported name ID formats
# - Available attributes`}</code></pre>
      </div>

      <h2>Advanced Authentication Features</h2>

      <h3>Conditional Authentication</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium mb-1">Enterprise Feature</p>
            <p className="text-amber-800 text-sm">
              Conditional authentication allows dynamic authentication flows based on
              user risk, device trust, location, and custom business logic.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`{
  "authentication_flow": "browser-conditional",
  "conditions": [
    {
      "type": "risk_assessment",
      "threshold": "medium",
      "actions": ["require_mfa", "device_verification"]
    },
    {
      "type": "ip_location",
      "allowed_countries": ["US", "CA", "GB"],
      "actions": ["log_suspicious_access"]
    },
    {
      "type": "time_based",
      "business_hours_only": true,
      "timezone": "America/New_York",
      "actions": ["require_manager_approval"]
    }
  ]
}`}</code></pre>
      </div>

      <h3>Session Management</h3>

      <p>IDP Platform provides distributed session management without session affinity:</p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h4 className="font-semibold mb-2">Session Lifecycle</h4>
          <ul className="text-sm space-y-1">
            <li>• Configurable session timeouts</li>
            <li>• Rolling session renewal</li>
            <li>• Concurrent session limits</li>
            <li>• Global logout coordination</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Session Storage</h4>
          <ul className="text-sm space-y-1">
            <li>• DynamoDB-based distribution</li>
            <li>• No server-side session affinity</li>
            <li>• Cross-region replication support</li>
            <li>• Automatic session cleanup</li>
          </ul>
        </div>
      </div>

      <h2>API Authentication Patterns</h2>

      <h3>Service-to-Service Authentication</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Client Credentials flow for service authentication
curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/protocol/openid-connect/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials&" \\
  -d "client_id=my-service&" \\
  -d "client_secret=SERVICE_SECRET&" \\
  -d "scope=api:read api:write"

# Use the access token for API calls
curl -X GET http://localhost:4000/api/v1/iam/realms/my-realm/users \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}</code></pre>
      </div>

      <h3>Token Validation</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Introspect token for validation
curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/protocol/openid-connect/token/introspect \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -H "Authorization: Bearer CLIENT_TOKEN" \\
  -d "token=TOKEN_TO_VALIDATE"

# Response includes token validity and claims:
# {
#   "active": true,
#   "sub": "user-uuid",
#   "client_id": "my-web-app",
#   "scope": "openid profile email",
#   "exp": 1640995200,
#   "iat": 1640991600
# }`}</code></pre>
      </div>

      <h2>Security Best Practices</h2>

      <div className="grid gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Recommended Practices
          </h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• Always use PKCE for public clients</li>
            <li>• Implement proper state validation</li>
            <li>• Use short-lived access tokens (1 hour recommended)</li>
            <li>• Store refresh tokens securely</li>
            <li>• Implement token rotation for refresh tokens</li>
            <li>• Use HTTPS for all communication</li>
            <li>• Validate redirect URIs strictly</li>
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Security Warnings
          </h4>
          <ul className="text-red-800 text-sm space-y-1">
            <li>• Never use implicit flow (deprecated in OAuth 2.1)</li>
            <li>• Don't store tokens in localStorage (use httpOnly cookies)</li>
            <li>• Avoid long-lived access tokens</li>
            <li>• Don't log tokens or sensitive parameters</li>
            <li>• Implement proper CORS policies</li>
            <li>• Use secure random generators for PKCE parameters</li>
          </ul>
        </div>
      </div>

      <h2>Integration Examples</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Link
          to="/api-reference"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <Code className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">Full API Reference</h3>
          <p className="text-sm text-gray-600">
            Complete documentation of all authentication and management APIs
          </p>
        </Link>
        <Link
          to="/federation"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <Globe className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">Federation Guide</h3>
          <p className="text-sm text-gray-600">
            Enterprise federation with external identity providers
          </p>
        </Link>
      </div>

      <h2>Next Steps</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Continue Learning</h3>
        <div className="space-y-2">
          <Link to="/federation" className="block text-blue-700 hover:text-blue-900 text-sm">
            → Federation and External Identity Providers
          </Link>
          <Link to="/multi-tenant" className="block text-blue-700 hover:text-blue-900 text-sm">
            → Multi-Tenant Configuration and Realm Management
          </Link>
          <Link to="/api-reference" className="block text-blue-700 hover:text-blue-900 text-sm">
            → Complete API Reference and SDKs
          </Link>
          <Link to="/deployment" className="block text-blue-700 hover:text-blue-900 text-sm">
            → Production Deployment and Scaling
          </Link>
        </div>
      </div>
    </div>
  )
}