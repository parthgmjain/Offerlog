import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test files share one Postgres test database, so they must run one at a time.
    fileParallelism: false,
  },
});
