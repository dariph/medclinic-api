import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/services/**/*.ts", "src/domain/**/*.ts"],
      exclude: ["src/services/**/*.spec.ts", "src/domain/ports/**/*.ts"],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
