import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, unwrap, withToken } from "./api";

afterEach(() => vi.useRealTimers());

/** What the SDK hands back for a refused call: the parsed body and the response. */
const refused = (status: number, body: unknown, headers?: Record<string, string>) => ({ error: body, response: new Response(null, { status, headers }) });
const tooMany = (retryAfter?: string) =>
  refused(429, { error: { code: "rate_limited", message: "Too many requests, try again shortly" } }, retryAfter === undefined ? undefined : { "Retry-After": retryAfter });

describe("unwrap", () => {
  it("returns the data of a successful call", () => {
    expect(unwrap({ data: { status: "ok" } })).toEqual({ status: "ok" });
  });

  it("keeps falsy data such as an empty list", () => {
    expect(unwrap({ data: [] })).toEqual([]);
  });

  it("raises the API's own error code, message and status", () => {
    const failure = {
      error: { error: { code: "work_not_found", message: "No work with this id" } },
      response: new Response(null, { status: 404 }),
    };
    expect(() => unwrap(failure)).toThrowError(
      expect.objectContaining({ status: 404, code: "work_not_found", message: "No work with this id" }),
    );
    expect(() => unwrap(failure)).toThrowError(ApiError);
  });

  it("reports an unreachable service when nothing came back", () => {
    expect(() => unwrap({ error: undefined })).toThrowError(
      expect.objectContaining({ status: 0, code: "unreachable" }),
    );
  });

  it("reports an unreachable service when the request never got a response", () => {
    // The SDK catches a failed fetch and hands its error back without a response.
    expect(() => unwrap({ error: new TypeError("fetch failed") })).toThrowError(
      expect.objectContaining({ status: 0, code: "unreachable", caseId: null, retryAfter: null }),
    );
  });

  it("keeps the status of an answer that is not in the API's shape", () => {
    expect(() => unwrap(refused(502, "<html>Bad Gateway</html>"))).toThrowError(expect.objectContaining({ status: 502, code: "unreachable" }));
  });

  it("names the framework's own 404 `not_found`", () => {
    expect(() => unwrap(refused(404, { detail: "Not Found" }))).toThrowError(expect.objectContaining({ status: 404, code: "not_found" }));
    // The API's own 404 keeps its code.
    expect(() => unwrap(refused(404, { error: { code: "artist_not_found", message: "No artist with this id" } }))).toThrowError(
      expect.objectContaining({ code: "artist_not_found" }),
    );
  });

  it("keeps the review case of a refused publication", () => {
    const copy = { error: { code: "possible_copy", message: "This image looks like another work.", case_id: "5f0c1a3e-7b1d-4c58-9a57-2f3f6f0d9b11" } };
    expect(() => unwrap(refused(409, copy))).toThrowError(
      expect.objectContaining({ status: 409, code: "possible_copy", caseId: "5f0c1a3e-7b1d-4c58-9a57-2f3f6f0d9b11" }),
    );
    expect(() => unwrap(refused(409, { error: { code: "duplicate_work", message: "Already published" } }))).toThrowError(expect.objectContaining({ caseId: null }));
  });

  it("reads Retry-After given in seconds", () => {
    expect(() => unwrap(tooMany("42"))).toThrowError(expect.objectContaining({ status: 429, code: "rate_limited", retryAfter: 42 }));
    expect(() => unwrap(tooMany("0"))).toThrowError(expect.objectContaining({ retryAfter: 0 }));
  });

  it("turns Retry-After given as a date into seconds from now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T10:00:00Z"));
    expect(() => unwrap(tooMany("Sun, 22 Nov 2026 10:01:30 GMT"))).toThrowError(expect.objectContaining({ retryAfter: 90 }));
    // A date already past means there is nothing left to wait.
    expect(() => unwrap(tooMany("Sun, 22 Nov 2026 09:59:00 GMT"))).toThrowError(expect.objectContaining({ retryAfter: 0 }));
  });

  it("has no Retry-After when the header is absent or unreadable", () => {
    // Absent is what a browser on another origin gets while the API does not expose the header.
    expect(() => unwrap(tooMany())).toThrowError(expect.objectContaining({ code: "rate_limited", retryAfter: null }));
    expect(() => unwrap(tooMany("soon"))).toThrowError(expect.objectContaining({ retryAfter: null }));
  });
});

describe("ApiError", () => {
  it("is built from a status, a code and a message alone", () => {
    expect(new ApiError(401, "unauthorized", "Sign in first")).toMatchObject({ status: 401, code: "unauthorized", message: "Sign in first", caseId: null, retryAfter: null });
  });
});

describe("withToken", () => {
  it("sends the token as a bearer header", () => {
    expect(withToken("abc")).toEqual({ headers: { Authorization: "Bearer abc" } });
  });
});
