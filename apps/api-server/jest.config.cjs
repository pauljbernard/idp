module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^vitest$': '<rootDir>/test/support/vitest-compat.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/server.ts',
    'src/serverInfrastructure.ts',
    'src/platform/iamAuthenticationRuntime.ts',
    'src/platform/iamProtocolRuntime.ts',
    'src/platform/iamFoundation.ts',
    'src/platform/iamFederationRuntime.ts',
    'src/platform/iamAuthorizationServices.ts',
    'src/platform/iamOrganizations.ts',
    'src/platform/serviceEntitlements.ts',
    'src/platform/tenantAliases.ts',
    'src/platform/rateLimiting.ts',
  ],
  coverageProvider: 'v8',
  coverageReporters: ['text', 'json-summary', 'html'],
  coverageThreshold: {
    global: {
      lines: 45,
      functions: 45,
      statements: 45,
      branches: 30,
    },
  },
}
