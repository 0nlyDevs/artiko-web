// Creates or updates Better Auth's tables (schema `better_auth`) from the app's own auth config.
// Node 24 strips the types of auth.ts itself, so no extra CLI is needed.
import { getMigrations } from "better-auth/db/migration";
import { auth } from "../src/lib/auth.ts";

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
await runMigrations();
console.log(`tables created: ${toBeCreated.map((t) => t.table).join(", ") || "none"}; tables altered: ${toBeAdded.length}`);
process.exit(0);
