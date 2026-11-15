import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Database tests boot an embedded Postgres (WASM), which can take several seconds on a busy machine.
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
