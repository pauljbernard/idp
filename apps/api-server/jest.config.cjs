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
    'src/serverInfrastructure.ts',
    'src/platform/serviceEntitlements.ts',
    'src/platform/tenantAliases.ts',
    'src/platform/rateLimiting.ts',
  ],
  coverageProvider: 'v8',
  coverageReporters: ['text', 'json-summary', 'html'],
  coverageThreshold: {
    global: {
      lines: 85,
      functions: 85,
      statements: 85,
      branches: 85,
    },
  },
}
