import { beforeEach, describe, expect, it, vi } from "vitest";

const { token } = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { token } }));

import { ApiError } from "@/lib/api";
import { callWithToken, clearApiToken, getApiToken, tokenExpiry } from "./api-token";

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

  it("shares one request between calls made at the same time", async () => {
    token.mockResolvedValue({ data: { token: jwtExpiring(NOW_SECONDS + 600) } });
    const tokens = await Promise.all([getApiToken(), getApiToken(), getApiToken()]);
    expect(new Set(tokens).size).toBe(1);
    expect(token).toHaveBeenCalledTimes(1);
  });

  it("asks again after a shared request failed", async () => {
    token.mockResolvedValueOnce({ data: null, error: { message: "no session" } });
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "later") } });
    const [first, second] = await Promise.allSettled([getApiToken(), getApiToken()]);
    expect([first.status, second.status]).toEqual(["rejected", "rejected"]);
    expect(await getApiToken()).toMatch(/later$/);
    expect(token).toHaveBeenCalledTimes(2);
  });

  it("does not keep the answer of a request that clearApiToken overtook", async () => {
    let answer: (value: unknown) => void = () => {};
    token.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "second-account") } });
    const overtaken = getApiToken();
    clearApiToken(); // another account signs in before the first answer
    const fresh = getApiToken();
    answer({ data: { token: jwtExpiring(NOW_SECONDS + 600, "first-account") } });
    expect(await overtaken).toMatch(/first-account$/);
    expect(await fresh).toMatch(/second-account$/);
    expect(await getApiToken()).toMatch(/second-account$/);
    expect(token).toHaveBeenCalledTimes(2);
  });
});

describe("callWithToken", () => {
  const sentTokens = (call: ReturnType<typeof vi.fn>) => call.mock.calls.map(([auth]) => auth.headers.Authorization);

  it("runs the call with the token and returns its result", async () => {
    token.mockResolvedValue({ data: { token: jwtExpiring(NOW_SECONDS + 600, "t1") } });
    const call = vi.fn().mockResolvedValue({ id: "w1" });
    expect(await callWithToken(call)).toEqual({ id: "w1" });
    expect(sentTokens(call)).toEqual([`Bearer ${jwtExpiring(NOW_SECONDS + 600, "t1")}`]);
  });

  it.each(["unauthorized", "invalid_token"])("replays once with a new token after a 401 %s", async (code) => {
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "refused") } });
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "renewed") } });
    const call = vi.fn().mockRejectedValueOnce(new ApiError(401, code, "Invalid token")).mockResolvedValueOnce("done");

    expect(await callWithToken(call)).toBe("done");

    expect(sentTokens(call)).toEqual([expect.stringMatching(/refused$/), expect.stringMatching(/renewed$/)]);
    expect(token).toHaveBeenCalledTimes(2);
    // The renewed token is the one kept for the next call.
    expect(await getApiToken()).toMatch(/renewed$/);
    expect(token).toHaveBeenCalledTimes(2);
  });

  it("raises the second 401 instead of replaying again", async () => {
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "refused") } });
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "renewed") } });
    const call = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(401, "invalid_token", "first"))
      .mockRejectedValueOnce(new ApiError(401, "invalid_token", "second"));

    await expect(callWithToken(call)).rejects.toThrowError(expect.objectContaining({ status: 401, code: "invalid_token", message: "second" }));

    expect(call).toHaveBeenCalledTimes(2);
    expect(token).toHaveBeenCalledTimes(2);
  });

  it.each([
    new ApiError(403, "email_not_verified", "Verify your email address first"),
    new ApiError(409, "already_voted", "You already voted in this category this month"),
    new ApiError(0, "unreachable", "unreachable"),
    new ApiError(401, "something_else", "A 401 that is not about the token"),
    new TypeError("not an API error"),
  ])("does not replay on another error (%s)", async (error) => {
    token.mockResolvedValue({ data: { token: jwtExpiring(NOW_SECONDS + 600) } });
    const call = vi.fn().mockRejectedValue(error);

    await expect(callWithToken(call)).rejects.toBe(error);

    expect(call).toHaveBeenCalledTimes(1);
    expect(token).toHaveBeenCalledTimes(1);
  });

  it("raises the 401 without calling when nobody is signed in", async () => {
    token.mockResolvedValue({ data: null, error: { message: "no session" } });
    const call = vi.fn();

    await expect(callWithToken(call)).rejects.toThrowError(expect.objectContaining({ status: 401, code: "unauthorized" }));

    expect(call).not.toHaveBeenCalled();
  });

  it("raises the 401 when the session ended between the call and its replay", async () => {
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "refused") } });
    token.mockResolvedValueOnce({ data: null, error: { message: "no session" } });
    const call = vi.fn().mockRejectedValue(new ApiError(401, "invalid_token", "Invalid token"));

    await expect(callWithToken(call)).rejects.toThrowError(expect.objectContaining({ status: 401, code: "unauthorized" }));

    expect(call).toHaveBeenCalledTimes(1);
  });

  it("renews the token once for calls refused at the same time", async () => {
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "refused") } });
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "renewed") } });
    // Like the API: the first token is refused, the renewed one accepted.
    const call = vi.fn(async (auth: { headers: { Authorization: string } }) => {
      if (auth.headers.Authorization.endsWith("refused")) throw new ApiError(401, "invalid_token", "Invalid token");
      return "done";
    });
    await getApiToken();

    expect(await Promise.all([callWithToken(call), callWithToken(call)])).toEqual(["done", "done"]);

    expect(call).toHaveBeenCalledTimes(4);
    expect(token).toHaveBeenCalledTimes(2);
  });

  it("keeps a token renewed in the meantime when a slower call is refused with the old one", async () => {
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "refused") } });
    token.mockResolvedValueOnce({ data: { token: jwtExpiring(NOW_SECONDS + 600, "renewed") } });
    let refuseSlow: (error: ApiError) => void = () => {};
    const slow = vi
      .fn()
      .mockReturnValueOnce(new Promise((_, reject) => (refuseSlow = reject)))
      .mockResolvedValueOnce("slow done");
    const fast = vi.fn().mockRejectedValueOnce(new ApiError(401, "invalid_token", "Invalid token")).mockResolvedValueOnce("fast done");

    const slowResult = callWithToken(slow);
    expect(await callWithToken(fast)).toBe("fast done");
    refuseSlow(new ApiError(401, "invalid_token", "Invalid token"));

    expect(await slowResult).toBe("slow done");
    expect(sentTokens(slow)).toEqual([expect.stringMatching(/refused$/), expect.stringMatching(/renewed$/)]);
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
