import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/i18n/locale";
import { emptyKey, exploreHref, mayBeCut, SEARCH_POOL, type ExploreFilters } from "@/features/explore/explore-logic";
import type { Artist, Work } from "@/lib/api";
import { MAX_ITEMS } from "@/lib/paging";
import { initials } from "@/lib/ui/avatar";
import { IconBack, IconForward } from "@/lib/ui/icons";
import { ButtonLink, StatusBanner, WorkRow, WorkRows } from "@/lib/ui/kanto";
import { WorkTile } from "@/lib/works/work-tile";
import { Plural } from "./plural";
import styles from "./explore.module.css";

/** Eyebrow, title and introduction: drawn at once, before the API answers. */
export function ExploreHead() {
  return (
    <header className={styles.lead}>
      <p className={styles.eyebrow}>
        <T k="explore.title" />
      </p>
      <h1 className={styles.headline}>
        <span>
          <T k="explore.headline1" />
        </span>
        <span className={styles.accent}>
          <T k="explore.headline2" />
        </span>
      </h1>
      <p className={styles.intro}>
        <T k="explore.intro" />
      </p>
    </header>
  );
}

/** A number after a section title, shown only for a list known to be whole. */
function SectionTitle({ id, children, count }: { id: string; children: ReactNode; count?: number }) {
  return (
    <h2 id={id} className={styles.sectionLabel}>
      {children}
      {count !== undefined && <span> · {count}</span>}
    </h2>
  );
}

const artistLine = (artist: Artist) => (artist.region ? `${artist.display_name} · ${artist.region}` : artist.display_name);

/** The artists above the works: a dozen names, then the way to all of them. `#artists-title` is linked from the plan of the museum. */
export function ArtistsRow({ artists, filters }: { artists: Artist[]; filters: ExploreFilters }) {
  if (!artists.length) return null;
  return (
    <nav aria-labelledby="artists-title" className={styles.section}>
      <SectionTitle id="artists-title">
        <T k="explore.artists" />
      </SectionTitle>
      <ul className={`no-scrollbar ${styles.pills}`}>
        {artists.map((a) => (
          <li key={a.id}>
            <Link href={`/artists/${a.id}`} className={styles.pill}>
              {artistLine(a)}
            </Link>
          </li>
        ))}
        <li>
          <Link href={`${exploreHref({ ...filters, view: "artists" })}#artists-title`} className={`${styles.pill} ${styles.pillStrong}`}>
            <T k="explore.allArtists" />
            <IconForward size={14} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/** Every artist, with region and biography. `cut` when the list stopped at the reading limit. */
export function ArtistsList({ artists, cut, filters }: { artists: Artist[]; cut: boolean; filters: ExploreFilters }) {
  return (
    <section aria-labelledby="artists-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <SectionTitle id="artists-title" count={cut ? undefined : artists.length}>
          <T k="explore.artists" />
        </SectionTitle>
        <Link href={exploreHref({ ...filters, view: "works" })} className={styles.headLink}>
          <IconBack size={14} />
          <T k="explore.backToWorks" />
        </Link>
      </div>
      {cut && (
        <StatusBanner>
          <T k="explore.artistsLimit" vars={{ n: MAX_ITEMS }} />
        </StatusBanner>
      )}
      {artists.length ? (
        <WorkRows labelledBy="artists-title">
          {artists.map((a) => (
            <WorkRow
              key={a.id}
              thumbnail={<span aria-hidden="true">{initials(a.display_name)}</span>}
              title={a.display_name}
              meta={
                <>
                  {a.region}
                  {a.bio && <span className={styles.bio}>{a.bio}</span>}
                </>
              }
              href={`/artists/${a.id}`}
            />
          ))}
        </WorkRows>
      ) : (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{filters.q ? <T k="explore.noResult" vars={{ q: filters.q }} /> : <T k="explore.noArtists" />}</p>
        </div>
      )}
    </section>
  );
}

/**
 * The works that match, as tiles. `read` is how many works the API gave before the text filter: at the
 * limit the feed may be cut, so the page says it and shows no count.
 */
export function WorksFeed({ works, read, filters }: { works: Work[]; read: number; filters: ExploreFilters }) {
  const cut = mayBeCut(read, SEARCH_POOL);
  return (
    <>
      {cut ? (
        <StatusBanner>
          <T k="explore.limit" vars={{ n: SEARCH_POOL }} />
        </StatusBanner>
      ) : (
        works.length > 0 && (
          <p className={styles.count}>
            <Plural base="explore.count" n={works.length} />
          </p>
        )
      )}
      {works.length ? (
        <div className={styles.grid}>
          {works.map((w, i) => (
            <WorkTile key={w.id} work={w} index={i} />
          ))}
        </div>
      ) : (
        <div className={`rise ${styles.empty}`}>
          <p className={styles.emptyTitle}>{filters.q ? <T k="explore.noResult" vars={{ q: filters.q }} /> : <T k={emptyKey(filters)} />}</p>
          <p className={styles.emptyHint}>
            <T k="explore.emptyHint" />
          </p>
          <ButtonLink href="/me?tab=publish">
            <T k="explore.publish" />
          </ButtonLink>
        </div>
      )}
    </>
  );
}

/** What stands in for the filters, the artists and the chips while the API answers. */
export function ExploreSkeleton() {
  return (
    <>
      <div aria-hidden="true" className={styles.filters}>
        <div className={`skel ${styles.skelField}`} />
        <div className={`skel ${styles.skelMonth}`} />
      </div>
      <div className={styles.section}>
        <div aria-hidden="true" className={`skel ${styles.skelLine}`} />
        <GridSkeleton />
      </div>
    </>
  );
}

export function GridSkeleton() {
  return (
    <div aria-busy="true">
      <span className="visually-hidden">
        <T k="explore.loadingWorks" />
      </span>
      <div aria-hidden="true" className={styles.grid}>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className={styles.skelTile}>
            <div className={`skel ${styles.skelMedia}`} />
            <div className={`skel ${styles.skelTitle}`} />
            <div className={`skel ${styles.skelMeta}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
