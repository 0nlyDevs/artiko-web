"use client";

import { useT } from "@/i18n/locale";
import type { Category } from "@/lib/api";
import { IconCheck } from "@/lib/ui/icons";
import { Button, CategoryChip, CategoryChipGroup, UnderlinedField } from "@/lib/ui/kanto";
import { CategoryLabel } from "@/lib/works/category-label";
import type { ImportState } from "@/features/model-import/import-state";
import { ModelImportPanel } from "@/features/model-import/model-import-panel";
import type { Draft } from "./draft";
import type { MediaKind } from "./file-checks";
import { countLabel, extensionOf, kindKey, sizeLabel } from "./file-labels";
import { SectionLabel } from "./publish-frame";
import styles from "./publish.module.css";
import { WorkFilePicker } from "./work-file-picker";

export const TITLE_MAX = 200;
export const STORY_MAX = 5000;

export interface WorkStepProps {
  categories: readonly Category[];
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  file: File | null;
  kind: MediaKind | null;
  previewUrl: string | null;
  /** Width and height of an image, once the browser has read them. */
  pixels: { width: number; height: number } | null;
  /** Why the last chosen file was refused, or that a file is missing. */
  fileError: string | null;
  /** The fields found empty at the last « Continuer ». */
  missing: { title: boolean; category: boolean };
  importState: ImportState;
  /** A 3D scan still being prepared, or refused: the next step waits for it. */
  importBlocks: boolean;
  /** The artist's name, when the page knows it. */
  artistName: string | null;
  confirmingCancel: boolean;
  onAskCancel: () => void;
  onCancel: (erase: boolean) => void;
  onChoose: (file: File) => void;
  onRemove: () => void;
  onContinue: () => void;
}

/** Frame R1: the file of the work, its title, its art form and its story. Nothing is sent from here. */
export function WorkStep({
  categories,
  draft,
  onDraft,
  file,
  kind,
  previewUrl,
  pixels,
  fileError,
  missing,
  importState,
  importBlocks,
  artistName,
  confirmingCancel,
  onAskCancel,
  onCancel,
  onChoose,
  onRemove,
  onContinue,
}: WorkStepProps) {
  const { t, locale } = useT();
  const meta = file
    ? [
        kind ? [t(kindKey(kind)), extensionOf(file.name)].filter(Boolean).join(" ") : extensionOf(file.name),
        // A scan is weighed by the import, which says the size of each file it prepares.
        kind === "model" ? sizeLabel(file.size, locale) : t("publish.file.weight", { size: sizeLabel(file.size, locale) }),
        pixels && t("publish.file.pixels", { width: countLabel(pixels.width, locale), height: countLabel(pixels.height, locale) }),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const signature = [artistName && t("publish.signed", { name: artistName }), t("publish.draft.local")].filter(Boolean).join(" · ");

  return (
    <form
      noValidate
      className={styles.fields}
      onSubmit={(event) => {
        // Not `action={...}`: React resets the fields after an action, wiping what was typed.
        event.preventDefault();
        onContinue();
      }}
    >
      <section className={styles.section} aria-labelledby="publish-file">
        <SectionLabel n={1} id="publish-file">
          {t("publish.section.file")}
        </SectionLabel>
        <WorkFilePicker
          file={file}
          kind={kind}
          previewUrl={previewUrl}
          meta={meta}
          note={kind !== null && kind !== "model" ? t("publish.file.note") : undefined}
          error={fileError}
          onChoose={onChoose}
          onRemove={onRemove}
        />
        <div id="publish-import" className={styles.importPanel}>
          <ModelImportPanel state={importState} alt={t("import.previewAlt")} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="publish-title">
        <SectionLabel n={2} id="publish-title">
          {t("publish.section.title")}
        </SectionLabel>
        <UnderlinedField
          id="title"
          name="title"
          label={t("publish.title.label")}
          hint={t("publish.title.hint")}
          error={missing.title ? t("publish.title.error") : undefined}
          value={draft.title}
          onChange={(event) => onDraft({ title: event.target.value })}
          maxLength={TITLE_MAX}
          required
          autoComplete="off"
        />
        <fieldset className={styles.group} aria-describedby={missing.category ? "category-error" : undefined}>
          <legend id="category" className={styles.fieldLabel}>
            {t("publish.category")}
          </legend>
          <CategoryChipGroup role="radiogroup" labelledBy="category">
            {categories.map((category) => (
              <CategoryChip key={category.id} name="category" value={category.id} selected={draft.category === category.id} onChange={() => onDraft({ category: category.id })} required>
                <CategoryLabel category={category} />
              </CategoryChip>
            ))}
          </CategoryChipGroup>
          {missing.category && (
            <p id="category-error" role="alert" className={styles.fieldError}>
              {t("publish.category.error")}
            </p>
          )}
        </fieldset>
      </section>

      <section className={styles.section} aria-labelledby="publish-story">
        <SectionLabel n={3} id="publish-story">
          {t("publish.section.story")}
        </SectionLabel>
        <UnderlinedField
          as="textarea"
          id="story"
          name="story"
          label={<span className="visually-hidden">{t("publish.story")}</span>}
          placeholder={t("publish.story.placeholder")}
          hint={t("publish.story.count", { n: countLabel(draft.story.length, locale) })}
          value={draft.story}
          onChange={(event) => onDraft({ story: event.target.value })}
          maxLength={STORY_MAX}
          rows={2}
        />
      </section>

      <div className={styles.actions}>
        {confirmingCancel ? (
          <p className={styles.confirm} role="group" aria-label={t("publish.cancel.confirm")}>
            <span>{t("publish.cancel.confirm")}</span>
            <button type="button" className={styles.textLink} onClick={() => onCancel(true)}>
              {t("publish.cancel.yes")}
            </button>
            <button type="button" className={styles.textLink} onClick={() => onCancel(false)}>
              {t("publish.cancel.no")}
            </button>
          </p>
        ) : (
          <p className={styles.note}>
            <IconCheck size={14} strokeWidth={2} />
            <span>{signature}</span>
          </p>
        )}
        <div className={styles.buttons}>
          <Button variant="ghost" onClick={onAskCancel} disabled={confirmingCancel}>
            {t("publish.cancel")}
          </Button>
          <Button type="submit" withArrow disabled={importBlocks} aria-describedby={importBlocks ? "publish-import" : undefined}>
            {t("publish.continue")}
          </Button>
        </div>
      </div>
    </form>
  );
}
