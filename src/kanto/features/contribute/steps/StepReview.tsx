import frameGildedAsset from '../../../assets/gallery/frame-gilded-800.webp';
import { Checkbox } from '../../../components/checkbox/Checkbox';
import { HallSection } from '../../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../../components/status-banner/StatusBanner';
import type { Item } from '../../../lib/api/types';
import type { WizardStep } from '../../../app/routes';
import type { DraftForm } from '../contribute-content';
import {
  CONSENT_ERROR,
  CONSENT_LABEL,
  MEDIUM_LABEL,
  stepForField,
} from '../contribute-content';
import { IMPORT_MODEL_GONE_REVIEW } from '../model-import-copy';
import { standsOnPlinth } from '../../hanging/hanging-content';
import styles from '../WizardPage.module.css';
import { useModelAvailability } from './model-availability';
import {
  isModelImportBusy,
  useModelImportState,
} from './model-import-session';
import { ModelImportNotice } from './ModelImportStatus';

// Next imports an image as { src, width, height }: the markup needs its URL.
const frameGilded = frameGildedAsset.src;

export interface StepReviewProps {
  item: Item;
  form: DraftForm;
  /** Details of a refused submission, from `VALIDATION_FAILED`. */
  errors: readonly { field: string; reason: string }[];
  onEdit: (step: WizardStep) => void;
  /** The one consent: it gives both the sharing and the display consents. */
  onConsent: (consent: boolean) => void;
  /** The send was tried without the consent. */
  consentMissing: boolean;
}

function joinParts(parts: readonly string[]): string {
  return parts.filter((part) => part.trim() !== '').join(' · ');
}

/** Step 3, Figma B4: the work hung in the red room, a short recap and the consent. */
export function StepReview({
  item,
  form,
  errors,
  onEdit,
  onConsent,
  consentMissing,
}: StepReviewProps) {
  const images = item.media.filter(
    (media) => media.kind === 'image' && media.status === 'ready',
  );
  const primary = images.find((media) => media.primary) ?? images[0];
  const videos = item.media.filter((media) => media.kind === 'video').length;
  const sounds = item.media.filter((media) => media.kind === 'audio').length;
  const hasModel = item.model3d.status !== 'missing';
  // The model may still be on its way from the media step, or point to a
  // file of an earlier session that this browser no longer holds.
  const modelOnItsWay = isModelImportBusy(useModelImportState(item.id));
  const modelGone =
    useModelAvailability(
      item.model3d.status === 'ready'
        ? (item.model3d.variants?.glb1k ?? null)
        : null,
    ) === 'gone';
  const modelPart = modelOnItsWay
    ? 'modèle 3D en préparation'
    : !hasModel
      ? ''
      : modelGone
        ? 'modèle 3D à importer de nouveau'
        : 'modèle 3D';
  const medium = form.medium ?? item.medium;
  // An object stands on a plinth: its 3D model when there is one, else its photograph.
  const readyPoster =
    item.model3d.status === 'ready' && !modelGone
      ? (item.model3d.variants?.poster ?? '')
      : '';
  const onPlinth = standsOnPlinth(medium) || readyPoster !== '';
  const plinthImage =
    readyPoster !== '' ? readyPoster : (primary?.url ?? null);
  const consent = form.consentShare && form.consentDisplay;
  const consentInvalid =
    !consent &&
    (consentMissing || errors.some((error) => error.field === 'consent'));
  // The consent is fixed here, under the recap: the banner lists the rest.
  const otherErrors = errors.filter((error) => error.field !== 'consent');

  const rows: readonly { label: string; value: string; step: WizardStep }[] = [
    {
      label: 'L’œuvre',
      value: joinParts([
        MEDIUM_LABEL[medium],
        form.title === '' ? 'Sans titre' : `« ${form.title} »`,
        form.author,
      ]),
      step: 1,
    },
    {
      label: 'Médias',
      value: joinParts([
        images.length === 0
          ? hasModel
            ? ''
            : 'Aucune photographie'
          : `${String(images.length)} image${images.length > 1 ? 's' : ''}`,
        images.length === 0 ? '' : '1 image principale',
        videos > 0 ? `${String(videos)} vidéo${videos > 1 ? 's' : ''}` : '',
        sounds > 0 ? `${String(sounds)} son${sounds > 1 ? 's' : ''}` : '',
        modelPart,
      ]),
      step: 2,
    },
  ];

  return (
    <div className={styles.form}>
      <ModelImportNotice itemId={item.id} beforeSending />
      {modelGone && !modelOnItsWay && (
        <StatusBanner
          tone="warning"
          className={styles.banner}
          action={{
            label: 'Aller aux médias',
            onClick: () => {
              onEdit(2);
            },
          }}
        >
          {IMPORT_MODEL_GONE_REVIEW}
        </StatusBanner>
      )}
      {otherErrors.length > 0 && (
        <StatusBanner tone="error" className={styles.banner}>
          La fiche est incomplète :
          <ul className={styles.errorList}>
            {otherErrors.map((error) => (
              <li key={`${error.field}:${error.reason}`}>
                {error.reason}
                <button
                  type="button"
                  className={styles.textAction}
                  onClick={() => {
                    onEdit(stepForField(error.field));
                  }}
                >
                  Corriger à l’étape {String(stepForField(error.field))}
                </button>
              </li>
            ))}
          </ul>
        </StatusBanner>
      )}
      <HallSection title="Aperçu dans la salle">
        <div className={styles.preview} aria-hidden="true">
          {onPlinth ? (
            <div className={styles.previewPlinth}>
              <div className={styles.previewObject}>
                {plinthImage !== null && <img src={plinthImage} alt="" />}
              </div>
              <span className={styles.previewPlinthTop} />
              <span className={styles.previewPlinthBody} />
            </div>
          ) : (
            <div className={styles.previewFrame}>
              <div className={styles.previewArt}>
                {primary !== undefined && <img src={primary.url} alt="" />}
              </div>
              <img className={styles.previewGilded} src={frameGilded} alt="" />
            </div>
          )}
          <div className={styles.previewLabel}>
            <span className={styles.previewEyebrow}>Nouvelle œuvre</span>
            <span className={styles.previewTitle}>
              {form.title === '' ? 'Sans titre' : form.title}
            </span>
            <span className={styles.previewMeta}>
              {joinParts([form.author, form.period])}
            </span>
          </div>
        </div>
        {plinthImage === null && primary === undefined && (
          <p className={styles.previewNote}>
            {onPlinth
              ? 'Ajoutez une photographie ou un modèle 3D à l’étape 2 pour voir l’œuvre sur son socle.'
              : 'Ajoutez une photographie à l’étape 2 pour voir l’œuvre dans le cadre.'}
          </p>
        )}
      </HallSection>
      <HallSection title="Récapitulatif">
        <dl className={styles.recap}>
          {rows.map((row) => (
            <div key={row.label} className={styles.recapRow}>
              <dt className={styles.recapLabel}>{row.label}</dt>
              <dd className={styles.recapValue}>{row.value}</dd>
              <dd className={styles.recapValue}>
                <button
                  type="button"
                  className={styles.textAction}
                  onClick={() => {
                    onEdit(row.step);
                  }}
                >
                  Modifier
                  <span className="visually-hidden"> {row.label}</span>
                </button>
              </dd>
            </div>
          ))}
        </dl>
      </HallSection>
      <HallSection title="Votre accord">
        <Checkbox
          checked={consent}
          invalid={consentInvalid}
          label={CONSENT_LABEL}
          hint="Vous pourrez la retirer à tout moment depuis votre espace."
          onChange={onConsent}
        />
        {consentInvalid && (
          <p className={styles.fieldError} role="alert">
            {CONSENT_ERROR}
          </p>
        )}
      </HallSection>
    </div>
  );
}
