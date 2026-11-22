import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { token } = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { token } }));

import type { HallOfFameEntry } from "@/lib/api";
import { clearApiToken } from "@/lib/api-token";
import { loadMyVote } from "./load-my-vote";

type Call = { path: string; query: Record<string, string>; bearer: string | null };

/** A JWT-shaped string that expires in 2100, so the token cache keeps it. */
const jwt = `h.${btoa(JSON.stringify({ exp: 4_102_444_800 }))}.session`;
const HUNG = [{ rank: 1, votes: 3, work: { id: "hung", title: "Hautes Terres" } }] as HallOfFameEntry[];
const VOTES = [
  { work_id: "song", category: "music", month: "2026-11" },
  { work_id: "hung", category: "painting", month: "2026-11" },
  { work_id: "elsewhere", category: "crafts", month: "2026-11" },
];

let calls: Call[];

/** Stands in for the API: `answer` gives the status and the body of each request. */
function serve(answer: (call: Call) => readonly [number, unknown]) {
  vi.stubGlobal("fetch", async (request: Request) => {
    const url = new URL(request.url);
    const call = { path: url.pathname.replace("/api/v1", ""), query: Object.fromEntries(url.searchParams), bearer: request.headers.get("Authorization") };
    calls.push(call);
    const [status, body] = answer(call);
    return Response.json(body, { status });
  });
}

const api = ({ path }: Call): readonly [number, unknown] => {
  if (path === "/votes/mine") return [200, VOTES];
  if (path === "/works/elsewhere") return [200, { id: "elsewhere", title: "Sobika" }];
  return [404, { error: { code: "work_not_found", message: "No work with this id" } }];
};

beforeEach(() => {
  calls = [];
  token.mockReset();
  token.mockResolvedValue({ data: { token: jwt } });
  clearApiToken();
});

afterEach(() => vi.unstubAllGlobals());

describe("loadMyVote", () => {
  it("asks for the votes of the month shown, with the token", async () => {
    serve(api);
    await loadMyVote("painting", "2026-10", HUNG);
    expect(calls[0]).toEqual({ path: "/votes/mine", query: { month: "2026-10" }, bearer: `Bearer ${jwt}` });
  });

  it("keeps the vote of the room's art form and takes its title from the frames, without another call", async () => {
    serve(api);
    expect(await loadMyVote("painting", "2026-11", HUNG)).toEqual({ workId: "hung", title: "Hautes Terres" });
    expect(calls.map((c) => c.path)).toEqual(["/votes/mine"]);
  });

  it("reads the work itself when the vote went to a work outside the five frames", async () => {
    serve(api);
    expect(await loadMyVote("crafts", "2026-11", HUNG)).toEqual({ workId: "elsewhere", title: "Sobika" });
    expect(calls.map((c) => c.path)).toEqual(["/votes/mine", "/works/elsewhere"]);
  });

  it("keeps the vote without a title when that work cannot be read", async () => {
    serve(api);
    expect(await loadMyVote("music", "2026-11", HUNG)).toEqual({ workId: "song", title: null });
  });

  it("answers null when the person has not voted in this art form", async () => {
    serve(api);
    expect(await loadMyVote("dance", "2026-11", HUNG)).toBeNull();
    expect(calls.map((c) => c.path)).toEqual(["/votes/mine"]);
  });

  it("fails when the API refuses the token, so the room draws nothing", async () => {
    serve(() => [401, { error: { code: "unauthorized", message: "Missing token" } }]);
    await expect(loadMyVote("painting", "2026-11", HUNG)).rejects.toMatchObject({ status: 401 });
  });
});
