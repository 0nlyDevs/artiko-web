import type { Room } from '../features/gallery/data/rooms';
import { findRoom, roomPath, rooms } from '../features/gallery/data/rooms';

export type WizardStep = 1 | 2 | 3 | 4;

export type Route =
  | { kind: 'home' }
  | { kind: 'gallery'; room: Room; artworkIndex: number | null }
  | { kind: 'end' }
  | { kind: 'items' }
  | { kind: 'item'; itemId: string }
  | { kind: 'login' }
  | { kind: 'register' }
  | { kind: 'contribute' }
  | { kind: 'wizard'; itemId: string | null; step: WizardStep }
  | { kind: 'submission'; itemId: string }
  | { kind: 'hanging'; itemId: string }
  | { kind: 'space' }
  | { kind: 'profile' }
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
  login: (next?: string): string =>
    next === undefined
      ? '/connexion'
      : `/connexion?suite=${encodeURIComponent(next)}`,
  register: '/inscription',
  contribute: '/contribuer',
  wizardNew: '/contribuer/nouvelle',
  wizard: (id: string, step: WizardStep): string =>
    `/contribuer/${encodeURIComponent(id)}/etape/${String(step)}`,
  submission: (id: string): string => `/contribuer/${encodeURIComponent(id)}`,
  /** The hanging ceremony shown once a work is sent or published. */
  hanging: (id: string): string =>
    `/contribuer/${encodeURIComponent(id)}/accrochage`,
  space: '/mon-espace',
  profile: '/mon-espace/profil',
  verification: (id: string): string =>
    `/verification/${encodeURIComponent(id)}`,
  scanNew: '/numerisation',
  scan: (sessionId: string): string => `/numerisation/${encodeURIComponent(sessionId)}`,
  scanPhone: (sessionId: string): string =>
    `/numerisation/${encodeURIComponent(sessionId)}/telephone`,
  admin: '/admin',
  adminItem: (id: string): string => `/admin/${encodeURIComponent(id)}`,
} as const;

function wizardStep(value: string | undefined): WizardStep | null {
  switch (value) {
    case '1':
      return 1;
    case '2':
      return 2;
    case '3':
      return 3;
    case '4':
      return 4;
    default:
      return null;
  }
}

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
  const [first, second, third, fourth] = segments;
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
    case 'oeuvres':
      return count === 1 ? { kind: 'items' } : { kind: 'not-found' };
    case 'oeuvre':
      return count === 2 && second !== undefined
        ? { kind: 'item', itemId: second }
        : { kind: 'not-found' };
    case 'connexion':
      return count === 1 ? { kind: 'login' } : { kind: 'not-found' };
    case 'inscription':
      return count === 1 ? { kind: 'register' } : { kind: 'not-found' };
    case 'contribuer': {
      if (count === 1) {
        return { kind: 'contribute' };
      }
      if (second === 'nouvelle') {
        return count === 2
          ? { kind: 'wizard', itemId: null, step: 1 }
          : { kind: 'not-found' };
      }
      if (second === undefined) {
        return { kind: 'not-found' };
      }
      if (count === 2) {
        return { kind: 'submission', itemId: second };
      }
      if (third === 'accrochage' && count === 3) {
        return { kind: 'hanging', itemId: second };
      }
      if (third === 'etape' && count === 4) {
        const step = wizardStep(fourth);
        return step === null
          ? { kind: 'redirect', to: paths.wizard(second, 1) }
          : { kind: 'wizard', itemId: second, step };
      }
      return { kind: 'not-found' };
    }
    case 'mon-espace':
      if (count === 1) {
        return { kind: 'space' };
      }
      return count === 2 && second === 'profil'
        ? { kind: 'profile' }
        : { kind: 'not-found' };
    case 'verification':
      return count === 2 && second !== undefined
        ? { kind: 'verification', itemId: second }
        : { kind: 'not-found' };
    case 'numerisation':
      if (count === 1) {
        return { kind: 'scan-new' };
      }
      if (second === undefined) {
        return { kind: 'not-found' };
      }
      if (count === 2) {
        return { kind: 'scan', sessionId: second };
      }
      return count === 3 && third === 'telephone'
        ? { kind: 'scan-phone', sessionId: second }
        : { kind: 'not-found' };
    case 'admin':
      if (count === 1) {
        return { kind: 'admin' };
      }
      return count === 2 && second !== undefined
        ? { kind: 'admin-item', itemId: second }
        : { kind: 'not-found' };
    default:
      return { kind: 'not-found' };
  }
}
