import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    dangerouslyIgnoreUnhandledErrors: true,
    testTimeout: 999_999_999,
    hookTimeout: 999_999_999,
    threads: true,
  },
});
