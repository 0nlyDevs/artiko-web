import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadMuseum } from "@/features/artist-museum/artist-museum-page";
import { MuseumView } from "@/features/artist-museum/museum-view";
import { PageTitle, T } from "@/i18n/locale";
import { IconBack } from "@/lib/ui/icons";
import styles from "./museum.module.css";

/** The 3D walk through an artist's works, reached from their profile. The page asks the shell for its dark dress. */
export function WalkPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" className={styles.page} data-shell-theme="dark">
          <span className="visually-hidden">
            <T k="museum.opening" />
          </span>
          <div className={styles.waiting} />
        </div>
      }
    >
      <Walk params={params} />
    </Suspense>
  );
}

async function Walk({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // the vote depends on this month
  const museum = await loadMuseum((await params).id);
  const { artist } = museum;
  return (
    <div className={styles.page} data-shell-theme="dark">
      {/* The same title as the tab had on the server: « 3D » stays after the page wakes up. */}
      <PageTitle k="meta.museum3d" vars={{ name: artist.display_name }} />
      <header className={styles.header}>
        <Link href={`/artists/${artist.id}`} className={styles.back}>
          <IconBack size={16} strokeWidth={2} />
          {artist.display_name}
        </Link>
        <p className={styles.eyebrow}>
          <T k="room.eyebrow" />
          {artist.region && <> · {artist.region}</>}
        </p>
        <h1 className={styles.title}>
          <T k="museum.walk" />
        </h1>
      </header>
      {museum.slots.length ? (
        <MuseumView museum={museum} />
      ) : (
        <p className={styles.empty}>
          <T k="museum.empty" />
        </p>
      )}
    </div>
  );
}
