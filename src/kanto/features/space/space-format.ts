import type { Item, Medium } from '../../lib/api/types';

export const MEDIUM_LABEL: Record<Medium, string> = {
  painting: 'Peinture',
  sculpture: 'Sculpture',
  craft: 'Savoir-faire',
  music: 'Musique',
};

const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE.format(date);
}

/** Primary image of a record, or its first image. */
export function thumbnailOf(item: Item): { url: string; alt: string } | null {
  const images = item.media.filter(
    (media) =>
      media.kind === 'image' && media.status === 'ready' && media.url !== '',
  );
  const picked = images.find((media) => media.primary) ?? images[0];
  return picked === undefined ? null : { url: picked.url, alt: '' };
}

export function sortByUpdated(items: readonly Item[]): Item[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function plural(
  count: number,
  singular: string,
  pluralForm: string,
): string {
  return `${String(count)} ${count > 1 ? pluralForm : singular}`;
}
