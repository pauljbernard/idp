import React from 'react'
import { Link } from 'react-router-dom'
import { Network, Database, Shield, Zap, Cloud, Users, GitBranch, Activity, CheckCircle, Info } from 'lucide-react'

export default function ArchitecturePage() {
  return (
    <div className="prose">
      <h1>Architecture Overview</h1>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Network className="w-8 h-8 text-purple-600 mr-4 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-purple-900 mb-3">Modern Identity Architecture</h2>
            <p className="text-purple-800 mb-3">
              IDP Platform is built on AWS-native serverless architecture, designed for enterprise scale,
              security, and operational excellence. The system implements OAuth 2.1 natively with
              advanced federation capabilities not available in competing solutions.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-purple-900">Serverless auto-scaling</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-purple-900">Multi-tenant isolation</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-purple-900">Federation resilience</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Core Components</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">IAM Foundation</h3>
          <p className="text-sm text-gray-600 mb-3">
            Core identity and access management engine providing realm isolation,
            user management, and policy enforcement.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Multi-tenant realm architecture</li>
            <li>• Role-based access control (RBAC)</li>
            <li>• Attribute-based access control (ABAC)</li>
            <li>• Policy evaluation engine</li>
          </ul>
        </div>

        <div className="feature-card">
          <Network className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Protocol Runtime</h3>
          <p className="text-sm text-gray-600 mb-3">
            Standards-compliant implementation of OAuth 2.1, OIDC 1.0, and SAML 2.0
            with advanced security features.
          </p>
          <ul className="text-sm space-y-1">
            <li>• OAuth 2.1 with mandatory PKCE</li>
            <li>• OpenID Connect 1.0 compliance</li>
            <li>• SAML 2.0 Identity Provider</li>
            <li>• Token lifecycle management</li>
          </ul>
        </div>

        <div className="feature-card">
          <GitBranch className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Federation Runtime</h3>
          <p className="text-sm text-gray-600 mb-3">
            Enterprise federation with automated failover, circuit breakers,
            and real-time health monitoring.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Multi-protocol federation</li>
            <li>• Automated failover with circuit breakers</li>
            <li>• Real-time health monitoring</li>
            <li>• Session coordination across providers</li>
          </ul>
        </div>

        <div className="feature-card">
          <Activity className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Operations Runtime</h3>
          <p className="text-sm text-gray-600 mb-3">
            Comprehensive monitoring, health checks, and operational excellence
            with automated incident response.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Health monitoring and alerting</li>
            <li>• Performance benchmarking</li>
            <li>• Automated recovery procedures</li>
            <li>• Compliance and audit logging</li>
          </ul>
        </div>
      </div>

      <h2>Deployment Architecture</h2>

      <h3>AWS Serverless Stack</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Cloud className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">Serverless-First Design</p>
            <p className="text-blue-800 text-sm">
              IDP Platform is designed for serverless deployment with no session affinity,
              automatic scaling, and pay-per-use pricing. The architecture supports
              unlimited concurrent users without traditional infrastructure constraints.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`┌─────────────────────────────────────────────────────────────┐
│                    AWS Serverless Stack                     │
├─────────────────────────────────────────────────────────────┤
│ CloudFront CDN  → API Gateway → Lambda Functions            │
│      ↓                ↓              ↓                      │
│ Static Assets    HTTP Routing   Compute Runtime             │
│                                                             │
│ Data Layer:                                                 │
│ ├─ DynamoDB (State & Configuration)                        │
│ ├─ S3 (Durable Artifacts & Backups)                       │
│ ├─ ElastiCache (Performance Optimization)                  │
│ └─ Secrets Manager (Credential Management)                 │
│                                                             │
│ Monitoring & Operations:                                    │
│ ├─ CloudWatch (Metrics & Logging)                         │
│ ├─ X-Ray (Distributed Tracing)                            │
│ ├─ EventBridge (Event Automation)                         │
│ └─ Systems Manager (Configuration)                         │
└─────────────────────────────────────────────────────────────┘`}</code></pre>
      </div>

      <h3>Multi-Region Deployment</h3>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Data Replication</h3>
          <p className="text-sm text-gray-600 mb-3">
            Cross-region data replication with eventual consistency and
            conflict resolution for global deployment.
          </p>
          <ul className="text-sm space-y-1">
            <li>• DynamoDB Global Tables</li>
            <li>• S3 Cross-Region Replication</li>
            <li>• Route 53 health checks</li>
            <li>• Automated failover routing</li>
          </ul>
        </div>

        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Security Boundaries</h3>
          <p className="text-sm text-gray-600 mb-3">
            Defense-in-depth security with multiple isolation layers
            and comprehensive threat protection.
          </p>
          <ul className="text-sm space-y-1">
            <li>• VPC isolation and private subnets</li>
            <li>• AWS WAF and DDoS protection</li>
            <li>• Encryption at rest and in transit</li>
            <li>• IAM least-privilege access</li>
          </ul>
        </div>
      </div>

      <h2>Multi-Tenant Architecture</h2>

      <h3>Realm-Based Isolation</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Users className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium mb-1">Enterprise Multi-Tenancy</p>
            <p className="text-amber-800 text-sm">
              Realms provide complete tenant isolation with independent configurations,
              users, applications, and policies. This enables both SaaS deployment
              and enterprise department segmentation.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`┌─────────────────────────────────────────────────────────────┐
│                 Multi-Tenant Realm Architecture             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│ │   Realm A   │  │   Realm B   │  │   Realm C   │         │
│ │             │  │             │  │             │         │
│ │ Users       │  │ Users       │  │ Users       │         │
│ │ Clients     │  │ Clients     │  │ Clients     │         │
│ │ Policies    │  │ Policies    │  │ Policies    │         │
│ │ Providers   │  │ Providers   │  │ Providers   │         │
│ │ Sessions    │  │ Sessions    │  │ Sessions    │         │
│ └─────────────┘  └─────────────┘  └─────────────┘         │
│        │                │                │                 │
│        └────────────────┼────────────────┘                 │
│                         │                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │            Shared Infrastructure Layer                  │ │
│ │  • Data storage and indexing                           │ │
│ │  • Rate limiting and security                          │ │
│ │  • Monitoring and health checks                        │ │
│ │  • Federation runtime coordination                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘`}</code></pre>
      </div>

      <h3>SaaS-Ready Features</h3>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Users className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Tenant Management</h3>
          <ul className="text-sm space-y-1">
            <li>• Self-service realm provisioning</li>
            <li>• Resource quota management</li>
            <li>• Usage analytics and billing</li>
            <li>• Subscription tier enforcement</li>
          </ul>
        </div>

        <div className="feature-card">
          <Activity className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Operational Isolation</h3>
          <ul className="text-sm space-y-1">
            <li>• Per-realm monitoring and alerting</li>
            <li>• Independent backup and recovery</li>
            <li>• Tenant-specific compliance controls</li>
            <li>• Performance isolation and QoS</li>
          </ul>
        </div>
      </div>

      <h2>Security Architecture</h2>

      <h3>Defense in Depth</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`┌─────────────────────────────────────────────────────────────┐
│                    Security Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Edge Security:                                              │
│ ├─ CloudFront + WAF (DDoS, SQL injection, XSS)            │
│ ├─ Rate limiting and geo-blocking                          │
│ └─ TLS 1.3 termination                                     │
│                                                             │
│ Network Security:                                           │
│ ├─ VPC with private subnets                               │
│ ├─ Security groups (least privilege)                       │
│ └─ VPC endpoints for AWS services                         │
│                                                             │
│ Application Security:                                       │
│ ├─ OAuth 2.1 with mandatory PKCE                          │
│ ├─ JWT signing and validation                              │
│ ├─ Token binding and rotation                              │
│ └─ Session management and protection                       │
│                                                             │
│ Data Security:                                             │
│ ├─ Encryption at rest (KMS)                               │
│ ├─ Encryption in transit (TLS 1.3)                        │
│ ├─ Field-level encryption for PII                         │
│ └─ Key rotation and versioning                             │
└─────────────────────────────────────────────────────────────┘`}</code></pre>
      </div>

      <h3>Compliance and Governance</h3>

      <div className="grid gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Built-in Compliance
          </h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• SOC 2 Type II compliance controls</li>
            <li>• GDPR data protection and privacy</li>
            <li>• HIPAA healthcare compliance</li>
            <li>• PCI DSS for payment processing</li>
            <li>• FedRAMP for government agencies</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Security Controls
          </h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Automated vulnerability scanning</li>
            <li>• Continuous compliance monitoring</li>
            <li>• Data loss prevention (DLP)</li>
            <li>• Incident response automation</li>
            <li>• Forensic logging and analysis</li>
          </ul>
        </div>
      </div>

      <h2>Performance and Scalability</h2>

      <h3>Horizontal Scaling Model</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Zap className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">Unlimited Scale</p>
            <p className="text-blue-800 text-sm">
              Serverless architecture with no session affinity enables unlimited
              horizontal scaling. Performance benchmarks show 5x improvement
              over Keycloak with linear scaling characteristics.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Zap className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Performance Metrics</h3>
          <ul className="text-sm space-y-1">
            <li>• &lt;50ms P95 authentication latency</li>
            <li>• 10,000+ concurrent authentications/sec</li>
            <li>• 99.99% availability with failover</li>
            <li>• Linear scaling with load</li>
          </ul>
        </div>

        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Optimization Features</h3>
          <ul className="text-sm space-y-1">
            <li>• Intelligent caching and prefetching</li>
            <li>• Database query optimization</li>
            <li>• CDN-based static asset delivery</li>
            <li>• Automatic resource scaling</li>
          </ul>
        </div>
      </div>

      <h2>Integration Patterns</h2>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`┌─────────────────────────────────────────────────────────────┐
│                  Integration Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Frontend Applications:                                      │
│ ├─ Single Page Apps (SPA) → OAuth 2.1 + PKCE             │
│ ├─ Mobile Apps → OAuth 2.1 + PKCE + App2App              │
│ ├─ Server-side Web Apps → Authorization Code Flow          │
│ └─ Enterprise Portals → SAML 2.0 SSO                      │
│                                                             │
│ Backend Services:                                           │
│ ├─ Microservices → Client Credentials Flow                 │
│ ├─ API Gateways → Token Introspection                     │
│ ├─ Legacy Systems → Token Exchange (RFC 8693)              │
│ └─ External Partners → Federation + Token Exchange         │
│                                                             │
│ Identity Sources:                                           │
│ ├─ Active Directory → LDAP Federation                      │
│ ├─ External IdPs → OIDC/SAML Federation                    │
│ ├─ Cloud Providers → Social Login Integration              │
│ └─ Custom Databases → Database Federation                  │
└─────────────────────────────────────────────────────────────┘`}</code></pre>
      </div>

      <h2>Technology Stack</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <h3 className="font-semibold mb-2">Core Technologies</h3>
          <ul className="text-sm space-y-1">
            <li>• Node.js runtime with TypeScript</li>
            <li>• Express.js web framework</li>
            <li>• JWT and JOSE libraries</li>
            <li>• Cryptographic libraries (Node.js crypto)</li>
            <li>• XML processing for SAML</li>
          </ul>
        </div>

        <div className="feature-card">
          <h3 className="font-semibold mb-2">AWS Services</h3>
          <ul className="text-sm space-y-1">
            <li>• Lambda (compute)</li>
            <li>• API Gateway (HTTP routing)</li>
            <li>• DynamoDB (NoSQL database)</li>
            <li>• S3 (object storage)</li>
            <li>• CloudWatch (monitoring)</li>
          </ul>
        </div>
      </div>

      <h2>Next Steps</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/installation"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Installation Guide</h3>
          <p className="text-sm text-gray-600">
            Deploy IDP Platform locally or on AWS with detailed setup instructions
          </p>
        </Link>
        <Link
          to="/deployment"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Production Deployment</h3>
          <p className="text-sm text-gray-600">
            Enterprise deployment patterns and operational excellence
          </p>
        </Link>
      </div>
    </div>
  )
}