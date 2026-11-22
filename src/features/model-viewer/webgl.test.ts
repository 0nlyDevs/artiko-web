import { describe, expect, it, vi } from "vitest";
import { isWebGLAvailable } from "./webgl";

const canvasWith = (getContext: (kind: string) => unknown) => () => ({ getContext }) as unknown as HTMLCanvasElement;

describe("isWebGLAvailable (CA13)", () => {
  it("is true with a WebGL context, which it releases at once", () => {
    const loseContext = vi.fn();
    const context = { getExtension: () => ({ loseContext }) };
    expect(isWebGLAvailable(canvasWith((kind) => (kind === "webgl" ? context : null)))).toBe(true);
    expect(loseContext).toHaveBeenCalled();
  });

  it("is false without a context or when the canvas throws", () => {
    expect(isWebGLAvailable(canvasWith(() => null))).toBe(false);
    expect(isWebGLAvailable(() => {
      throw new Error("no canvas");
    })).toBe(false);
  });
});
