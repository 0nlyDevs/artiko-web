"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { loadSpace, type Space } from "@/features/artist-space/load-space";
import { PublishForm } from "@/features/artist-space/publish-form";
import { signOutOfSpace } from "@/features/artist-space/space/sign-out";
import { resolveTab, withPublished } from "@/features/artist-space/space/space-logic";
import { SignedOut, SpaceDashboard, SpaceFailure, SpaceSkeleton } from "@/features/artist-space/space/space-view";
import { MY_SPACE_VERIFIED_CALLBACK_URL, mySpaceVerificationNotice } from "@/features/auth/verification";

/**
 * My space, `/me`. One page (frame R11) whose sections were tabs: `?tab=works`, `votes` and `profile` scroll to
 * their section (`profile` opens the edition in place) and `?tab=publish` gives the page to the publication form.
 */
export function MySpace() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [space, setSpace] = useState<Space | null>(null);
  // An ApiError says why the space did not load, `email_not_verified` for a session opened before email
  // verification was required: the API refuses its token. "error" is any other failure.
  const [failed, setFailed] = useState<false | "error" | ApiError>(false);
  const [attempt, setAttempt] = useState(0);
  const [resent, setResent] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  // The publication form stays mounted once opened, so a visit to another section keeps what was typed and
  // chosen. After a publication it starts afresh the next time it is left: `run` is its key.
  const [publication, setPublication] = useState({ opened: false, published: false, run: 0 });
  const notice = mySpaceVerificationNotice(params, Boolean(session));

  useEffect(() => {
    if (!session) return;
    let current = true;
    loadSpace().then(
      (loaded) => {
        if (!current) return;
        setFailed(false);
        setSpace(loaded);
      },
      (e) => current && setFailed(e instanceof ApiError ? e : "error"),
    );
    return () => {
      current = false;
    };
  }, [session, attempt]);

  async function signOut() {
    setSignOutFailed(false);
    if (await signOutOfSpace()) router.push("/");
    else setSignOutFailed(true);
  }

  if (isPending || (session && !space && !failed)) return <SpaceSkeleton />;
  if (!session) return <SignedOut notice={notice} />;
  if (failed || !space)
    return (
      <SpaceFailure
        error={failed instanceof ApiError ? failed : null}
        signOutFailed={signOutFailed}
        resent={resent}
        onResend={async () => {
          const { error } = await authClient.sendVerificationEmail({ email: session.user.email, callbackURL: MY_SPACE_VERIFIED_CALLBACK_URL });
          if (!error) setResent(true);
        }}
        onRetry={() => {
          setFailed(false);
          setAttempt(attempt + 1);
        }}
        onSignOut={signOut}
      />
    );

  const artist = space.me.artist;
  const tab = resolveTab(params.get("tab"), Boolean(artist));
  const publishing = tab === "publish";
  if (publishing && !publication.opened) setPublication({ ...publication, opened: true });
  if (!publishing && publication.published) setPublication({ opened: false, published: false, run: publication.run + 1 });

  return (
    <>
      <div hidden={publishing}>
        <SpaceDashboard
          space={space}
          tab={tab}
          signOutFailed={signOutFailed}
          onSignOut={signOut}
          onProfileSaved={(saved) => {
            setSpace({ ...space, me: { ...space.me, artist: saved } });
            // A first profile opens the way to publish, as it did when the space had tabs.
            if (!artist) router.push("/me?tab=publish");
          }}
          onExpositionCreated={(exposition) => setSpace({ ...space, expositions: [exposition, ...space.expositions] })}
        />
      </div>
      {artist && (publishing || publication.opened) && (
        <div hidden={!publishing}>
          <PublishForm
            key={publication.run}
            categories={space.categories}
            expositions={space.expositions}
            artist={artist}
            onPublished={(work, exposition) => {
              setSpace({ ...space, ...withPublished(space, work, exposition) });
              setPublication({ ...publication, opened: true, published: true });
            }}
          />
        </div>
      )}
    </>
  );
}
