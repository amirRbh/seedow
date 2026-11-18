import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vite 8 résout nativement les alias `paths` du tsconfig (`@/…`).
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.{test,spec}.ts", "src/**/__tests__/**/*.{test,spec}.ts"],
    environment: "node",
    globals: false,
  },
});
