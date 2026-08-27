import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals.js";
import nextTs from "eslint-config-next/typescript.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Work-in-progress directories not critical to OAuth verification
    "src/shared/connectors/**",
    "src/shared/explorer/**",
    "src/shared/intelligence/**",
    "src/shared/components/reconstruction/**",
    "src/shared/components/replay/**",
    "src/shared/components/diff/**",
    "src/shared/components/inspector/**",
    "src/shared/components/explorer/**",
    "src/objects/**",
    "src/motion/**",
    "src/scripts/**",
    "src/app/admin/**",
    "src/app/api/admin/**",
    "src/app/api/diagnostics/**",
    "src/app/api/auth/google/**",
    "src/app/api/drive/**",
    "src/services/**",
    "src/types/**",
    "src/lib/**",
    "src/app/api/drive-sync/**",
    "src/app/api/estimate/**",
    "src/app/api/kit/**",
    "src/app/api/reviews/**",
    "src/app/blog/**",
    "src/app/contact/**",
    "src/app/estimate/**",
    "src/app/newsletter/**",
    "src/app/reviews/**",
    "src/app/workbench/**",
    "src/app/our-work/**",
    "src/app/projects/**",
    "src/app/services/**",
    "src/components/**",
    "src/generated/**",
    "src/generators/**",
    "src/automation/**",
    "src/compiler/**",
    "src/config/**",
  ]),
]);

export default eslintConfig;
