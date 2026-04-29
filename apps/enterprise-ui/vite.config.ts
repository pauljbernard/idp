import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devPort = (() => {
  const parsed = Number.parseInt(process.env.PORT ?? '3004', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3004
})()
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:4000'

const vendorChunkGroups = [
  {
    name: 'react-vendor',
    packages: ['react', 'react-dom', 'react-router-dom']
  },
  {
    name: 'query-vendor',
    packages: ['@tanstack/react-query', 'axios']
  },
  {
    name: 'maps-vendor',
    packages: ['leaflet', 'react-leaflet', '@turf/turf']
  },
  {
    name: 'charts-vendor',
    packages: ['recharts']
  },
  {
    name: 'forms-vendor',
    packages: ['react-hook-form', 'zod', '@hookform/resolvers']
  },
  {
    name: 'motion-vendor',
    packages: ['framer-motion']
  },
  {
    name: 'ui-vendor',
    packages: [
      '@headlessui/react',
      '@heroicons/react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@uiw/react-json-view',
      'lucide-react',
      'react-hot-toast',
      'clsx',
      'date-fns'
    ]
  }
] as const

function resolveManualChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) {
    return undefined
  }

  for (const group of vendorChunkGroups) {
    if (group.packages.some((packageName) => id.includes(`/node_modules/${packageName}/`))) {
      return group.name
    }
  }

  return 'vendor'
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: devPort,
    strictPort: true,
    proxy: {
      '/health': {
        target: apiProxyTarget,
        changeOrigin: true
      },
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: devPort,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: resolveManualChunk
      }
    }
  }
})
