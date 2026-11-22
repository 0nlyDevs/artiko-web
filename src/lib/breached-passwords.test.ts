import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { afterEach, describe, expect, it, vi } from "vitest";
import { breachedPasswordCheck } from "./breached-passwords";

const PASSWORD = "correct horse battery staple";
const hashSuffix = createHash("sha1").update(PASSWORD).digest("hex").toUpperCase().slice(5);

// The real Better Auth sign-up, in memory: only the call to Have I Been Pwned is simulated.
function signUp() {
  const db: Record<string, unknown[]> = { user: [], session: [], account: [], verification: [] };
  const auth = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "a".repeat(32),
    database: memoryAdapter(db),
    emailAndPassword: { enabled: true },
    plugins: [...breachedPasswordCheck()],
  });
  const attempt = auth.api.signUpEmail({ body: { name: "Rova", email: "rova@example.test", password: PASSWORD } });
  return { attempt, db };
}

function breachServiceAnswers(answer: () => Promise<Response>) {
  const fetch = vi.fn<(url: string | URL | Request) => Promise<Response>>(answer);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("breached password check on /sign-up/email", () => {
  it.each([
    ["the network fails", () => Promise.reject(new TypeError("fetch failed"))],
    ["the service answers 503", async () => new Response("Service Unavailable", { status: 503 })],
    ["the service answers an unreadable count", async () => new Response(`${hashSuffix}:many`)],
  ])("refuses with PASSWORD_CHECK_UNAVAILABLE when %s, and creates no account", async (_, answer) => {
    const fetch = breachServiceAnswers(answer);
    const { attempt, db } = signUp();
    await expect(attempt).rejects.toMatchObject({ statusCode: 503, body: { code: "PASSWORD_CHECK_UNAVAILABLE" } });
    expect(String(fetch.mock.calls[0][0])).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/);
    expect(db.user).toEqual([]);
  });

  it("still refuses a breached password with PASSWORD_COMPROMISED", async () => {
    breachServiceAnswers(async () => new Response(`0000000000000000000000000000000000A:1\r\n${hashSuffix}:42\r\n`));
    await expect(signUp().attempt).rejects.toMatchObject({ statusCode: 400, body: { code: "PASSWORD_COMPROMISED" } });
  });

  it("accepts a password absent from the breaches", async () => {
    breachServiceAnswers(async () => new Response("0000000000000000000000000000000000A:1\r\n"));
    const { attempt, db } = signUp();
    await expect(attempt).resolves.toMatchObject({ user: { email: "rova@example.test" } });
    expect(db.user).toHaveLength(1);
  });
});
