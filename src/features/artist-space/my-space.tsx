"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/locale";
import { getMe, listCategories, unwrap, withToken, type Category, type Me } from "@/lib/api";
import { clearApiToken, getApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { ProfileForm } from "@/features/artist-space/profile-form";
import { PublishForm } from "@/features/artist-space/publish-form";

export function MySpace() {
  const router = useRouter();
  const { t, rich } = useT();
  const { data: session, isPending } = authClient.useSession();
  const [me, setMe] = useState<Me | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const token = await getApiToken();
        const [profile, list] = await Promise.all([getMe(withToken(token)), listCategories()]);
        setMe(unwrap(profile));
        setCategories(unwrap(list));
      } catch {
        setFailed(true);
      }
    })();
  }, [session]);

  if (isPending) return <p>{t("space.loading")}</p>;
  if (!session)
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-7xl">{t("space.title")}</h1>
        <p className="max-w-2xl text-xl">{t("space.intro")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-in" className="bg-ink px-5 py-3 font-bold text-paper">{t("space.signIn")}</Link>
          <Link href="/sign-up" className="border-2 border-ink px-5 py-3 font-bold">{t("space.signUp")}</Link>
        </div>
      </div>
    );
  if (failed) return <p role="alert" className="border-l-4 border-red pl-3">{t("space.error")}</p>;
  if (!me) return <p>{t("space.loading")}</p>;

  async function signOut() {
    await authClient.signOut();
    clearApiToken();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-7xl">{me.name ?? me.email ?? t("space.title")}</h1>
        <button type="button" onClick={signOut} className="underline underline-offset-4">{t("space.signOut")}</button>
      </div>
      <ProfileForm artist={me.artist} onSaved={(artist) => setMe({ ...me, artist })} />
      {me.artist ? (
        <PublishForm artistId={me.artist.id} categories={categories} />
      ) : (
        <p>
          {rich("space.noProfile", {
            link: (text) => (
              <Link href="/explore" className="underline underline-offset-4">{text}</Link>
            ),
          })}
        </p>
      )}
    </div>
  );
}
