import { describe, expect, it } from "vitest";
import { dayLabel, momentLabel, shortFingerprint } from "./work-facts";

describe("the facts of a published work", () => {
  it("shortens the SHA-256 to its first and last four characters", () => {
    expect(shortFingerprint("3f9a" + "0".repeat(56) + "c21e")).toBe("3F9A…C21E");
    expect(shortFingerprint("abcd")).toBe("ABCD");
  });

  it("gives the day of publication in the language of the page, in UTC", () => {
    expect(dayLabel("2026-11-22T03:41:00Z", "fr")).toBe("22 novembre 2026");
    expect(dayLabel("2026-11-22T03:41:00Z", "en")).toBe("November 22, 2026");
    expect(dayLabel("2026-11-30T23:59:59Z", "fr")).toBe("30 novembre 2026");
    expect(dayLabel("not a date", "fr")).toBe("");
  });

  it("gives the day and the time of a moment", () => {
    const { day, time } = momentLabel(new Date(2026, 10, 22, 3, 41), "fr");

    expect(day).toBe("22 novembre 2026");
    expect(time).toBe("03:41");
  });
});
