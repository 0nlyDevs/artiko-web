"use client";

import Image from "next/image";
import { useId, useRef, useState, type ReactNode } from "react";
import { useT } from "@/i18n/locale";
import type { ApiError, Exposition } from "@/lib/api";
import { IconBack } from "@/lib/ui/icons";
import { Button, StatusBanner, Switch, UnderlinedField } from "@/lib/ui/kanto";
import { cx } from "@/lib/ui/kanto/cx";
import type { ProofVisibility } from "@/features/artist-space/publish-body";
import { badgeForecast } from "./badge-forecast";
import { NEW_EXPOSITION, NO_EXPOSITION, type Draft } from "./draft";
import { ACCEPT_PROOF, mediaKind, proofsLeft, validProofs, type ProofItem } from "./file-checks";
import { kindKey, sizeLabel } from "./file-labels";
import { KindGlyph } from "./file-thumb";
import { publishErrorText } from "./outcome";
import { SectionLabel } from "./publish-frame";
import styles from "./publish.module.css";
import { useObjectUrl } from "./use-file-facts";

export const EXPOSITION_TITLE_MAX = 200;
export const EXPOSITION_DESCRIPTION_MAX = 2000;

export interface ProofsStepProps {
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  proofs: readonly ProofItem[];
  /** Valid files left out because five proofs were already there. */
  overflow: number;
  /** Adds the chosen files; with `replace`, the first one takes the place of that proof. */
  onAddProofs: (files: File[], replace?: number) => void;
  onRemoveProof: (id: number) => void;
  /** The artist's expositions, the ones created by an earlier try included. */
  expositions: readonly Exposition[];
  /** A new exposition was asked for without a title. */
  missingExpositionTitle: boolean;
  sending: boolean;
  /** The work cannot be sent yet: no file, or a 3D scan not ready. */
  blocked: boolean;
  /** The last refusal: an API error, or null when no answer came. Undefined when there is none to show. */
  failure: ApiError | null | undefined;
  onBack: () => void;
  onPublish: () => void;
}

/** One proof: its picture or pictogram, its name, « Importée · 2,3 Mo » or why it is refused, and its links. */
function Proof({ item, onReplace, onRemove, disabled }: { item: ProofItem; onReplace: () => void; onRemove: () => void; disabled: boolean }) {
  const { t, locale } = useT();
  const kind = mediaKind(item.file);
  const url = useObjectUrl(item.problem === null && kind === "image" ? item.file : null);
  const size = sizeLabel(item.file.size, locale);
  return (
    <li className={styles.proof}>
      <span className={styles.proofTile} data-refused={item.problem !== null}>
        {item.problem !== null ? (
          <span aria-hidden="true">!</span>
        ) : url ? (
          <Image src={url} alt="" fill sizes="(min-width: 640px) 170px, 45vw" unoptimized />
        ) : (
          <>
            <KindGlyph kind={kind} />
            {kind && kind !== "image" && <span>{t(kindKey(kind))}</span>}
          </>
        )}
      </span>
      <p className={styles.proofName} title={item.file.name}>
        {item.file.name}
      </p>
      {item.problem === null ? (
        <p className={styles.proofMeta}>{t("publish.proof.imported", { size })}</p>
      ) : (
        <p className={styles.proofMeta} data-refused="true" role="alert">
          {t(`publish.proof.error.${item.problem}`, { size })}
        </p>
      )}
      <div className={styles.links}>
        {item.problem !== null && (
          <button type="button" className={styles.textLink} disabled={disabled} onClick={onReplace} aria-label={t("publish.file.replaceAria", { name: item.file.name })}>
            {t("publish.file.replace")}
          </button>
        )}
        <button type="button" className={styles.textLink} disabled={disabled} onClick={onRemove} aria-label={t("publish.removeProof", { name: item.file.name })}>
          {t("publish.file.remove")}
        </button>
      </div>
    </li>
  );
}

/** A setting already chosen: its name, its value, and « Modifier » to open the choice in place. */
function Setting({ name, value, open, onToggle, children }: { name: string; value: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  const { t } = useT();
  const panel = useId();
  return (
    <div className={styles.setting}>
      <span className={styles.settingName}>{name}</span>
      <span className={styles.settingValue}>{value}</span>
      <button type="button" className={styles.textLink} aria-expanded={open} aria-controls={panel} aria-label={open ? undefined : t("publish.setting.editAria", { setting: name })} onClick={onToggle}>
        {open ? t("publish.setting.done") : t("publish.setting.edit")}
      </button>
      <div id={panel} className={styles.settingPanel} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

/** Frame R2: the proofs with the forecast of the badge, the AI declaration, two settings, then the one button that sends everything. */
export function ProofsStep({ draft, onDraft, proofs, overflow, onAddProofs, onRemoveProof, expositions, missingExpositionTitle, sending, blocked, failure, onBack, onPublish }: ProofsStepProps) {
  const { t, plural } = useT();
  const input = useRef<HTMLInputElement>(null);
  // The proof « Remplacer » was asked for, until its file is chosen; null adds.
  const [replacing, setReplacing] = useState<number | null>(null);
  const [opened, setOpened] = useState<"proofs" | "exposition" | null>(null);

  const valid = validProofs(proofs).length;
  const left = proofsLeft(proofs);
  const forecast = badgeForecast({ proofs: valid, aiDeclared: draft.aiDeclared });
  const exposition = expositions.find((e) => e.id === draft.exposition);
  const expositionValue =
    draft.exposition === NEW_EXPOSITION
      ? draft.expositionTitle.trim()
        ? t("publish.exposition.new", { title: draft.expositionTitle.trim() })
        : t("publish.exposition.newUntitled")
      : (exposition?.title ?? t("publish.exposition.none"));
  // A missing title must be seen: its panel opens whatever was open.
  const expositionOpen = opened === "exposition" || missingExpositionTitle;

  const browse = (replace: number | null) => {
    setReplacing(replace);
    input.current?.click();
  };

  return (
    <form
      noValidate
      className={styles.fields}
      aria-busy={sending}
      onSubmit={(event) => {
        // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
        event.preventDefault();
        onPublish();
      }}
    >
      <section className={styles.section} aria-labelledby="publish-proofs">
        <SectionLabel n={1} id="publish-proofs">
          {t("publish.section.proofs", { n: valid })}
        </SectionLabel>
        <ul className={styles.proofs}>
          {proofs.map((item) => (
            <Proof key={item.id} item={item} disabled={sending} onReplace={() => browse(item.id)} onRemove={() => onRemoveProof(item.id)} />
          ))}
          {left > 0 && (
            <li className={styles.proof}>
              <button type="button" className={styles.proofAdd} disabled={sending} onClick={() => browse(null)} aria-label={t("publish.addProof")} aria-describedby="proof-help">
                <span className={styles.proofAddTitle}>+ {t("publish.proof.add")}</span>
                <span className={styles.proofAddHint}>{t("publish.proof.addHint")}</span>
              </button>
              <p id="proof-help" className={styles.proofMeta}>
                {plural("publish.proof.left", left)}
              </p>
            </li>
          )}
        </ul>
        {left === 0 && <p className={styles.quiet}>{t("publish.proof.full")}</p>}
        <input
          ref={input}
          id="proof"
          type="file"
          className="visually-hidden"
          tabIndex={-1}
          multiple
          accept={ACCEPT_PROOF}
          aria-label={t("publish.addProof")}
          onChange={(event) => {
            const chosen = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (chosen.length > 0) onAddProofs(chosen, replacing ?? undefined);
            setReplacing(null);
          }}
        />
        {overflow > 0 && <StatusBanner tone="warning">{plural("publish.proof.overflow", overflow)}</StatusBanner>}
        <div className={styles.gauge} data-forecast={forecast} role="status">
          <span className={styles.gaugeMark} aria-hidden="true">
            {forecast === "expected" ? "✓" : forecast === "ai" ? "!" : ""}
          </span>
          <div>
            <p className={styles.gaugeTitle}>{forecast === "ai" ? t("publish.gauge.ai") : t(forecast === "expected" ? "publish.gauge.expected" : "publish.gauge.short", { n: valid })}</p>
            <p className={styles.gaugeHint}>{t(forecast === "ai" ? "publish.gauge.aiHint" : forecast === "expected" ? "publish.gauge.expectedHint" : "publish.gauge.shortHint")}</p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="publish-ai">
        <SectionLabel n={2} id="publish-ai">
          {t("publish.section.ai")}
        </SectionLabel>
        <Switch name="ai_declared" value="true" checked={draft.aiDeclared} onChange={(event) => onDraft({ aiDeclared: event.target.checked })} disabled={sending} label={t("publish.ai.label")} hint={t("publish.ai.hint")} />
      </section>

      <section className={styles.section} aria-labelledby="publish-settings">
        <SectionLabel n={3} id="publish-settings">
          {t("publish.section.settings")}
        </SectionLabel>
        <div className={styles.settings}>
          <Setting
            name={t("publish.setting.proofs")}
            value={t(draft.visibility === "public" ? "publish.setting.public" : "publish.setting.reviewers")}
            open={opened === "proofs"}
            onToggle={() => setOpened(opened === "proofs" ? null : "proofs")}
          >
            <fieldset className={styles.options} disabled={sending}>
              <legend className="visually-hidden">{t("publish.visibility")}</legend>
              {(["reviewers", "public"] as const satisfies readonly ProofVisibility[]).map((value) => (
                <label key={value} className={styles.option}>
                  <input type="radio" name="proof_visibility" value={value} checked={draft.visibility === value} onChange={() => onDraft({ visibility: value })} />
                  <span className={styles.optionLabel}>{t(value === "public" ? "publish.public" : "publish.reviewers")}</span>
                  <span className={styles.optionHint}>{t(value === "public" ? "publish.setting.publicHint" : "publish.setting.reviewersHint")}</span>
                </label>
              ))}
            </fieldset>
          </Setting>
          <Setting name={t("publish.exposition")} value={expositionValue} open={expositionOpen} onToggle={() => setOpened(expositionOpen ? null : "exposition")}>
            <fieldset className={styles.options} disabled={sending}>
              <legend className="visually-hidden">{t("publish.exposition")}</legend>
              <label className={styles.option}>
                <input type="radio" name="exposition" value={NO_EXPOSITION} checked={draft.exposition === NO_EXPOSITION} onChange={() => onDraft({ exposition: NO_EXPOSITION })} />
                <span className={styles.optionLabel}>{t("publish.noExposition")}</span>
              </label>
              {expositions.map((e) => (
                <label key={e.id} className={styles.option}>
                  <input type="radio" name="exposition" value={e.id} checked={draft.exposition === e.id} onChange={() => onDraft({ exposition: e.id })} />
                  <span className={styles.optionLabel}>{e.title}</span>
                </label>
              ))}
              <label className={styles.option}>
                <input type="radio" name="exposition" value={NEW_EXPOSITION} checked={draft.exposition === NEW_EXPOSITION} onChange={() => onDraft({ exposition: NEW_EXPOSITION })} />
                <span className={styles.optionLabel}>{t("publish.newExposition")}</span>
              </label>
            </fieldset>
            {draft.exposition === NEW_EXPOSITION && (
              <div className={styles.newExposition}>
                <UnderlinedField
                  name="expo_title"
                  label={t("publish.expositionTitle")}
                  error={missingExpositionTitle ? t("publish.exposition.titleError") : undefined}
                  value={draft.expositionTitle}
                  onChange={(event) => onDraft({ expositionTitle: event.target.value })}
                  maxLength={EXPOSITION_TITLE_MAX}
                  required
                  disabled={sending}
                  autoComplete="off"
                />
                <UnderlinedField
                  as="textarea"
                  name="expo_description"
                  label={t("publish.exposition.description")}
                  value={draft.expositionDescription}
                  onChange={(event) => onDraft({ expositionDescription: event.target.value })}
                  maxLength={EXPOSITION_DESCRIPTION_MAX}
                  rows={2}
                  disabled={sending}
                />
                <p className={styles.quiet}>{t("publish.exposition.note")}</p>
              </div>
            )}
          </Setting>
        </div>
      </section>

      <div className={styles.actions}>
        <p className={cx(styles.note, styles.warning)}>
          <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.5v4.2M8 11.2v.3" />
          </svg>
          <span>{t("publish.final")}</span>
        </p>
        <div className={styles.buttons}>
          <Button variant="ghost" onClick={onBack} disabled={sending}>
            <IconBack size={14} strokeWidth={1.6} className={styles.backIcon} />
            {t("publish.back")}
          </Button>
          <Button type="submit" withArrow loading={sending} disabled={blocked}>
            {sending ? t("publish.publishing") : t("publish.submit")}
          </Button>
        </div>
      </div>

      {/* Under the button: the reason of a refusal, with everything typed still above it. */}
      <div className={styles.under}>{failure !== undefined && <StatusBanner tone="error">{publishErrorText(failure, t)}</StatusBanner>}</div>
    </form>
  );
}
