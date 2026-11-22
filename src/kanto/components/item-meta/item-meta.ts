import type {
  HistoryActor,
  Item,
  ItemMedia,
  Medium,
  Relationship,
  SignalOutcome,
} from '../../lib/api/types';

/* Labels and small derivations shared by the item, verification and review screens. */

export const MEDIUM_LABEL: Record<Medium, string> = {
  painting: 'Peinture',
  sculpture: 'Sculpture',
  craft: 'Savoir-faire',
  music: 'Musique',
};

export const MEDIUM_OPTIONS: readonly { value: Medium; label: string }[] = [
  { value: 'painting', label: 'Peinture' },
  { value: 'sculpture', label: 'Sculpture' },
  { value: 'craft', label: 'Savoir-faire' },
  { value: 'music', label: 'Musique' },
];

const ROOM_NAME: Record<string, string> = {
  peinture: 'Peinture',
  sculpture: 'Sculpture',
  'savoir-faire': 'Savoir-faire',
  musique: 'Musique',
};

export function roomLabel(room: { slug: string; number: string }): string {
  return `Salle ${room.number} · ${ROOM_NAME[room.slug] ?? room.slug}`;
}

export function roomPathOf(room: { slug: string; number: string }): string {
  return `/musee/${room.slug}/${room.number}`;
}

export function relationshipLabel(relationship: Relationship | null): string {
  switch (relationship) {
    case 'author':
      return 'Déposée par l’auteur·e';
    case 'holder':
      return 'Déposée par le détenteur';
    case 'representative':
      return 'Déposée par un atelier ou une communauté';
    case null:
      return 'Lien avec l’œuvre non déclaré';
  }
}

export const ACTOR_LABEL: Record<HistoryActor, string> = {
  contributor: 'Contributeur',
  system: 'Système',
  reviewer: 'Relecture',
  admin: 'Administration',
};

export const OUTCOME_LABEL: Record<
  SignalOutcome,
  { glyph: string; text: string }
> = {
  pass: { glyph: '✓', text: 'Conforme' },
  warn: { glyph: '!', text: 'À vérifier' },
  flag: { glyph: '!', text: 'Signal fort' },
  unavailable: { glyph: '–', text: 'Indisponible' },
};

const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeStyle: 'short',
});
const DATE_ONLY = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function formatDateTime(iso: string | null): string {
  if (iso === null) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE_TIME.format(date);
}

export function formatDate(iso: string | null): string {
  if (iso === null) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE_ONLY.format(date);
}

/** The image shown first: the primary one, else the first ready image. */
export function primaryImage(item: Item): ItemMedia | null {
  const images = item.media.filter(
    (media) => media.kind === 'image' && media.status === 'ready',
  );
  return images.find((media) => media.primary) ?? images[0] ?? null;
}

export function readyImages(item: Item): ItemMedia[] {
  return item.media.filter(
    (media) => media.kind === 'image' && media.status === 'ready',
  );
}

/** Shortens a long reference such as a transaction hash for display. */
export function shortenReference(value: string, head = 10, tail = 6): string {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}
