import { describe, expect, it } from "vitest";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, passwordProblems, passwordStrength } from "./password";

describe("passwordProblems", () => {
  it("flags a short password and a different confirmation", () => {
    expect(passwordProblems("short", "other")).toEqual({ tooShort: true, tooLong: false, mismatch: true });
  });

  it("accepts a long enough password typed twice", () => {
    const ok = "x".repeat(MIN_PASSWORD_LENGTH);
    expect(passwordProblems(ok, ok)).toEqual({ tooShort: false, tooLong: false, mismatch: false });
  });

  it("accepts up to 128 characters, like the auth server", () => {
    expect(MAX_PASSWORD_LENGTH).toBe(128);
    for (const length of [127, 128]) expect(passwordProblems("x".repeat(length), "").tooLong).toBe(false);
    expect(passwordProblems("x".repeat(129), "").tooLong).toBe(true);
  });

  it("never treats two empty fields as matching", () => {
    expect(passwordProblems("", "").mismatch).toBe(true);
  });
});

describe("passwordStrength", () => {
  it("grows with length and variety", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abc")).toBe(1);
    expect(passwordStrength("abcdefghij")).toBe(1);
    expect(passwordStrength("abcdefgh1j")).toBe(2);
    expect(passwordStrength("abcdefgh1jklmn")).toBe(3);
  });
});
