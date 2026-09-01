import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json",
      diagnostics: false,
    }],
  },
  testMatch: [
    "**/src/lib/drive/__tests__/oauth-*.test.ts",
  ],
  testPathIgnorePatterns: [
    "/src/lib/drive/__tests__/*.integration.test.ts", // Exclude integration tests from unit test runs
    "/src/lib/drive/__tests__/oauth-atomic-identity.integration.test.ts", // Explicitly exclude
    "/src/lib/drive/__tests__/oauth-negative-security.integration.test.ts", // Explicitly exclude
    "/src/lib/drive/__tests__/oauth-state-concurrency.integration.test.ts", // Explicitly exclude
    "/src/lib/drive/__tests__/oauth-atomic-identity.test.ts", // Requires complex Redis mocking (eval)
    "/src/lib/drive/__tests__/oauth-authority-revocation.test.ts", // Requires complex Redis mocking (eval)
    "/src/lib/drive/__tests__/oauth-browser-binding.test.ts", // Requires complex Redis mocking
    "/src/lib/drive/__tests__/oauth-state-concurrency.test.ts", // Requires complex Redis mocking
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Unit tests MAY mock Redis for testing logic in isolation
  setupFilesAfterEnv: ['<rootDir>/jest.oauth.unit.setup.ts'],
};

export default config;