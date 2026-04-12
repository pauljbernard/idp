import React from 'react'
import { Link } from 'react-router-dom'
import { Play, User, Shield, Key, CheckCircle, ArrowRight } from 'lucide-react'

export default function QuickStartPage() {
  return (
    <div className="prose">
      <h1>Quick Start Tutorial</h1>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Play className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <p className="text-green-900 font-medium mb-2">15-Minute Setup</p>
            <p className="text-green-800 text-sm">
              This tutorial will get you up and running with your first IDP Platform realm,
              user authentication, and API integration in about 15 minutes.
            </p>
          </div>
        </div>
      </div>

      <h2>Before You Begin</h2>

      <p>Make sure you have completed the <Link to="/installation">Installation and Setup</Link> and your IDP Platform is running locally:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Verify IDP Platform is running
curl http://localhost:4000/health

# Should return: {"status": "healthy"}`}</code></pre>
      </div>

      <h2>Tutorial Overview</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="feature-card text-center">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-600 font-bold">1</span>
          </div>
          <h3 className="font-medium mb-1">Create Realm</h3>
          <p className="text-xs text-gray-600">Set up your identity domain</p>
        </div>
        <div className="feature-card text-center">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-600 font-bold">2</span>
          </div>
          <h3 className="font-medium mb-1">Configure Client</h3>
          <p className="text-xs text-gray-600">Register your application</p>
        </div>
        <div className="feature-card text-center">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-600 font-bold">3</span>
          </div>
          <h3 className="font-medium mb-1">Create User</h3>
          <p className="text-xs text-gray-600">Add test user account</p>
        </div>
        <div className="feature-card text-center">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-primary-600 font-bold">4</span>
          </div>
          <h3 className="font-medium mb-1">Test Auth</h3>
          <p className="text-xs text-gray-600">Validate authentication flow</p>
        </div>
      </div>

      <h2>Step 1: Create Your First Realm</h2>

      <p>A realm is an isolated identity domain. Let's create one for your application:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Create a new realm
curl -X POST http://localhost:4000/api/v1/iam/realms \\
  -H "Content-Type: application/json" \\
  -H "X-IAM-Session: mock-admin-session-for-test" \\
  -d '{
    "id": "my-app-realm",
    "name": "My Application Realm",
    "description": "Development realm for my application"
  }'`}</code></pre>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-blue-900 text-sm">
          <strong>Note:</strong> The <code>X-IAM-Session</code> header is using a mock session for
          local development. In production, this would be a proper authenticated session.
        </p>
      </div>

      <h2>Step 2: Register Your Application Client</h2>

      <p>Register your application as an OAuth/OIDC client:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Register your application client
curl -X POST http://localhost:4000/api/v1/iam/realms/my-app-realm/clients \\
  -H "Content-Type: application/json" \\
  -H "X-IAM-Session: mock-admin-session-for-test" \\
  -d '{
    "client_id": "my-web-app",
    "name": "My Web Application",
    "access_type": "PUBLIC",
    "redirect_uris": ["http://localhost:3000/auth/callback"],
    "allowed_scopes": ["openid", "profile", "email"]
  }'`}</code></pre>
      </div>

      <h2>Step 3: Create a Test User</h2>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Create a test user
curl -X POST http://localhost:4000/api/v1/iam/realms/my-app-realm/users \\
  -H "Content-Type: application/json" \\
  -H "X-IAM-Session: mock-admin-session-for-test" \\
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "SecurePassword123!",
    "email_verified": true,
    "enabled": true
  }'`}</code></pre>
      </div>

      <h2>Step 4: Test Authentication Flow</h2>

      <h3>OAuth 2.1 Authorization Code + PKCE Flow</h3>

      <p>Let's test the complete OAuth 2.1 authentication flow with PKCE:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# 1. Generate PKCE parameters (in a real app, this would be done by your client)
CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n $CODE_VERIFIER | shasum -a 256 | cut -d" " -f1 | xxd -r -p | base64 | tr -d "=+/")

echo "Code Verifier: $CODE_VERIFIER"
echo "Code Challenge: $CODE_CHALLENGE"`}</code></pre>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# 2. Get OIDC discovery configuration
curl http://localhost:4000/api/v1/iam/realms/my-app-realm/.well-known/openid-configuration

# 3. Create authorization URL (replace CODE_CHALLENGE with your generated value)
AUTH_URL="http://localhost:4000/api/v1/iam/realms/my-app-realm/protocol/openid-connect/auth"
AUTH_URL="$AUTH_URL?client_id=my-web-app"
AUTH_URL="$AUTH_URL&redirect_uri=http://localhost:3000/auth/callback"
AUTH_URL="$AUTH_URL&response_type=code"
AUTH_URL="$AUTH_URL&scope=openid+profile+email"
AUTH_URL="$AUTH_URL&code_challenge=$CODE_CHALLENGE"
AUTH_URL="$AUTH_URL&code_challenge_method=S256"
AUTH_URL="$AUTH_URL&state=random-state-value"

echo "Visit this URL in your browser:"
echo $AUTH_URL`}</code></pre>
      </div>

      <h3>Browser Authentication</h3>

      <p>Open the authorization URL in your browser. You'll see the IDP Platform login page:</p>

      <ol>
        <li>Enter username: <code>testuser</code></li>
        <li>Enter password: <code>SecurePassword123!</code></li>
        <li>Click "Sign In"</li>
        <li>You'll be redirected to your callback URL with an authorization code</li>
      </ol>

      <h3>Exchange Authorization Code for Tokens</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Extract the authorization code from your callback URL
# Replace AUTHORIZATION_CODE with the code from the redirect
curl -X POST http://localhost:4000/api/v1/iam/realms/my-app-realm/protocol/openid-connect/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "client_id=my-web-app" \\
  -d "code=AUTHORIZATION_CODE" \\
  -d "redirect_uri=http://localhost:3000/auth/callback" \\
  -d "code_verifier=$CODE_VERIFIER"`}</code></pre>
      </div>

      <p>You'll receive a response like this:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "openid profile email"
}`}</code></pre>
      </div>

      <h3>Access User Information</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Use the access token to get user information
# Replace ACCESS_TOKEN with your actual token
curl -H "Authorization: Bearer ACCESS_TOKEN" \\
  http://localhost:4000/api/v1/iam/realms/my-app-realm/protocol/openid-connect/userinfo`}</code></pre>
      </div>

      <h2>Step 5: Explore Additional Features</h2>

      <h3>Device Authorization Flow</h3>

      <p>Test the device authorization flow for devices without browsers:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Initiate device authorization
curl -X POST http://localhost:4000/api/v1/iam/realms/my-app-realm/protocol/openid-connect/auth/device \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "client_id=my-web-app" \\
  -d "scope=openid profile email"

# Response includes:
# - device_code: Use this to poll for tokens
# - user_code: User enters this code
# - verification_uri: User visits this URL`}</code></pre>
      </div>

      <h3>Token Introspection</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Introspect a token to check its validity
curl -X POST http://localhost:4000/api/v1/iam/realms/my-app-realm/protocol/openid-connect/token/introspect \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "token=ACCESS_TOKEN" \\
  -d "client_id=my-web-app"`}</code></pre>
      </div>

      <h2>Success! What's Next?</h2>

      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-start">
          <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-3">Congratulations!</h3>
            <p className="text-green-800 text-sm mb-4">
              You've successfully set up IDP Platform and completed your first authentication flow.
              Your realm is ready for development and testing.
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Created realm: <code>my-app-realm</code></span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Registered client: <code>my-web-app</code></span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Created user: <code>testuser</code></span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span>Tested OAuth 2.1 + PKCE flow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link
          to="/authentication"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <Shield className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">Authentication Flows</h3>
          <p className="text-sm text-gray-600">
            Explore all supported authentication flows and protocols
          </p>
        </Link>
        <Link
          to="/api-reference"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <Key className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">API Reference</h3>
          <p className="text-sm text-gray-600">
            Complete API documentation with examples
          </p>
        </Link>
        <Link
          to="/federation"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <User className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">Federation</h3>
          <p className="text-sm text-gray-600">
            Set up identity federation with external providers
          </p>
        </Link>
      </div>

      <h2>Integration Examples</h2>

      <p>Here are some common integration patterns to help you get started with your application:</p>

      <h3>React/JavaScript SPA</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`// Example React integration with IDP Platform
import { createAuthConfig } from '@idp/client-sdk'

const authConfig = createAuthConfig({
  issuer: 'http://localhost:4000/api/v1/iam/realms/my-app-realm',
  clientId: 'my-web-app',
  redirectUri: window.location.origin + '/auth/callback',
  scopes: ['openid', 'profile', 'email'],
  pkce: true // Always enable PKCE
})

// Initialize authentication
const auth = new IDPAuth(authConfig)
auth.login()`}</code></pre>
      </div>

      <h3>Node.js Backend</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`// Example Node.js middleware for token validation
const { IDPTokenValidator } = require('@idp/node-sdk')

const validator = new IDPTokenValidator({
  issuer: 'http://localhost:4000/api/v1/iam/realms/my-app-realm',
  audience: 'my-web-app'
})

app.use('/api', async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const claims = await validator.validate(token)
  req.user = claims
  next()
})`}</code></pre>
      </div>

      <h2>Development Tips</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">Best Practices</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• Always use PKCE for public clients (SPAs, mobile apps)</li>
          <li>• Store tokens securely - never in localStorage for production</li>
          <li>• Implement proper token refresh logic</li>
          <li>• Use appropriate scopes - request only what you need</li>
          <li>• Validate tokens on your backend for API access</li>
          <li>• Test all flows in your development environment first</li>
        </ul>
      </div>

      <div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200">
        <Link
          to="/installation"
          className="inline-flex items-center text-primary-600 hover:text-primary-800 no-underline"
        >
          ← Installation Guide
        </Link>
        <Link
          to="/authentication"
          className="inline-flex items-center text-primary-600 hover:text-primary-800 no-underline"
        >
          Authentication Flows
          <ArrowRight className="ml-1 w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}