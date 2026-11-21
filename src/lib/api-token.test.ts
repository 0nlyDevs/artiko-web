import { beforeEach, describe, expect, it, vi } from "vitest";

const { token } = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { token } }));

import { ApiError } from "@/lib/api";
import { clearApiToken, getApiToken, tokenExpiry } from "./api-token";

const NOW_SECONDS = 1_800_000_000;

/** A JWT-shaped string whose payload carries `exp`. */
function jwtExpiring(exp: number, name = "t"): string {
  return `h.${btoa(JSON.stringify({ exp }))}.${name}`;
}

beforeEach(() => {
  token.mockReset();
  clearApiToken();
  vi.useFakeTimers();
  vi.setSystemTime(NOW_SECONDS * 1000);
});

describe("getApiToken", () => {
  it("reuses the token until a minute before it expires", async () => {
    token.mockResolvedValue({ data: { token: jwtExpiring(NOW_SECONDS + 600) } });
    const first = await getApiToken();
    expect(await getApiToken()).toBe(first);
    expect(token).toHaveBeenCalledTimes(1);
  });

  it("asks for a new one inside the last minute", async () => {
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 30, "old") } });
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 900, "new") } });
    await getApiToken();
    expect(await getApiToken()).toMatch(/new$/);
    expect(token).toHaveBeenCalledTimes(2);
  });

  it("raises a 401 when nobody is signed in", async () => {
    token.mockResolvedValue({ data: null, error: { message: "no session" } });
    await expect(getApiToken()).rejects.toThrowError(expect.objectContaining({ status: 401, code: "unauthorized" }));
    await expect(getApiToken()).rejects.toBeInstanceOf(ApiError);
  });

  it("forgets the token after clearApiToken, for example on sign-out", async () => {
    token.mockResolvedValue({ data: { token: jwtExpiring(NOW_SECONDS + 600) } });
    await getApiToken();
    clearApiToken();
    await getApiToken();
    expect(token).toHaveBeenCalledTimes(2);
  });
});

describe("tokenExpiry", () => {
  const base64url = (text: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  it("reads a payload that uses the base64url alphabet and accented names", () => {
    // "é" and "?>" in the claims produce "-" and "_" once base64url encoded.
    const payload = JSON.stringify({ name: "Rakotoarivélo", image: "https://x.test/a?b=>c", exp: 1_900_000_000 });
    expect(base64url(payload)).toMatch(/[-_]/);
    expect(tokenExpiry(`h.${base64url(payload)}.s`)).toBe(1_900_000_000);
  });

  it("answers 0 for tokens it cannot read, so they are never cached", () => {
    expect(tokenExpiry("garbage")).toBe(0);
    expect(tokenExpiry("h.!!!.s")).toBe(0);
    expect(tokenExpiry(`h.${base64url('{"sub":"1"}')}.s`)).toBe(0);
  });
});
