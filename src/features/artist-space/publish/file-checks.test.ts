import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/features/model-import/limits";
import { addProofs, checkProofFile, checkWorkFile, mediaKind, proofsLeft, validProofs, type ProofItem } from "./file-checks";

/** A file of a given size without allocating it. */
function sized(name: string, type: string, size: number): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

const image = (name = "a.jpg", size = 1024) => sized(name, "image/jpeg", size);

describe("checkWorkFile", () => {
  it("accepts every type the API takes", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "video/mp4", "video/webm"]) {
      expect(checkWorkFile(sized("work", type, 10))).toBeNull();
    }
  });

  it("refuses a type the API does not take, whatever its size", () => {
    expect(checkWorkFile(sized("scan-dos.tiff", "image/tiff", 10))).toBe("type");
    expect(checkWorkFile(sized("scan-dos.tiff", "image/tiff", 62 * 1024 * 1024))).toBe("type");
    expect(checkWorkFile(sized("clip.mov", "video/quicktime", 10))).toBe("type");
    expect(checkWorkFile(sized("notes", "", 10))).toBe("type");
  });

  it("accepts exactly 20 971 520 bytes and refuses one byte more", () => {
    expect(MAX_UPLOAD_BYTES).toBe(20_971_520);
    expect(checkWorkFile(image("limit.jpg", 20_971_520))).toBeNull();
    expect(checkWorkFile(image("over.jpg", 20_971_521))).toBe("size");
  });

  it("refuses an empty file", () => {
    expect(checkWorkFile(image("empty.jpg", 0))).toBe("empty");
  });

  it("leaves a 3D scan to the import, which has its own limits", () => {
    expect(checkWorkFile(sized("scan.usdz", "model/vnd.usdz+zip", 90 * 1024 * 1024))).toBeNull();
    expect(checkWorkFile(sized("scan.GLB", "", 90 * 1024 * 1024))).toBeNull();
    expect(mediaKind(sized("scan.glb", "", 1))).toBe("model");
  });
});

describe("checkProofFile", () => {
  it("accepts an image, a sound or a video", () => {
    expect(checkProofFile(sized("a.png", "image/png", 10))).toBeNull();
    expect(checkProofFile(sized("a.mp3", "audio/mpeg", 10))).toBeNull();
    expect(checkProofFile(sized("a.mp4", "video/mp4", 10))).toBeNull();
  });

  it("refuses a 3D model and any other type before looking at the size", () => {
    expect(checkProofFile(sized("scan.glb", "model/gltf-binary", 10))).toBe("type");
    expect(checkProofFile(sized("scan-dos.tiff", "image/tiff", 62 * 1024 * 1024))).toBe("type");
  });

  it("accepts exactly 20 971 520 bytes and refuses one byte more", () => {
    expect(checkProofFile(image("limit.jpg", 20_971_520))).toBeNull();
    expect(checkProofFile(image("over.jpg", 20_971_521))).toBe("size");
  });
});

describe("addProofs", () => {
  const five = () => addProofs([], [1, 2, 3, 4, 5].map((n) => image(`p${n}.jpg`)), 1).items;

  it("keeps the files in the order chosen, each with its own id", () => {
    const { items, overflow } = addProofs([], [image("a.jpg"), image("b.jpg")], 7);

    expect(items.map((item) => [item.id, item.file.name, item.problem])).toEqual([
      [7, "a.jpg", null],
      [8, "b.jpg", null],
    ]);
    expect(overflow).toBe(0);
  });

  it("leaves a sixth valid proof out and says so", () => {
    const { items, overflow } = addProofs(five(), [image("p6.jpg"), image("p7.jpg")], 6);

    expect(validProofs(items)).toHaveLength(5);
    expect(items.map((item) => item.file.name)).not.toContain("p6.jpg");
    expect(overflow).toBe(2);
    expect(proofsLeft(items)).toBe(0);
  });

  it("shows a refused file with its reason without taking one of the five places", () => {
    const { items } = addProofs([], [image("a.jpg"), image("b.jpg"), image("heavy.jpg", 62 * 1024 * 1024), sized("scan.tiff", "image/tiff", 10)], 1);

    expect(items.map((item) => item.problem)).toEqual([null, null, "size", "type"]);
    expect(validProofs(items).map((file) => file.name)).toEqual(["a.jpg", "b.jpg"]);
    expect(proofsLeft(items)).toBe(3);
  });

  it("replaces a refused proof in place", () => {
    const start: ProofItem[] = addProofs([], [image("a.jpg"), image("heavy.jpg", 62 * 1024 * 1024), image("c.jpg")], 1).items;

    const { items } = addProofs(start, [image("light.jpg")], 10, start[1].id);

    expect(items.map((item) => item.file.name)).toEqual(["a.jpg", "light.jpg", "c.jpg"]);
    expect(items[1].problem).toBeNull();
  });
});
