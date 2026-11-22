import type { ImportStep } from '@/features/model-import/import-model';
import type { ModelImportErrorCode } from '@/features/model-import/model-import-error';
import { fr } from '@/i18n/fr';
import type { ModelImportState } from './steps/model-import-session';

/*
 * French wording of the scan import. Steps, sizes and refusals are read from
 * the application dictionary, so each is translated in one place only. The
 * sentences that the dictionary words for the publication form of Artiko, and
 * those that only this wizard needs, are written here.
 */

export type ImportStepProgress = 'done' | 'current' | 'pending';

export const IMPORT_PREPARING =
  'Préparation de votre modèle 3D dans ce navigateur. Vous pouvez continuer à remplir la fiche : gardez seulement cet onglet ouvert.';

export const IMPORT_PANEL_LABEL = 'Préparation du modèle 3D';

export const IMPORT_SENDING = 'Envoi du modèle 3D…';

export const IMPORT_CANCELLED = 'Préparation annulée.';

export const IMPORT_SEND_FAILED = 'Le modèle 3D n’a pas pu être envoyé.';

export const IMPORT_MODEL_GONE =
  'Le fichier de ce modèle 3D n’était conservé que le temps d’une session : il n’est plus disponible dans ce navigateur. Importez-le de nouveau, ou retirez-le de la liste.';

export const IMPORT_MODEL_GONE_REVIEW =
  'Le fichier du modèle 3D n’est plus disponible dans ce navigateur. Importez-le de nouveau à l’étape Médias, ou retirez-le, avant d’envoyer l’œuvre.';

export function importStepLabel(step: ImportStep): string {
  return fr[`import.step.${step}`];
}

export function importStepProgress(
  step: ImportStep,
  progress: ImportStepProgress,
): string {
  return fr[`import.progress.${progress}`].replace(
    '{step}',
    importStepLabel(step),
  );
}

/*
 * Two refusals are worded for this wizard. It also takes a .gltf file, and
 * its last action sends the work to review: nothing is "published" here.
 */
const WIZARD_REFUSALS: Partial<Record<ModelImportErrorCode, string>> = {
  unsupported_format: 'Choisissez un fichier .usdz, .glb ou .gltf.',
  unsupported_browser:
    'Ce navigateur ne peut pas préparer un scan 3D. Vous pouvez ajouter un fichier .gltf, ou continuer avec vos images, sons et vidéos.',
};

export function importErrorMessage(code: ModelImportErrorCode): string {
  return WIZARD_REFUSALS[code] ?? fr[`import.error.${code}`];
}

/** False when another scan would be refused for the same reason. */
export function canChooseAnotherFile(code: ModelImportErrorCode): boolean {
  return code !== 'unsupported_browser';
}

export function importOversizedMessage(
  variants: readonly ('1k' | '2k')[],
): string {
  return fr['import.oversized'].replace(
    '{variants}',
    variants.map((variant) => fr[`import.size.${variant}`]).join(', '),
  );
}

export const IMPORT_SIZE_LABEL = {
  model1k: fr['import.size.1k'],
  model2k: fr['import.size.2k'],
  poster: fr['import.size.poster'],
} as const;

export function importAdded(fileName: string): string {
  return `Modèle 3D ajouté : ${fileName}.`;
}

/**
 * The one sentence a screen reader hears when the import moves on: the step
 * that runs, the upload once, then the model added. Refusals speak through
 * their own alert.
 */
export function importAnnouncement(state: ModelImportState): string {
  switch (state.phase) {
    case 'preparing':
      return state.current === null
        ? `${IMPORT_PANEL_LABEL}…`
        : importStepProgress(state.current, 'current');
    case 'sending':
      return IMPORT_SENDING;
    case 'attached':
      return importAdded(state.fileName);
    default:
      return '';
  }
}

export interface ImportNotice {
  tone: 'info' | 'error';
  text: string;
}

/**
 * What the other steps of the wizard say about the model while the
 * contributor is away from the media step. `witnessed` is true when the step
 * opened while the model was still on its way: only then does it confirm
 * that the model was added. On the last step (`beforeSending`) the advice is
 * to wait, since the work would otherwise leave for review without its model.
 */
export function importNotice(
  state: ModelImportState,
  witnessed: boolean,
  beforeSending: boolean,
): ImportNotice | null {
  switch (state.phase) {
    case 'preparing':
      return {
        tone: 'info',
        text: beforeSending
          ? `Modèle 3D en préparation : ${state.fileName}. Attendez qu’il soit ajouté avant d’envoyer l’œuvre en relecture.`
          : `Modèle 3D en préparation : ${state.fileName}. Vous pouvez continuer, gardez cet onglet ouvert.`,
      };
    case 'sending':
      return {
        tone: 'info',
        text: beforeSending
          ? `Envoi du modèle 3D : ${state.fileName}… Attendez qu’il soit ajouté avant d’envoyer l’œuvre en relecture.`
          : `Envoi du modèle 3D : ${state.fileName}…`,
      };
    case 'attached':
      return witnessed
        ? {
            tone: 'info',
            text: `Modèle 3D ajouté à l’œuvre : ${state.fileName}.`,
          }
        : null;
    case 'refused':
      return {
        tone: 'error',
        text: `Le modèle 3D n’a pas été ajouté (${state.fileName}). ${importErrorMessage(state.code)}`,
      };
    case 'oversized':
      return {
        tone: 'error',
        text: `Le modèle 3D n’a pas été ajouté (${state.fileName}). ${importOversizedMessage(state.variants)}`,
      };
    case 'send-failed':
      return {
        tone: 'error',
        text: `Le modèle 3D n’a pas pu être envoyé (${state.fileName}). ${state.message}`,
      };
    default:
      return null;
  }
}
