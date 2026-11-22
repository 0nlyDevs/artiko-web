import { Checkbox } from '../../../components/checkbox/Checkbox';
import { ChoiceTiles } from '../../../components/choice-tile/ChoiceTile';
import {
  FieldRow,
  HallSection,
} from '../../../components/hall-layout/HallLayout';
import { TextField } from '../../../components/text-field/TextField';
import type { DraftForm } from '../contribute-content';
import { RELATIONSHIP_OPTIONS } from '../contribute-content';
import styles from '../WizardPage.module.css';
import { ModelImportNotice } from './ModelImportStatus';

export interface StepProvenanceProps {
  form: DraftForm;
  onChange: (patch: Partial<DraftForm>) => void;
  /** Fields the last submission attempt flagged. */
  flagged: ReadonlySet<string>;
}

/** Step 3, Figma B3: creation, the relationship to the work, rights and consent. */
export function StepProvenance({
  form,
  onChange,
  flagged,
}: StepProvenanceProps) {
  return (
    <div className={styles.form}>
      <ModelImportNotice />
      <HallSection number="01" title="Création">
        <FieldRow>
          <TextField
            label="Date ou période"
            value={form.period}
            placeholder="2024"
            hint="Une année, une décennie ou « vers 1950 »"
            onChange={(period) => {
              onChange({ period });
            }}
          />
          <TextField
            label="Lieu de création"
            value={form.place}
            placeholder="Ambohimanga, Analamanga"
            onChange={(place) => {
              onChange({ place });
            }}
          />
        </FieldRow>
        <TextField
          multiline
          label="Le récit complet"
          value={form.story}
          placeholder="L’histoire de l’œuvre, son contexte, ce qu’elle transmet. Ce texte accompagne la notice."
          rows={5}
          onChange={(story) => {
            onChange({ story });
          }}
        />
      </HallSection>
      <HallSection number="02" title="Votre lien avec l’œuvre">
        <ChoiceTiles
          name="relationship"
          label="Lien avec l’œuvre"
          layout="row"
          columns={1}
          options={RELATIONSHIP_OPTIONS}
          value={form.relationship}
          error={
            flagged.has('relationship')
              ? 'Précisez votre lien avec l’œuvre.'
              : undefined
          }
          onChange={(relationship) => {
            onChange({ relationship });
          }}
        />
        {flagged.has('relationship') && (
          <p className={styles.fieldError} role="alert">
            Précisez votre lien avec l’œuvre.
          </p>
        )}
        <TextField
          label="Détenteur·rice des droits, tel qu’affiché sur la notice"
          value={form.holder}
          placeholder="Votre nom, celui de la famille ou de l’atelier"
          onChange={(holder) => {
            onChange({ holder });
          }}
        />
      </HallSection>
      <HallSection number="03" title="Droits et consentement">
        <Checkbox
          checked={form.consentShare}
          invalid={flagged.has('consent') && !form.consentShare}
          label="Je certifie avoir le droit de partager cette œuvre et ses images."
          onChange={(consentShare) => {
            onChange({ consentShare });
          }}
        />
        <Checkbox
          checked={form.consentDisplay}
          invalid={flagged.has('consent') && !form.consentDisplay}
          label="J’accepte que KANTO la présente dans le musée virtuel, avec mon nom."
          hint="Vous pourrez la retirer à tout moment depuis votre espace."
          onChange={(consentDisplay) => {
            onChange({ consentDisplay });
          }}
        />
      </HallSection>
    </div>
  );
}
