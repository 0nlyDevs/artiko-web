"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, unwrap, upsertMyArtist, type Artist } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";
import { Button, StatusBanner, UnderlinedField } from "@/lib/ui/kanto";
import styles from "./publish.module.css";

/**
 * The artist profile in two fields, opened in place when the API answers 403 `not_an_artist` to a publication.
 * `PUT /me/artist` replaces the three fields of the profile at each call, so the bio already known is sent back.
 */
export function MiniProfile({ artist, onSaved }: { artist: Artist | null; onSaved: (artist: Artist) => void }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"saved" | "failed" | ApiError | null>(null);

  const save = (form: FormData) =>
    startTransition(async () => {
      try {
        const body = { display_name: String(form.get("display_name") ?? "").trim(), bio: artist?.bio ?? "", region: String(form.get("region") ?? "").trim() };
        const saved = await callWithToken((auth) => upsertMyArtist({ body, ...auth }).then(unwrap));
        setStatus("saved");
        onSaved(saved);
      } catch (e) {
        setStatus(e instanceof ApiError ? e : "failed");
      }
    });

  return (
    <form
      className={styles.profile}
      onSubmit={(event) => {
        // Not `action={...}`: React resets the fields after an action even when it fails.
        event.preventDefault();
        save(new FormData(event.currentTarget));
      }}
    >
      <p className={styles.quiet}>{t("publish.profile.intro")}</p>
      <UnderlinedField name="display_name" label={t("publish.profile.name")} defaultValue={artist?.display_name} maxLength={100} required autoComplete="off" />
      <UnderlinedField name="region" label={t("profile.region")} defaultValue={artist?.region} maxLength={100} autoComplete="off" />
      <Button type="submit" variant="secondary" size="small" loading={pending}>
        {t("publish.profile.save")}
      </Button>
      {status && (
        <StatusBanner tone={status === "saved" ? "success" : "error"}>
          {status instanceof ApiError ? apiErrorText(status, t) : t(status === "saved" ? "publish.profile.saved" : "profile.failed")}
        </StatusBanner>
      )}
    </form>
  );
}
