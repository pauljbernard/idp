import React from 'react'
import { Link } from 'react-router-dom'
import { Network, Shield, Zap, AlertTriangle, CheckCircle, Info, TrendingUp, RotateCcw, Activity } from 'lucide-react'

export default function FederationPage() {
  return (
    <div className="prose">
      <h1>Identity Federation and Enterprise Integration</h1>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Network className="w-8 h-8 text-blue-600 mr-4 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-blue-900 mb-3">Enterprise-Grade Federation</h2>
            <p className="text-blue-800 mb-3">
              IDP Platform's federation capabilities provide seamless integration with external
              identity providers, automated failover, and real-time health monitoring—features
              not available in competing solutions.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-blue-900">Multi-protocol support</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-blue-900">Automated failover</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-blue-900">Circuit breaker protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Federation Architecture</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Identity Provider Federation</h3>
          <p className="text-sm text-gray-600 mb-3">
            Connect with external OIDC and SAML identity providers with automatic
            protocol translation and claim mapping.
          </p>
          <ul className="text-sm space-y-1">
            <li>• OIDC 1.0 identity providers</li>
            <li>• SAML 2.0 identity providers</li>
            <li>• Social login (Google, Microsoft, GitHub)</li>
            <li>• Custom protocol adapters</li>
          </ul>
        </div>

        <div className="feature-card">
          <Network className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">User Federation</h3>
          <p className="text-sm text-gray-600 mb-3">
            Integrate with existing user directories and databases while maintaining
            centralized identity management.
          </p>
          <ul className="text-sm space-y-1">
            <li>• LDAP/Active Directory</li>
            <li>• Database user federation</li>
            <li>• REST API user providers</li>
            <li>• Custom federation adapters</li>
          </ul>
        </div>

        <div className="feature-card">
          <Zap className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Automated Failover</h3>
          <p className="text-sm text-gray-600 mb-3">
            Unique failover capabilities with circuit breakers and health monitoring
            ensure continuous availability even when providers fail.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Real-time health monitoring</li>
            <li>• Circuit breaker protection</li>
            <li>• Automatic provider switching</li>
            <li>• Recovery validation and testing</li>
          </ul>
        </div>

        <div className="feature-card">
          <Activity className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Operational Excellence</h3>
          <p className="text-sm text-gray-600 mb-3">
            Comprehensive monitoring, alerting, and management capabilities for
            enterprise federation deployments.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Federation health dashboards</li>
            <li>• Performance metrics and SLA tracking</li>
            <li>• Automated incident response</li>
            <li>• Audit logging and compliance</li>
          </ul>
        </div>
      </div>

      <h2>Setting Up External Identity Providers</h2>

      <h3>OIDC Identity Provider Configuration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/identity-providers \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "alias": "corporate-sso",
    "provider_id": "oidc",
    "display_name": "Corporate SSO",
    "enabled": true,
    "priority": 1,
    "config": {
      "authorization_url": "https://corp-idp.example.com/auth",
      "token_url": "https://corp-idp.example.com/token",
      "userinfo_url": "https://corp-idp.example.com/userinfo",
      "issuer": "https://corp-idp.example.com",
      "client_id": "idp-platform-client",
      "client_secret": "CLIENT_SECRET",
      "scopes": "openid profile email",
      "claims_mapping": {
        "email": "email",
        "first_name": "given_name",
        "last_name": "family_name",
        "department": "department"
      }
    }
  }'`}</code></pre>
      </div>

      <h3>SAML Identity Provider Integration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/identity-providers \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "alias": "enterprise-saml",
    "provider_id": "saml",
    "display_name": "Enterprise SAML",
    "enabled": true,
    "config": {
      "sso_service_url": "https://enterprise-idp.example.com/sso/saml",
      "slo_service_url": "https://enterprise-idp.example.com/slo/saml",
      "entity_id": "https://enterprise-idp.example.com",
      "signing_certificate": "-----BEGIN CERTIFICATE-----\\nMIIC...\\n-----END CERTIFICATE-----",
      "name_id_policy": "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent",
      "force_authn": false,
      "attribute_mapping": {
        "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        "first_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
        "last_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
        "roles": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      }
    }
  }'`}</code></pre>
      </div>

      <h2>Advanced Federation Features</h2>

      <h3>Federation Failover Configuration</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <TrendingUp className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium mb-1">Unique Competitive Advantage</p>
            <p className="text-amber-800 text-sm">
              Federation failover with circuit breakers is not available in Keycloak, Auth0,
              or other major identity platforms. This enterprise feature ensures continuous
              authentication availability even during provider outages.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Configure failover priorities and health checks
curl -X PUT http://localhost:4000/api/v1/iam/realms/my-realm/federation/failover-config \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "enabled": true,
    "health_check_interval_seconds": 60,
    "failure_threshold": 3,
    "recovery_threshold": 2,
    "circuit_breaker_timeout_seconds": 300,
    "provider_priorities": [
      {
        "provider_alias": "corporate-sso",
        "priority": 1,
        "weight": 80
      },
      {
        "provider_alias": "backup-idp",
        "priority": 2,
        "weight": 20
      }
    ],
    "fallback_strategy": "local_authentication"
  }'`}</code></pre>
      </div>

      <h3>Real-Time Health Monitoring</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Check federation provider health status
curl http://localhost:4000/api/v1/iam/realms/my-realm/federation/health \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response includes real-time health data:
{
  "summary": {
    "total_providers": 3,
    "healthy_providers": 2,
    "degraded_providers": 1,
    "failed_providers": 0,
    "circuit_breakers_open": 0
  },
  "providers": [
    {
      "provider_id": "corporate-sso",
      "provider_name": "Corporate SSO",
      "provider_type": "IDENTITY_PROVIDER",
      "protocol": "oidc",
      "status": "HEALTHY",
      "last_check_at": "2026-04-04T10:30:00Z",
      "consecutive_failures": 0,
      "circuit_breaker_open": false,
      "response_time_ms": 150,
      "availability_percentage": 99.8
    }
  ]
}`}</code></pre>
      </div>

      <h2>User Federation Setup</h2>

      <h3>LDAP/Active Directory Integration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/user-federation \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "provider_name": "corporate-ldap",
    "provider_type": "ldap",
    "enabled": true,
    "priority": 1,
    "config": {
      "connection_url": "ldaps://ldap.corporate.example.com:636",
      "users_dn": "ou=users,dc=corporate,dc=example,dc=com",
      "bind_dn": "cn=service,dc=corporate,dc=example,dc=com",
      "bind_credential": "SERVICE_PASSWORD",
      "search_scope": "SUBTREE",
      "user_object_classes": ["person", "organizationalPerson", "inetOrgPerson"],
      "username_ldap_attribute": "uid",
      "rdn_ldap_attribute": "uid",
      "uuid_ldap_attribute": "entryUUID",
      "user_ldap_filter": "(objectClass=person)",
      "attribute_mapping": {
        "username": "uid",
        "email": "mail",
        "first_name": "givenName",
        "last_name": "sn",
        "department": "ou"
      }
    }
  }'`}</code></pre>
      </div>

      <h3>Database User Federation</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/user-federation \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \\
  -d '{
    "provider_name": "legacy-users",
    "provider_type": "database",
    "enabled": true,
    "priority": 2,
    "config": {
      "connection_url": "postgresql://legacy-db.example.com:5432/users",
      "username": "federation_user",
      "password": "DB_PASSWORD",
      "user_table": "users",
      "username_column": "email",
      "password_column": "password_hash",
      "password_hash_algorithm": "bcrypt",
      "user_query": "SELECT * FROM users WHERE email = ?",
      "attribute_mapping": {
        "username": "email",
        "email": "email",
        "first_name": "first_name",
        "last_name": "last_name",
        "enabled": "active"
      }
    }
  }'`}</code></pre>
      </div>

      <h2>Federation Session Management</h2>

      <h3>Session Index and Coordination</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">Session Coordination</p>
            <p className="text-blue-800 text-sm">
              IDP Platform maintains a distributed session index for coordinating
              authentication state across multiple federation providers, ensuring
              consistent user experience during provider transitions.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Federation session index tracks cross-provider sessions
{
  "session_id": "sess_12345",
  "user_id": "user_67890",
  "realm_id": "my-realm",
  "federation_providers": [
    {
      "provider_alias": "corporate-sso",
      "provider_session_id": "oidc_session_abc123",
      "status": "ACTIVE",
      "last_activity": "2026-04-04T10:30:00Z"
    }
  ],
  "failover_events": [
    {
      "timestamp": "2026-04-04T09:45:00Z",
      "from_provider": "primary-idp",
      "to_provider": "corporate-sso",
      "reason": "CIRCUIT_BREAKER_OPEN"
    }
  ]
}`}</code></pre>
      </div>

      <h2>Federation Monitoring and Operations</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Activity className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Health Dashboards</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>GET /api/v1/iam/realms/{`{realm}`}/federation/metrics</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Provider availability metrics</li>
            <li>• Response time percentiles</li>
            <li>• Error rate tracking</li>
            <li>• Circuit breaker status</li>
          </ul>
        </div>

        <div className="feature-card">
          <RotateCcw className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Automated Recovery</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>POST /api/v1/iam/realms/{`{realm}`}/federation/recovery</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Automatic provider testing</li>
            <li>• Recovery validation</li>
            <li>• Graceful traffic shifting</li>
            <li>• Rollback on failure</li>
          </ul>
        </div>
      </div>

      <h3>Federation Performance Metrics</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`curl http://localhost:4000/api/v1/iam/realms/my-realm/federation/metrics \\
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Comprehensive federation metrics
{
  "time_range": "last_24h",
  "summary": {
    "total_authentications": 15420,
    "successful_authentications": 15398,
    "failed_authentications": 22,
    "average_response_time_ms": 245,
    "p95_response_time_ms": 580,
    "p99_response_time_ms": 1200
  },
  "by_provider": [
    {
      "provider_alias": "corporate-sso",
      "authentications": 12336,
      "success_rate": 99.85,
      "average_response_time_ms": 180,
      "circuit_breaker_events": 0
    }
  ],
  "failover_events": [
    {
      "timestamp": "2026-04-04T02:15:00Z",
      "affected_users": 42,
      "recovery_time_seconds": 18,
      "cause": "provider_timeout"
    }
  ]
}`}</code></pre>
      </div>

      <h2>Enterprise Federation Patterns</h2>

      <h3>Multi-Protocol Chain Authentication</h3>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold mb-2">Advanced Use Case</h4>
        <p className="text-sm text-gray-600 mb-3">
          Configure authentication chains that traverse multiple protocols and providers
          for complex enterprise scenarios.
        </p>
        <div className="text-sm space-y-1">
          <p><strong>Step 1:</strong> Corporate OIDC provider authentication</p>
          <p><strong>Step 2:</strong> Role federation from LDAP directory</p>
          <p><strong>Step 3:</strong> Additional claims from REST API</p>
          <p><strong>Step 4:</strong> Policy evaluation and authorization</p>
        </div>
      </div>

      <h3>Federation Security Considerations</h3>

      <div className="grid gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Security Best Practices
          </h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• Use certificate pinning for SAML providers</li>
            <li>• Implement claim validation and filtering</li>
            <li>• Enable audit logging for all federation events</li>
            <li>• Configure secure communication channels (TLS 1.3+)</li>
            <li>• Implement token binding where supported</li>
            <li>• Use short-lived federation sessions</li>
            <li>• Regular certificate rotation and validation</li>
          </ul>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 mb-2 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Common Pitfalls
          </h4>
          <ul className="text-red-800 text-sm space-y-1">
            <li>• Trusting unvalidated claims from external providers</li>
            <li>• Insufficient timeout configuration leading to hanging requests</li>
            <li>• Missing fallback authentication when all providers fail</li>
            <li>• Inadequate monitoring of federation provider health</li>
            <li>• Poor error handling during provider transitions</li>
            <li>• Lack of session coordination across federation boundaries</li>
          </ul>
        </div>
      </div>

      <h2>Troubleshooting Federation Issues</h2>

      <div className="space-y-4 mb-8">
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer">Provider Connection Failures</summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Symptoms:</strong> Users cannot authenticate, provider shows as "FAILED" in health check</p>
            <p><strong>Diagnosis:</strong> Check network connectivity, certificate validity, and provider configuration</p>
            <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
              <code>curl -v https://provider.example.com/.well-known/openid-configuration</code>
            </div>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer">Circuit Breaker Activation</summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Symptoms:</strong> Authentication requests bypass primary provider</p>
            <p><strong>Resolution:</strong> Monitor provider recovery and manually reset if needed</p>
            <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
              <code>curl -X POST /api/v1/iam/realms/my-realm/federation/circuit-breaker/reset</code>
            </div>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer">Claim Mapping Issues</summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Symptoms:</strong> User attributes not properly mapped after authentication</p>
            <p><strong>Solution:</strong> Review attribute mapping configuration and provider claim structure</p>
            <p><strong>Debug:</strong> Enable federation debug logging to inspect raw claims</p>
          </div>
        </details>
      </div>

      <h2>Next Steps</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/multi-tenant"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Multi-Tenant Configuration</h3>
          <p className="text-sm text-gray-600">
            Learn how federation works in multi-tenant scenarios with realm isolation
          </p>
        </Link>
        <Link
          to="/deployment"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Production Deployment</h3>
          <p className="text-sm text-gray-600">
            Deploy federation-enabled IDP Platform to AWS with high availability
          </p>
        </Link>
      </div>
    </div>
  )
}