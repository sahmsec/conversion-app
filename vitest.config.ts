import { defineConfig } from "vitest/config";

/**
 * Root unit tests live under app/. Function extensions (extensions/*) ship their
 * own vitest config + harness and are tested independently, so they're excluded
 * here to avoid version/harness clashes with the app's test runner.
 */
export default defineConfig({
  test: {
    include: ["app/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "build", "extensions"],
  },
});
