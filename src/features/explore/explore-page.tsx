import { connection } from "next/server";
import { Suspense } from "react";
import { ExploreCategories } from "@/features/explore/explore-categories";
import { ExploreFilters } from "@/features/explore/explore-filters";
import { ARTIST_PAGE, ARTIST_ROW, mayBeCut, readFilters, readQuery, readView, SEARCH_POOL, type ExploreFilters as Filters } from "@/features/explore/explore-logic";
import { ArtistsList, ArtistsRow, ExploreHead, ExploreSkeleton, GridSkeleton, WorksFeed } from "@/features/explore/explore-sections";
import { T } from "@/i18n/locale";
import { listArtists, listCategories, listWorks, unwrap } from "@/lib/api";
import { lastMonths } from "@/lib/months";
import { MAX_ITEMS, readAll } from "@/lib/paging";
import { matchesQuery } from "@/lib/works/search";
import styles from "./explore.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.page}>
      <ExploreHead />
      <Suspense fallback={<ExploreSkeleton />}>
        <Explore searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Explore({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // the month list depends on today's date
  const params = await searchParams;
  const months = lastMonths(12);
  // A search and the list of all artists look through every artist, page after page; the row only needs the first names.
  const everyArtist = readView(params) === "artists" || readQuery(params) !== "";
  const [categories, artists] = await Promise.all([
    listCategories().then(unwrap),
    everyArtist ? readAll((page) => listArtists({ query: page }).then(unwrap)) : listArtists({ query: { limit: ARTIST_PAGE } }).then(unwrap),
  ]);
  const filters = readFilters(params, categories, months);
  const found = artists.filter((a) => matchesQuery([a.display_name, a.region, a.bio], filters.q));

  return (
    <>
      <ExploreFilters q={filters.q} month={filters.month} months={months} category={filters.category} view={filters.view} />
      {filters.view === "artists" ? (
        <ArtistsList artists={found} cut={mayBeCut(artists.length, MAX_ITEMS)} filters={filters} />
      ) : (
        <>
          <ArtistsRow artists={found.slice(0, ARTIST_ROW)} filters={filters} />
          <section aria-labelledby="works-title" className={styles.section}>
            <h2 id="works-title" className={styles.sectionLabel}>
              <T k="explore.works" />
            </h2>
            <ExploreCategories categories={categories} filters={filters} />
            <Suspense key={`${filters.category}|${filters.month}|${filters.q}`} fallback={<GridSkeleton />}>
              <Works filters={filters} />
            </Suspense>
          </section>
        </>
      )}
    </>
  );
}

async function Works({ filters }: { filters: Filters }) {
  const query = { ...(filters.category && { category: filters.category }), ...(filters.month && { month: filters.month }), limit: SEARCH_POOL };
  const read = unwrap(await listWorks({ query }));
  const works = read.filter((w) => matchesQuery([w.title, w.artist_name, w.story], filters.q));
  return <WorksFeed works={works} read={read.length} filters={filters} />;
}
