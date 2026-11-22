import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut, token } = vi.hoisted(() => ({ signOut: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signOut, token } }));

import { clearApiToken, getApiToken } from "@/lib/api-token";
import { signOutOfSpace } from "./sign-out";

/** A JWT-shaped string that expires in 2100, so the token cache keeps it. */
const jwt = (name: string) => `h.${btoa(JSON.stringify({ exp: 4_102_444_800 }))}.${name}`;

/** Fills the token cache, then says how many times the token was requested once `act` is done and a token is asked again. */
async function requestsAround(act: () => Promise<unknown>) {
  await getApiToken();
  await act();
  await getApiToken();
  return token.mock.calls.length;
}

beforeEach(() => {
  signOut.mockReset();
  token.mockReset();
  token.mockResolvedValue({ data: { token: jwt("session") } });
  clearApiToken();
});

describe("signOutOfSpace", () => {
  it("closes the session, then forgets the API token", async () => {
    signOut.mockResolvedValue({ data: { success: true }, error: null });

    let done: boolean | undefined;
    const requests = await requestsAround(async () => (done = await signOutOfSpace()));

    expect(done).toBe(true);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(requests).toBe(2);
  });

  it("forgets the token and says so when the server refuses", async () => {
    signOut.mockResolvedValue({ data: null, error: { status: 500 } });

    let done: boolean | undefined;
    const requests = await requestsAround(async () => (done = await signOutOfSpace()));

    expect(done).toBe(false);
    expect(requests).toBe(2);
  });

  it("forgets the token and says so when the request never arrives", async () => {
    signOut.mockRejectedValue(new TypeError("Failed to fetch"));

    let done: boolean | undefined;
    const requests = await requestsAround(async () => (done = await signOutOfSpace()));

    expect(done).toBe(false);
    expect(requests).toBe(2);
  });
});
