import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // All test files share one Postgres database, so they must run one at a time.
    fileParallelism: false,
  },
});
