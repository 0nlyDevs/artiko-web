import type { MediaKind } from "@/lib/api";

const SHAPES: Record<Exclude<MediaKind, "image">, string> = {
  // A speaker and two waves.
  audio: "M4 10v4h3l4 3.5v-11L7 10zM15 9.5a3.5 3.5 0 0 1 0 5M17.5 7a7 7 0 0 1 0 10",
  // A screen and its play triangle.
  video: "M3.5 6h17v12h-17zM10 9.5v5l4.5-2.5z",
  // A cube seen from a corner.
  model: "M12 3.5 4.5 7.75v8.5L12 20.5l7.5-4.25v-8.5zM4.5 7.75 12 12l7.5-4.25M12 12v8.5",
};

/** The pictogram that stands for a work with no picture: a sound, a video or a 3D object. Decorative: the caller names the kind. */
export function KindIcon({ kind, size = 20 }: { kind: Exclude<MediaKind, "image">; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={SHAPES[kind]} />
    </svg>
  );
}
