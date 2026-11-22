import type { TrackerStep } from '../../components/tracker/Tracker';
import type { ScanSession, ScanStage } from '../../lib/api/types';

/** Order of the stages along the session, for the tracker and the status lines. */
const RANK: Record<ScanStage, number> = {
  created: 0,
  phone_connected: 1,
  scanning: 2,
  uploading: 3,
  received: 4,
  processing: 4,
  ready: 5,
  failed: 3,
  expired: -1,
};

const STEPS = [
  'Session créée',
  'iPhone connecté',
  'Capture dans l’app',
  'Transfert du fichier',
  'Modèle reçu',
  'Prêt à associer',
] as const;

export const STAGE_TEXT: Record<ScanStage, string> = {
  created: 'En attente du téléphone…',
  phone_connected: 'Téléphone connecté. La capture se fait dans l’app native.',
  scanning: 'Capture en cours sur le téléphone.',
  uploading: 'Transfert du fichier…',
  received: 'Fichier reçu.',
  processing:
    'Fichier reçu. Conversion en GLB à faire hors ligne (procédure 3D-04a).',
  ready: 'Modèle prêt à associer à une fiche.',
  failed: 'La session a échoué.',
  expired: 'La session a expiré.',
};

export function trackerSteps(session: ScanSession): TrackerStep[] {
  const rank = RANK[session.stage];
  return STEPS.map((title, index) => {
    if (session.stage === 'failed' && index === 3) {
      return {
        title,
        state: 'failed',
        detail: session.error ?? 'Transfert interrompu.',
      };
    }
    if (session.stage === 'expired') {
      return {
        title,
        state:
          index <= 1 && session.device !== null
            ? 'done'
            : index === 0
              ? 'done'
              : 'upcoming',
        ...(index === 1 ? { detail: 'Session expirée' } : {}),
      };
    }
    if (index <= rank) {
      const detail =
        index === 1 && session.device !== null
          ? session.device.name
          : index === 4 && session.file !== null
            ? session.file.name
            : index === 5 && session.stage === 'ready'
              ? 'Le modèle s’ouvre dans la visionneuse.'
              : undefined;
      return detail === undefined
        ? { title, state: 'done' }
        : { title, state: 'done', detail };
    }
    if (index === rank + 1) {
      const detail =
        session.stage === 'processing'
          ? 'Conversion hors ligne requise pour un USDZ.'
          : session.stage === 'uploading'
            ? `${String(Math.round(session.progress * 100))} %`
            : undefined;
      return detail === undefined
        ? { title, state: 'active' }
        : { title, state: 'active', detail };
    }
    return { title, state: 'upcoming' };
  });
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
  }
  if (bytes >= 1_000) {
    return `${String(Math.round(bytes / 1_000))} ko`;
  }
  return `${String(bytes)} o`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** A short device name from the user agent, never the full string. */
export function deviceFromUserAgent(userAgent: string): {
  name: string;
  platform: string;
} {
  if (/iPhone/.test(userAgent)) {
    return { name: 'iPhone', platform: 'iOS' };
  }
  if (/iPad/.test(userAgent)) {
    return { name: 'iPad', platform: 'iPadOS' };
  }
  if (/Android/.test(userAgent)) {
    return { name: 'Android', platform: 'Android' };
  }
  return { name: 'Ordinateur', platform: 'web' };
}

export const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
