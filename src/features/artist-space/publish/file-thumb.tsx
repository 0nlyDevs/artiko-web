import Image from "next/image";
import type { MediaKind } from "./file-checks";
import styles from "./publish.module.css";

/** A pictogram for what has no picture: a sound, a video, a 3D model. */
export function KindGlyph({ kind, size = 22 }: { kind: MediaKind | null; size?: number }) {
  const common = { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
  if (kind === "video")
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m10 8.5 5.5 3.5-5.5 3.5z" />
      </svg>
    );
  if (kind === "audio")
    return (
      <svg {...common}>
        <path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4" />
      </svg>
    );
  if (kind === "model")
    return (
      <svg {...common}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />
      </svg>
    );
  return (
    <svg {...common}>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="m4 16 4.5-4.5 4 4 2.5-2.5 5 5" />
    </svg>
  );
}

/** The picture of a chosen file: the image itself from its local address, else the pictogram of its kind. */
export function FileThumb({ url, kind, sizes = "64px" }: { url: string | null; kind: MediaKind | null; sizes?: string }) {
  return (
    <span className={styles.thumb}>
      {/* A local address: next/image shows it as it is, without the optimizer. */}
      {url ? <Image src={url} alt="" fill sizes={sizes} unoptimized /> : <KindGlyph kind={kind} />}
    </span>
  );
}
