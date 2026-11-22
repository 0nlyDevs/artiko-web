import { ChoiceTiles } from '../../../components/choice-tile/ChoiceTile';
import { HallSection } from '../../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../../components/status-banner/StatusBanner';
import { TextField } from '../../../components/text-field/TextField';
import type { DraftForm, Step1Errors } from '../contribute-content';
import { MEDIUM_OPTIONS } from '../contribute-content';
import styles from '../WizardPage.module.css';
import { ModelImportNotice } from './ModelImportStatus';

export interface StepArtworkProps {
  form: DraftForm;
  errors: Step1Errors;
  onChange: (patch: Partial<DraftForm>) => void;
  /** Entered through "Importer un modèle 3D": says where the model goes. */
  mode3d: boolean;
}

/** Step 1, Figma 129:62 and B1: the art form and the title, nothing more is required. */
export function StepArtwork({
  form,
  errors,
  onChange,
  mode3d,
}: StepArtworkProps) {
  return (
    <div className={styles.form}>
      <ModelImportNotice />
      {errors.banner !== undefined && (
        <StatusBanner tone="error" className={styles.banner}>
          {errors.banner}
        </StatusBanner>
      )}
      {mode3d && (
        <StatusBanner className={styles.hint3d}>
          Import 3D : donnez un titre à l’objet, puis déposez votre fichier GLB,
          glTF ou USDZ à l’étape suivante.
        </StatusBanner>
      )}
      <HallSection number="01" title="Quelle forme d’art ?">
        <ChoiceTiles
          name="medium"
          label="Forme d’art"
          options={MEDIUM_OPTIONS}
          value={form.medium}
          error={errors.medium}
          onChange={(medium) => {
            onChange({ medium });
          }}
        />
        {errors.medium !== undefined && (
          <p className={styles.fieldError} role="alert">
            {errors.medium}
          </p>
        )}
      </HallSection>
      <HallSection number="02" title="Son titre">
        <TextField
          label="Titre de l’œuvre"
          value={form.title}
          error={errors.title}
          placeholder="Ex. Hautes Terres, fin du jour"
          autoComplete="off"
          onChange={(title) => {
            onChange({ title });
          }}
        />
        <TextField
          label="Artiste ou atelier (facultatif)"
          value={form.author}
          placeholder="Votre nom ou celui de l’atelier"
          hint="Laissé vide, votre nom de compte est utilisé."
          autoComplete="name"
          onChange={(author) => {
            onChange({ author });
          }}
        />
      </HallSection>
    </div>
  );
}
