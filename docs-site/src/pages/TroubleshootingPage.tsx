import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle, Info, Search, Wrench, HelpCircle, Zap, Shield, Database } from 'lucide-react'

export default function TroubleshootingPage() {
  return (
    <div className="prose">
      <h1>Troubleshooting and FAQ</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-2">Comprehensive Support</p>
            <p className="text-blue-800 text-sm">
              This guide covers common issues, diagnostic procedures, and solutions for
              IDP Platform deployment and operation. Use the search functionality and
              health monitoring endpoints for faster issue resolution.
            </p>
          </div>
        </div>
      </div>

      <h2>Quick Diagnostic Commands</h2>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Health check - first step for any issue
curl http://localhost:4000/health

# Detailed health information
curl http://localhost:4000/health/detailed

# Check specific realm status
curl http://localhost:4000/api/v1/iam/realms/my-realm/health

# Federation provider health
curl http://localhost:4000/api/v1/iam/realms/my-realm/federation/health

# View recent logs (if deployed with CloudWatch)
aws logs tail /aws/lambda/idp-platform --follow --since 5m`}</code></pre>
      </div>

      <h2>Common Issues and Solutions</h2>

      <div className="space-y-6 mb-8">
        <details className="bg-red-50 border border-red-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer text-red-900 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Authentication Failures
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-medium text-red-900 mb-2">Symptoms</h4>
              <ul className="text-red-800 text-sm space-y-1">
                <li>• Users cannot log in to applications</li>
                <li>• "Invalid client" or "unauthorized client" errors</li>
                <li>• Token validation failures</li>
                <li>• SAML assertion errors</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-red-900 mb-2">Diagnostic Steps</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-2">
                <code>{`# Check client configuration
curl -H "Authorization: Bearer ADMIN_TOKEN" \\
  http://localhost:4000/api/v1/iam/realms/my-realm/clients/my-client

# Verify realm settings
curl -H "Authorization: Bearer ADMIN_TOKEN" \\
  http://localhost:4000/api/v1/iam/realms/my-realm

# Test token endpoint directly
curl -X POST http://localhost:4000/api/v1/iam/realms/my-realm/protocol/openid-connect/token \\
  -d "grant_type=authorization_code&client_id=my-client&code=TEST_CODE"`}</code>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-red-900 mb-2">Common Solutions</h4>
              <ul className="text-red-800 text-sm space-y-1">
                <li>• Verify client ID and redirect URIs match exactly</li>
                <li>• Check that PKCE is enabled for public clients</li>
                <li>• Ensure clock synchronization between client and server</li>
                <li>• Verify SSL certificate validity and trust</li>
                <li>• Check rate limiting and IP restrictions</li>
              </ul>
            </div>
          </div>
        </details>

        <details className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer text-amber-900 flex items-center">
            <Database className="w-4 h-4 mr-2" />
            Database and Storage Issues
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Symptoms</h4>
              <ul className="text-amber-800 text-sm space-y-1">
                <li>• "Service temporarily unavailable" errors</li>
                <li>• Slow response times or timeouts</li>
                <li>• Data persistence failures</li>
                <li>• State synchronization issues</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Diagnostic Commands</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-2">
                <code>{`# Check DynamoDB connectivity
aws dynamodb describe-table --table-name idp-platform-state-prod

# Check S3 bucket access
aws s3 ls s3://idp-platform-durable-prod

# Test database connections
curl http://localhost:4000/health/storage

# Check filesystem permissions (local development)
ls -la ./state/
df -h ./state/`}</code>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-amber-900 mb-2">Solutions</h4>
              <ul className="text-amber-800 text-sm space-y-1">
                <li>• Verify AWS credentials and permissions</li>
                <li>• Check DynamoDB and S3 service status</li>
                <li>• Ensure adequate read/write capacity units</li>
                <li>• Verify VPC and security group configurations</li>
                <li>• Check disk space for filesystem backend</li>
              </ul>
            </div>
          </div>
        </details>

        <details className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer text-purple-900 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Federation and External Provider Issues
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Symptoms</h4>
              <ul className="text-purple-800 text-sm space-y-1">
                <li>• External authentication redirects fail</li>
                <li>• SAML metadata errors</li>
                <li>• Federation provider marked as "FAILED"</li>
                <li>• Circuit breaker activation</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Diagnostic Steps</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-2">
                <code>{`# Check federation provider health
curl -H "Authorization: Bearer ADMIN_TOKEN" \\
  http://localhost:4000/api/v1/iam/realms/my-realm/federation/health

# Test external provider connectivity
curl -v https://external-idp.example.com/.well-known/openid-configuration

# Check SAML metadata
curl https://external-idp.example.com/saml/metadata

# Review federation events
curl -H "Authorization: Bearer ADMIN_TOKEN" \\
  http://localhost:4000/api/v1/iam/realms/my-realm/federation/events`}</code>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-purple-900 mb-2">Solutions</h4>
              <ul className="text-purple-800 text-sm space-y-1">
                <li>• Verify external provider availability and configuration</li>
                <li>• Check certificate validity and trust chains</li>
                <li>• Review claim mapping and attribute configuration</li>
                <li>• Reset circuit breakers if provider has recovered</li>
                <li>• Verify network connectivity and firewall rules</li>
              </ul>
            </div>
          </div>
        </details>

        <details className="bg-green-50 border border-green-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer text-green-900 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Performance and Scaling Issues
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h4 className="font-medium text-green-900 mb-2">Symptoms</h4>
              <ul className="text-green-800 text-sm space-y-1">
                <li>• Slow authentication response times</li>
                <li>• High CPU or memory usage</li>
                <li>• Rate limiting errors</li>
                <li>• Auto-scaling events</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-900 mb-2">Performance Analysis</h4>
              <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-2">
                <code>{`# Check performance metrics
curl http://localhost:4000/metrics/performance

# Review resource utilization
curl http://localhost:4000/metrics/resources

# Check rate limiting status
curl http://localhost:4000/metrics/rate-limiting

# AWS CloudWatch metrics (production)
aws cloudwatch get-metric-statistics \\
  --namespace AWS/Lambda \\
  --metric-name Duration \\
  --dimensions Name=FunctionName,Value=idp-platform-api`}</code>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-green-900 mb-2">Optimization Steps</h4>
              <ul className="text-green-800 text-sm space-y-1">
                <li>• Increase Lambda memory allocation if needed</li>
                <li>• Optimize database queries and indexing</li>
                <li>• Configure appropriate rate limiting thresholds</li>
                <li>• Enable caching for frequently accessed data</li>
                <li>• Review and optimize federation provider response times</li>
              </ul>
            </div>
          </div>
        </details>
      </div>

      <h2>Frequently Asked Questions</h2>

      <div className="space-y-4 mb-8">
        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            How do I migrate from Keycloak to IDP Platform?
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Migration Strategy:</strong> IDP Platform provides migration tools and compatibility layers for seamless transition:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Export realm configurations from Keycloak using our migration utility</li>
              <li>Use the IDP Platform import tool to convert and import configurations</li>
              <li>Test authentication flows in a staging environment</li>
              <li>Perform gradual cutover with DNS routing</li>
            </ul>
            <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs mt-2">
              <code>npm run migrate:keycloak -- --source-realm my-realm --export-file keycloak-export.json</code>
            </div>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            What are the differences between IDP Platform and Auth0?
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Key Advantages:</strong> IDP Platform offers several advantages over Auth0:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Cost:</strong> 50-70% lower TCO with serverless AWS-native architecture</li>
              <li><strong>Performance:</strong> 5x faster authentication flows with distributed architecture</li>
              <li><strong>Federation:</strong> Unique federation failover capabilities not available in Auth0</li>
              <li><strong>Standards:</strong> OAuth 2.1 native implementation vs Auth0's OAuth 2.0</li>
              <li><strong>Control:</strong> Self-hosted option with full data sovereignty</li>
            </ul>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            Can IDP Platform handle enterprise-scale deployments?
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Enterprise Scale:</strong> IDP Platform is designed for enterprise-scale deployments:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Tested at 1M+ authentications per day</li>
              <li>Auto-scaling serverless architecture with no upper limits</li>
              <li>Multi-region deployment with disaster recovery</li>
              <li>Enterprise compliance (SOC 2, GDPR, HIPAA)</li>
              <li>99.99% availability SLA with federation failover</li>
              <li>Comprehensive monitoring and operational excellence</li>
            </ul>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            How do I configure custom authentication flows?
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Custom Flows:</strong> IDP Platform supports flexible authentication flow customization:</p>
            <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
              <code>{`{
  "flow_name": "custom-mfa-flow",
  "steps": [
    {"type": "username-password", "required": true},
    {"type": "conditional-mfa", "condition": "risk_score > 0.7"},
    {"type": "device-verification", "condition": "new_device"}
  ]
}`}</code>
            </div>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            What monitoring and alerting capabilities are available?
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Comprehensive Monitoring:</strong> IDP Platform includes enterprise-grade monitoring:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Real-time health checks and availability monitoring</li>
              <li>Performance metrics (response times, throughput)</li>
              <li>Security event detection and alerting</li>
              <li>Federation provider health and failover tracking</li>
              <li>Cost optimization and budget alerts</li>
              <li>Custom dashboards and reporting</li>
            </ul>
          </div>
        </details>

        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <summary className="font-semibold cursor-pointer flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            How do I backup and restore IDP Platform data?
          </summary>
          <div className="mt-3 space-y-2 text-sm">
            <p><strong>Backup Strategy:</strong> Multiple backup and recovery options are available:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Automated DynamoDB point-in-time recovery</li>
              <li>Scheduled backups with configurable retention</li>
              <li>Cross-region backup replication</li>
              <li>Export/import tools for realm configurations</li>
              <li>Disaster recovery testing procedures</li>
            </ul>
            <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
              <code>aws dynamodb create-backup --table-name idp-platform-state-prod --backup-name manual-backup</code>
            </div>
          </div>
        </details>
      </div>

      <h2>Diagnostic Tools and Utilities</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Search className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Health Check Utility</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>npm run health-check -- --comprehensive</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Complete system health validation</li>
            <li>• Dependency connectivity testing</li>
            <li>• Configuration validation</li>
            <li>• Performance baseline testing</li>
          </ul>
        </div>

        <div className="feature-card">
          <Wrench className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Log Analysis Tool</h3>
          <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs mb-3">
            <code>npm run analyze-logs -- --since 1h --filter ERROR</code>
          </div>
          <ul className="text-sm space-y-1">
            <li>• Automated log parsing and analysis</li>
            <li>• Error pattern detection</li>
            <li>• Performance trend analysis</li>
            <li>• Security incident detection</li>
          </ul>
        </div>
      </div>

      <h3>Configuration Validation</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Validate complete configuration
npm run validate:config

# Check specific realm configuration
npm run validate:realm -- --realm-id my-realm

# Validate federation providers
npm run validate:federation -- --realm-id my-realm

# Test authentication flows
npm run test:auth-flows -- --realm-id my-realm --client-id my-client

# Verify compliance with security policies
npm run audit:security -- --output json`}</code></pre>
      </div>

      <h2>Getting Help and Support</h2>

      <div className="grid gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            Documentation and Resources
          </h4>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• <Link to="/api-reference" className="text-blue-600 hover:text-blue-800">Complete API Reference</Link> - Detailed API documentation</li>
            <li>• <Link to="/architecture" className="text-blue-600 hover:text-blue-800">Architecture Overview</Link> - System design and components</li>
            <li>• <a href="https://github.com/pauljbernard/idp/wiki" className="text-blue-600 hover:text-blue-800">GitHub Wiki</a> - Community documentation</li>
            <li>• <a href="https://github.com/pauljbernard/idp/discussions" className="text-blue-600 hover:text-blue-800">Community Discussions</a> - Q&A and best practices</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Community and Support
          </h4>
          <ul className="text-green-800 text-sm space-y-1">
            <li>• <a href="https://github.com/pauljbernard/idp/issues" className="text-green-600 hover:text-green-800">GitHub Issues</a> - Bug reports and feature requests</li>
            <li>• <a href="mailto:support@idpplatform.com" className="text-green-600 hover:text-green-800">Email Support</a> - Direct technical support</li>
            <li>• <a href="https://idpplatform.slack.com" className="text-green-600 hover:text-green-800">Slack Community</a> - Real-time community support</li>
            <li>• <a href="https://idpplatform.com/professional-support" className="text-green-600 hover:text-green-800">Professional Support</a> - Enterprise support packages</li>
          </ul>
        </div>
      </div>

      <h3>Before Contacting Support</h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-amber-900 mb-3">Please Gather This Information</h4>
        <ul className="text-amber-800 text-sm space-y-1">
          <li>• IDP Platform version and deployment environment</li>
          <li>• Output from health check endpoints</li>
          <li>• Relevant log files and error messages</li>
          <li>• Steps to reproduce the issue</li>
          <li>• Configuration details (sanitized of secrets)</li>
          <li>• Network and infrastructure details</li>
        </ul>
        <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs mt-3">
          <code>curl http://localhost:4000/health/detailed &gt; health-report.json</code>
        </div>
      </div>

      <h2>Emergency Procedures</h2>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <h4 className="font-semibold text-red-900 mb-3 flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          Production Emergency Response
        </h4>
        <div className="text-red-800 text-sm space-y-2">
          <p><strong>Service Outage:</strong></p>
          <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
            <code>{`# Enable maintenance mode
curl -X PUT http://localhost:4000/admin/maintenance-mode -d '{"enabled": true}'

# Switch to backup region (AWS)
aws route53 change-resource-record-sets --change-batch file://failover-dns.json

# Rollback to previous version
aws lambda update-function-code --function-name idp-platform-api --s3-bucket backups --s3-key previous-version.zip`}</code>
          </div>
          <p><strong>Security Incident:</strong></p>
          <div className="bg-gray-900 text-gray-100 p-2 rounded text-xs">
            <code>{`# Immediately revoke all sessions
curl -X POST http://localhost:4000/admin/revoke-all-sessions

# Enable enhanced logging
curl -X PUT http://localhost:4000/admin/logging -d '{"level": "DEBUG", "security_events": true}'

# Block suspicious IPs
curl -X POST http://localhost:4000/admin/block-ips -d '{"ips": ["1.2.3.4", "5.6.7.8"]}'`}</code>
          </div>
        </div>
      </div>
    </div>
  )
}