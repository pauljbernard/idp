import React, { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  Download,
  Zap,
  Network,
  Shield,
  GitBranch,
  Users,
  Code,
  Cloud,
  AlertCircle,
  Menu,
  X
} from 'lucide-react'
import clsx from 'clsx'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Installation', href: '/installation', icon: Download },
  { name: 'Quick Start', href: '/quick-start', icon: Zap },
  { name: 'Architecture', href: '/architecture', icon: Network },
  { name: 'Authentication', href: '/authentication', icon: Shield },
  { name: 'Federation', href: '/federation', icon: GitBranch },
  { name: 'Multi-Tenant', href: '/multi-tenant', icon: Users },
  { name: 'API Reference', href: '/api-reference', icon: Code },
  { name: 'Deployment', href: '/deployment', icon: Cloud },
  { name: 'Troubleshooting', href: '/troubleshooting', icon: AlertCircle },
]

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(75, 85, 99, 0.75)',
            zIndex: 20
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarOpen ? 'sidebar' : 'sidebar'} style={{
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
      }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">IDP Platform</h1>
                <p className="text-xs text-gray-500">Documentation</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'nav-link flex items-center space-x-3',
                    isActive && 'nav-link-active'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Version 1.0.0 • Phase 4 Complete
            </p>
            <a
              href="https://github.com/pauljbernard/idp"
              className="text-xs text-primary-600 hover:text-primary-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => item.href === location.pathname)?.name || 'Documentation'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/pauljbernard/idp"
                className="text-gray-400 hover:text-gray-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Code className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}