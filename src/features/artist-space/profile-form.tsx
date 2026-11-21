"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, unwrap, upsertMyArtist, withToken, type Artist } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";

export const field = "w-full border-2 border-ink bg-paper px-3 py-2";

export function ProfileForm({ artist, onSaved }: { artist: Artist | null; onSaved: (artist: Artist) => void }) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();
  // "saved" and "failed" are translated on render; an API error keeps its own message.
  const [status, setStatus] = useState<"saved" | "failed" | { message: string } | null>(null);

  const save = (form: FormData) =>
    startTransition(async () => {
      try {
        const body = {
          display_name: String(form.get("display_name") ?? ""),
          bio: String(form.get("bio") ?? ""),
          region: String(form.get("region") ?? ""),
        };
        onSaved(unwrap(await upsertMyArtist({ body, ...withToken(await getApiToken()) })));
        setStatus("saved");
      } catch (e) {
        setStatus(e instanceof ApiError ? { message: e.message } : "failed");
      }
    });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-5xl">{artist ? t("profile.titleEdit") : t("profile.titleNew")}</h2>
      {!artist && <p className="max-w-2xl">{t("profile.intro")}</p>}
      <form action={save} className="flex max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="display_name" className="font-bold">{t("profile.name")}</label>
          <input id="display_name" name="display_name" required maxLength={100} defaultValue={artist?.display_name} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="region" className="font-bold">{t("profile.region")}</label>
          <input id="region" name="region" maxLength={100} defaultValue={artist?.region} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className="font-bold">{t("profile.bio")}</label>
          <textarea id="bio" name="bio" rows={3} maxLength={2000} defaultValue={artist?.bio} className={field} />
        </div>
        <button type="submit" disabled={pending} className="self-start bg-ink px-5 py-3 font-bold text-paper disabled:opacity-60">
          {artist ? t("profile.saveEdit") : t("profile.saveNew")}
        </button>
        {status && <p role="status">{typeof status === "object" ? status.message : t(status === "saved" ? "profile.saved" : "profile.failed")}</p>}
        {artist && (
          <Link href={`/artists/${artist.id}`} className="underline underline-offset-4">{t("profile.visit")}</Link>
        )}
      </form>
    </section>
  );
}
