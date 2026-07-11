import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    globalSetup: ["src/__tests__/global-setup.ts"],
    // Integration tests share one dev Postgres database. Run files serially in a
    // single fork so concurrent suites never race on the same rows.
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
