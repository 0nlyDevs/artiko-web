import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  ApiError,
  getArtist,
  getHallOfFame,
  getMuseum,
  listArtists,
  listExpositions,
  listPractices,
  listWorks,
  unwrap,
  type Artist,
  type Museum,
} from "@/lib/api";
import { ArtistProfile, type HallPlace } from "@/features/artist-museum/artist-profile";
import { PageTitle, T } from "@/i18n/locale";
import { currentMonth } from "@/lib/months";
import { MAX_ITEMS, readAll } from "@/lib/paging";
import styles from "./artist-profile.module.css";

const notFoundOn = <T,>(promise: Promise<T>) =>
  promise.catch((e) => {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  });

export function loadArtist(id: string): Promise<Artist> {
  return notFoundOn(getArtist({ path: { artist_id: id } }).then(unwrap));
}

export function loadMuseum(id: string): Promise<Museum> {
  return notFoundOn(getMuseum({ path: { artist_id: id } }).then(unwrap));
}

export function ArtistMuseumPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  await connection(); // "this month" for the Hall of Fame places
  const { id } = await params;
  const artist = await loadArtist(id);
  const [works, expositions, artists, practices] = await Promise.all([
    // Every page, since the profile counts them (the API sends no total).
    readAll((page) => listWorks({ query: { artist_id: id, ...page } }).then(unwrap)),
    listExpositions({ query: { artist_id: id } }).then(unwrap),
    listArtists().then(unwrap),
    listPractices().then(unwrap),
  ]);
  const categories = [...new Set(works.map((w) => w.category))];
  const month = currentMonth();
  // The artist's places in this month's Hall of Fame, in the art forms they work in.
  const halls = await Promise.all(categories.slice(0, 3).map((category) => getHallOfFame({ path: { category, month } }).then((r) => r.data ?? [])));
  const places: HallPlace[] = halls.flat().filter((e) => e.work.artist_id === id).map((e) => ({ rank: e.rank, work: e.work, votes: e.votes }));
  const related = practices.filter((p) => categories.includes(p.category));

  return (
    <>
      <PageTitle k="meta.museum" vars={{ name: artist.display_name }} />
      <ArtistProfile
        artist={artist}
        works={works}
        // readAll ends on a short page, or at its cap: under the cap, the last page read was short.
        worksComplete={works.length < MAX_ITEMS}
        expositions={expositions}
        places={places}
        others={artists.filter((a) => a.id !== id).slice(0, 4)}
        practices={(related.length ? related : practices).slice(0, 3)}
      />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" className={styles.profile}>
      <span className="visually-hidden">
        <T k="museum.opening" />
      </span>
      <div className={`${styles.artist} ${styles.waiting}`}>
        <div className="skel" style={{ width: 88, height: 88, borderRadius: "50%" }} />
        <div className="skel" style={{ width: "75%", height: 40 }} />
        <div className="skel" style={{ width: "100%", height: 72 }} />
        <div className="skel" style={{ width: "100%", height: 52 }} />
      </div>
      <div className={styles.works}>
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`skel ${styles.tile}`} />
          ))}
        </div>
      </div>
      <div className={styles.related} />
    </div>
  );
}
