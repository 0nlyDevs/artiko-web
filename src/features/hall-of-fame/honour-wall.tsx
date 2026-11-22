"use client";

import Image from "next/image";
import Link from "next/link";
import type { HallOfFameEntry, Work } from "@/lib/api";
import { useT } from "@/i18n/locale";
import { monthLabel } from "@/lib/months";
import { ButtonLink, Cartel, PantheonFrame } from "@/lib/ui/kanto";
import { categoryLabel } from "@/lib/works/category-label";
import styles from "./hall-of-fame.module.css";
import { MyVoteNote } from "./my-vote";
import { FRAMES, hang, worksLink, type WorksLink } from "./room";

const KIND = { audio: "work.kind.audio", video: "work.kind.video", model: "work.kind.model" } as const;

// Width of the gilded picture (1.4 times the frame) and of the work in its opening, by place on the wall.
const SIZES = {
  laureate: { frame: "(min-width: 1024px) 420px, (min-width: 768px) 400px, 95vw", work: "(min-width: 1024px) 200px, (min-width: 768px) 190px, 46vw" },
  other: { frame: "(min-width: 1024px) 270px, (min-width: 768px) 210px, 55vw", work: "(min-width: 1024px) 130px, (min-width: 768px) 100px, 26vw" },
};

/** What shows through the opening of a gilded frame: the picture, the still of a 3D work, or the kind of the work in words. */
function FramedWork({ work, sizes, preload }: { work: Work; sizes: string; preload?: boolean }) {
  const { t } = useT();
  const alt = t("work.alt", { title: work.title, artist: work.artist_name });
  if (work.media_kind === "image") return <Image src={work.media_url} alt={alt} fill sizes={sizes} preload={preload} />;
  if (work.media_kind === "model" && work.poster_url) return <Image src={work.poster_url} alt={alt} fill sizes={sizes} preload={preload} />;
  return <span className={styles.kind}>{t(KIND[work.media_kind])}</span>;
}

/**
 * The wall of the room of honour: five gilded frames, the first in the middle under the lights.
 * `rank`, `work` and `votes` are those of the API's entries; a rank without an entry keeps its frame, empty.
 * Each hung work opens its notice, where the vote is cast.
 */
export function HonourWall({ entries, category, month, current }: { entries: HallOfFameEntry[]; category: { id: string; label?: string }; month: string; current: boolean }) {
  const { t, plural, locale } = useT();
  const shownMonth = monthLabel(month, locale);
  return (
    <ol className={styles.wall} aria-label={t("hall.ranking", { category: categoryLabel(category, locale), month: shownMonth })}>
      {hang(entries).map(({ rank, entry }) => {
        const size = rank === 1 ? SIZES.laureate : SIZES.other;
        if (!entry)
          return (
            <li key={rank} className={styles.slot} data-rank={rank} data-empty="true">
              <div className={styles.entry}>
                <div className={styles.hang}>
                  <PantheonFrame sizes={size.frame} />
                </div>
                <div className={styles.caption}>
                  <span className={styles.rank}>{t("hall.rank", { n: rank })}</span>
                  <span className={styles.undecided}>{t("hall.undecided")}</span>
                </div>
              </div>
            </li>
          );
        const { work } = entry;
        return (
          <li key={rank} className={styles.slot} data-rank={rank}>
            <Link href={`/works/${work.id}`} className={styles.entry}>
              <div className={styles.hang}>
                <PantheonFrame sizes={size.frame}>
                  <FramedWork work={work} sizes={size.work} preload={rank === 1} />
                </PantheonFrame>
              </div>
              {rank === 1 ? (
                <div className={styles.honour}>
                  <span className={styles.medal}>
                    <span className="visually-hidden">{t("hall.rank", { n: entry.rank })}</span>
                    <span aria-hidden="true">{entry.rank}</span>
                  </span>
                  <Cartel
                    variant="honour"
                    className={styles.honourCartel}
                    eyebrow={t(current ? "hall.leading" : "hall.laureate", { month: shownMonth })}
                    title={work.title}
                    footer={plural("votes", entry.votes)}
                  >
                    <span>{work.artist_name}</span>
                  </Cartel>
                </div>
              ) : (
                <div className={styles.caption}>
                  <span className={styles.rank}>{t("hall.rank", { n: entry.rank })}</span>
                  <span className={styles.workTitle}>{work.title}</span>
                  <span className={styles.artist}>{work.artist_name}</span>
                  <span className={styles.votes}>{plural("votes", entry.votes)}</span>
                </div>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** No entry at all: the lights are off, the frames wait, and a button opens the works that can still be voted for or seen. */
export function DarkRoom({ month, works }: { month: string; works: WorksLink }) {
  const { t, locale } = useT();
  const current = works.scope === "current";
  return (
    <div className={styles.dark} data-dark="true">
      <div className={styles.wall} aria-hidden="true">
        {Array.from({ length: FRAMES }, (_, i) => (
          <div key={i} className={styles.slot} data-rank={i + 1} data-empty="true">
            <div className={styles.hang}>
              <PantheonFrame sizes={i === 0 ? SIZES.laureate.frame : SIZES.other.frame} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.darkNote}>
        <p className={styles.darkTitle}>{current ? t("hall.dark.title") : t("hall.dark.past", { month: monthLabel(month, locale) })}</p>
        {current && <p className={styles.darkHint}>{t("hall.dark.hint")}</p>}
        <WorksButton works={works} month={month} />
      </div>
    </div>
  );
}

/**
 * The button to Explore. A room of the last twelve months opens the works of its month; an older room opens
 * every work of its art form, under the words of the team's page (« Explorer et voter »).
 */
function WorksButton({ works, month }: { works: WorksLink; month: string }) {
  const { t, locale } = useT();
  const label = { current: t("hall.worksThisMonth"), month: t("hall.worksOfMonth", { month: monthLabel(month, locale) }), all: t("menu.explore") }[works.scope];
  return (
    <ButtonLink href={works.href} withArrow className={styles.worksLink}>
      {label}
    </ButtonLink>
  );
}

type RoomProps = { entries: HallOfFameEntry[]; category: { id: string; label?: string }; month: string; now: string };

/** What a ranking hangs in the room: the wall, or the dark room when the API sent no entry. `now` is the current contest month, read on the server at request time. */
export function RoomWall({ entries, category, month, now }: RoomProps) {
  if (entries.length === 0) return <DarkRoom month={month} works={worksLink(category.id, month, now)} />;
  return <HonourWall entries={entries} category={category} month={month} current={month === now} />;
}

/**
 * The right of the bottom bar, after the art forms: the visitor's own vote in this room, then the button to Explore.
 * The dark room has its button under its sentence, so nothing is drawn here.
 */
export function RoomAside({ entries, category, month, now }: RoomProps) {
  if (entries.length === 0) return null;
  return (
    <div className={styles.aside}>
      <MyVoteNote category={category.id} month={month} entries={entries} />
      <WorksButton works={worksLink(category.id, month, now)} month={month} />
    </div>
  );
}

/** The room while its ranking is read: the five frames, still empty. */
export function WallSkeleton() {
  const { t } = useT();
  return (
    <div className={styles.loading} aria-busy="true">
      <span className="visually-hidden">{t("hall.loading")}</span>
      <div className={styles.wall} aria-hidden="true">
        {Array.from({ length: FRAMES }, (_, i) => (
          <div key={i} className={styles.slot} data-rank={i + 1} data-empty="true">
            <div className={styles.hang}>
              <PantheonFrame sizes={i === 0 ? SIZES.laureate.frame : SIZES.other.frame} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
