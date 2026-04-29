import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.mjs', '.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    coverage: {
      provider: 'istanbul',
      all: true,
      include: [
        'src/pages/IamLogin.tsx',
        'src/pages/IamAccount.tsx',
        'src/pages/HeadlessIam.tsx',
        'src/providers/AuthProvider.tsx',
        'src/providers/TenantProvider.tsx',
        'src/providers/PlatformCapabilitiesProvider.tsx',
        'src/components/iam/IamExperiencePanel.tsx',
        'src/components/iam/IamProtocolRuntimePanel.tsx',
        'src/components/iam/IamOrganizationsPanel.tsx',
        'src/components/iam/IamAuthorizationServicesPanel.tsx',
        'src/components/iam/IamFederationPanel.tsx',
        'src/components/iam/IamOperationsPanel.tsx',
        'src/services/iamClientState.ts',
        'src/utils/iamOidc.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 42,
        functions: 23,
        statements: 38,
        branches: 40,
      },
    },
  },
})
