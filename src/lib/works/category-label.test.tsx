import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryLabel, categoryLabel } from "./category-label";

describe("categoryLabel", () => {
  it("names a known art form in the language asked", () => {
    expect(categoryLabel({ id: "oral_arts" }, "en")).toBe("Oral arts");
    expect(categoryLabel({ id: "oral_arts" }, "fr")).toBe("Arts oraux");
    expect(categoryLabel({ id: "oral_arts" }, "mg")).toBe("Kanto am-bava");
  });

  it("prefers our translation to the API's English label", () => {
    expect(categoryLabel({ id: "painting", label: "Painting" }, "fr")).toBe("Peinture");
  });

  it("falls back to the API's label for an art form we have no translation for", () => {
    expect(categoryLabel({ id: "street_art", label: "Street art" }, "fr")).toBe("Street art");
  });

  it("shows nothing, never the raw id, where no label came with it, for example on a work", () => {
    expect(categoryLabel({ id: "street_art" }, "fr")).toBe("");
  });
});

describe("CategoryLabel", () => {
  it("renders the same name as text", () => {
    expect(renderToStaticMarkup(<CategoryLabel category={{ id: "crafts" }} />)).toBe("Crafts");
    expect(renderToStaticMarkup(<CategoryLabel category={{ id: "street_art", label: "Street art" }} />)).toBe("Street art");
    expect(renderToStaticMarkup(<CategoryLabel category={{ id: "street_art" }} />)).toBe("");
  });
});
