import { describe, expect, it } from "vitest";
import { modelSource } from "./model-source";

describe("modelSource (CA12)", () => {
  it("keeps the URL on the first attempt and changes only the fragment on a retry", () => {
    expect(modelSource("https://api.test/media/a.glb", 0)).toBe("https://api.test/media/a.glb");
    expect(modelSource("https://api.test/media/a.glb", 2)).toBe("https://api.test/media/a.glb#retry-2");
    expect(modelSource("https://api.test/media/a.glb#retry-1", 2)).toBe("https://api.test/media/a.glb#retry-2");
  });
});
