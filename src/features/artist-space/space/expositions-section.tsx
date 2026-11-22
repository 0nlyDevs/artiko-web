"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { intlLocale } from "@/i18n/locales";
import { ApiError, createExposition, unwrap, type Exposition } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";
import { Button, StatusBanner, UnderlinedField } from "@/lib/ui/kanto";
import { EXPOSITION_DESCRIPTION_MAX, EXPOSITION_TITLE_MAX, expositionBody, SECTION_ID } from "./space-logic";
import styles from "./space.module.css";

const FORM_ID = "space-new-exposition";

/** A new, empty exposition: a title and an optional description, which is all the API takes. A work joins one when it is published. */
function NewExpositionForm({ onCreated, onCancel }: { onCreated: (exposition: Exposition) => void; onCancel: () => void }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  // A field that breaks the contract, an API error (translated on render), or "failed" for anything else.
  const [problem, setProblem] = useState<"title" | "description" | "failed" | ApiError | null>(null);

  function create(form: FormData) {
    const checked = expositionBody({ title: String(form.get("title") ?? ""), description: String(form.get("description") ?? "") });
    if ("invalid" in checked) return setProblem(checked.invalid);
    setProblem(null);
    startTransition(async () => {
      try {
        onCreated(await callWithToken((auth) => createExposition({ body: checked.body, ...auth }).then(unwrap)));
      } catch (e) {
        setProblem(e instanceof ApiError ? e : "failed");
      }
    });
  }

  return (
    <form
      id={FORM_ID}
      aria-label={t("space.expo.new")}
      noValidate
      onSubmit={(event) => {
        // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
        event.preventDefault();
        create(new FormData(event.currentTarget));
      }}
      className={`${styles.form} ${styles.panel}`}
    >
      <UnderlinedField
        label={t("publish.expositionTitle")}
        name="title"
        autoFocus
        required
        maxLength={EXPOSITION_TITLE_MAX}
        autoComplete="off"
        error={problem === "title" ? t("space.expo.titleError") : undefined}
      />
      <UnderlinedField
        as="textarea"
        label={t("space.expo.description")}
        name="description"
        rows={3}
        maxLength={EXPOSITION_DESCRIPTION_MAX}
        hint={t("space.expo.hint")}
        error={problem === "description" ? t("space.expo.descriptionError") : undefined}
      />
      <div className={styles.formActions}>
        <Button type="submit" loading={pending}>
          {t("space.expo.create")}
        </Button>
        <button type="button" onClick={onCancel} className={styles.textLink}>
          {t("space.expo.cancel")}
        </button>
      </div>
      {(problem === "failed" || problem instanceof ApiError) && (
        <StatusBanner tone="error">{problem instanceof ApiError ? apiErrorText(problem, t) : t("space.expo.failed")}</StatusBanner>
      )}
    </form>
  );
}

/** My expositions, newest first, each with its number of works, its date and a link to its page; and the way to open a new one. */
export function ExpositionsSection({ expositions, onCreated }: { expositions: Exposition[]; onCreated: (exposition: Exposition) => void }) {
  const { t, plural, locale } = useT();
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState(false);
  const day = (iso: string) => new Date(iso).toLocaleDateString(intlLocale(locale), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <section id={SECTION_ID.expositions} aria-labelledby="space-expositions-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 id="space-expositions-title" className={styles.sectionLabel}>
          {/* The API gives an artist's expositions in one answer: the list is whole, so it is counted. */}
          {t("space.expositions")} · {expositions.length}
        </h2>
        <button
          type="button"
          className={styles.headLink}
          aria-expanded={adding}
          aria-controls={FORM_ID}
          onClick={() => {
            setAdding(!adding);
            setCreated(false);
          }}
        >
          <span aria-hidden="true">+&nbsp;</span>
          {t("space.expo.new")}
        </button>
      </div>
      {adding && (
        <NewExpositionForm
          onCancel={() => setAdding(false)}
          onCreated={(exposition) => {
            onCreated(exposition);
            setAdding(false);
            setCreated(true);
          }}
        />
      )}
      {created && <StatusBanner tone="success">{t("space.expo.created")}</StatusBanner>}
      {expositions.length ? (
        <ul aria-labelledby="space-expositions-title" className={styles.list}>
          {expositions.map((exposition) => (
            <li key={exposition.id} className={styles.line}>
              <span className={styles.lineTitle}>{exposition.title}</span>
              <span className={styles.lineMeta}>{t("space.expo.meta", { works: plural("works", exposition.works_count), date: day(exposition.created_at) })}</span>
              <Link href={`/expositions/${exposition.id}`} className={styles.lineLink}>
                {t("kit.view")}
                <span className="visually-hidden">, {exposition.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.empty}>
          <p>{t("space.expo.empty")}</p>
        </div>
      )}
    </section>
  );
}
