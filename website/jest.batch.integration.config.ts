import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: false }] },
  testMatch: ['**/src/lib/drive/__tests__/assignment-batch.integration.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 30000,
};
export default config;
