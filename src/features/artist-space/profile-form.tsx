"use client";

import { useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, unwrap, upsertMyArtist, type Artist } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";

export function ProfileForm({ artist, onSaved }: { artist: Artist | null; onSaved: (artist: Artist) => void }) {
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
      className="flex max-w-xl flex-col gap-5"
    >
      <p className="leading-relaxed">{t("profile.intro")}</p>
      <div className="flex flex-col gap-2">
        <label htmlFor="display_name" className="font-semibold">{t("profile.name")}</label>
        <input id="display_name" name="display_name" required maxLength={100} defaultValue={artist?.display_name} className="input" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="region" className="font-semibold">{t("profile.region")}</label>
        <input id="region" name="region" maxLength={100} defaultValue={artist?.region} className="input" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="bio" className="font-semibold">{t("profile.bio")}</label>
        <textarea id="bio" name="bio" rows={4} maxLength={2000} defaultValue={artist?.bio} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-ink self-start">
        {pending && <span className="spin" aria-hidden="true" />}
        {artist ? t("profile.saveEdit") : t("profile.saveNew")}
      </button>
      {status && (
        <p role="status" className={status === "saved" ? "font-semibold" : "text-[#8E3524]"}>
          {status instanceof ApiError ? apiErrorText(status, t) : t(status === "saved" ? "profile.saved" : "profile.failed")}
        </p>
      )}
    </form>
  );
}
