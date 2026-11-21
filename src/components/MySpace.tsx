"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, type Artist, type Category, type Me, type Work, api } from "@/lib/api";
import { authedApi, clearToken } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

const field = "w-full border-2 border-ink bg-ground px-3 py-2";

export function MySpace() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | "signed-out">(null);

  useEffect(() => {
    authedApi<Me>("/me")
      .then(setMe)
      .catch((e) => setMe(e instanceof ApiError && e.status === 401 ? "signed-out" : null));
  }, []);

  if (me === "signed-out")
    return (
      <p>
        <Link href="/sign-in" className="font-bold underline underline-offset-4">Sign in</Link> to see your space.
      </p>
    );
  if (!me) return <p>Loading your space.</p>;

  async function signOut() {
    await authClient.signOut();
    clearToken();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-5xl font-extrabold tracking-tighter">{me.name ?? me.email}</h1>
        <button type="button" onClick={signOut} className="underline underline-offset-4">
          Sign out
        </button>
      </div>
      <Profile artist={me.artist} onSaved={(artist) => setMe({ ...me, artist })} />
      {me.artist && <Publish artist={me.artist} />}
    </div>
  );
}

function Profile({ artist, onSaved }: { artist: Artist | null; onSaved: (a: Artist) => void }) {
  const [status, setStatus] = useState<string | null>(null);

  async function save(form: FormData) {
    try {
      const saved = await authedApi<Artist>("/me/artist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: form.get("display_name"),
          bio: form.get("bio"),
          region: form.get("region"),
        }),
      });
      onSaved(saved);
      setStatus("Profile saved.");
    } catch (e) {
      setStatus(e instanceof ApiError ? e.message : "The profile was not saved. Try again.");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-3xl font-extrabold tracking-tight">{artist ? "Your artist profile" : "Become an artist"}</h2>
      {!artist && <p className="max-w-2xl">Your profile opens your own museum, where people visit and vote for your works.</p>}
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
        <button type="submit" className="self-start bg-ink px-5 py-3 font-bold text-ground">
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

function Publish({ artist }: { artist: Artist }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [state, setState] = useState<"idle" | "publishing" | Work | { error: string }>("idle");

  useEffect(() => {
    api<Category[]>("/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  async function publish(form: FormData) {
    setState("publishing");
    try {
      setState(await authedApi<Work>("/works", { method: "POST", body: form }));
    } catch (e) {
      setState({ error: e instanceof ApiError ? e.message : "The work was not published. Try again." });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-3xl font-extrabold tracking-tight">Publish a work</h2>
      <p className="max-w-2xl">
        Add 2 to 5 proof files of how you made it (sketches, progress photos, a timelapse, stems). With proof,
        the work gets the human-made seal and enters this month&apos;s vote.
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
          <input id="file" name="file" type="file" required aria-describedby="file-help"
            accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,.glb" />
          <p id="file-help">Image, sound, video or 3D model (.glb), up to 20 MB.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="proof" className="font-bold">Proof of process</label>
          <input id="proof" name="proof" type="file" multiple aria-describedby="proof-help"
            accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm" />
          <p id="proof-help">2 to 5 files, up to 20 MB each.</p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ai_declared" value="true" />
          AI tools helped make this work (it is labelled and does not enter the vote)
        </label>
        <button type="submit" disabled={state === "publishing"} className="self-start bg-ink px-5 py-3 font-bold text-ground disabled:opacity-60">
          {state === "publishing" ? "Publishing" : "Publish"}
        </button>
        {typeof state === "object" && "error" in state && <p role="alert" className="text-red">{state.error}</p>}
        {typeof state === "object" && "id" in state && (
          <p role="status">
            Published{state.human_proven ? " with the human-made seal" : ""}.{" "}
            <Link href={`/artists/${artist.id}`} className="underline underline-offset-4">See it in your museum</Link>
          </p>
        )}
      </form>
    </section>
  );
}
