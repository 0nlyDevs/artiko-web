"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import type { Artist, Category, Exposition, Work } from "@/lib/api";
import { IconCheck, IconClose, IconForward } from "@/lib/ui/icons";
import { BadgeLabel, badgeState, Cartel } from "@/lib/ui/kanto";
import { categoryLabel } from "@/lib/works/category-label";
import { useVote, VoteActions, VoteContest } from "@/lib/works/vote";
import voteStyles from "@/lib/works/vote/vote-panel.module.css";
import { elides, monthName, publishedDay, shortHash, twoDigits, type RoomPlace } from "@/features/work/work-facts";
import { WorkMedia } from "@/features/work/work-media";
import { WorkProofs } from "@/features/work/work-proofs";
import styles from "./work-sheet.module.css";

export interface WorkSheetProps {
  work: Work;
  artist: Artist;
  exposition: Exposition | null;
  /** Where the work hangs in the room of its category, when the page of that room held it. */
  place?: RoomPlace | null;
  /** The rooms of the museum: the categories of the API, in its order. */
  rooms?: readonly Category[];
}

/**
 * The notice of a work (Figma frame R7): the piece on the wall of its room, then the fields the Work
 * schema has, its proofs and the contest of its month. Double-click a picture to vote.
 */
export function WorkSheet({ work, artist, exposition, place = null, rooms = [] }: WorkSheetProps) {
  const { t, locale } = useT();
  const router = useRouter();
  const vote = useVote(work);
  // A double-click asked for the vote: the heart plays once the API has counted it.
  const [byDoubleClick, setByDoubleClick] = useState(false);

  // Back only when the visitor came from a page of this site; a shared link closes to Explore.
  const close = () => (document.referrer.startsWith(window.location.origin) ? router.back() : router.push("/explore"));
  const doubleClick = () => {
    if (vote.vote()) setByDoubleClick(true);
  };

  const category = categoryLabel({ id: work.category }, locale);
  const roomNumber = rooms.findIndex((room) => room.id === work.category) + 1;
  // No total comes from the API: the counter only shows when the whole room was read.
  const counter = place && place.total !== null ? `${twoDigits(place.position)} / ${twoDigits(place.total)}` : null;
  const badge = badgeState(work);
  const month = monthName(work.month, locale);
  const published = publishedDay(work.created_at, locale);
  const contest = t(elides(locale, month) ? "notice.contestOf.elided" : "notice.contestOf", { month });

  return (
    <article className={`rise ${styles.notice}`} data-shell-theme="dark" data-shell-bleed>
      <div className={styles.room}>
        <div className={styles.stage}>
          {roomNumber > 0 && (
            <p className={styles.roomLabel}>
              <span>
                {t("notice.room", { n: twoDigits(roomNumber), total: twoDigits(rooms.length) })} · {category}
              </span>
              <span className={styles.dots} aria-hidden="true">
                {rooms.map((room) => (
                  <span key={room.id} className={styles.dot} data-current={room.id === work.category || undefined} />
                ))}
              </span>
            </p>
          )}
          <div className={styles.wall}>
            {/* The wall label of the frame, beside a picture; the panel says the same to everyone. */}
            {work.media_kind === "image" && (
              <div className={styles.cartel} aria-hidden="true">
                <Cartel eyebrow={counter ?? undefined} title={work.title}>
                  <span>{category}</span>
                  <span>{work.artist_name}</span>
                </Cartel>
              </div>
            )}
            <div className={styles.hung}>
              <WorkMedia
                work={work}
                // Images only: a double-click on a video or sound player means full screen or seeking, not a vote.
                onDoubleClick={work.media_kind === "image" ? doubleClick : undefined}
                hint={work.media_kind === "image" && vote.canVote ? t("vote.doubleClick") : undefined}
              >
                {byDoubleClick && vote.state === "done" && (
                  <svg viewBox="0 0 24 24" className="burst" fill="currentColor" aria-hidden="true">
                    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
                  </svg>
                )}
              </WorkMedia>
            </div>
          </div>
        </div>
        {rooms.length > 0 && (
          <nav aria-label={t("notice.rooms")} className={styles.rooms}>
            {rooms.map((room) => (
              <Link key={room.id} href={`/explore?category=${room.id}`} aria-current={room.id === work.category ? "true" : undefined} className={styles.roomLink}>
                {categoryLabel(room, locale)}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className={styles.panel}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>{[t("notice.label"), counter].filter(Boolean).join(" · ")}</p>
          <button type="button" onClick={close} className={styles.close}>
            {t("work.close")}
            <span className={styles.closeDisc} aria-hidden="true">
              <IconClose size={14} strokeWidth={1.8} />
            </span>
          </button>
        </header>

        <BadgeLabel state={badge} className={styles.badge}>
          {badge === "human" ? (
            <>
              <IconCheck size={11} strokeWidth={3} />
              {t("badge.human")}
            </>
          ) : undefined}
        </BadgeLabel>

        <h1 className={styles.title}>{work.title}</h1>

        <p className={styles.maker}>
          <span>
            <Link href={`/artists/${artist.id}`} className={styles.makerName}>
              {artist.display_name}
            </Link>
            {artist.region && <> · {artist.region}</>}
          </span>
          <Link href={`/artists/${artist.id}/museum`} className={styles.museum}>
            {t("work.museum")}
          </Link>
        </p>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>{t("notice.category")}</dt>
            <dd>{category}</dd>
          </div>
          {exposition && (
            <div className={styles.fact}>
              <dt>{t("notice.exposition")}</dt>
              <dd>{exposition.title}</dd>
            </div>
          )}
          <div className={styles.fact}>
            <dt>{t("notice.published")}</dt>
            <dd>
              <time dateTime={work.created_at}>{published}</time> · {contest}
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>{t("notice.ai")}</dt>
            <dd>{t(work.ai_declared ? "notice.aiDeclared" : "notice.aiNone")}</dd>
          </div>
          <div className={styles.fact}>
            <dt>{t("notice.fingerprint")}</dt>
            <dd title={work.sha256}>SHA-256 · {shortHash(work.sha256)}</dd>
          </div>
        </dl>

        {work.story && (
          <section className={styles.section} aria-label={t("notice.story")}>
            <p className={styles.eyebrow}>{t("notice.story")}</p>
            <p className={styles.story}>{work.story}</p>
          </section>
        )}

        <div className={styles.proofs}>
          <WorkProofs work={work} />
        </div>

        <div className={styles.contest}>
          <VoteContest work={work} vote={vote} />
        </div>

        <VoteActions
          work={work}
          vote={vote}
          returnTo={`/works/${work.id}`}
          className={styles.actions}
          aside={
            place?.next && (
              <Link href={`/works/${place.next.id}`} title={place.next.title} className={`${voteStyles.button} ${voteStyles.secondary}`}>
                {t("notice.next")}
                <IconForward size={14} className={styles.arrow} />
              </Link>
            )
          }
        />
      </div>
    </article>
  );
}
