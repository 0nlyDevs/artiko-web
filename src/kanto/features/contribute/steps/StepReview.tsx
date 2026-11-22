import frameGildedAsset from '../../../assets/gallery/frame-gilded-800.webp';
import { HallSection } from '../../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../../components/status-banner/StatusBanner';
import type { Item } from '../../../lib/api/types';
import type { WizardStep } from '../../../app/routes';
import type { DraftForm } from '../contribute-content';
import {
  MEDIUM_LABEL,
  RELATIONSHIP_LABEL,
  stepForField,
} from '../contribute-content';
import { IMPORT_MODEL_GONE_REVIEW } from '../model-import-copy';
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
}

function joinParts(parts: readonly string[]): string {
  return parts.filter((part) => part.trim() !== '').join(' · ');
}

/** Step 4, Figma B4: the work hung in the red room, then the recap with edit links. */
export function StepReview({ item, form, errors, onEdit }: StepReviewProps) {
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
  const consents = form.consentShare && form.consentDisplay;

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
          ? 'Aucune photographie'
          : `${String(images.length)} image${images.length > 1 ? 's' : ''}`,
        images.length === 0 ? '' : '1 image principale',
        videos > 0 ? `${String(videos)} vidéo${videos > 1 ? 's' : ''}` : '',
        sounds > 0 ? `${String(sounds)} son${sounds > 1 ? 's' : ''}` : '',
        modelPart,
      ]),
      step: 2,
    },
    {
      label: 'Provenance',
      value:
        joinParts([
          form.period,
          form.place,
          form.relationship === null
            ? ''
            : RELATIONSHIP_LABEL[form.relationship],
        ]) || 'À compléter',
      step: 3,
    },
    {
      label: 'Droits',
      value: joinParts([
        form.holder === '' ? 'Détenteur non nommé' : `© ${form.holder}`,
        consents ? 'consentements donnés' : 'consentements incomplets',
      ]),
      step: 3,
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
      {errors.length > 0 && (
        <StatusBanner tone="error" className={styles.banner}>
          La fiche est incomplète :
          <ul className={styles.errorList}>
            {errors.map((error) => (
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
          <div className={styles.previewFrame}>
            <div className={styles.previewArt}>
              {primary !== undefined && <img src={primary.url} alt="" />}
            </div>
            <img className={styles.previewGilded} src={frameGilded} alt="" />
          </div>
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
        {primary === undefined && (
          <p className={styles.previewNote}>
            Ajoutez une photographie à l’étape 2 pour voir l’œuvre dans le
            cadre.
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
    </div>
  );
}
