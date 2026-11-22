import type { WizardStep } from '../../app/routes';
import type {
  Item,
  ItemDraftInput,
  Medium,
  Relationship,
} from '../../lib/api/types';

/*
 * Copy and options of the contribution journey (Figma 129:62, B1–B5).
 */

export const MEDIUM_LABEL: Record<Medium, string> = {
  painting: 'Peinture',
  sculpture: 'Sculpture',
  craft: 'Savoir-faire',
  music: 'Musique',
};

export const MEDIUM_OPTIONS: readonly {
  value: Medium;
  title: string;
  description: string;
}[] = [
  {
    value: 'painting',
    title: 'Peinture',
    description: 'Toiles, dessins, œuvres sur papier',
  },
  {
    value: 'sculpture',
    title: 'Sculpture',
    description: 'Bois, pierre, métal · numérisation 3D',
  },
  {
    value: 'craft',
    title: 'Savoir-faire',
    description: 'Gestes, étapes et techniques artisanales',
  },
  {
    value: 'music',
    title: 'Musique',
    description: 'Instruments, chants, enregistrements',
  },
];

/** The 23 regions of Madagascar. */
export const REGIONS: readonly string[] = [
  'Alaotra-Mangoro',
  'Amoron’i Mania',
  'Analamanga',
  'Analanjirofo',
  'Androy',
  'Anosy',
  'Atsimo-Andrefana',
  'Atsimo-Atsinanana',
  'Atsinanana',
  'Betsiboka',
  'Boeny',
  'Bongolava',
  'Diana',
  'Fitovinany',
  'Haute Matsiatra',
  'Ihorombe',
  'Itasy',
  'Melaky',
  'Menabe',
  'Sava',
  'Sofia',
  'Vakinankaratra',
  'Vatovavy',
];

export const RELATIONSHIP_OPTIONS: readonly {
  value: Relationship;
  title: string;
}[] = [
  { value: 'author', title: 'Je suis l’auteur·e de cette œuvre' },
  { value: 'holder', title: 'Je la détiens (famille, collection)' },
  {
    value: 'representative',
    title: 'Je représente un atelier ou une communauté',
  },
];

export const RELATIONSHIP_LABEL: Record<Relationship, string> = {
  author: 'auteur·e',
  holder: 'détenteur·rice',
  representative: 'représentant·e',
};

export const WIZARD_STEPS = [
  { label: 'L’œuvre' },
  { label: 'Médias' },
  { label: 'Envoi' },
] as const;

export const STEP_HEADLINES: Record<WizardStep, readonly string[]> = {
  1: ['Confiez', 'votre œuvre', 'au musée.'],
  2: ['Montrez-la', 'telle qu’elle', 'est.'],
  3: ['Votre œuvre,', 'accrochée', 'comme ici.'],
};

export const STEP_LEDES: Record<WizardStep, string> = {
  1: 'Une forme d’art et un titre suffisent pour commencer. L’équipe de KANTO relit chaque œuvre avant de l’exposer.',
  2: 'Une photo de face, à la lumière du jour, ou un modèle 3D : c’est ce que verront les visiteurs.',
  3: 'Voici comment elle apparaîtra dans la salle. Cochez la case, puis envoyez-la à l’équipe de KANTO.',
};

export const STEP_NEXT_LABEL: Record<1 | 2, string> = {
  1: 'Continuer · Médias',
  2: 'Continuer · Envoi',
};

/** The one consent of the send step: it stands for sharing and display. */
export const CONSENT_LABEL =
  'Je certifie avoir le droit de partager cette œuvre et j’accepte que KANTO la présente avec mon nom.';
export const CONSENT_ERROR = 'Cochez la case pour envoyer votre œuvre.';

export const SUMMARY_MAX = 280;
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/*,.heic,.heif';
export const VIDEO_ACCEPT = 'video/mp4,video/webm,.mp4,.webm';
export const AUDIO_ACCEPT = 'audio/mpeg,audio/wav,audio/ogg,.mp3,.wav,.ogg';
export const MODEL_ACCEPT = '.glb,.gltf,.usdz';

/** Values edited by the wizard, kept flat for the form. */
export interface DraftForm {
  medium: Medium | null;
  title: string;
  author: string;
  region: string;
  summary: string;
  period: string;
  place: string;
  relationship: Relationship | null;
  holder: string;
  story: string;
  consentShare: boolean;
  consentDisplay: boolean;
}

export function emptyForm(medium: Medium | null = null): DraftForm {
  return {
    medium,
    title: '',
    author: '',
    region: '',
    summary: '',
    period: '',
    place: '',
    relationship: null,
    holder: '',
    story: '',
    consentShare: false,
    consentDisplay: false,
  };
}

export function formFromItem(item: Item): DraftForm {
  return {
    medium: item.medium,
    title: item.title,
    author: item.author,
    region: item.details.region,
    summary: item.details.summary,
    period: item.details.period,
    place: item.details.place,
    relationship: item.rights.relationship,
    holder: item.rights.holder,
    story: item.details.story,
    consentShare: item.rights.consentShare,
    consentDisplay: item.rights.consentDisplay,
  };
}

export function patchFromForm(form: DraftForm): Partial<ItemDraftInput> {
  const patch: Partial<ItemDraftInput> = {
    title: form.title,
    author: form.author,
    details: {
      region: form.region,
      summary: form.summary,
      period: form.period,
      place: form.place,
      story: form.story,
    },
    rights: {
      relationship: form.relationship,
      holder: form.holder,
      consentShare: form.consentShare,
      consentDisplay: form.consentDisplay,
    },
  };
  if (form.medium !== null) {
    patch.medium = form.medium;
  }
  return patch;
}

export function createInputFromForm(
  form: DraftForm,
  medium: Medium,
): ItemDraftInput {
  return {
    title: form.title,
    author: form.author,
    medium,
    details: {
      region: form.region,
      summary: form.summary,
      period: form.period,
      place: form.place,
      story: form.story,
    },
    rights: {
      relationship: form.relationship,
      holder: form.holder,
      consentShare: form.consentShare,
      consentDisplay: form.consentDisplay,
    },
  };
}

export interface Step1Errors {
  medium?: string;
  title?: string;
  banner?: string;
}

/** Figma B1: a banner naming what is missing, plus the field errors. */
export function validateStep1(form: DraftForm): Step1Errors {
  const errors: Step1Errors = {};
  const missing: string[] = [];
  if (form.medium === null) {
    errors.medium = 'Choisissez une forme d’art.';
    missing.push('la forme d’art');
  }
  if (form.title.trim() === '') {
    errors.title = 'Donnez un titre à votre œuvre — même provisoire.';
    missing.push('le titre');
  }
  if (missing.length === 1) {
    errors.banner = `Une information manque avant de continuer : ${missing[0] ?? ''}.`;
  } else if (missing.length > 1) {
    errors.banner = `Deux informations manquent avant de continuer : ${missing.join(' et ')}.`;
  }
  return errors;
}

/** Which wizard step fixes a `VALIDATION_FAILED` field of `items.submit`. */
export function stepForField(field: string): WizardStep {
  switch (field) {
    case 'media':
      return 2;
    case 'consent':
      return 3;
    default:
      return 1;
  }
}

const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const DATE_TIME = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }
  if (bytes >= 1024) {
    return `${String(Math.round(bytes / 1024))} ko`;
  }
  return `${String(bytes)} o`;
}

export const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
