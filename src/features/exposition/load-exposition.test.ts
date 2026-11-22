import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Next's notFound() throws to hand the request to not-found.tsx: a named error stands in for it here.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import { ApiError } from "@/lib/api";
import { PAGE_LIMIT } from "@/lib/paging";
import { loadExposition, loadExpositionRoom } from "./load-exposition";

type Call = { method: string; path: string; query: Record<string, string>; bearer: string | null };

const EXPOSITION = {
  id: "e1",
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: "Lumières des Hautes Terres",
  description: "",
  cover_url: null,
  works_count: 3,
  created_at: "2026-11-03T09:00:00Z",
};
const work = (id: string) => ({ id, artist_id: "a1", artist_name: "Rova Rasoanaivo", title: id, category: "painting", exposition_id: "e1", votes: 0 });
const works = (count: number, from = 0) => Array.from({ length: count }, (_, i) => work(`w${from + i}`));

let calls: Call[];

/** Stands in for the API: `answer` gives the status and the body of each request. */
function serve(answer: (call: Call) => readonly [number, unknown]) {
  vi.stubGlobal("fetch", async (request: Request) => {
    const url = new URL(request.url);
    const call = { method: request.method, path: url.pathname.replace("/api/v1", ""), query: Object.fromEntries(url.searchParams), bearer: request.headers.get("Authorization") };
    calls.push(call);
    const [status, body] = answer(call);
    return Response.json(body, { status });
  });
}

/** An API that knows the exposition `e1`, hung with `total` works. */
const museum =
  (total: number) =>
  ({ path, query }: Call): readonly [number, unknown] => {
    if (path === "/expositions/e1") return [200, EXPOSITION];
    if (path.startsWith("/expositions/")) return [404, { error: { code: "exposition_not_found", message: "No exposition with this id" } }];
    if (path === "/works") return [200, works(Math.max(0, Math.min(Number(query.limit), total - Number(query.offset))), Number(query.offset))];
    return [404, { detail: "Not Found" }];
  };

const to = (path: string) => calls.filter((call) => call.path === path);

beforeEach(() => {
  calls = [];
});

afterEach(() => vi.unstubAllGlobals());

describe("loadExpositionRoom", () => {
  it("reads the exposition, then its works by `exposition_id`, without a token and without writing", async () => {
    serve(museum(3));

    const room = await loadExpositionRoom("e1");

    expect(room.exposition).toEqual(EXPOSITION);
    expect(room.works.map((w) => w.id)).toEqual(["w0", "w1", "w2"]);
    expect(room.complete).toBe(true);
    expect(calls.map((call) => call.path)).toEqual(["/expositions/e1", "/works"]);
    expect(to("/works")[0].query).toEqual({ exposition_id: "e1", limit: String(PAGE_LIMIT), offset: "0" });
    expect(calls.every((call) => call.method === "GET" && call.bearer === null)).toBe(true);
  });

  it("gives an exposition without works as an empty, whole room", async () => {
    serve(museum(0));

    const room = await loadExpositionRoom("e1");

    expect(room.works).toEqual([]);
    expect(room.complete).toBe(true);
  });

  it("reads every page of a long exposition, down to the short one", async () => {
    serve(museum(PAGE_LIMIT + 5));

    const room = await loadExpositionRoom("e1");

    expect(room.works).toHaveLength(PAGE_LIMIT + 5);
    expect(room.complete).toBe(true);
    expect(to("/works").map((call) => call.query.offset)).toEqual(["0", String(PAGE_LIMIT)]);
  });

  it("says the room is not whole when the reading stops at its cap", async () => {
    serve(museum(PAGE_LIMIT * 6));

    const room = await loadExpositionRoom("e1");

    expect(room.works).toHaveLength(PAGE_LIMIT * 5);
    expect(room.complete).toBe(false);
  });

  it("is not found for an id the API does not know (404), and reads no works", async () => {
    serve(museum(3));

    await expect(loadExpositionRoom("e404")).rejects.toThrow("NOT_FOUND");
    expect(to("/works")).toHaveLength(0);
  });

  it("is not found for an id that is not one (422)", async () => {
    serve(() => [422, { error: { code: "invalid_request", message: "exposition_id: not a uuid" } }]);

    await expect(loadExposition("abc")).rejects.toThrow("NOT_FOUND");
  });

  it("keeps a failure of the API an error, not a missing exposition", async () => {
    serve(() => [500, { error: { code: "internal", message: "boom" } }]);

    const failure = await loadExposition("e1").catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(500);
  });

  it("fails as a whole when the works cannot be read: an exposition is never shown empty by mistake", async () => {
    serve((call) => (call.path === "/works" ? [500, { error: { code: "internal", message: "boom" } }] : museum(3)(call)));

    await expect(loadExpositionRoom("e1")).rejects.toBeInstanceOf(ApiError);
  });
});
