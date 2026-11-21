import { describe, expect, it } from "vitest";
import { ApiError, unwrap, withToken } from "./api";

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
});

describe("withToken", () => {
  it("sends the token as a bearer header", () => {
    expect(withToken("abc")).toEqual({ headers: { Authorization: "Bearer abc" } });
  });
});
