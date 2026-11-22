import { ChoiceTiles } from '../../../components/choice-tile/ChoiceTile';
import {
  FieldRow,
  HallSection,
} from '../../../components/hall-layout/HallLayout';
import { StatusBanner } from '../../../components/status-banner/StatusBanner';
import {
  SelectField,
  TextField,
} from '../../../components/text-field/TextField';
import type { DraftForm, Step1Errors } from '../contribute-content';
import { MEDIUM_OPTIONS, REGIONS, SUMMARY_MAX } from '../contribute-content';
import styles from '../WizardPage.module.css';
import { ModelImportNotice } from './ModelImportStatus';

export interface StepArtworkProps {
  form: DraftForm;
  errors: Step1Errors;
  onChange: (patch: Partial<DraftForm>) => void;
  /** Entered through "Importer un modèle 3D": says where the model goes. */
  mode3d: boolean;
}

const REGION_OPTIONS = REGIONS.map((region) => ({
  value: region,
  label: region,
}));

/** Step 1, Figma 129:62 and B1: the art form and the first words about the work. */
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
      <HallSection number="02" title="Présentez-la">
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
        <FieldRow>
          <TextField
            label="Artiste ou atelier"
            value={form.author}
            placeholder="Votre nom ou celui de l’atelier"
            autoComplete="name"
            onChange={(author) => {
              onChange({ author });
            }}
          />
          <SelectField
            label="Région d’origine"
            value={form.region}
            options={REGION_OPTIONS}
            placeholder="Choisir une région"
            onChange={(region) => {
              onChange({ region });
            }}
          />
        </FieldRow>
        <TextField
          multiline
          label="Quelques mots sur l’œuvre"
          value={form.summary}
          placeholder="Ce qu’elle représente, pourquoi vous l’avez faite, ce qu’elle transmet…"
          maxLength={SUMMARY_MAX}
          hint="280 caractères au plus · le récit complet viendra à l’étape 3"
          rows={3}
          onChange={(summary) => {
            onChange({ summary });
          }}
        />
      </HallSection>
    </div>
  );
}
