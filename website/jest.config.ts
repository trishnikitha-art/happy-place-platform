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
    "**/compiler/__tests__/**/*.test.ts",
    "**/lib/__tests__/**/*.test.ts",
    "**/src/lib/drive/__tests__/**/*.test.ts",
  ],
  testPathIgnorePatterns: [
    "/src/generators/__tests__/",
    "/src/generated/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

export default config;
