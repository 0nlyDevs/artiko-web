import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const NEXT = path.join(ROOT, "node_modules/.bin/next");

function run(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: ["ignore", "ignore", "inherit"] });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${path.basename(command)} ${args.join(" ")} exited with ${code}`))));
  });
}

/**
 * NEXT_PUBLIC_API_URL is inlined at build time, so the app is rebuilt against the mock API.
 * This replaces the .next folder of the working copy.
 */
export async function buildApp(apiUrl: string): Promise<void> {
  const env = { ...process.env, NEXT_PUBLIC_API_URL: apiUrl };
  await run(process.execPath, [path.join(ROOT, "scripts/copy-draco.mjs")], env);
  await run(NEXT, ["build"], env);
}

export async function startApp(port: number): Promise<{ url: string; stop: () => void }> {
  // Production start refuses to boot without a client IP header (README); any name works for a local run.
  const child: ChildProcess = spawn(NEXT, ["start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: ROOT,
    env: { ...process.env, AUTH_CLIENT_IP_HEADER: "x-e2e-client-ip" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise<void>((resolve, reject) => {
    child.stdout?.on("data", (data) => {
      if (String(data).includes("Ready")) resolve();
    });
    child.on("exit", (code) => reject(new Error(`next start exited with ${code}`)));
  });
  return { url: `http://127.0.0.1:${port}`, stop: () => child.kill() };
}
