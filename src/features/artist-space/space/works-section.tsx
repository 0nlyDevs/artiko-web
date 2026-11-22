"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, listWorkProofs, unwrap, type Category, type Proof, type Work } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";
import { monthLabel } from "@/lib/months";
import { BadgeLabel, badgeState, ButtonLink, WorkRow, WorkRows } from "@/lib/ui/kanto";
import { categoryLabel } from "@/lib/works/category-label";
import { KindIcon } from "./kind-icon";
import { contestStatus, SECTION_ID } from "./space-logic";
import styles from "./space.module.css";

const KIND = { audio: "work.kind.audio", video: "work.kind.video", model: "work.kind.model" } as const;
const STATUS = { open: "space.contest.open", closed: "space.contest.closed", out: "space.contest.out" } as const;

type ProofsState = "loading" | Proof[] | { error: ApiError | null };

/** The proofs of one work, as the API lists them for the artist. The links are read on every opening and never kept. */
export function ProofList({ id, title, state }: { id: string; title: string; state: ProofsState }) {
  const { t } = useT();
  return (
    <div id={id} role="region" aria-label={t("space.proofs.of", { title })} className={styles.proofs}>
      {state === "loading" && <p role="status">{t("space.proofs.loading")}</p>}
      {Array.isArray(state) &&
        (state.length ? (
          <>
            <ul className={styles.proofList}>
              {state.map((proof, i) => (
                <li key={proof.id}>
                  <a href={proof.url} target="_blank" rel="noreferrer">
                    {t("space.proofs.item", { n: i + 1 })}
                  </a>
                  <span>
                    {[
                      t(proof.visibility === "public" ? "space.proofs.public" : "space.proofs.private"),
                      t(proof.source === "in_app" ? "space.proofs.inApp" : "space.proofs.imported"),
                      proof.signed && t("space.proofs.signed"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
            <p>{t("space.proofs.expiry")}</p>
          </>
        ) : (
          <p>{t("space.proofs.empty")}</p>
        ))}
      {!Array.isArray(state) && state !== "loading" && <p role="alert">{state.error ? apiErrorText(state.error, t) : t("space.proofs.failed")}</p>}
    </div>
  );
}

/** The picture of a work at the size of a row, or the pictogram of its kind. */
function Thumbnail({ work }: { work: Work }) {
  const { t } = useT();
  const picture = work.media_kind === "image" ? work.media_url : work.poster_url;
  if (picture) return <Image src={picture} alt="" width={44} height={54} />;
  if (work.media_kind === "image") return null;
  return (
    <span className={styles.pictogram}>
      <KindIcon kind={work.media_kind} />
      <span className="visually-hidden">{t(KIND[work.media_kind])}</span>
    </span>
  );
}

/**
 * My works, one per row: picture, title, art form, contest month and status, badge, votes, then « Preuves » and
 * « Voir ». The API has no way to edit or delete a work, so a row offers neither.
 */
export function WorksSection({
  works,
  complete,
  categories,
  month,
  artistId,
}: {
  works: Work[];
  /** The works are all there: only then are they counted. */
  complete: boolean;
  categories: Category[];
  /** The current contest month. */
  month: string;
  artistId: string;
}) {
  const { t, plural, locale } = useT();
  const [open, setOpen] = useState<{ workId: string; proofs: ProofsState } | null>(null);

  function toggleProofs(workId: string) {
    if (open?.workId === workId) return setOpen(null);
    setOpen({ workId, proofs: "loading" });
    // The answer is shown only while this work is still the open one; private links expire, so none is kept for later.
    const show = (proofs: ProofsState) => setOpen((current) => (current?.workId === workId ? { workId, proofs } : current));
    callWithToken((auth) => listWorkProofs({ path: { work_id: workId }, cache: "no-store", ...auth }).then(unwrap)).then(show, (e) =>
      show({ error: e instanceof ApiError ? e : null }),
    );
  }

  return (
    <section id={SECTION_ID.works} aria-labelledby="space-works-title" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 id="space-works-title" className={styles.sectionLabel}>
          {t("space.tabWorks")}
          {complete && ` · ${works.length}`}
          {complete && works.length > 0 && ` · ${plural("received", works.reduce((n, w) => n + w.votes, 0))}`}
        </h2>
        {/* The public page of the artist stays one click away, even before a first work. */}
        <Link href={`/artists/${artistId}`} className={styles.headLink}>
          {t("space.seeAll")}
        </Link>
      </div>
      {works.length ? (
        <WorkRows labelledBy="space-works-title">
          {works.map((work) => {
            const status = contestStatus(work, month);
            const category = categoryLabel(categories.find((c) => c.id === work.category) ?? { id: work.category }, locale);
            const proofsId = `space-proofs-${work.id}`;
            const proofs = open?.workId === work.id ? open.proofs : null;
            return (
              <li key={work.id}>
                <WorkRow
                  as="div"
                  thumbnail={<Thumbnail work={work} />}
                  title={work.title}
                  meta={
                    <>
                      {category} · {monthLabel(work.month, locale)} · <span className={styles.status}>{t(STATUS[status])}</span>
                    </>
                  }
                  badge={<BadgeLabel state={badgeState(work)} />}
                  aside={status === "out" && work.votes === 0 ? <span aria-hidden="true">—</span> : plural("votes", work.votes)}
                  actions={
                    <button type="button" className={styles.rowLink} aria-expanded={proofs !== null} aria-controls={proofsId} onClick={() => toggleProofs(work.id)}>
                      {t("space.proofs")}
                      <span className="visually-hidden">, {work.title}</span>
                    </button>
                  }
                  href={`/works/${work.id}`}
                />
                {proofs !== null && <ProofList id={proofsId} title={work.title} state={proofs} />}
              </li>
            );
          })}
        </WorkRows>
      ) : (
        <div className={styles.empty}>
          <p>{t("space.noWorks")}</p>
          <ButtonLink href="/me?tab=publish">{t("explore.publish")}</ButtonLink>
        </div>
      )}
    </section>
  );
}
