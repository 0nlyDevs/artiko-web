import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The guards run before any database or Better Auth object exists, so they can be checked without either.
async function authWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(name, "");
    else vi.stubEnv(name, value);
  }
  return (await import("./auth")).getAuth;
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_URL", "postgresql://x:x@127.0.0.1:1/x");
  vi.stubEnv("BETTER_AUTH_SECRET", "a".repeat(32));
});

afterEach(() => vi.unstubAllEnvs());

describe("production configuration", () => {
  it("refuses a plain http URL", async () => {
    const getAuth = await authWith({ BETTER_AUTH_URL: "http://artiko.example", AUTH_CLIENT_IP_HEADER: "x-real-ip" });
    expect(getAuth).toThrowError("must be an https URL");
  });

  it("requires the header the proxy overwrites with the client IP", async () => {
    const getAuth = await authWith({ BETTER_AUTH_URL: "https://artiko.example", AUTH_CLIENT_IP_HEADER: undefined });
    expect(getAuth).toThrowError("AUTH_CLIENT_IP_HEADER must name");
  });

  it.each(["x-forwarded-for", "  X-Forwarded-For "])("refuses %j, which clients can set", async (header) => {
    const getAuth = await authWith({ BETTER_AUTH_URL: "https://artiko.example", AUTH_CLIENT_IP_HEADER: header });
    expect(getAuth).toThrowError("cannot be x-forwarded-for");
  });
});
