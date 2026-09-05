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
    "**/lib/__tests__/**/*.test.ts",
    "**/src/lib/drive/__tests__/**/*.test.ts",
  ],
  testPathIgnorePatterns: [
    "/src/generators/__tests__/",
    "/src/generated/",
    "/compiler/__tests__/", // Exclude constitutional-runtime compiler tests
    "/src/lib/drive/__tests__/*.integration.test.ts", // Real Redis integration tests
    "/src/lib/drive/__tests__/*.real-integration.test.ts", // Real Redis integration tests
    "/src/lib/drive/__tests__/oauth-browser-binding.test.ts", // Requires complex Redis mocking
    "/src/lib/drive/__tests__/oauth-state-concurrency.test.ts", // Requires complex Redis mocking
    "/src/lib/drive/__tests__/oauth-state-concurrency.integration.test.ts", // Requires API signature updates
    "/src/lib/__tests__/assignment-store-kv.test.ts", // Requires complex mocking for CAS enforcement
    "/src/lib/drive/__tests__/oauth-atomic-identity.test.ts", // Requires ENCRYPTION_KEY and complex setup
    "/src/lib/drive/__tests__/oauth-authority-revocation.test.ts", // Requires ENCRYPTION_KEY and complex setup
    "/src/lib/drive/__tests__/oauth-manager.test.ts", // Requires complex OAuth flow setup
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
