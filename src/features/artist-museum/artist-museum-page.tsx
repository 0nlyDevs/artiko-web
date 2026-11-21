import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiError, getMuseum, unwrap, type Museum } from "@/lib/api";
import { MuseumView } from "@/features/artist-museum/museum-view";

export async function loadMuseum(id: string): Promise<Museum> {
  try {
    return unwrap(await getMuseum({ path: { artist_id: id } }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
}

export function ArtistMuseumPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Opening the museum.</p>}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: Promise<{ id: string }> }) {
  const museum = await loadMuseum((await params).id);
  const { artist } = museum;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-7xl">{artist.display_name}</h1>
        <p className="max-w-2xl text-xl">
          {artist.region ? `${artist.region}. ` : ""}
          {artist.bio}
        </p>
      </div>
      {museum.slots.length ? (
        <MuseumView museum={museum} />
      ) : (
        <p>This museum is still empty: the artist has not published a work yet.</p>
      )}
    </div>
  );
}
