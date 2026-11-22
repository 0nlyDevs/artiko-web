import { describe, expect, it } from "vitest";
import { elides, monthName, publishedDay, roomPlace, shortHash, twoDigits } from "./work-facts";

describe("publishedDay", () => {
  it("reads the instant in UTC, like the contest month: 30 November 22:30 UTC stays in November", () => {
    // In Antananarivo (UTC+3) this instant is already 1 December.
    expect(publishedDay("2026-11-30T22:30:00Z", "fr")).toBe("30 novembre 2026");
    expect(publishedDay("2026-11-30T22:30:00Z", "en")).toBe("November 30, 2026");
    expect(publishedDay("2026-12-01T00:00:00+03:00", "fr")).toBe("30 novembre 2026");
  });

  it("is empty for a date it cannot read", () => {
    expect(publishedDay("soon", "fr")).toBe("");
  });
});

describe("contest month", () => {
  it("names the month alone", () => {
    expect(monthName("2026-11", "fr")).toBe("novembre");
    expect(monthName("2026-11", "en")).toBe("November");
  });

  it("elides « de » in French before a vowel", () => {
    expect(elides("fr", monthName("2026-10", "fr"))).toBe(true);
    expect(elides("fr", monthName("2026-04", "fr"))).toBe(true);
    expect(elides("fr", monthName("2026-08", "fr"))).toBe(true);
    expect(elides("fr", monthName("2026-11", "fr"))).toBe(false);
    expect(elides("en", "October")).toBe(false);
  });
});

describe("shortHash", () => {
  it("keeps the first and the last four characters", () => {
    expect(shortHash("3f9a" + "0".repeat(56) + "c21e")).toBe("3f9a…c21e");
    expect(twoDigits(1)).toBe("01");
    expect(twoDigits(104)).toBe("104");
  });
});

describe("roomPlace", () => {
  const works = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `w${i + 1}`, title: `Work ${i + 1}` }));

  it("counts the work in a room that was read whole, and leads to the next", () => {
    expect(roomPlace(works(12), "w1", 200)).toEqual({ position: 1, total: 12, next: { id: "w2", title: "Work 2" } });
  });

  it("leads from the last work back to the first when the room is whole", () => {
    expect(roomPlace(works(3), "w3", 200)).toEqual({ position: 3, total: 3, next: { id: "w1", title: "Work 1" } });
  });

  it("gives no total when the page is full: the API sends none, and more works may follow", () => {
    expect(roomPlace(works(100), "w4", 100)).toEqual({ position: 4, total: null, next: { id: "w5", title: "Work 5" } });
    expect(roomPlace(works(100), "w100", 100)).toEqual({ position: 100, total: null, next: null });
  });

  it("has no next work in a room of one, and no place for a work the page does not hold", () => {
    expect(roomPlace(works(1), "w1", 200)).toEqual({ position: 1, total: 1, next: null });
    expect(roomPlace(works(5), "w9", 200)).toBeNull();
  });
});
