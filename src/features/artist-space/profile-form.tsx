"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ApiError, unwrap, upsertMyArtist, withToken, type Artist } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";

export const field = "w-full border-2 border-ink bg-paper px-3 py-2";

export function ProfileForm({ artist, onSaved }: { artist: Artist | null; onSaved: (artist: Artist) => void }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const save = (form: FormData) =>
    startTransition(async () => {
      try {
        const body = {
          display_name: String(form.get("display_name") ?? ""),
          bio: String(form.get("bio") ?? ""),
          region: String(form.get("region") ?? ""),
        };
        onSaved(unwrap(await upsertMyArtist({ body, ...withToken(await getApiToken()) })));
        setStatus("Profile saved.");
      } catch (e) {
        setStatus(e instanceof ApiError ? e.message : "The profile was not saved. Try again.");
      }
    });

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-5xl">{artist ? "Your artist profile" : "Become an artist"}</h2>
      {!artist && (
        <p className="max-w-2xl">Your profile opens your own museum, where people visit and vote for your works.</p>
      )}
      <form action={save} className="flex max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="display_name" className="font-bold">Name shown on your museum</label>
          <input id="display_name" name="display_name" required maxLength={100} defaultValue={artist?.display_name} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="region" className="font-bold">Region</label>
          <input id="region" name="region" maxLength={100} defaultValue={artist?.region} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className="font-bold">About your work</label>
          <textarea id="bio" name="bio" rows={3} maxLength={2000} defaultValue={artist?.bio} className={field} />
        </div>
        <button type="submit" disabled={pending} className="self-start bg-ink px-5 py-3 font-bold text-paper disabled:opacity-60">
          {artist ? "Save changes" : "Open my museum"}
        </button>
        {status && <p role="status">{status}</p>}
        {artist && (
          <Link href={`/artists/${artist.id}`} className="underline underline-offset-4">Visit my museum</Link>
        )}
      </form>
    </section>
  );
}
