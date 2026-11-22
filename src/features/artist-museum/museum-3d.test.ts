import { describe, expect, it, vi } from "vitest";

const setDecoderPath = vi.hoisted(() => vi.fn());

vi.mock("@react-three/drei", () => ({
  OrbitControls: () => null,
  Resize: () => null,
  useTexture: vi.fn(),
  useGLTF: Object.assign(vi.fn(), { setDecoderPath }),
}));

describe("museum 3D (CA14)", () => {
  it("decodes Draco plinth models with the decoder served by artiko-web, not www.gstatic.com", async () => {
    await import("./museum-3d");

    expect(setDecoderPath).toHaveBeenCalledWith("/draco/");
  });
});
