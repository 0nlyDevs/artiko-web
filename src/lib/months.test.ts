import { afterEach, describe, expect, it, vi } from "vitest";
import { currentMonth, monthLabel, shiftMonth } from "./months";

afterEach(() => vi.useRealTimers());

describe("currentMonth", () => {
  it("is the UTC month, even when local time is already in the next one", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-30T23:59:59Z"));
    expect(currentMonth()).toBe("2026-11");
  });
});

describe("shiftMonth", () => {
  it("moves across year boundaries in both directions", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 0)).toBe("2026-11");
    expect(shiftMonth("2026-11", 14)).toBe("2028-01");
  });
});

describe("monthLabel", () => {
  it("names the month in the active language", () => {
    expect(monthLabel("2026-11", "en")).toBe("November 2026");
    expect(monthLabel("2026-11", "fr")).toBe("novembre 2026");
  });
});
