import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/*.ts"],
    exclude: ["src/__tests__/utils.ts"],
    testTimeout: 30 * 1000,
    hookTimeout: 120 * 1000,
    fileParallelism: false,
    maxConcurrency: 1,
  },
});
