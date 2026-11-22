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
    listWorks({ query: { artist_id: id, limit: 200 } }).then(unwrap),
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
    <div aria-busy="true" className="mx-auto flex max-w-[1400px] flex-col gap-10 lg:flex-row-reverse">
      <span className="sr-only">
        <T k="museum.opening" />
      </span>
      <div className="flex flex-col gap-4 lg:w-[300px]">
        <div className="skel size-24 rounded-full" />
        <div className="skel h-8 w-3/4" />
        <div className="skel h-20 w-full" />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skel aspect-[4/5] rounded-none" />
        ))}
      </div>
    </div>
  );
}
