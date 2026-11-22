import { describe, expect, it } from "vitest";
import { cameraOrbitOf, MAX_CAMERA_ORBIT, VIEW_NAMES } from "./views";

describe("views (CA10)", () => {
  it("offers front, back, left, right and top, but no bottom view", () => {
    expect(VIEW_NAMES).toEqual(["front", "back", "left", "right", "top"]);
    expect(VIEW_NAMES.map(cameraOrbitOf)).toEqual([
      "0deg 75deg auto",
      "180deg 75deg auto",
      "-90deg 75deg auto",
      "90deg 75deg auto",
      "0deg 0deg auto",
    ]);
  });

  it("stops the orbit at the horizon", () => {
    expect(MAX_CAMERA_ORBIT).toBe("auto 90deg auto");
  });
});
