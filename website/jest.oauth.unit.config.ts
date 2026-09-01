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
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Unit tests MAY mock Redis for testing logic in isolation
  setupFilesAfterEnv: ['<rootDir>/jest.oauth.unit.setup.ts'],
};

export default config;