import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { token } = vi.hoisted(() => ({ token: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { token } }));

import { clearApiToken } from "@/lib/api-token";
import { loadSpace } from "./load-space";

type Call = { path: string; query: Record<string, string>; bearer: string | null };

/** A JWT-shaped string that expires in 2100, so the token cache keeps it. */
const jwt = (name: string) => `h.${btoa(JSON.stringify({ exp: 4_102_444_800 }))}.${name}`;
const SESSION = `Bearer ${jwt("session")}`;

const ARTIST = { id: "a1", display_name: "Rova", bio: "", region: "Analamanga" };
const ME = { id: "u1", email: "rova@example.test", name: "Rova", artist: ARTIST };
const CATEGORIES = [{ id: "painting", label: "Painting" }];
const work = (id: string) => ({ id, artist_id: "a1", artist_name: "Rova", title: id, category: "painting", votes: 0 });
const works = (count: number, from = 0) => Array.from({ length: count }, (_, i) => work(`w${from + i}`));
const notFound = [404, { error: { code: "work_not_found", message: "No work with this id" } }] as const;

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

/** A space with `total` works by the artist and one vote, for the work `voted`. */
const space =
  (total: number, voted: readonly [number, unknown] = [200, work("voted")], me: unknown = ME) =>
  ({ path, query }: Call): readonly [number, unknown] => {
    if (path === "/me") return [200, me];
    if (path === "/votes/mine") return [200, [{ work_id: "voted", category: "painting", month: "2026-11" }]];
    if (path === "/categories") return [200, CATEGORIES];
    if (path === "/expositions") return [200, []];
    if (path === "/works/voted") return voted;
    if (path === "/works") return [200, works(Math.max(0, Math.min(Number(query.limit), total - Number(query.offset))), Number(query.offset))];
    return [404, { detail: "Not Found" }];
  };

const to = (path: string) => calls.filter((call) => call.path === path);

beforeEach(() => {
  calls = [];
  token.mockReset();
  token.mockResolvedValue({ data: { token: jwt("session") } });
  clearApiToken();
});

afterEach(() => vi.unstubAllGlobals());

describe("loadSpace", () => {
  it("reads every page of the artist's works, with the token", async () => {
    serve(space(201));

    const loaded = await loadSpace();

    expect(loaded.works).toHaveLength(201);
    expect(loaded.works.at(-1)?.id).toBe("w200");
    expect(to("/works")).toEqual([
      { path: "/works", query: { artist_id: "a1", limit: "200", offset: "0" }, bearer: SESSION },
      { path: "/works", query: { artist_id: "a1", limit: "200", offset: "200" }, bearer: SESSION },
    ]);
  });

  it("reads each voted work with the token", async () => {
    serve(space(1));

    const loaded = await loadSpace();

    expect(loaded.votes).toEqual([{ category: "painting", work: work("voted") }]);
    expect(to("/works/voted")).toEqual([{ path: "/works/voted", query: {}, bearer: SESSION }]);
  });

  it("keeps the public reads without a token", async () => {
    serve(space(1));

    await loadSpace();

    expect(to("/categories").map((call) => call.bearer)).toEqual([null]);
    expect(to("/expositions").map((call) => call.bearer)).toEqual([null]);
    expect(to("/me").map((call) => call.bearer)).toEqual([SESSION]);
    expect(to("/votes/mine").map((call) => call.bearer)).toEqual([SESSION]);
  });

  it("leaves a vote without its work when the work cannot be read", async () => {
    serve(space(1, notFound));

    expect((await loadSpace()).votes).toEqual([{ category: "painting", work: null }]);
  });

  it("reads no works for someone who is not an artist", async () => {
    serve(space(3, undefined, { ...ME, artist: null }));

    const loaded = await loadSpace();

    expect(loaded.works).toEqual([]);
    expect(loaded.expositions).toEqual([]);
    expect(to("/works")).toEqual([]);
    expect(to("/expositions")).toEqual([]);
  });

  it("renews a refused token once and loads the space with the new one", async () => {
    token.mockReset();
    token.mockResolvedValueOnce({ data: { token: jwt("refused") } });
    token.mockResolvedValueOnce({ data: { token: jwt("renewed") } });
    const answer = space(1);
    serve((call) => (call.bearer === `Bearer ${jwt("refused")}` ? [401, { error: { code: "invalid_token", message: "Invalid token: Signature has expired" } }] : answer(call)));

    const loaded = await loadSpace();

    expect(loaded.me).toEqual(ME);
    expect(to("/me").map((call) => call.bearer)).toEqual([`Bearer ${jwt("refused")}`, `Bearer ${jwt("renewed")}`]);
    expect(to("/works").map((call) => call.bearer)).toEqual([`Bearer ${jwt("renewed")}`]);
    expect(token).toHaveBeenCalledTimes(2);
  });

  it("fails with the API's error when the token belongs to an unverified address", async () => {
    serve(({ path }) => (path === "/categories" ? [200, CATEGORIES] : [403, { error: { code: "email_not_verified", message: "Verify your email address first" } }]));

    await expect(loadSpace()).rejects.toThrowError(expect.objectContaining({ status: 403, code: "email_not_verified" }));
    expect(token).toHaveBeenCalledTimes(1);
  });
});
