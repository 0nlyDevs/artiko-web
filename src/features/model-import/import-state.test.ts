import { describe, expect, it } from "vitest";
import type { ImportedModel } from "./import-model";
import { canPublish, errorCodeOf, stepsFor, type ImportState } from "./import-state";
import { ModelImportError } from "./model-import-error";

const model = (oversized: ImportedModel["oversized"]): ImportedModel => ({
  model1k: new File([], "a-1k.glb"),
  model2k: new File([], "a-2k.glb"),
  poster: new File([], "a.webp"),
  oversized,
});
const preview = { model1k: "blob:1", model2k: "blob:2", poster: "blob:3" };

describe("canPublish", () => {
  it.each<[string, ImportState, boolean]>([
    ["a running import", { status: "running", steps: [], current: "conversion" }, false],
    ["a failed import (CA4)", { status: "failed", code: "external_reference" }, false],
    ["an oversized variant (CA5)", { status: "ready", model: model(["1k"]), preview }, false],
    ["a finished import", { status: "ready", model: model([]), preview }, true],
  ])("is %s publishable: %s", (_, state, expected) => {
    expect(canPublish(state)).toBe(expected);
  });
});

describe("stepsFor", () => {
  it("lists the conversion only for a USDZ (CA6)", () => {
    expect(stepsFor(new File([], "a.USDZ"))).toEqual(["conversion", "optimization2k", "optimization1k", "poster"]);
    expect(stepsFor(new File([], "a.glb"))).toEqual(["optimization2k", "optimization1k", "poster"]);
  });
});

describe("errorCodeOf", () => {
  it("keeps a known code, also from a plain object posted by the worker, and hides anything else", () => {
    expect(errorCodeOf(new ModelImportError("unreadable_usdz"))).toBe("unreadable_usdz");
    expect(errorCodeOf({ code: "no_mesh" })).toBe("no_mesh");
    expect(errorCodeOf({ code: "drop table" })).toBe("optimization_failed");
    expect(errorCodeOf(new Error("boom"))).toBe("optimization_failed");
  });
});
