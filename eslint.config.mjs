import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
    // server.js is a plain Node.js entry point Passenger/hosting executes
    // directly, with no build/transpile step — it has to stay CommonJS
    // (require/module.exports), which the rest of the TypeScript codebase
    // correctly forbids. Same reasoning for scripts/** — plain Node
    // utilities that run before/outside the app's own build step (e.g.
    // scripts/link-persistent-uploads.js runs in postinstall, before
    // TypeScript/Prisma are even generated yet).
    "server.js",
    "scripts/**",
  ]),
]);

export default eslintConfig;
