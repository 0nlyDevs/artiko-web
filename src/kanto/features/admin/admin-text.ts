import type { Medium, Relationship, SignalOutcome } from '../../lib/api/types';

export const MEDIUM_TEXT: Record<Medium, string> = {
  painting: 'Peinture',
  sculpture: 'Sculpture',
  craft: 'Savoir-faire',
  music: 'Musique',
};

export const RELATIONSHIP_TEXT: Record<Relationship, string> = {
  author: 'Auteur ou autrice de l’œuvre',
  holder: 'Détenteur (famille, collection)',
  representative: 'Représentant d’un atelier ou d’une communauté',
};

export const OUTCOME_TEXT: Record<SignalOutcome, string> = {
  pass: 'OK',
  warn: 'À vérifier',
  flag: 'Signal',
  unavailable: 'Indisponible',
};

export function formatDate(iso: string | null): string {
  if (iso === null) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
