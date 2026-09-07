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
    "**/src/lib/drive/__tests__/*.real-integration.test.ts",
    "**/src/lib/drive/__tests__/*.integration.test.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // DO NOT mock @upstash/redis for integration tests
  // These tests require real Redis connectivity
  setupFilesAfterEnv: ['<rootDir>/jest.oauth.integration.setup.ts'],
};

export default config;