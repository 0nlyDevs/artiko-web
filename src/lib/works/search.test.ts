import { describe, expect, it } from "vitest";
import { matchesQuery } from "./search";

describe("matchesQuery", () => {
  const fields = ["Rova study 1", "Rova Rasoanaivo", "Peinture"];

  it("matches every word, in any field and order", () => {
    expect(matchesQuery(fields, "rasoanaivo study")).toBe(true);
    expect(matchesQuery(fields, "rova sculpture")).toBe(false);
  });

  it("ignores case, accents and extra spaces", () => {
    expect(matchesQuery(["Hiragasy des Hautes Terres"], "  HAUTES   terrés ")).toBe(true);
  });

  it("lets an empty query through and skips missing fields", () => {
    expect(matchesQuery([null, undefined, ""], "   ")).toBe(true);
    expect(matchesQuery([null, "Valiha"], "valiha")).toBe(true);
  });
});
