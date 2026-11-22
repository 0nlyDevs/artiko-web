import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Real-browser journeys, kept out of `pnpm test`: they rebuild the app and need Chrome (CHROME_PATH).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["e2e/**/*.e2e.ts"], testTimeout: 120_000, hookTimeout: 600_000, fileParallelism: false },
});
