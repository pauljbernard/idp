import React from 'react'
import { Link } from 'react-router-dom'
import { Download, Terminal, Cloud, AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function InstallationPage() {
  return (
    <div className="prose">
      <h1>Installation and Setup</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-blue-900 font-medium mb-2">Choose Your Deployment</p>
            <p className="text-blue-800 text-sm">
              IDP Platform supports both local development and AWS cloud deployment.
              Start with local development to explore features, then deploy to AWS for production.
            </p>
          </div>
        </div>
      </div>

      <h2>Prerequisites</h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="feature-card">
          <Terminal className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">Local Development</h3>
          <ul className="text-sm space-y-1">
            <li>• Node.js 18+ and npm 8+</li>
            <li>• Git for version control</li>
            <li>• 4GB+ RAM recommended</li>
            <li>• macOS, Linux, or Windows with WSL2</li>
          </ul>
        </div>
        <div className="feature-card">
          <Cloud className="w-6 h-6 text-primary-600 mb-3" />
          <h3 className="font-semibold mb-2">AWS Deployment</h3>
          <ul className="text-sm space-y-1">
            <li>• AWS CLI v2 configured</li>
            <li>• IAM permissions for DynamoDB, S3, Lambda</li>
            <li>• AWS CDK v2 (for infrastructure)</li>
            <li>• Docker (for container builds)</li>
          </ul>
        </div>
      </div>

      <h2>Quick Installation</h2>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <div className="flex items-center mb-2">
          <Terminal className="w-4 h-4 mr-2" />
          <span className="text-sm font-medium">Clone and Install</span>
        </div>
        <pre className="text-sm"><code>{`# Clone the repository
git clone https://github.com/pauljbernard/idp.git
cd idp

# Install dependencies
npm install

# Install workspace dependencies
npm run install:all

# Verify installation
npm run verify:sdk:iam-contract`}</code></pre>
      </div>

      <h2>Local Development Setup</h2>

      <h3>1. Environment Configuration</h3>

      <p>Create your local environment configuration:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Copy example environment
cp deploy/iam-standalone/bootstrap.env.example .env.local

# Edit configuration for local development
# Key settings for filesystem-based development:
IDP_PLATFORM_PERSISTENCE_BACKEND=filesystem
IDP_RATE_LIMIT_BACKEND=memory
IDP_IAM_BOOTSTRAP_DEFAULT_PASSWORD=StandaloneIAM!SuperAdmin2026`}</code></pre>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
          <div>
            <p className="text-amber-900 font-medium mb-1">Security Note</p>
            <p className="text-amber-800 text-sm">
              The default password is for development only. Change it for any deployment
              beyond local development.
            </p>
          </div>
        </div>
      </div>

      <h3>2. Start the Development Server</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Start API server in development mode
npm run api:dev

# In another terminal, start the UI (optional)
npm run ui:dev

# API will be available at: http://localhost:4000
# UI will be available at: http://localhost:3004`}</code></pre>
      </div>

      <h3>3. Verify Installation</h3>

      <p>Test your installation with these verification steps:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Health check
curl http://localhost:4000/health

# IAM public catalog
curl http://localhost:4000/api/v1/iam/public/catalog

# Run test suite
npm run test:unit
npm run test:journeys`}</code></pre>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <p className="text-green-900 font-medium mb-1">Success!</p>
            <p className="text-green-800 text-sm">
              If all commands complete successfully, your local IDP Platform is ready.
              Continue to the <Link to="/quick-start" className="font-medium">Quick Start Guide</Link>.
            </p>
          </div>
        </div>
      </div>

      <h2>AWS Cloud Deployment</h2>

      <h3>1. AWS Prerequisites Setup</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Install AWS CDK v2
npm install -g aws-cdk@2

# Verify AWS setup
aws sts get-caller-identity`}</code></pre>
      </div>

      <h3>2. Infrastructure Deployment</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Set up environment for AWS deployment
export IDP_DEPLOYMENT_STAGE=production
export IDP_AWS_REGION=us-east-1

# Create AWS infrastructure
cd deploy/iam-standalone
./provision-aws-infrastructure.sh

# This creates:
# - DynamoDB tables for state and rate limiting
# - S3 buckets for durable artifacts
# - IAM roles and policies
# - CloudWatch log groups`}</code></pre>
      </div>

      <h3>3. Application Deployment</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Configure for AWS deployment
cp deploy/iam-standalone/aws-production.env.example .env.production

# Update environment variables for your AWS account:
IDP_PLATFORM_PERSISTENCE_BACKEND=dynamodb-s3
IDP_RATE_LIMIT_BACKEND=dynamodb
IDP_PLATFORM_STATE_DYNAMODB_TABLE=idp-platform-state
IDP_PLATFORM_DURABLE_S3_BUCKET=idp-platform-durable
IDP_RATE_LIMIT_DYNAMODB_TABLE=idp-rate-limit

# Deploy application
npm run build
npm run deploy:aws`}</code></pre>
      </div>

      <h3>4. Verify AWS Deployment</h3>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Get deployment URL from CloudFormation output
aws cloudformation describe-stacks --stack-name idp-platform-stack

# Test health endpoint
curl https://your-api-gateway-url/health

# Check application logs
aws logs tail /aws/lambda/idp-platform-api --follow`}</code></pre>
      </div>

      <h2>LocalStack Development (Optional)</h2>

      <p>For AWS-like local development without cloud costs:</p>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg mb-6">
        <pre className="text-sm"><code>{`# Install LocalStack
pip install localstack

# Start LocalStack
localstack start -d

# Provision local AWS resources
cd deploy/iam-standalone
./provision-localstack.sh

# Configure for LocalStack
export AWS_ENDPOINT_URL=http://localhost:4566
export IDP_DYNAMODB_ENDPOINT=http://localhost:4566
export IDP_PLATFORM_PERSISTENCE_BACKEND=dynamodb-s3`}</code></pre>
      </div>

      <h2>Configuration Options</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full">
          <thead>
            <tr>
              <th>Environment Variable</th>
              <th>Description</th>
              <th>Local Default</th>
              <th>Production</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>IDP_PLATFORM_PERSISTENCE_BACKEND</code></td>
              <td>State storage backend</td>
              <td><code>filesystem</code></td>
              <td><code>dynamodb-s3</code></td>
            </tr>
            <tr>
              <td><code>IDP_RATE_LIMIT_BACKEND</code></td>
              <td>Rate limiting backend</td>
              <td><code>memory</code></td>
              <td><code>dynamodb</code></td>
            </tr>
            <tr>
              <td><code>IDP_PLATFORM_STATE_ROOT</code></td>
              <td>Local filesystem state directory</td>
              <td><code>./state</code></td>
              <td>N/A</td>
            </tr>
            <tr>
              <td><code>IDP_PLATFORM_STATE_DYNAMODB_TABLE</code></td>
              <td>DynamoDB table for state</td>
              <td>N/A</td>
              <td>Required</td>
            </tr>
            <tr>
              <td><code>IDP_RATE_LIMIT_DYNAMODB_TABLE</code></td>
              <td>DynamoDB table for rate limiting</td>
              <td>N/A</td>
              <td>Required</td>
            </tr>
            <tr>
              <td><code>IDP_IAM_BOOTSTRAP_DEFAULT_PASSWORD</code></td>
              <td>Default admin password</td>
              <td><code>StandaloneIAM!SuperAdmin2026</code></td>
              <td>Custom required</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Next Steps</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <Link
          to="/quick-start"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Quick Start Tutorial</h3>
          <p className="text-sm text-gray-600">
            Create your first realm, users, and authentication flow
          </p>
        </Link>
        <Link
          to="/architecture"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Architecture Overview</h3>
          <p className="text-sm text-gray-600">
            Understand IDP Platform's design and components
          </p>
        </Link>
        <Link
          to="/troubleshooting"
          className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting</h3>
          <p className="text-sm text-gray-600">
            Common issues and solutions for setup problems
          </p>
        </Link>
      </div>
    </div>
  )
}