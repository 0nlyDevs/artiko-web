import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblems, passwordStrength } from "./password";

describe("passwordProblems", () => {
  it("flags a short password and a different confirmation", () => {
    expect(passwordProblems("short", "other")).toEqual({ tooShort: true, mismatch: true });
  });

  it("accepts a long enough password typed twice", () => {
    const ok = "x".repeat(MIN_PASSWORD_LENGTH);
    expect(passwordProblems(ok, ok)).toEqual({ tooShort: false, mismatch: false });
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
