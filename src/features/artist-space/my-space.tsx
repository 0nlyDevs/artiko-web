"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, listCategories, unwrap, withToken, type Category, type Me } from "@/lib/api";
import { clearApiToken, getApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { ProfileForm } from "@/features/artist-space/profile-form";
import { PublishForm } from "@/features/artist-space/publish-form";

export function MySpace() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const token = await getApiToken();
        const [profile, list] = await Promise.all([getMe(withToken(token)), listCategories()]);
        setMe(unwrap(profile));
        setCategories(unwrap(list));
      } catch {
        setError("Your space could not load. Check your connection, then reload the page.");
      }
    })();
  }, [session]);

  if (isPending) return <p>Loading your space.</p>;
  if (!session)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-7xl">My space</h1>
        <p className="max-w-2xl text-xl">
          Sign in to vote for the month&apos;s best works, or to open your own museum and publish your work with its
          proof of process.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-in" className="bg-ink px-5 py-3 font-bold text-paper">Sign in</Link>
          <Link href="/sign-up" className="border-2 border-ink px-5 py-3 font-bold">Create an account</Link>
        </div>
      </div>
    );
  if (error) return <p role="alert" className="border-l-4 border-red pl-3">{error}</p>;
  if (!me) return <p>Loading your space.</p>;

  async function signOut() {
    await authClient.signOut();
    clearApiToken();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-7xl">{me.name ?? me.email ?? "My space"}</h1>
        <button type="button" onClick={signOut} className="underline underline-offset-4">Sign out</button>
      </div>
      <ProfileForm artist={me.artist} onSaved={(artist) => setMe({ ...me, artist })} />
      {me.artist ? (
        <PublishForm artistId={me.artist.id} categories={categories} />
      ) : (
        <p>
          Once your profile is saved you can publish works.{" "}
          <Link href="/explore" className="underline underline-offset-4">Explore other museums</Link> meanwhile.
        </p>
      )}
    </div>
  );
}
