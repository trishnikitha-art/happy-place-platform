import type { Config } from "jest";

/**
 * Phase B HTTP Integration Test Configuration
 *
 * This configuration is for testing the actual HTTP boundary against a running Next.js server.
 * These tests require:
 * - NEXT_PUBLIC_TEST_BASE_URL to be set (points to the running Next server)
 * - KV_REST_API_URL and KV_REST_API_TOKEN for Redis state management
 *
 * Tests executed:
 * - http-negative-security.test.ts - Route-level security invariants
 * - multi-slot-adversarial.integration.test.ts - Multi-slot HTTP behavior
 * - Any other route-level tests requiring the live server
 */

const config: Config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: "tsconfig.json",
      diagnostics: false,
    }],
  },
  testMatch: [
    "**/src/lib/drive/__tests__/http-negative-security.test.ts",
    "**/src/lib/drive/__tests__/multi-slot-adversarial.integration.test.ts",
    "**/src/lib/drive/__tests__/assignment-batch.integration.test.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
