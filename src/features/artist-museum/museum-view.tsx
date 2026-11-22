"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import { ProofSeal } from "@/lib/works/proof-seal";
import { useVote, VotePanel } from "@/lib/works/vote";
import { SlotErrorBoundary } from "@/features/artist-museum/slot-error-boundary";
import type { Museum, Work } from "@/lib/api";

// three.js only runs in the browser.
const Museum3D = dynamic(() => import("@/features/artist-museum/museum-3d"), {
  ssr: false,
  loading: () => <Building />,
});

// model-viewer and the WebGL check only exist in the browser.
const ArtworkViewer = dynamic(() => import("@/features/model-viewer/artwork-viewer").then((m) => m.ArtworkViewer), {
  ssr: false,
});

function Building() {
  return <div className="flex h-full items-center justify-center">{useT().t("museum.building")}</div>;
}

export function MuseumView({ museum }: { museum: Museum }) {
  const { t } = useT();
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [selected, setSelected] = useState<Work>(museum.slots[0].work);
  const workList = (
    <ul className="grid gap-4 sm:grid-cols-2">
      {museum.slots.map(({ work }) => (
        <li key={work.id}>
          <button
            type="button"
            onClick={() => setSelected(work)}
            aria-pressed={work.id === selected.id}
            className="flex w-full flex-col gap-2 bg-paper p-3 text-left aria-pressed:outline-3 aria-pressed:outline-ink"
          >
            <WorkThumbnail work={work} />
            <span className="font-bold">{work.title}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setMode(mode === "3d" ? "2d" : "3d")}
          className="border-2 border-ink px-3 py-1"
        >
          {mode === "3d" ? t("museum.simple") : t("museum.walk")}
        </button>
        {mode === "3d" && <p>{t("museum.hint")}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        {mode === "3d" ? (
          <SlotErrorBoundary fallback={workList}>
            <div className="h-[60vh] min-h-80 bg-ink">
              <Museum3D museum={museum} selectedId={selected.id} onSelect={setSelected} />
            </div>
          </SlotErrorBoundary>
        ) : (
          workList
        )}

        <aside aria-live="polite" className="flex flex-col gap-4">
          <h2 className="font-heading text-5xl leading-none">{selected.title}</h2>
          <ProofSeal work={selected} />
          {selected.media_kind === "model" && (
            <ArtworkViewer
              model1k={selected.media_url}
              model2k={selected.media_hd_url ?? null}
              poster={selected.poster_url ?? null}
              alt={selected.title}
            />
          )}
          {selected.media_kind === "audio" && <audio controls src={selected.media_url} className="w-full" />}
          {selected.media_kind === "video" && <video controls src={selected.media_url} className="w-full" />}
          {selected.story && <p>{selected.story}</p>}
          <SelectedVote key={selected.id} work={selected} />
          {selected.proof_urls.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">{t("museum.proof")}</h3>
              <div className="grid grid-cols-3 gap-2">
                {selected.proof_urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="bg-paper">
                    {/\.(jpg|png|webp)$/.test(url) ? (
                      <Image src={url} alt={t("museum.stepAlt", { n: i + 1 })} width={200} height={150} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[4/3] items-center justify-center text-sm">{t("museum.step", { n: i + 1 })}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Keyed by work, so each piece keeps its own vote state while visitors walk around. */
function SelectedVote({ work }: { work: Work }) {
  return <VotePanel work={work} vote={useVote(work)} />;
}

/** Images show themselves; a 3D work shows its poster when it has one (2D mode loads no model). */
export function WorkThumbnail({ work }: { work: Work }) {
  const src = work.media_kind === "image" ? work.media_url : work.media_kind === "model" ? work.poster_url : null;
  if (!src) return null;
  return <Image src={src} alt="" width={400} height={300} className="aspect-[4/3] w-full object-cover" />;
}
