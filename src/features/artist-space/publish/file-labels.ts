import type { Key } from "@/i18n/en";
import { intlLocale, type Locale } from "@/i18n/locales";
import { formatBytes } from "@/features/model-import/format-bytes";
import type { MediaKind } from "./file-checks";

const KIND: Record<MediaKind, Key> = {
  image: "publish.kind.image",
  audio: "work.kind.audio",
  video: "work.kind.video",
  model: "work.kind.model",
};

/** The dictionary key of « Image », « Son », « Vidéo » or « Objet 3D ». */
export const kindKey = (kind: MediaKind): Key => KIND[kind];

/** « JPG » for « vue-de-face.jpg »; empty for a name without extension. */
export function extensionOf(name: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match ? match[1].toUpperCase() : "";
}

/** « 6,1 Mo », in the language of the page (English figures where the browser has none for it). */
export const sizeLabel = (bytes: number, locale: Locale): string => formatBytes(bytes, intlLocale(locale));

/** « 4 032 », grouped as the language of the page groups thousands. */
export const countLabel = (n: number, locale: Locale): string => new Intl.NumberFormat(intlLocale(locale)).format(n);
