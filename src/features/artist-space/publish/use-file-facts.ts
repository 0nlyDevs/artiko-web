"use client";

import { useEffect, useState } from "react";

/** A local address for a chosen file, released when the file changes. Null until it is ready, and for no file. */
export function useObjectUrl(file: File | null): string | null {
  const [made, setMade] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const frame = requestAnimationFrame(() => setMade({ file, url }));
    return () => {
      cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  // The address of an earlier file is already released.
  return made && made.file === file ? made.url : null;
}

/** Width and height of an image file, read in the browser. Null for anything the browser cannot decode. */
export function useImageSize(file: File | null): { width: number; height: number } | null {
  const [read, setRead] = useState<{ file: File; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!file || typeof createImageBitmap !== "function") return;
    let current = true;
    createImageBitmap(file).then(
      (bitmap) => {
        if (current) setRead({ file, width: bitmap.width, height: bitmap.height });
        bitmap.close();
      },
      () => {
        // Not an image the browser can decode: the line simply has no dimensions.
      },
    );
    return () => {
      current = false;
    };
  }, [file]);
  return read && read.file === file ? { width: read.width, height: read.height } : null;
}
