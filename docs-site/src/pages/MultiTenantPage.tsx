import React from 'react'
import { Link } from 'react-router-dom'
import { Users, Building2, Shield, Settings, Database, TrendingUp, CheckCircle, AlertCircle, Info, Zap } from 'lucide-react'

export default function MultiTenantPage() {
  return (
    <div className="prose">
      <h1>Multi-Tenant Configuration and Realm Management</h1>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Building2 className="w-8 h-8 text-green-600 mr-4 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-green-900 mb-3">Enterprise Multi-Tenancy</h2>
            <p className="text-green-800 mb-3">
              IDP Platform's realm-based architecture provides complete tenant isolation with
              independent configurations, users, and policies. Designed for both SaaS deployment
              and enterprise organizational segmentation.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-900">Complete tenant isolation</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-900">SaaS-ready architecture</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-900">Resource quota management</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Realm Architecture</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Users className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Tenant Isolation</h3>
          <p className="text-sm text-gray-600 mb-3">
            Complete separation between realms with independent user stores,
            authentication policies, and application configurations.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Isolated user directories</li>
            <li>• Independent client applications</li>
            <li>• Separate authentication flows</li>
            <li>• Realm-specific policies</li>
          </ul>
        </div>

        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Data Segregation</h3>
          <p className="text-sm text-gray-600 mb-3">
            Logical data separation with optional physical isolation for
            compliance and security requirements.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Logical data partitioning</li>
            <li>• Cross-realm access prevention</li>
            <li>• Encrypted tenant boundaries</li>
            <li>• Audit trail separation</li>
          </ul>
        </div>

        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Security Boundaries</h3>
          <p className="text-sm text-gray-600 mb-3">
            Strong security isolation with tenant-specific encryption keys,
            certificate management, and access controls.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Per-realm encryption keys</li>
            <li>• Independent certificate stores</li>
            <li>• Isolated session management</li>
            <li>• Tenant-specific rate limiting</li>
          </ul>
        </div>

        <div className="feature-card">
          <TrendingUp className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Resource Management</h3>
          <p className="text-sm text-gray-600 mb-3">
            Granular resource quotas and usage monitoring for cost control
            and performance isolation.
          </p>
          <ul className="text-sm space-y-1">
            <li>• User and application limits</li>
            <li>• Request rate quotas</li>
            <li>• Storage usage monitoring</li>
            <li>• Performance isolation</li>
          </ul>
        </div>
      </div>

      <h2>Realm Creation and Management</h2>

      <h3>Creating a New Realm</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Create a new realm with basic configuration
curl -X POST http://localhost:4000/api/v1/iam/realms \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer MASTER_ADMIN_TOKEN" \\
  -d '{
    "realm_id": "tenant-acme-corp",
    "realm_name": "ACME Corporation",
    "display_name": "ACME Corp Identity",
    "enabled": true,
    "default_locale": "en_US",
    "supported_locales": ["en_US", "es_ES", "fr_FR"],
    "configuration": {
      "login_theme": "corporate",
      "email_theme": "default",
      "require_ssl": true,
      "registration_allowed": false,
      "remember_me": true,
      "verify_email": true,
      "reset_password_allowed": true,
      "session_timeout_seconds": 3600,
      "offline_session_timeout_seconds": 2592000
    },
    "quota_limits": {
      "max_users": 10000,
      "max_clients": 50,
      "max_requests_per_minute": 1000,
      "max_storage_mb": 1024
    }
  }'`}</code></pre>
      </div>

      <h3>Realm Configuration Options</h3>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Settings className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Authentication Settings</h3>
          <ul className="text-sm space-y-1">
            <li>• Password policies and complexity</li>
            <li>• Multi-factor authentication requirements</li>
            <li>• Session timeout and management</li>
            <li>• Login attempt rate limiting</li>
            <li>• Brute force protection</li>
          </ul>
        </div>

        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Security Policies</h3>
          <ul className="text-sm space-y-1">
            <li>• IP allowlists and blocklists</li>
            <li>• Device trust policies</li>
            <li>• Conditional authentication rules</li>
            <li>• Risk-based authentication</li>
            <li>• Compliance enforcement</li>
          </ul>
        </div>
      </div>

      <h3>Advanced Realm Configuration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Configure advanced realm settings
curl -X PUT http://localhost:4000/api/v1/iam/realms/tenant-acme-corp \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "authentication_flows": {
      "browser_flow": "browser-with-mfa",
      "direct_grant_flow": "direct-grant-conditional",
      "registration_flow": "registration-with-approval"
    },
    "password_policy": {
      "minimum_length": 12,
      "require_uppercase": true,
      "require_lowercase": true,
      "require_digits": true,
      "require_special_chars": true,
      "history_count": 5,
      "max_age_days": 90
    },
    "brute_force_protection": {
      "enabled": true,
      "max_login_failures": 5,
      "wait_increment_seconds": 60,
      "quick_login_check_millis": 1000,
      "max_failure_wait_seconds": 900
    },
    "email_configuration": {
      "smtp_server": "smtp.acmecorp.com",
      "smtp_port": 587,
      "smtp_username": "noreply@acmecorp.com",
      "from_address": "identity@acmecorp.com",
      "from_display_name": "ACME Corp Identity"
    }
  }'`}</code></pre>
      </div>

      <h2>SaaS Configuration Patterns</h2>

      <h3>Subscription Tier Management</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">SaaS-Ready Features</p>
            <p className="text-blue-800 text-sm">
              IDP Platform includes built-in support for SaaS subscription models
              with tiered features, usage-based billing, and automated quota enforcement.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Define subscription tiers with feature limits
{
  "subscription_tiers": {
    "starter": {
      "max_users": 100,
      "max_clients": 5,
      "max_requests_per_minute": 100,
      "features": ["basic_auth", "password_reset"],
      "sla_uptime": 99.9,
      "support_level": "community"
    },
    "professional": {
      "max_users": 5000,
      "max_clients": 25,
      "max_requests_per_minute": 1000,
      "features": ["basic_auth", "mfa", "sso", "federation"],
      "sla_uptime": 99.95,
      "support_level": "email"
    },
    "enterprise": {
      "max_users": 50000,
      "max_clients": 100,
      "max_requests_per_minute": 10000,
      "features": ["all"],
      "sla_uptime": 99.99,
      "support_level": "priority",
      "dedicated_infrastructure": true
    }
  }
}`}</code></pre>
      </div>

      <h3>Tenant Onboarding Automation</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Automated tenant provisioning workflow
curl -X POST http://localhost:4000/api/v1/iam/tenants/provision \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer PLATFORM_ADMIN_TOKEN" \\
  -d '{
    "organization_name": "Customer Corp",
    "admin_email": "admin@customer.com",
    "subscription_tier": "professional",
    "billing_configuration": {
      "billing_email": "billing@customer.com",
      "payment_method_id": "pm_1234567890",
      "billing_cycle": "monthly"
    },
    "customization": {
      "logo_url": "https://customer.com/logo.png",
      "primary_color": "#1e40af",
      "company_name": "Customer Corp"
    },
    "initial_configuration": {
      "default_password_policy": "strong",
      "require_mfa": true,
      "session_timeout_hours": 8
    }
  }'

# Response includes realm_id, admin credentials, and setup URLs
{
  "realm_id": "customer-corp-12345",
  "admin_console_url": "https://identity.customer.com/admin",
  "initial_admin_token": "temp_admin_token_expires_24h",
  "setup_completion_required": true
}`}</code></pre>
      </div>

      <h2>Enterprise Department Segmentation</h2>

      <h3>Organizational Realm Structure</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Building2 className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium mb-1">Enterprise Use Case</p>
            <p className="text-amber-800 text-sm">
              Large enterprises can use realm separation to isolate different
              business units, regions, or projects while maintaining centralized
              administration and compliance oversight.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Enterprise realm hierarchy example
{
  "enterprise_structure": {
    "master_realm": "acme-corporation",
    "business_units": [
      {
        "realm_id": "acme-manufacturing",
        "name": "Manufacturing Division",
        "users": 15000,
        "applications": ["erp", "scada", "quality"],
        "compliance_requirements": ["iso_9001", "osha"]
      },
      {
        "realm_id": "acme-retail",
        "name": "Retail Operations",
        "users": 8000,
        "applications": ["pos", "inventory", "crm"],
        "compliance_requirements": ["pci_dss", "ccpa"]
      },
      {
        "realm_id": "acme-finance",
        "name": "Financial Services",
        "users": 2000,
        "applications": ["trading", "risk", "compliance"],
        "compliance_requirements": ["sox", "gdpr", "basel_iii"]
      }
    ]
  }
}`}</code></pre>
      </div>

      <h3>Cross-Realm Federation</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Configure cross-realm trust and federation
curl -X POST http://localhost:4000/api/v1/iam/realms/acme-manufacturing/federation/trust \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -d '{
    "trusted_realm": "acme-finance",
    "trust_type": "limited",
    "allowed_operations": ["user_lookup", "group_membership"],
    "attribute_mapping": {
      "employee_id": "employee_id",
      "department": "department",
      "clearance_level": "security_clearance"
    },
    "conditions": {
      "require_mfa": true,
      "max_session_duration_hours": 4,
      "allowed_networks": ["10.0.0.0/8", "192.168.0.0/16"]
    }
  }'`}</code></pre>
      </div>

      <h2>Resource Quotas and Monitoring</h2>

      <h3>Quota Management</h3>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <TrendingUp className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Usage Tracking</h3>
          <ul className="text-sm space-y-1">
            <li>• Real-time usage monitoring</li>
            <li>• Historical usage analytics</li>
            <li>• Predictive capacity planning</li>
            <li>• Cost allocation and chargeback</li>
          </ul>
        </div>

        <div className="feature-card">
          <Zap className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Automated Enforcement</h3>
          <ul className="text-sm space-y-1">
            <li>• Soft and hard quota limits</li>
            <li>• Grace period management</li>
            <li>• Automated scaling notifications</li>
            <li>• Usage-based billing integration</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Check realm usage and quota status
curl http://localhost:4000/api/v1/iam/realms/customer-corp-12345/usage \\
  -H "Authorization: Bearer ADMIN_TOKEN"

{
  "realm_id": "customer-corp-12345",
  "subscription_tier": "professional",
  "current_usage": {
    "users": {
      "current": 2847,
      "limit": 5000,
      "utilization": 56.94
    },
    "clients": {
      "current": 18,
      "limit": 25,
      "utilization": 72.0
    },
    "requests_per_minute": {
      "current_avg": 342,
      "limit": 1000,
      "utilization": 34.2,
      "peak_last_24h": 756
    },
    "storage_mb": {
      "current": 245,
      "limit": 2048,
      "utilization": 11.96
    }
  },
  "quota_alerts": [
    {
      "type": "approaching_limit",
      "resource": "clients",
      "threshold": 80,
      "recommendation": "Consider upgrading to enterprise tier"
    }
  ]
}`}</code></pre>
      </div>

      <h2>Operational Management</h2>

      <h3>Bulk Realm Operations</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Bulk configuration update across multiple realms
curl -X POST http://localhost:4000/api/v1/iam/realms/bulk-update \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer PLATFORM_ADMIN_TOKEN" \\
  -d '{
    "realm_filter": {
      "subscription_tier": "professional",
      "compliance_requirements": ["gdpr"]
    },
    "configuration_updates": {
      "password_policy": {
        "minimum_length": 14,
        "max_age_days": 60
      },
      "session_management": {
        "absolute_timeout_seconds": 28800,
        "idle_timeout_seconds": 1800
      }
    },
    "schedule": {
      "apply_at": "2026-04-05T02:00:00Z",
      "rollback_on_error": true
    }
  }'`}</code></pre>
      </div>

      <h3>Compliance and Audit</h3>

      <div className="grid gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Compliance Controls
          </h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• Per-realm compliance policies and enforcement</li>
            <li>• Data residency and sovereignty controls</li>
            <li>• Automated compliance reporting and attestation</li>
            <li>• Audit trail aggregation and analysis</li>
            <li>• Privacy controls and data subject requests</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Security Monitoring
          </h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Cross-realm security event correlation</li>
            <li>• Tenant-specific threat intelligence</li>
            <li>• Anomaly detection and behavioral analysis</li>
            <li>• Automated incident response workflows</li>
            <li>• Security scorecard and posture assessment</li>
          </ul>
        </div>
      </div>

      <h2>Migration and Backup Strategies</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Realm Backup</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>POST /api/v1/iam/realms/{`{realm}`}/backup</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Complete realm configuration export</li>
            <li>• User data and credential backup</li>
            <li>• Application and client configuration</li>
            <li>• Incremental and differential backups</li>
          </ul>
        </div>

        <div className="feature-card">
          <Settings className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Realm Migration</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>POST /api/v1/iam/realms/{`{realm}`}/migrate</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Cross-platform realm import/export</li>
            <li>• Zero-downtime migration procedures</li>
            <li>• Data validation and integrity checks</li>
            <li>• Rollback and recovery mechanisms</li>
          </ul>
        </div>
      </div>

      <h2>Performance and Scaling</h2>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
          <div>
            <p className="text-red-900 font-medium mb-1">Scaling Considerations</p>
            <p className="text-red-800 text-sm">
              While realms provide excellent isolation, consider performance implications
              of large numbers of realms. IDP Platform is optimized for up to 10,000
              active realms per deployment with appropriate resource allocation.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Performance optimization for large multi-tenant deployments
{
  "optimization_strategies": {
    "database_sharding": {
      "enabled": true,
      "shard_key": "realm_id",
      "shards_per_region": 4
    },
    "caching": {
      "realm_configuration_ttl_seconds": 3600,
      "user_session_cache_size": 10000,
      "federation_metadata_ttl_seconds": 1800
    },
    "connection_pooling": {
      "max_connections_per_realm": 50,
      "connection_timeout_seconds": 30,
      "pool_size": 200
    },
    "rate_limiting": {
      "global_requests_per_minute": 100000,
      "per_realm_requests_per_minute": 1000,
      "burst_allowance": 20
    }
  }
}`}</code></pre>
      </div>

      <h2>Next Steps</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/federation"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Federation Guide</h3>
          <p className="text-sm text-gray-600">
            Configure external identity providers and cross-realm federation
          </p>
        </Link>
        <Link
          to="/deployment"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Production Deployment</h3>
          <p className="text-sm text-gray-600">
            Deploy multi-tenant IDP Platform at enterprise scale
          </p>
        </Link>
      </div>
    </div>
  )
}