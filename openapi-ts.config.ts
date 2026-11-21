import { defineConfig } from "@hey-api/openapi-ts";

// The contract lives in artiko-api. Point OPENAPI_SPEC at a checkout (or URL) and run
// `pnpm api:generate`; the generated client is committed so CI and Vercel need no sibling repo.
export default defineConfig({
  input: process.env.OPENAPI_SPEC ?? "../artiko-api/openapi.yml",
  output: { path: "src/lib/api-client", clean: true },
  plugins: ["@hey-api/typescript", "@hey-api/client-fetch", "@hey-api/sdk"],
});
