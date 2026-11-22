/*
 * The works published on the real API, as the KANTO rooms need them. Read
 * on the server (the API refuses browser calls from other origins), then
 * hung in the rooms by the shell before the museum renders.
 */

export interface PublishedWork {
  id: string;
  title: string;
  artistName: string;
  category: string;
  mediaKind: string;
  mediaUrl: string;
  /** 3D works: the 2K model and the still shown while it loads. */
  modelHdUrl: string | null;
  posterUrl: string | null;
  story: string;
}

/** The image and 3D works of the API answer, in the order the API gives them (newest first). */
export function toPublishedWorks(
  works: readonly {
    id: string;
    title: string;
    artist_name: string;
    category: string;
    media_kind: string;
    media_url: string;
    media_hd_url?: string | null;
    poster_url?: string | null;
    story?: string | null;
  }[],
): PublishedWork[] {
  return works
    .filter(
      (work) =>
        (work.media_kind === 'image' || work.media_kind === 'model') &&
        work.media_url !== '',
    )
    .map((work) => ({
      id: work.id,
      title: work.title,
      artistName: work.artist_name,
      category: work.category,
      mediaKind: work.media_kind,
      mediaUrl: work.media_url,
      modelHdUrl: work.media_hd_url ?? null,
      posterUrl: work.poster_url ?? null,
      story: work.story ?? '',
    }));
}
