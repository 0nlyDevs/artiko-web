"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import type { Key } from "@/i18n/en";
import { useT } from "@/i18n/locale";
import { ApiError, type Exposition } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { Button, ButtonLink, StatusBanner } from "@/lib/ui/kanto";
import type { Space } from "@/features/artist-space/load-space";
import { ProfileForm } from "@/features/artist-space/profile-form";
import { VerificationNotice } from "@/features/auth/verification-notice";
import { ExpositionsSection } from "./expositions-section";
import { SECTION_ID, type SpaceTab } from "./space-logic";
import { VotesSection } from "./votes-section";
import { WorksSection } from "./works-section";
import styles from "./space.module.css";

/** Names longer than this take the smaller headline. */
const LONG_NAME = 12;

/** « Tongasoa, » then the name in the accent colour; the greeting alone when the account has no name. */
function Welcome({ name }: { name: string | null }) {
  const { t } = useT();
  if (!name)
    return (
      <h1 id="space-title" className={styles.headline}>
        {t("space.welcome")}.
      </h1>
    );
  return (
    <h1 id="space-title" className={styles.headline} data-long={name.length > LONG_NAME ? "" : undefined}>
      <span>{t("space.welcome")},</span> <span className={styles.accent}>{name}.</span>
    </h1>
  );
}

/** Someone who is not signed in: what the space is for, and the two doors of the account. */
export function SignedOut({ notice }: { notice: Key | null }) {
  const { t } = useT();
  return (
    <div className={`rise ${styles.narrow}`}>
      <h1 className={styles.headline}>{t("space.title")}</h1>
      {notice && <VerificationNotice notice={notice} />}
      <p className={styles.formIntro}>{t("space.intro")}</p>
      <div className={styles.actions}>
        <ButtonLink href="/sign-in">{t("space.signIn")}</ButtonLink>
        <ButtonLink href="/sign-up" variant="secondary">
          {t("space.signUp")}
        </ButtonLink>
      </div>
    </div>
  );
}

/** The page while the session or the space is being read. */
export function SpaceSkeleton() {
  return (
    <div aria-busy="true" className={styles.skeleton}>
      <div>
        <div className="skel h-3 w-40" />
        <div className="skel h-16 w-3/4" />
        <div className="skel h-16 w-1/2" />
        <div className="skel h-4 w-2/3" />
        <div className="skel h-[52px] w-56" />
      </div>
      <div>
        <div className="skel h-3 w-32" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skel h-[62px]" />
        ))}
      </div>
    </div>
  );
}

/**
 * The space did not load. An ApiError says why: `email_not_verified` for a session opened before the address was
 * confirmed (the API refuses its token), a refused token, or no answer; null is any other failure. Always a way to
 * try again and a way out.
 */
export function SpaceFailure({
  error,
  signOutFailed,
  resent,
  onResend,
  onRetry,
  onSignOut,
}: {
  error: ApiError | null;
  signOutFailed: boolean;
  resent: boolean;
  onResend: () => void;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  const { t } = useT();
  return (
    <div className={styles.narrow}>
      <h1 className={styles.headline}>{t("space.title")}</h1>
      <StatusBanner tone="error">{error ? apiErrorText(error, t, "space") : t("space.error")}</StatusBanner>
      <div className={styles.actions}>
        {error?.code === "email_not_verified" && (
          <Button onClick={onResend} disabled={resent}>
            {resent ? t("auth.resent") : t("auth.resend")}
          </Button>
        )}
        <Button variant={error?.code === "email_not_verified" ? "secondary" : "primary"} onClick={onRetry}>
          {t("error.retry")}
        </Button>
        <Button variant="secondary" onClick={onSignOut}>
          {t("space.signOut")}
        </Button>
      </div>
      {signOutFailed && <StatusBanner tone="error">{t("space.signOutFailed")}</StatusBanner>}
    </div>
  );
}

/**
 * My space on one page (frame R11). On the left the profile, read or edited in place, the way to publish, the way
 * to the artist's room and the sign-out; on the right my works, my expositions and my votes of the month. Without
 * an artist profile the page shows the invitation to open one, and the votes. `tab` is the section the address
 * asks for: the page scrolls to it, and « profile » opens the edition.
 */
export function SpaceDashboard({
  space,
  tab,
  signOutFailed,
  onSignOut,
  onProfileSaved,
  onExpositionCreated,
}: {
  space: Space;
  tab: SpaceTab | null;
  signOutFailed: boolean;
  onSignOut: () => void;
  onProfileSaved: (artist: NonNullable<Space["me"]["artist"]>) => void;
  onExpositionCreated: (exposition: Exposition) => void;
}) {
  const { t, rich } = useT();
  const { me, works, expositions, votes } = space;
  const artist = me.artist;
  const editing = tab === "profile";

  useEffect(() => {
    if (tab === null || tab === "publish") return;
    document.getElementById(SECTION_ID[tab])?.scrollIntoView({ block: "start" });
  }, [tab]);

  // The account's own name beside the artist's when they differ, then the region; the address when there is no name at all.
  const shown = artist?.display_name ?? me.name;
  const identity = [me.name && me.name !== shown ? me.name : null, artist?.region, shown ? null : me.email].filter(Boolean).join(" · ");

  let profile: ReactNode;
  if (!artist)
    profile = (
      <>
        <h2 className={styles.invite}>{t("profile.titleNew")}</h2>
        <ProfileForm artist={null} onSaved={onProfileSaved} />
        <p className={styles.note}>{rich("space.noProfile", { link: (text) => <Link href="/explore">{text}</Link> })}</p>
      </>
    );
  else if (editing) profile = <ProfileForm artist={artist} onSaved={onProfileSaved} closeHref="/me" />;
  else
    profile = (
      <>
        {identity && <p className={styles.identity}>{identity}</p>}
        {artist.bio && <p className={styles.bio}>{artist.bio}</p>}
        <Link href="/me?tab=profile" scroll={false} className={styles.textLink}>
          {t("space.editProfile")}
        </Link>
      </>
    );

  return (
    <div className={styles.page}>
      <section id={SECTION_ID.profile} aria-labelledby="space-title" className={`rise ${styles.profile}`}>
        <p className={styles.eyebrow}>
          {t("nav.mySpace")}
          {artist && ` · ${t("space.artist")}`}
        </p>
        <Welcome name={shown} />
        {!artist && identity && <p className={styles.identity}>{identity}</p>}
        {profile}
        {artist && (
          <div className={styles.actions}>
            <ButtonLink href="/me?tab=publish">{t("explore.publish")}</ButtonLink>
            <ButtonLink href={`/artists/${artist.id}/museum`} variant="secondary">
              {t("space.viewRoom")}
            </ButtonLink>
          </div>
        )}
        <button type="button" onClick={onSignOut} className={styles.quietLink}>
          {t("space.signOut")}
        </button>
        {signOutFailed && <StatusBanner tone="error">{t("space.signOutFailed")}</StatusBanner>}
      </section>

      <div className={styles.sections}>
        {artist && <WorksSection works={works} complete={space.worksComplete} categories={space.categories} month={space.month} artistId={artist.id} />}
        {artist && <ExpositionsSection expositions={expositions} onCreated={onExpositionCreated} />}
        <VotesSection categories={space.categories} votes={votes} month={space.month} />
      </div>
    </div>
  );
}
