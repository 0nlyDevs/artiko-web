"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, unwrap, upsertMyArtist, type Artist } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";
import { Button, StatusBanner, UnderlinedField } from "@/lib/ui/kanto";
import styles from "@/features/artist-space/space/space.module.css";

/**
 * The artist profile, created or edited in place: the three fields of `PUT /me/artist`, always sent together.
 * `closeHref` adds the link that leaves the edition (my space gives the address of its reading view).
 */
export function ProfileForm({ artist, onSaved, closeHref }: { artist: Artist | null; onSaved: (artist: Artist) => void; closeHref?: string }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  // "saved", "failed" and an API error (api-messages.ts) are translated on render.
  const [status, setStatus] = useState<"saved" | "failed" | ApiError | null>(null);

  const save = (form: FormData) =>
    startTransition(async () => {
      try {
        const body = {
          display_name: String(form.get("display_name") ?? ""),
          bio: String(form.get("bio") ?? ""),
          region: String(form.get("region") ?? ""),
        };
        onSaved(await callWithToken((auth) => upsertMyArtist({ body, ...auth }).then(unwrap)));
        setStatus("saved");
      } catch (e) {
        setStatus(e instanceof ApiError ? e : "failed");
      }
    });

  return (
    <form
      onSubmit={(event) => {
        // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
        event.preventDefault();
        void save(new FormData(event.currentTarget));
      }}
      className={styles.form}
    >
      <p className={styles.formIntro}>{t("profile.intro")}</p>
      <UnderlinedField id="display_name" name="display_name" label={t("profile.name")} required maxLength={100} defaultValue={artist?.display_name} autoComplete="off" />
      <UnderlinedField id="region" name="region" label={t("profile.region")} maxLength={100} defaultValue={artist?.region} autoComplete="off" />
      <UnderlinedField as="textarea" id="bio" name="bio" label={t("profile.bio")} rows={4} maxLength={2000} defaultValue={artist?.bio} />
      <div className={styles.formActions}>
        <Button type="submit" loading={pending}>
          {artist ? t("profile.saveEdit") : t("profile.saveNew")}
        </Button>
        {closeHref !== undefined && (
          <Link href={closeHref} scroll={false} className={styles.textLink}>
            {t("work.close")}
          </Link>
        )}
      </div>
      {status && (
        <StatusBanner tone={status === "saved" ? "success" : "error"}>
          {status instanceof ApiError ? apiErrorText(status, t) : t(status === "saved" ? "profile.saved" : "profile.failed")}
        </StatusBanner>
      )}
    </form>
  );
}
