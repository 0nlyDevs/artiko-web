import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { T } from "@/i18n/locale";
import { ExploreFilters } from "@/features/explore/explore-filters";
import { ExploreCategories } from "@/features/explore/explore-categories";
import { listArtists, listCategories, listWorks, unwrap, type CategoryId } from "@/lib/api";
import { lastMonths } from "@/lib/months";
import { readAll } from "@/lib/paging";
import { Avatar } from "@/lib/ui/avatar";
import { matchesQuery } from "@/lib/works/search";
import { WorkTile } from "@/lib/works/work-tile";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Filters = { category?: CategoryId; month?: string; q: string };

const GRID = "grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
// shortcut: the API has no text search, so the newest works are fetched and filtered here; add a `q`
// parameter to GET /works once the catalogue outgrows this limit.
const SEARCH_POOL = 200;

export function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <Suspense fallback={<GridSkeleton header />}>
        <Explore searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

async function Explore({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // the month list depends on today's date
  const params = await searchParams;
  const months = lastMonths(12);
  const q = one(params.q).trim().slice(0, 100);
  const [categories, artists] = await Promise.all([
    listCategories().then(unwrap),
    // A search looks through every artist, page after page; without one the row only shows the first names.
    q ? readAll((page) => listArtists({ query: page }).then(unwrap)) : listArtists().then(unwrap),
  ]);
  const filters: Filters = {
    category: categories.find((c) => c.id === params.category)?.id as CategoryId | undefined,
    month: months.includes(one(params.month)) ? one(params.month) : undefined,
    q,
  };
  const shownArtists = artists.filter((a) => matchesQuery([a.display_name, a.region, a.bio], filters.q)).slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <h1 className="mr-2 text-[32px] leading-none font-extrabold tracking-[-0.04em]">
          <T k="explore.title" />
        </h1>
        <ExploreFilters q={filters.q} month={filters.month} months={months} category={filters.category} />
      </div>

      {shownArtists.length > 0 && (
        <nav aria-labelledby="artists-title" className="flex flex-col gap-2">
          <h2 id="artists-title" className="sr-only">
            <T k="explore.artists" />
          </h2>
          <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {shownArtists.map((a, i) => (
              <li key={a.id} className="rise shrink-0" style={{ animationDelay: `${i * 40}ms` }}>
                <Link href={`/artists/${a.id}`} className="group flex w-[76px] flex-col items-center gap-1.5 text-center">
                  <span className="rounded-full bg-red p-[3px] transition-transform group-hover:scale-105">
                    <span className="block rounded-full border-2 border-white">
                      <Avatar name={a.display_name} size={60} />
                    </span>
                  </span>
                  <span className="line-clamp-2 text-xs leading-tight font-medium">{a.display_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ExploreCategories categories={categories} filters={filters} />

      <Suspense key={`${filters.category}|${filters.month}|${filters.q}`} fallback={<GridSkeleton />}>
        <Works filters={filters} />
      </Suspense>
    </div>
  );
}

async function Works({ filters }: { filters: Filters }) {
  const query = { ...(filters.category && { category: filters.category }), ...(filters.month && { month: filters.month }), limit: SEARCH_POOL };
  const works = unwrap(await listWorks({ query })).filter((w) => matchesQuery([w.title, w.artist_name, w.story], filters.q));
  if (!works.length) return <Empty searched={filters.q} />;
  return (
    <div className={`${GRID} mt-3`}>
      {works.map((w, i) => (
        <WorkTile key={w.id} work={w} index={i} />
      ))}
    </div>
  );
}

function Empty({ searched }: { searched: string }) {
  return (
    <div className="rise mt-3 flex flex-col items-center gap-3.5 rounded-md bg-surface px-6 py-16 text-center">
      <p className="text-[22px] font-bold tracking-[-0.02em]">
        {searched ? <T k="explore.noResult" vars={{ q: searched }} /> : <T k="explore.empty" />}
      </p>
      <p className="max-w-[46ch] text-muted">
        <T k="explore.emptyHint" />
      </p>
      <Link href="/me?tab=publish" className="btn btn-ink mt-1">
        <T k="explore.publish" />
      </Link>
    </div>
  );
}

function GridSkeleton({ header = false }: { header?: boolean }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">
        <T k="explore.loadingWorks" />
      </span>
      {header && (
        <>
          <div className="skel h-12 w-full max-w-2xl rounded-full" />
          <div className="skel h-12 w-full max-w-3xl rounded-full" />
        </>
      )}
      <div className={`${GRID} mt-3`}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="skel aspect-[3/4]" />
            <div className="flex items-center gap-2.5">
              <div className="skel size-7 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="skel h-3 w-4/5" />
                <div className="skel h-2.5 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
