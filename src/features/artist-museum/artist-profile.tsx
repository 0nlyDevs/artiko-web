"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import type { Artist, CategoryId, Exposition, Practice, Work } from "@/lib/api";
import { Avatar } from "@/lib/ui/avatar";
import { HeartFilled, IconForward, IconSeal } from "@/lib/ui/icons";
import { Button, ButtonLink, CategoryChip, CategoryChipGroup } from "@/lib/ui/kanto";
import { SlidingTabs } from "@/lib/ui/sliding-tabs";
import { categoryLabel } from "@/lib/works/category-label";
import { profileFigures } from "./profile-figures";
import styles from "./artist-profile.module.css";

export type HallPlace = { rank: number; work: Work; votes: number };

const KIND = { audio: "work.kind.audio", video: "work.kind.video", model: "work.kind.model" } as const;

/**
 * An artist's page as a profile: who they are on the right, their works in the middle (by exposition
 * or by art form), and what goes with them on the left. On phones the artist comes first.
 */
export function ArtistProfile({
  artist,
  works,
  worksComplete = true,
  expositions,
  places,
  others,
  practices,
}: {
  artist: Artist;
  works: Work[];
  /** False when the works shown are not all of the artist's: nothing is counted then. */
  worksComplete?: boolean;
  expositions: Exposition[];
  places: HallPlace[];
  others: Artist[];
  practices: Practice[];
}) {
  const { t, plural, locale } = useT();
  const [view, setView] = useState<"expo" | "genre">("expo");
  const [expo, setExpo] = useState<string>("all");
  const categories = [...new Set(works.map((w) => w.category))];
  const [genre, setGenre] = useState<CategoryId | undefined>(categories[0]);
  const [copied, setCopied] = useState(false);

  const current = expositions.find((e) => e.id === expo);
  const shown =
    view === "genre"
      ? works.filter((w) => w.category === genre).sort((a, b) => b.votes - a.votes)
      : current
        ? works.filter((w) => w.exposition_id === current.id)
        : works;
  // Works, votes and proofs are counted on the works read: no number when that list was cut.
  const figures = profileFigures(works, worksComplete);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: artist.display_name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  };

  return (
    <div className={styles.profile}>
      {/* The artist: first on phones, right column on wide screens. */}
      <aside aria-label={t("artist.about")} className={`rise ${styles.artist}`}>
        <p className={styles.eyebrow}>{[t("artist.label"), artist.region].filter(Boolean).join(" · ")}</p>
        <div className={styles.identity}>
          <Avatar name={artist.display_name} size={88} tone="ink" />
          <div className={styles.names}>
            <h1 className={styles.name}>{artist.display_name}</h1>
            {categories.length > 0 && <p className={styles.forms}>{categories.map((c) => categoryLabel({ id: c }, locale)).join(" · ")}</p>}
          </div>
        </div>
        <dl className={styles.stats}>
          {figures && <Stat label={t("artist.works")} value={figures.works} />}
          {figures && <Stat label={t("artist.votes")} value={figures.votes} />}
          {/* The API gives an artist's expositions in one answer, without pages: this count is always whole. */}
          <Stat label={t("artist.expositions")} value={expositions.length} />
        </dl>
        {artist.bio && <p className={styles.bio}>{artist.bio}</p>}
        {figures && figures.works > 0 && (
          <p className={styles.proven}>
            <IconSeal size={18} strokeWidth={2} />
            {t("artist.proven", { proven: figures.proven, total: figures.works })}
          </p>
        )}
        {!figures && <p className={styles.partial}>{t("artist.incomplete")}</p>}
        <div className={styles.actions}>
          {works.length > 0 && (
            <ButtonLink href={`/artists/${artist.id}/museum`} className={styles.action}>
              {t("museum.walk")}
            </ButtonLink>
          )}
          <Button variant="secondary" onClick={share} className={styles.action}>
            {copied ? t("artist.copied") : t("artist.share")}
          </Button>
        </div>
      </aside>

      <section aria-label={t("artist.worksTitle")} className={styles.works}>
        {expositions.length > 0 && (
          <div role="group" aria-label={t("artist.expositions")} className={styles.expositions}>
            <Highlight
              label={t("explore.all")}
              cover={works.find((w) => w.media_kind === "image")?.media_url ?? null}
              on={view === "expo" && expo === "all"}
              pick={() => {
                setView("expo");
                setExpo("all");
              }}
            />
            {expositions.map((e) => (
              <Highlight
                key={e.id}
                label={e.title}
                cover={e.cover_url}
                on={view === "expo" && expo === e.id}
                pick={() => {
                  setView("expo");
                  setExpo(e.id);
                }}
              />
            ))}
          </div>
        )}

        <div className={styles.tabs}>
          <SlidingTabs
            id="artist"
            label={t("artist.sort")}
            value={view}
            onChange={setView}
            tabs={[
              { key: "expo", label: t("artist.byExposition") },
              { key: "genre", label: t("artist.byForm") },
            ]}
          />
        </div>

        <div id="artist-panel" role="tabpanel" aria-labelledby={`artist-tab-${view}`}>
          {view === "genre" && categories.length > 1 && (
            <CategoryChipGroup className={styles.chips}>
              {categories.map((c) => (
                <CategoryChip key={c} selected={c === genre} onClick={() => setGenre(c)}>
                  {categoryLabel({ id: c }, locale)}
                  {figures && <> · {works.filter((w) => w.category === c).length}</>}
                </CategoryChip>
              ))}
            </CategoryChipGroup>
          )}
          <div className={styles.head}>
            <div className={styles.headText}>
              <h2 className={styles.heading}>
                {view === "genre" ? (genre ? categoryLabel({ id: genre }, locale) : t("artist.worksTitle")) : current ? current.title : t("artist.allWorks")}
              </h2>
              {view === "expo" && current?.description && <p className={styles.description}>{current.description}</p>}
              {figures && <p className={styles.count}>{plural("works", shown.length)}</p>}
            </div>
            {view === "expo" && current && (
              <Link href={`/expositions/${current.id}`} className={styles.more}>
                {t("artist.openExposition")}
                <IconForward size={14} />
              </Link>
            )}
          </div>
          {shown.length ? (
            <div key={`${view}-${expo}-${genre}`} className={styles.grid}>
              {shown.map((w, i) => (
                <Link key={w.id} href={`/works/${w.id}`} className={`tile rise ${styles.tile}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                  <span className={`tile-media ${styles.media}`}>
                    <TileMedia work={w} />
                  </span>
                  <span className={styles.votes}>
                    <HeartFilled size={18} />
                    <span className="visually-hidden">{plural("votes", w.votes)}</span>
                    <span aria-hidden="true">{w.votes}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>{t("museum.empty")}</p>
          )}
        </div>
      </section>

      <aside aria-label={t("artist.related")} className={styles.related}>
        {places.length > 0 && (
          <section>
            <h2 className={styles.label}>{t("artist.inHall")}</h2>
            <ul className={styles.rows}>
              {places.map((p) => (
                <li key={p.work.id}>
                  <Link href={`/works/${p.work.id}`} className={styles.place}>
                    <span className={styles.thumb}>
                      <TileMedia work={p.work} sizes="64px" bare />
                    </span>
                    <span className={styles.placeText}>
                      <span className={styles.rank}>{t("hall.rank", { n: p.rank })}</span>
                      <span className={styles.placeForm}>{categoryLabel({ id: p.work.category }, locale)}</span>
                      <span className={styles.quiet}>
                        {p.work.title}, {plural("votes", p.votes)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {others.length > 0 && (
          <section>
            <h2 className={styles.label}>{t("artist.others")}</h2>
            <ul className={styles.rows}>
              {others.map((a) => (
                <li key={a.id}>
                  <Link href={`/artists/${a.id}`} className={styles.other}>
                    <Avatar name={a.display_name} size={40} />
                    <span className={styles.otherText}>
                      <span className={styles.otherName}>{a.display_name}</span>
                      {a.region && <span className={styles.quiet}>{a.region}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {practices.length > 0 && (
          <section>
            <h2 className={styles.label}>{t("artist.heritage")}</h2>
            <ul className={styles.rows}>
              {practices.map((p) => (
                <li key={p.id}>
                  <Link href="/heritage" className={styles.practice}>
                    <span className={styles.practiceName}>{p.name}</span>
                    <span className={styles.status} data-status={p.status}>
                      <span aria-hidden="true" className={styles.dot} />
                      {t(`heritage.${p.status}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * A work on a tile: its picture, the poster of a 3D work when it has one, or a paper plate naming a
 * sound, a video or a 3D object. `bare` leaves the plate without its words, for a thumbnail too small to read.
 */
function TileMedia({ work, sizes = "(min-width: 1024px) 18vw, 33vw", bare = false }: { work: Work; sizes?: string; bare?: boolean }) {
  const { t } = useT();
  const picture = work.media_kind === "image" ? work.media_url : work.media_kind === "model" ? (work.poster_url ?? null) : null;
  const kind = work.media_kind === "image" ? null : t(KIND[work.media_kind]);
  if (picture)
    return (
      <>
        <Image src={picture} alt={t("work.alt", { title: work.title, artist: work.artist_name })} fill sizes={sizes} className={styles.picture} />
        {kind && !bare && <span className={styles.kindTag}>{kind}</span>}
      </>
    );
  if (bare) return <span className={styles.plate} role="img" aria-label={t("artist.kind", { kind: kind ?? "", title: work.title })} />;
  return (
    <span className={styles.plate}>
      <span className={styles.plateKind}>{kind}</span>
      <span className={styles.plateTitle}>{work.title}</span>
    </span>
  );
}

/** An exposition as a small hung picture: the ink frame marks the one shown. */
function Highlight({ label, cover, on, pick }: { label: string; cover: string | null; on: boolean; pick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={pick} className={styles.highlight}>
      <span key={String(on)} className={`${styles.cover} ${on ? "pop" : ""}`}>
        {cover && <Image src={cover} alt="" fill sizes="88px" className={styles.picture} />}
      </span>
      <span className={styles.highlightLabel}>{label}</span>
    </button>
  );
}
