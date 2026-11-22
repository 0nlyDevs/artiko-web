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
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "Artiko <hi@artiko.example>");
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

  it.each(["RESEND_API_KEY", "EMAIL_FROM"])("requires %s, since accounts must verify their email", async (name) => {
    const getAuth = await authWith({ BETTER_AUTH_URL: "https://artiko.example", AUTH_CLIENT_IP_HEADER: "x-real-ip", [name]: undefined });
    expect(getAuth).toThrowError("RESEND_API_KEY and EMAIL_FROM must be set");
  });
});

describe("account security", () => {
  async function auth() {
    return (await authWith({ BETTER_AUTH_URL: "https://artiko.example", AUTH_CLIENT_IP_HEADER: "x-real-ip" }))();
  }

  it("opens no session from a verification link", async () => {
    expect((await auth()).options.emailVerification?.autoSignInAfterVerification).toBe(false);
  });
});
