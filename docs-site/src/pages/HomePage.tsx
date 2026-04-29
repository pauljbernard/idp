import React from 'react'
import { Link } from 'react-router-dom'
import {
  Shield,
  Zap,
  Globe,
  Users,
  Award,
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="prose">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-600 rounded-xl flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          IDP Platform User Manual
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Enterprise-grade, AWS-native identity and access management platform designed to
          compete with and exceed solutions like Keycloak, Auth0, and Okta.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/quick-start"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors no-underline"
          >
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <Link
            to="/architecture"
            className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors no-underline"
          >
            Architecture Overview
          </Link>
        </div>
      </div>

      {/* Key Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="feature-card">
          <Shield className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Standards Leadership</h3>
          <p className="text-sm text-gray-600">
            OAuth 2.1 native, comprehensive PKCE, SAML 2.0 IdP with automated certificate management.
          </p>
        </div>
        <div className="feature-card">
          <Globe className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Enterprise Federation</h3>
          <p className="text-sm text-gray-600">
            Multi-protocol support with automated failover, circuit breakers, and real-time monitoring.
          </p>
        </div>
        <div className="feature-card">
          <Zap className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">AWS-Native Architecture</h3>
          <p className="text-sm text-gray-600">
            Serverless, auto-scaling design with 50-70% lower TCO than self-managed solutions.
          </p>
        </div>
        <div className="feature-card">
          <Users className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Multi-Tenant Excellence</h3>
          <p className="text-sm text-gray-600">
            Realm-based isolation with flexible tenancy and subscription management.
          </p>
        </div>
        <div className="feature-card">
          <Award className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Operational Excellence</h3>
          <p className="text-sm text-gray-600">
            Automated health monitoring, recovery validation, and performance benchmarking.
          </p>
        </div>
        <div className="feature-card">
          <Star className="w-8 h-8 text-primary-600 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Privacy-First Design</h3>
          <p className="text-sm text-gray-600">
            Built-in data classification, consent management, and regulatory compliance.
          </p>
        </div>
      </div>

      {/* Competitive Advantages */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Why Choose IDP Platform?
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Technical Superiority
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>5x performance advantage</strong> over Keycloak</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Federation failover</strong> not available in competitors</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>OAuth 2.1 native</strong> implementation</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>True serverless scaling</strong> without session affinity</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              Business Value
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>50-70% lower TCO</strong> vs self-managed solutions</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Zero-downtime updates</strong> and maintenance</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Enterprise-grade compliance</strong> built-in</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>SaaS-ready architecture</strong> for multi-tenancy</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Link
          to="/installation"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Installation</h3>
          <p className="text-sm text-gray-600">
            Get IDP Platform running locally or on AWS
          </p>
        </Link>
        <Link
          to="/quick-start"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Quick Start</h3>
          <p className="text-sm text-gray-600">
            Your first realm, user, and authentication flow
          </p>
        </Link>
        <Link
          to="/api-reference"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">API Reference</h3>
          <p className="text-sm text-gray-600">
            Complete API documentation and examples
          </p>
        </Link>
        <Link
          to="/federation"
          className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow no-underline"
        >
          <h3 className="font-semibold text-gray-900 mb-2">Federation</h3>
          <p className="text-sm text-gray-600">
            Advanced identity federation and failover
          </p>
        </Link>
      </div>

      {/* Getting Started */}
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Getting Started
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              🚀 New Users
            </h3>
            <p className="text-gray-600 mb-2">
              Start with our comprehensive installation guide and quick start tutorial.
            </p>
            <Link
              to="/installation"
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Installation Guide →
            </Link>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              🔄 Migrating from Other Platforms
            </h3>
            <p className="text-gray-600 mb-2">
              Comprehensive guides for migrating from Keycloak, Auth0, Okta, and others.
            </p>
            <Link
              to="/troubleshooting"
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Migration Guides →
            </Link>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              🏗️ Enterprise Architects
            </h3>
            <p className="text-gray-600 mb-2">
              Deep dive into architecture, security model, and enterprise features.
            </p>
            <Link
              to="/architecture"
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Architecture Overview →
            </Link>
          </div>
        </div>
      </div>

      {/* Prerequisites */}
      <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-semibold text-amber-900 mb-3">
          Prerequisites
        </h3>
        <ul className="text-amber-800 space-y-1 text-sm">
          <li>• <strong>Node.js 18+</strong> for local development</li>
          <li>• <strong>AWS Account</strong> for cloud deployment (optional for local dev)</li>
          <li>• <strong>Docker</strong> for containerized deployment (optional)</li>
          <li>• <strong>Basic OAuth 2.0/OIDC knowledge</strong> for integration</li>
        </ul>
      </div>
    </div>
  )
}