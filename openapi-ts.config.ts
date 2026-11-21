import { defineConfig } from "@hey-api/openapi-ts";

// The contract lives in artiko-api; regenerate with `pnpm gen:api` after it changes.
export default defineConfig({
  input: "../artiko-api/openapi.yml",
  output: "src/lib/api-types",
  plugins: ["@hey-api/typescript"],
});
