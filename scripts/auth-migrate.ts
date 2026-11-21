// Creates the Better Auth tables in schema `better_auth` (run once per database):
//   pnpm auth:migrate
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth";

async function main() {
  const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(getAuth().options);
  console.log(`tables to create: ${toBeCreated.length}, tables to alter: ${toBeAdded.length}`);
  await runMigrations();
  console.log("better_auth schema is up to date");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
