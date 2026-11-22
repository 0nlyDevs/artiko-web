import { describe, expect, it } from "vitest";
import { retryAfterSeconds } from "./retry-after";

const answer = (status: number, headers: Record<string, string> = {}) => ({ status, headers: new Headers(headers) });

describe("retryAfterSeconds", () => {
  it("reads the wait Better Auth sends with a 429", () => {
    expect(retryAfterSeconds(answer(429, { "X-Retry-After": "42" }))).toBe(42);
    expect(retryAfterSeconds(answer(429, { "Retry-After": "7" }))).toBe(7);
    expect(retryAfterSeconds(answer(429, { "X-Retry-After": "0.2" }))).toBe(1);
  });

  it("is null when the answer gives no usable wait", () => {
    expect(retryAfterSeconds(answer(429))).toBeNull();
    expect(retryAfterSeconds(answer(429, { "X-Retry-After": "soon" }))).toBeNull();
    expect(retryAfterSeconds(answer(429, { "X-Retry-After": "0" }))).toBeNull();
    expect(retryAfterSeconds(answer(429, { "X-Retry-After": "-5" }))).toBeNull();
    expect(retryAfterSeconds(undefined)).toBeNull();
  });

  it("ignores the header on any other answer", () => {
    expect(retryAfterSeconds(answer(401, { "X-Retry-After": "42" }))).toBeNull();
  });

  it("never counts down longer than an hour", () => {
    expect(retryAfterSeconds(answer(429, { "X-Retry-After": "999999" }))).toBe(3600);
  });
});
