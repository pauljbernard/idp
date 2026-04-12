import React from 'react'
import { Link } from 'react-router-dom'
import { Cloud, Server, Database, Shield, TrendingUp, CheckCircle, AlertCircle, Info, Zap, Activity } from 'lucide-react'

export default function DeploymentPage() {
  return (
    <div className="prose">
      <h1>Production Deployment and Operations</h1>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <Cloud className="w-8 h-8 text-green-600 mr-4 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-green-900 mb-3">Enterprise-Grade Operations</h2>
            <p className="text-green-800 mb-3">
              IDP Platform is designed for production deployment with AWS-native architecture,
              automated scaling, comprehensive monitoring, and enterprise-grade operational excellence.
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-900">Auto-scaling serverless</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-900">Zero-downtime updates</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-green-900">50-70% lower TCO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2>Deployment Architecture</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Server className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Serverless Architecture</h3>
          <p className="text-sm text-gray-600 mb-3">
            True serverless deployment with automatic scaling, no server management,
            and pay-per-use pricing model.
          </p>
          <ul className="text-sm space-y-1">
            <li>• AWS Lambda for compute</li>
            <li>• API Gateway for HTTP routing</li>
            <li>• CloudFront for global distribution</li>
            <li>• No session affinity requirements</li>
          </ul>
        </div>

        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Data Layer</h3>
          <p className="text-sm text-gray-600 mb-3">
            Distributed data storage with high availability, automatic backups,
            and cross-region replication capabilities.
          </p>
          <ul className="text-sm space-y-1">
            <li>• DynamoDB for state management</li>
            <li>• S3 for durable artifacts</li>
            <li>• ElastiCache for performance optimization</li>
            <li>• Automated backup and recovery</li>
          </ul>
        </div>

        <div className="feature-card">
          <Shield className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Security and Compliance</h3>
          <p className="text-sm text-gray-600 mb-3">
            Enterprise security controls with encryption, network isolation,
            and compliance framework integration.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Encryption at rest and in transit</li>
            <li>• VPC isolation and private subnets</li>
            <li>• AWS WAF integration</li>
            <li>• SOC 2, GDPR, HIPAA compliance ready</li>
          </ul>
        </div>

        <div className="feature-card">
          <Activity className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Monitoring and Observability</h3>
          <p className="text-sm text-gray-600 mb-3">
            Comprehensive monitoring with real-time metrics, alerting,
            and automated incident response.
          </p>
          <ul className="text-sm space-y-1">
            <li>• CloudWatch metrics and alarms</li>
            <li>• X-Ray distributed tracing</li>
            <li>• Custom health checks</li>
            <li>• Automated runbook execution</li>
          </ul>
        </div>
      </div>

      <h2>AWS Production Deployment</h2>

      <h3>Infrastructure as Code</h3>

      <p>Deploy using AWS CDK for reproducible, version-controlled infrastructure:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Install AWS CDK and dependencies
npm install -g aws-cdk@2
npm install

# Configure AWS credentials and region
aws configure
export AWS_REGION=us-east-1
export IDP_DEPLOYMENT_STAGE=production

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy core infrastructure
cd deploy/iam-standalone
cdk deploy IDP-Platform-Core-Stack

# Deploy application stack
cdk deploy IDP-Platform-App-Stack

# Deploy monitoring and alerting
cdk deploy IDP-Platform-Monitoring-Stack`}</code></pre>
      </div>

      <h3>Environment Configuration</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Production environment variables (.env.production)
IDP_PLATFORM_ENVIRONMENT=production
IDP_PLATFORM_LOG_LEVEL=INFO

# Data persistence
IDP_PLATFORM_PERSISTENCE_BACKEND=dynamodb-s3
IDP_PLATFORM_STATE_DYNAMODB_TABLE=idp-platform-state-prod
IDP_PLATFORM_DURABLE_S3_BUCKET=idp-platform-durable-prod

# Rate limiting
IDP_RATE_LIMIT_BACKEND=dynamodb
IDP_RATE_LIMIT_DYNAMODB_TABLE=idp-rate-limit-prod

# Security
IDP_IAM_BOOTSTRAP_DEFAULT_PASSWORD=SECURE_PRODUCTION_PASSWORD
IDP_PLATFORM_ENCRYPTION_KEY_ARN=arn:aws:kms:us-east-1:123456789:key/abcd-1234
IDP_PLATFORM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789:certificate/abcd-1234

# Monitoring
IDP_PLATFORM_ENABLE_XRAY=true
IDP_PLATFORM_ENABLE_DETAILED_METRICS=true
IDP_CLOUDWATCH_LOG_GROUP=/aws/lambda/idp-platform-prod`}</code></pre>
      </div>

      <h3>Multi-Region Deployment</h3>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-1">High Availability</p>
            <p className="text-blue-800 text-sm">
              Deploy IDP Platform across multiple AWS regions for disaster recovery
              and global performance optimization with cross-region state replication.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Deploy to primary region (us-east-1)
export AWS_REGION=us-east-1
export IDP_DEPLOYMENT_REGION=primary
cdk deploy --all

# Deploy to secondary region (us-west-2)
export AWS_REGION=us-west-2
export IDP_DEPLOYMENT_REGION=secondary
cdk deploy --all

# Configure cross-region replication
aws dynamodb put-item --region us-east-1 \\
  --table-name idp-platform-state-prod \\
  --item '{
    "pk": {"S": "GLOBAL_CONFIG"},
    "sk": {"S": "REPLICATION"},
    "replica_regions": {"SS": ["us-west-2", "eu-west-1"]},
    "sync_interval_minutes": {"N": "5"}
  }'`}</code></pre>
      </div>

      <h2>Container Deployment (Alternative)</h2>

      <h3>Docker Compose for Development</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# docker-compose.yml for local development
version: '3.8'
services:
  idp-platform:
    build: .
    ports:
      - "4000:4000"
    environment:
      - IDP_PLATFORM_PERSISTENCE_BACKEND=filesystem
      - IDP_RATE_LIMIT_BACKEND=memory
      - IDP_PLATFORM_STATE_ROOT=/app/state
    volumes:
      - ./state:/app/state
      - ./config:/app/config

  idp-ui:
    build: ./apps/enterprise-ui
    ports:
      - "3004:3004"
    environment:
      - REACT_APP_API_BASE_URL=http://localhost:4000
    depends_on:
      - idp-platform

# Start development environment
docker-compose up -d`}</code></pre>
      </div>

      <h3>Kubernetes Deployment</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Kubernetes deployment manifest
apiVersion: apps/v1
kind: Deployment
metadata:
  name: idp-platform
  namespace: identity
spec:
  replicas: 3
  selector:
    matchLabels:
      app: idp-platform
  template:
    metadata:
      labels:
        app: idp-platform
    spec:
      containers:
      - name: idp-platform
        image: idp-platform:latest
        ports:
        - containerPort: 4000
        env:
        - name: IDP_PLATFORM_PERSISTENCE_BACKEND
          value: "dynamodb-s3"
        - name: IDP_PLATFORM_LOG_LEVEL
          value: "INFO"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5`}</code></pre>
      </div>

      <h2>Operational Excellence</h2>

      <h3>Health Monitoring</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Comprehensive health check endpoint
curl http://production-api.example.com/health

{
  "status": "HEALTHY",
  "timestamp": "2026-04-04T10:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": [
    {
      "id": "database-connectivity",
      "name": "DynamoDB connectivity",
      "status": "PASS",
      "response_time_ms": 12
    },
    {
      "id": "s3-connectivity",
      "name": "S3 bucket accessibility",
      "status": "PASS",
      "response_time_ms": 8
    },
    {
      "id": "federation-failover",
      "name": "Federation failover and monitoring",
      "status": "PASS",
      "summary": "3 healthy, 0 degraded, 0 failed providers"
    }
  ]
}`}</code></pre>
      </div>

      <h3>Performance Metrics</h3>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <TrendingUp className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Response Time Monitoring</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>GET /metrics/performance</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• P50, P95, P99 response times</li>
            <li>• Authentication flow latency</li>
            <li>• Federation provider performance</li>
            <li>• Database query optimization</li>
          </ul>
        </div>

        <div className="feature-card">
          <Zap className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Throughput Analysis</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>GET /metrics/throughput</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Requests per second (RPS)</li>
            <li>• Authentication success rates</li>
            <li>• Token generation throughput</li>
            <li>• Federation flow completion rates</li>
          </ul>
        </div>
      </div>

      <h3>Automated Scaling</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# CloudWatch-based auto-scaling configuration
{
  "scaling_policies": [
    {
      "metric": "authentication_requests_per_minute",
      "threshold": 1000,
      "scale_out": {
        "lambda_concurrency": "+50%",
        "dynamodb_read_capacity": "+25%"
      }
    },
    {
      "metric": "response_time_p95_ms",
      "threshold": 500,
      "scale_out": {
        "lambda_memory": "+256MB",
        "dynamodb_write_capacity": "+25%"
      }
    }
  ],
  "cost_optimization": {
    "scheduled_scaling": {
      "business_hours": "08:00-18:00 EST",
      "weekend_reduction": "50%"
    }
  }
}`}</code></pre>
      </div>

      <h2>Security Operations</h2>

      <h3>Certificate Management</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium mb-1">Automated Certificate Rotation</p>
            <p className="text-amber-800 text-sm">
              IDP Platform automatically manages SAML signing certificates and JWT
              signing keys with zero-downtime rotation and proper key versioning.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Certificate rotation schedule
{
  "certificate_rotation": {
    "saml_signing_cert": {
      "rotation_interval_days": 90,
      "warning_threshold_days": 30,
      "automated_rotation": true
    },
    "jwt_signing_keys": {
      "rotation_interval_days": 30,
      "overlap_period_days": 7,
      "key_algorithm": "RS256"
    },
    "tls_certificates": {
      "managed_by": "aws_certificate_manager",
      "auto_renewal": true
    }
  }
}`}</code></pre>
      </div>

      <h3>Backup and Recovery</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Automated backup configuration
aws dynamodb put-backup-schedule \\
  --table-name idp-platform-state-prod \\
  --backup-schedule '{
    "continuous_backups": {
      "enabled": true,
      "point_in_time_recovery": true
    },
    "scheduled_backups": {
      "frequency": "daily",
      "retention_days": 30,
      "backup_time": "02:00 UTC"
    },
    "cross_region_backup": {
      "enabled": true,
      "destination_region": "us-west-2"
    }
  }'

# Disaster recovery test procedure
aws dynamodb restore-table-from-backup \\
  --target-table-name idp-platform-state-test \\
  --backup-arn arn:aws:dynamodb:us-east-1:123456789:table/idp-platform-state-prod/backup/12345678`}</code></pre>
      </div>

      <h2>Cost Optimization</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <TrendingUp className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Serverless Economics</h3>
          <p className="text-sm text-gray-600 mb-3">
            Pay-per-use pricing model with automatic scaling reduces costs
            compared to traditional infrastructure.
          </p>
          <ul className="text-sm space-y-1">
            <li>• 50-70% lower TCO vs self-managed</li>
            <li>• No idle infrastructure costs</li>
            <li>• Automatic resource optimization</li>
            <li>• Usage-based pricing model</li>
          </ul>
        </div>

        <div className="feature-card">
          <Database className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Storage Optimization</h3>
          <p className="text-sm text-gray-600 mb-3">
            Intelligent data lifecycle management with automated archiving
            and compression for long-term cost efficiency.
          </p>
          <ul className="text-sm space-y-1">
            <li>• Automated data archiving</li>
            <li>• Intelligent tiering (S3 IA, Glacier)</li>
            <li>• Compression for audit logs</li>
            <li>• Retention policy automation</li>
          </ul>
        </div>
      </div>

      <h3>Cost Monitoring and Alerts</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# AWS Cost Explorer integration
{
  "cost_monitoring": {
    "daily_budget": 100,
    "monthly_budget": 2500,
    "alerts": [
      {
        "threshold": 80,
        "type": "percentage",
        "notification": "email"
      },
      {
        "threshold": 120,
        "type": "absolute_amount",
        "notification": "slack"
      }
    ]
  },
  "cost_optimization_recommendations": {
    "reserved_capacity": {
      "dynamodb_read_units": 1000,
      "dynamodb_write_units": 500,
      "estimated_savings": "35%"
    }
  }
}`}</code></pre>
      </div>

      <h2>Compliance and Governance</h2>

      <div className="grid gap-4 mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Compliance Frameworks
          </h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• SOC 2 Type II compliance ready</li>
            <li>• GDPR data protection and privacy</li>
            <li>• HIPAA healthcare compliance</li>
            <li>• PCI DSS for payment card industry</li>
            <li>• ISO 27001 information security</li>
            <li>• FedRAMP for government agencies</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            Audit and Logging
          </h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Comprehensive audit trail for all operations</li>
            <li>• Tamper-evident log storage in S3</li>
            <li>• Real-time security event monitoring</li>
            <li>• Automated compliance reporting</li>
            <li>• Data retention and deletion policies</li>
            <li>• Forensic investigation capabilities</li>
          </ul>
        </div>
      </div>

      <h2>Deployment Checklist</h2>

      <div className="space-y-2 mb-8">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">AWS account configured with appropriate permissions</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">Production environment variables configured</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">SSL certificates provisioned and validated</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">Domain name configured with Route 53</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">DynamoDB tables created with appropriate capacity</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">S3 buckets configured with proper permissions</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">CloudWatch monitoring and alarms configured</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">Backup and recovery procedures tested</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">Security groups and VPC configuration reviewed</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">Performance and load testing completed</span>
        </label>
      </div>

      <h2>Next Steps</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/troubleshooting"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <AlertCircle className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting Guide</h3>
          <p className="text-sm text-gray-600">
            Common deployment issues, monitoring, and operational procedures
          </p>
        </Link>
        <Link
          to="/api-reference"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <Shield className="w-6 h-6 text-primary-600 mb-2" />
          <h3 className="font-semibold text-gray-900 mb-2">API Reference</h3>
          <p className="text-sm text-gray-600">
            Complete API documentation for integration and automation
          </p>
        </Link>
      </div>
    </div>
  )
}