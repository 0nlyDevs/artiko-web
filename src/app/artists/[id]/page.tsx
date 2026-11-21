import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MuseumView } from "@/components/MuseumView";
import { api, ApiError, type Museum } from "@/lib/api";

async function load(id: string): Promise<Museum> {
  try {
    return await api<Museum>(`/artists/${encodeURIComponent(id)}/museum`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 422)) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps<"/artists/[id]">): Promise<Metadata> {
  const { artist } = await load((await params).id);
  return { title: `${artist.display_name}'s museum`, description: artist.bio };
}

export default function ArtistPage({ params }: PageProps<"/artists/[id]">) {
  return (
    <Suspense fallback={<p>Opening the museum.</p>}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: PageProps<"/artists/[id]">["params"] }) {
  const museum = await load((await params).id);
  const { artist } = museum;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-extrabold tracking-tighter">{artist.display_name}</h1>
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
