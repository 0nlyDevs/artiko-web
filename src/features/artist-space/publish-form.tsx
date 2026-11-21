"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiError, createWork, unwrap, withToken, type Category, type CategoryId, type Work } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";
import { field } from "@/features/artist-space/profile-form";

const ACCEPT_WORK = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,.glb";
const ACCEPT_PROOF = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm";

export function PublishForm({ artistId, categories }: { artistId: string; categories: Category[] }) {
  const [state, setState] = useState<"idle" | "publishing" | Work | { error: string }>("idle");

  async function publish(form: FormData) {
    setState("publishing");
    try {
      const body = {
        title: String(form.get("title") ?? ""),
        category: String(form.get("category") ?? "") as CategoryId,
        story: String(form.get("story") ?? ""),
        ai_declared: form.get("ai_declared") === "true",
        file: form.get("file") as File,
        proof: form.getAll("proof").filter((p): p is File => p instanceof File && p.size > 0),
      };
      setState(unwrap(await createWork({ body, ...withToken(await getApiToken()) })));
    } catch (e) {
      setState({ error: e instanceof ApiError ? e.message : "The work was not published. Check your connection and try again." });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-5xl">Publish a work</h2>
      <p className="max-w-2xl">
        Add 2 to 5 proof files of how you made it (sketches, progress photos, a timelapse, stems). With proof, the work
        gets the human-made seal and enters this month&apos;s vote.
      </p>
      <form action={publish} className="flex max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="font-bold">Title</label>
          <input id="title" name="title" required maxLength={200} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="font-bold">Art form</label>
          <select id="category" name="category" required className={field}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="story" className="font-bold">The story of the work, in your own language</label>
          <textarea id="story" name="story" rows={4} maxLength={5000} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="file" className="font-bold">The work</label>
          <input id="file" name="file" type="file" required accept={ACCEPT_WORK} aria-describedby="file-help" />
          <p id="file-help">Image, sound, video or 3D model (.glb), up to 20 MB.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="proof" className="font-bold">Proof of process</label>
          <input id="proof" name="proof" type="file" multiple accept={ACCEPT_PROOF} aria-describedby="proof-help" />
          <p id="proof-help">2 to 5 files, up to 20 MB each.</p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ai_declared" value="true" />
          AI tools helped make this work (it is labelled and does not enter the vote)
        </label>
        <button type="submit" disabled={state === "publishing"} className="self-start bg-ink px-5 py-3 font-bold text-paper disabled:opacity-60">
          {state === "publishing" ? "Publishing" : "Publish"}
        </button>
        {typeof state === "object" && "error" in state && (
          <p role="alert" className="border-l-4 border-red pl-3">{state.error}</p>
        )}
        {typeof state === "object" && "id" in state && (
          <p role="status">
            Published{state.human_proven ? " with the human-made seal" : ""}.{" "}
            <Link href={`/artists/${artistId}`} className="underline underline-offset-4">See it in your museum</Link>
          </p>
        )}
      </form>
    </section>
  );
}
