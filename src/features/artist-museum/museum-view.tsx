"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import { IconForward } from "@/lib/ui/icons";
import { ProofSeal } from "@/lib/works/proof-seal";
import { useVote, VotePanel } from "@/lib/works/vote";
import { SlotErrorBoundary } from "@/features/artist-museum/slot-error-boundary";
import type { Museum, Work } from "@/lib/api";
import styles from "./museum.module.css";

// three.js only runs in the browser.
const Museum3D = dynamic(() => import("@/features/artist-museum/museum-3d"), {
  ssr: false,
  loading: () => <Building />,
});

// model-viewer and the WebGL check only exist in the browser.
const ArtworkViewer = dynamic(() => import("@/features/model-viewer/artwork-viewer").then((m) => m.ArtworkViewer), {
  ssr: false,
});

const KIND = { audio: "work.kind.audio", video: "work.kind.video", model: "work.kind.model" } as const;

/** « 01 », « 12 »: the counter of the wall labels. */
const twoDigits = (n: number) => String(n).padStart(2, "0");

function Building() {
  return <div className={styles.building}>{useT().t("museum.building")}</div>;
}

export function MuseumView({ museum }: { museum: Museum }) {
  const { t } = useT();
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [selected, setSelected] = useState<Work>(museum.slots[0].work);
  // The museum comes whole from the API (one slot per work): the place of a work in it is a true count.
  const position = museum.slots.findIndex((slot) => slot.work.id === selected.id) + 1;
  const workList = (
    <ul className={styles.list} aria-label={t("room.works")}>
      {museum.slots.map(({ work }) => (
        <li key={work.id}>
          <button type="button" onClick={() => setSelected(work)} aria-pressed={work.id === selected.id} className={styles.work}>
            <span className={styles.thumb}>
              <WorkThumbnail work={work} />
              {work.media_kind !== "image" && <span className={styles.kind}>{t(KIND[work.media_kind])}</span>}
            </span>
            <span className={styles.workTitle}>{work.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.view}>
      <div className={styles.toolbar}>
        <button type="button" onClick={() => setMode(mode === "3d" ? "2d" : "3d")} className={styles.toggle}>
          {mode === "3d" ? t("museum.simple") : t("museum.walk")}
        </button>
        {mode === "3d" && <p className={styles.hint}>{t("museum.hint")}</p>}
      </div>

      <div className={styles.layout}>
        {mode === "3d" ? (
          <SlotErrorBoundary fallback={workList}>
            <div className={styles.room}>
              <Museum3D museum={museum} selectedId={selected.id} onSelect={setSelected} />
            </div>
          </SlotErrorBoundary>
        ) : (
          workList
        )}

        <aside aria-live="polite" className={styles.panel}>
          <p className={styles.counter}>{t("room.counter", { n: twoDigits(position), total: twoDigits(museum.slots.length) })}</p>
          <h2 className={styles.workName}>{selected.title}</h2>
          <ProofSeal work={selected} />
          {selected.media_kind === "model" && (
            <ArtworkViewer
              model1k={selected.media_url}
              model2k={selected.media_hd_url ?? null}
              poster={selected.poster_url ?? null}
              alt={selected.title}
            />
          )}
          {selected.media_kind === "audio" && <audio controls src={selected.media_url} className={styles.player} />}
          {selected.media_kind === "video" && <video controls src={selected.media_url} className={styles.player} />}
          {selected.story && <p className={styles.story}>{selected.story}</p>}
          <SelectedVote key={selected.id} work={selected} />
          {selected.proof_urls.length > 0 && (
            <div className={styles.proofs}>
              <h3 className={styles.label}>{t("museum.proof")}</h3>
              <div className={styles.proofGrid}>
                {selected.proof_urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className={styles.proof}>
                    {/\.(jpg|png|webp)$/.test(url) ? (
                      <Image src={url} alt={t("museum.stepAlt", { n: i + 1 })} width={200} height={150} className={styles.proofPicture} />
                    ) : (
                      <span className={styles.proofStep}>{t("museum.step", { n: i + 1 })}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* The page of the work has what this panel leaves out: its month, its exposition, its fingerprint. */}
          <Link href={`/works/${selected.id}`} className={styles.more}>
            {t("room.openWork")}
            <IconForward size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** Keyed by work, so each piece keeps its own vote state while visitors walk around. */
function SelectedVote({ work }: { work: Work }) {
  // After a sign-in the visitor comes back to this room, not to the page of the work.
  return <VotePanel work={work} vote={useVote(work)} returnTo={`/artists/${work.artist_id}/museum`} />;
}

/** Images show themselves; a 3D work shows its poster when it has one (2D mode loads no model). */
export function WorkThumbnail({ work }: { work: Work }) {
  const src = work.media_kind === "image" ? work.media_url : work.media_kind === "model" ? work.poster_url : null;
  if (!src) return null;
  return <Image src={src} alt="" width={400} height={300} className={styles.thumbPicture} />;
}
