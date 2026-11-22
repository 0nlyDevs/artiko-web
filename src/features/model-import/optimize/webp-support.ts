/** Safari encodes canvases to PNG when asked for WebP; the returned blob type tells which one happened. */
export async function canEncodeWebp(): Promise<boolean> {
  if (typeof OffscreenCanvas === "undefined") return false;
  const canvas = new OffscreenCanvas(1, 1);
  canvas.getContext("2d");
  const blob = await canvas.convertToBlob({ type: "image/webp" });
  return blob.type === "image/webp";
}
