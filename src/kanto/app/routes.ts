import type { Room } from '../features/gallery/data/rooms';
import { findRoom, roomPath, rooms } from '../features/gallery/data/rooms';

/** The contribution wizard: the work, its media, then the send. */
export type WizardStep = 1 | 2 | 3;

export type Route =
  | { kind: 'home' }
  | { kind: 'gallery'; room: Room; artworkIndex: number | null }
  | { kind: 'end' }
  | { kind: 'items' }
  | { kind: 'item'; itemId: string }
  | { kind: 'contribute' }
  | { kind: 'wizard'; itemId: string | null; step: WizardStep }
  | { kind: 'submission'; itemId: string }
  | { kind: 'hanging'; itemId: string }
  | { kind: 'verification'; itemId: string }
  | { kind: 'scan-new' }
  | { kind: 'scan'; sessionId: string }
  | { kind: 'scan-phone'; sessionId: string }
  | { kind: 'admin' }
  | { kind: 'admin-item'; itemId: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'not-found' };

/** Path builders, so screens never assemble URLs by hand. */
export const paths = {
  home: '/',
  museum: (): string => {
    const entrance = rooms[0];
    return entrance === undefined ? '/musee' : roomPath(entrance);
  },
  end: '/fin-de-visite',
  items: '/oeuvres',
  item: (id: string): string => `/oeuvre/${encodeURIComponent(id)}`,
  // Accounts, my space and publication are the pages of the Next app on the real API.
  login: (next?: string): string =>
    next === undefined
      ? '/sign-in'
      : `/sign-in?next=${encodeURIComponent(next)}`,
  register: '/sign-up',
  contribute: '/me?tab=publish',
  wizardNew: '/me?tab=publish',
  wizard: (id: string, step: WizardStep): string =>
    `/contribuer/${encodeURIComponent(id)}/etape/${String(step)}`,
  submission: (id: string): string => `/contribuer/${encodeURIComponent(id)}`,
  /** The hanging ceremony shown once a work is sent or published. */
  hanging: (id: string): string =>
    `/contribuer/${encodeURIComponent(id)}/accrochage`,
  space: '/me',
  profile: '/me?tab=profile',
  verification: (id: string): string =>
    `/verification/${encodeURIComponent(id)}`,
  scanNew: '/numerisation',
  scan: (sessionId: string): string => `/numerisation/${encodeURIComponent(sessionId)}`,
  scanPhone: (sessionId: string): string =>
    `/numerisation/${encodeURIComponent(sessionId)}/telephone`,
  admin: '/admin',
  adminItem: (id: string): string => `/admin/${encodeURIComponent(id)}`,
} as const;

function museumRoute(segments: readonly string[], pathname: string): Route {
  const [, roomSlug, artworkNumber] = segments;
  if (segments.length > 3) {
    return { kind: 'not-found' };
  }
  const room = roomSlug === undefined ? rooms[0] : findRoom(roomSlug);
  if (room === undefined) {
    return { kind: 'not-found' };
  }
  if (artworkNumber === undefined) {
    const target = roomPath(room);
    return target === pathname
      ? { kind: 'gallery', room, artworkIndex: null }
      : { kind: 'redirect', to: target };
  }
  const artworkIndex = room.artworks.findIndex(
    (artwork) => artwork.number === artworkNumber,
  );
  if (artworkIndex === -1) {
    return { kind: 'redirect', to: roomPath(room) };
  }
  return { kind: 'gallery', room, artworkIndex };
}

/**
 * Maps a pathname to a screen. `/musee` and `/musee/:room` redirect to the
 * first artwork, and the former `/galerie` address joins the museum.
 */
export function matchRoute(pathname: string): Route {
  const segments = pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  const [first, second] = segments;
  const count = segments.length;

  if (first === undefined) {
    return { kind: 'home' };
  }
  switch (first) {
    case 'musee':
      return museumRoute(segments, pathname);
    case 'galerie':
      return { kind: 'redirect', to: paths.museum() };
    case 'fin-de-visite':
      return count === 1 ? { kind: 'end' } : { kind: 'not-found' };
    // The pages that ran on the simulated API lead to their real counterparts.
    case 'oeuvres':
    case 'oeuvre':
      return { kind: 'redirect', to: '/explore' };
    // The simulated account and deposit pages are replaced by the real ones.
    case 'connexion':
      return { kind: 'redirect', to: paths.login() };
    case 'inscription':
      return { kind: 'redirect', to: paths.register };
    case 'contribuer':
      return { kind: 'redirect', to: paths.contribute };
    case 'mon-espace':
      return {
        kind: 'redirect',
        to: second === 'profil' ? paths.profile : paths.space,
      };
    case 'verification':
      return { kind: 'redirect', to: paths.space };
    case 'numerisation':
      return { kind: 'redirect', to: paths.contribute };
    case 'admin':
      return { kind: 'redirect', to: paths.home };
    default:
      return { kind: 'not-found' };
  }
}
