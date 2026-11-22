import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { token } = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { token } }));

import { clearApiToken } from "@/lib/api-token";
import { identifyVoter, refreshCount, refreshVoter, resetVoter, voterSnapshot } from "./voter-store";

type Call = { method: string; path: string; bearer: string | null; cache: RequestCache };

/** A JWT-shaped string that expires in 2100, so the token cache keeps it. */
const jwt = `h.${btoa(JSON.stringify({ exp: 4_102_444_800 }))}.session`;
const ARTIST = { id: "a1", display_name: "Rova", bio: "", region: "Analamanga" };
const VOTE = { work_id: "w9", category: "painting", month: "2026-11" };

let calls: Call[];

function serve(answer: (call: Call) => readonly [number, unknown]) {
  vi.stubGlobal("fetch", async (request: Request) => {
    const call = { method: request.method, path: new URL(request.url).pathname.replace("/api/v1", ""), bearer: request.headers.get("Authorization"), cache: request.cache };
    calls.push(call);
    const [status, body] = answer(call);
    return Response.json(body, { status });
  });
}

/** The reads are started by `identifyVoter` and not awaited by it: wait until the store has settled. */
const settled = () => vi.waitFor(() => expect(voterSnapshot().voter.status).not.toBe("pending"));

beforeEach(() => {
  calls = [];
  token.mockReset();
  token.mockResolvedValue({ data: { token: jwt } });
  clearApiToken();
  resetVoter();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("voter store", () => {
  it("knows nobody until the session answers, then an anonymous visitor without any call", () => {
    expect(voterSnapshot()).toMatchObject({ userId: undefined, voter: { status: "pending" } });
    serve(() => [500, {}]);
    identifyVoter(null);
    expect(voterSnapshot()).toMatchObject({ userId: null, voter: { status: "anonymous" } });
    expect(calls).toEqual([]);
  });

  it("reads the profile and the votes of the signed-in person once, with the token and without cache", async () => {
    serve(({ path }) => (path === "/me" ? [200, { id: "u1", email: null, name: "Rova", artist: ARTIST }] : [200, [VOTE]]));
    identifyVoter("u1");
    expect(voterSnapshot().voter).toEqual({ status: "pending" });
    await settled();
    expect(voterSnapshot().voter).toEqual({ status: "ready", artistId: "a1", votes: [VOTE] });
    identifyVoter("u1");
    expect(calls.map((call) => call.path).sort()).toEqual(["/me", "/votes/mine"]);
    expect(calls.every((call) => call.method === "GET" && call.bearer === `Bearer ${jwt}` && call.cache === "no-store")).toBe(true);
  });

  it("has no artist profile for a person who only votes", async () => {
    serve(({ path }) => (path === "/me" ? [200, { id: "u1", email: null, name: null, artist: null }] : [200, []]));
    identifyVoter("u1");
    await settled();
    expect(voterSnapshot().voter).toEqual({ status: "ready", artistId: null, votes: [] });
  });

  it("reads the votes again after a vote", async () => {
    let votes: unknown[] = [];
    serve(({ path }) => (path === "/me" ? [200, { id: "u1", email: null, name: null, artist: null }] : [200, votes]));
    identifyVoter("u1");
    await settled();
    votes = [VOTE];
    await refreshVoter();
    expect(voterSnapshot().voter).toMatchObject({ status: "ready", votes: [VOTE] });
  });

  it("invites to sign in again when the API refuses the token, and leaves the API the judge on any other failure", async () => {
    serve(() => [401, { error: { code: "invalid_token", message: "Invalid token" } }]);
    identifyVoter("u1");
    await settled();
    expect(voterSnapshot().voter).toEqual({ status: "anonymous" });

    resetVoter();
    serve(() => [503, { error: { code: "not_ready", message: "Not ready" } }]);
    identifyVoter("u1");
    await settled();
    expect(voterSnapshot().voter).toMatchObject({ status: "unknown", error: { code: "not_ready" } });
  });

  it("re-reads a work's count without the token and never lowers it", async () => {
    let votes = 16;
    serve(() => [200, { id: "w1", votes }]);
    await refreshCount("w1");
    expect(voterSnapshot().counts).toEqual({ w1: 16 });
    expect(calls).toEqual([{ method: "GET", path: "/works/w1", bearer: null, cache: "no-store" }]);
    votes = 12;
    await refreshCount("w1");
    expect(voterSnapshot().counts).toEqual({ w1: 16 });
  });
});
