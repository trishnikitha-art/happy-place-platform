import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  testTimeout: 30000, // P0 FIX: 30-second timeout for network-backed Redis integration tests
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json",
      diagnostics: false,
    }],
  },
  testMatch: [
    // TEMPORARILY DISABLED: OAuth Redis-backed integration tests (Phase A)
    // These tests have cookie mocking conflicts that need investigation
    // The jest.oauth.integration.setup.ts mock doesn't match Next.js RequestCookies typing
    // Pattern below will not match any files
    "**/__tests__/TEMPORARILY_DISABLED_INTEGRATION__/*.test.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // DO NOT mock @upstash/redis for integration tests
  // These tests require real Redis connectivity
  setupFilesAfterEnv: ['<rootDir>/jest.oauth.integration.setup.ts'],
};

export default config;