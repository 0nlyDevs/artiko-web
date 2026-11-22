import { describe, expect, it } from "vitest";
import { badgeForecast } from "./badge-forecast";

describe("badgeForecast", () => {
  it("expects the badge with two proofs and no declared AI", () => {
    expect(badgeForecast({ proofs: 2, aiDeclared: false })).toBe("expected");
    expect(badgeForecast({ proofs: 5, aiDeclared: false })).toBe("expected");
  });

  it("is short of proofs under two", () => {
    expect(badgeForecast({ proofs: 0, aiDeclared: false })).toBe("short");
    expect(badgeForecast({ proofs: 1, aiDeclared: false })).toBe("short");
  });

  it("gives no badge once AI is declared, whatever the proofs", () => {
    expect(badgeForecast({ proofs: 5, aiDeclared: true })).toBe("ai");
    expect(badgeForecast({ proofs: 0, aiDeclared: true })).toBe("ai");
  });
});
