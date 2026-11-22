"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/locale";
import { ApiError } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { clearApiToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/lib/ui/avatar";
import { HeartFilled } from "@/lib/ui/icons";
import { SlidingTabs } from "@/lib/ui/sliding-tabs";
import { CategoryLabel } from "@/lib/works/category-label";
import { WorkMedia } from "@/lib/works/work-tile";
import { loadSpace, type Space } from "@/features/artist-space/load-space";
import { ProfileForm } from "@/features/artist-space/profile-form";
import { PublishForm } from "@/features/artist-space/publish-form";
import { MY_SPACE_VERIFIED_CALLBACK_URL, mySpaceVerificationNotice } from "@/features/auth/verification";
import { VerificationNotice } from "@/features/auth/verification-notice";

type Tab = "works" | "publish" | "votes" | "profile";

export function MySpace() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, plural, rich } = useT();
  const { data: session, isPending } = authClient.useSession();
  const [space, setSpace] = useState<Space | null>(null);
  // An ApiError says why the space did not load, `email_not_verified` for a session opened before email
  // verification was required: the API refuses its token. "error" is any other failure.
  const [failed, setFailed] = useState<false | "error" | ApiError>(false);
  const [picked, setPicked] = useState<Tab | null>(null);
  const [resent, setResent] = useState(false);
  const notice = mySpaceVerificationNotice(params, Boolean(session));

  useEffect(() => {
    if (!session) return;
    loadSpace().then(
      (loaded) => {
        setFailed(false);
        setSpace(loaded);
      },
      (e) => setFailed(e instanceof ApiError ? e : "error"),
    );
  }, [session]);

  async function signOut() {
    await authClient.signOut();
    clearApiToken();
    router.push("/");
  }

  if (isPending || (session && !space && !failed)) return <SpaceSkeleton />;
  if (!session)
    return (
      <div className="rise mx-auto flex max-w-2xl flex-col items-start gap-5 py-8">
        <h1 className="text-[40px] leading-none font-extrabold tracking-[-0.04em]">{t("space.title")}</h1>
        {notice && <VerificationNotice notice={notice} />}
        <p className="text-lg leading-relaxed">{t("space.intro")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-in" className="btn btn-ink">{t("space.signIn")}</Link>
          <Link href="/sign-up" className="btn btn-soft">{t("space.signUp")}</Link>
        </div>
      </div>
    );
  if (failed || !space)
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-8">
        <p role="alert" className="rounded-md bg-[#FBE9E3] p-4 text-[#8E3524]">
          {failed instanceof ApiError ? apiErrorText(failed, t, "space") : t("space.error")}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {failed instanceof ApiError && failed.code === "email_not_verified" && (
            <button
              type="button"
              disabled={resent}
              onClick={async () => {
                const { error } = await authClient.sendVerificationEmail({ email: session.user.email, callbackURL: MY_SPACE_VERIFIED_CALLBACK_URL });
                if (!error) setResent(true);
              }}
              className="btn btn-ink"
            >
              {resent ? t("auth.resent") : t("auth.resend")}
            </button>
          )}
          <button type="button" onClick={signOut} className="btn btn-soft">
            {t("space.signOut")}
          </button>
        </div>
      </div>
    );

  const { me, works, expositions, votes } = space;
  const artist = me.artist;
  const tabs: { key: Tab; label: string }[] = artist
    ? [
        { key: "works", label: t("space.tabWorks") },
        { key: "publish", label: t("nav.publish") },
        { key: "votes", label: t("space.tabVotes") },
        { key: "profile", label: t("space.tabProfile") },
      ]
    : [
        { key: "profile", label: t("profile.titleNew") },
        { key: "votes", label: t("space.tabVotes") },
      ];
  const asked = params.get("tab") as Tab | null;
  const tab = picked ?? (tabs.some((x) => x.key === asked) ? (asked as Tab) : tabs[0].key);
  const name = me.name ?? me.email ?? t("space.title");

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col">
      <header className="rise flex flex-wrap items-center gap-x-10 gap-y-5">
        <Avatar name={name} size={112} tone="ink" />
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.04em]">{artist?.display_name ?? name}</h1>
            {artist && (
              <Link href={`/artists/${artist.id}`} className="btn btn-soft min-h-11">
                {t("profile.visit")}
              </Link>
            )}
            <button type="button" onClick={signOut} className="btn min-h-11 bg-transparent text-muted hover:text-ink">
              {t("space.signOut")}
            </button>
          </div>
          {artist && (
            <p className="flex flex-wrap gap-x-7 gap-y-1">
              <span>{plural("works", works.length)}</span>
              <span>{plural("received", works.reduce((n, w) => n + w.votes, 0))}</span>
              <span>{plural("expositions", expositions.length)}</span>
            </p>
          )}
          {artist?.bio && <p className="font-serif text-xl italic">{artist.bio}</p>}
        </div>
      </header>

      <div className="mt-9">
        <SlidingTabs id="space" label={t("space.title")} tabs={tabs} value={tab} onChange={setPicked} />
      </div>

      <div id="space-panel" role="tabpanel" aria-labelledby={`space-tab-${tab}`} key={tab} className="rise pt-7">
        {tab === "works" &&
          (works.length ? (
            <div className="grid grid-cols-3 gap-1">
              {works.map((w) => (
                <Link key={w.id} href={`/works/${w.id}`} className="tile group relative block aspect-[4/5] overflow-hidden bg-surface">
                  <span className="tile-media absolute inset-0">
                    <WorkMedia work={w} sizes="(min-width: 1024px) 340px, 33vw" />
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-ink/35 font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <HeartFilled size={20} />
                    {w.votes}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-md bg-surface px-6 py-14 text-center">
              <p className="text-lg font-bold">{t("space.noWorks")}</p>
              <button type="button" onClick={() => setPicked("publish")} className="btn btn-ink">
                {t("explore.publish")}
              </button>
            </div>
          ))}

        {tab === "publish" && artist && (
          <PublishForm
            categories={space.categories}
            expositions={expositions}
            onPublished={(work, exposition) =>
              setSpace({ ...space, works: [work, ...works], expositions: exposition ? [exposition, ...expositions] : expositions })
            }
          />
        )}

        {tab === "votes" && (
          <div className="flex max-w-2xl flex-col gap-4">
            <p>{t("space.votesIntro")}</p>
            <ul className="flex flex-col gap-1">
              {space.categories.map((c) => {
                const vote = votes.find((v) => v.category === c.id);
                return (
                  <li key={c.id} className={`flex min-h-16 items-center gap-4 rounded-md px-3.5 py-2.5 ${vote ? "bg-surface" : ""}`}>
                    <span className="w-28 shrink-0 font-bold sm:w-36"><CategoryLabel category={c} /></span>
                    {vote?.work ? (
                      <Link href={`/works/${vote.work.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                        {vote.work.media_kind === "image" && (
                          <span className="relative block size-11 shrink-0 overflow-hidden rounded">
                            <Image src={vote.work.media_url} alt="" fill sizes="44px" className="object-cover" />
                          </span>
                        )}
                        <span className="truncate">
                          {vote.work.title}, {vote.work.artist_name}
                        </span>
                        <HeartFilled size={20} className="ml-auto shrink-0 text-red" />
                      </Link>
                    ) : (
                      <Link href={`/explore?category=${c.id}`} className="text-muted underline underline-offset-4">
                        {t("space.noVote")}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {tab === "profile" && (
          <ProfileForm
            artist={artist}
            onSaved={(saved) => {
              setSpace({ ...space, me: { ...me, artist: saved } });
              if (!artist) setPicked("publish");
            }}
          />
        )}
        {tab === "profile" && !artist && (
          <p className="mt-6 text-muted">
            {rich("space.noProfile", { link: (text) => <Link href="/explore" className="underline underline-offset-4">{text}</Link> })}
          </p>
        )}
      </div>
    </div>
  );
}

function SpaceSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto flex max-w-[1080px] flex-col gap-9">
      <div className="flex items-center gap-8">
        <div className="skel size-28 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="skel h-8 w-1/2" />
          <div className="skel h-4 w-1/3" />
        </div>
      </div>
      <div className="skel h-12" />
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skel aspect-[4/5] rounded-none" />
        ))}
      </div>
    </div>
  );
}
