"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { ProofSeal } from "@/lib/works/proof-seal";
import { VoteButton } from "@/features/artist-museum/vote-button";
import type { Museum, Work } from "@/lib/api";

// three.js only runs in the browser.
const Museum3D = dynamic(() => import("@/features/artist-museum/museum-3d"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center">Building the room.</div>,
});

export function MuseumView({ museum }: { museum: Museum }) {
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [selected, setSelected] = useState<Work>(museum.slots[0].work);
  const [extraVotes, setExtraVotes] = useState<Record<string, number>>({});
  const votes = (w: Work) => w.votes + (extraVotes[w.id] ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setMode(mode === "3d" ? "2d" : "3d")}
          className="border-2 border-ink px-3 py-1"
        >
          {mode === "3d" ? "Simple gallery view" : "Walk the 3D museum"}
        </button>
        {mode === "3d" && <p>Drag to look around, scroll to move closer, click a work to open it.</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        {mode === "3d" ? (
          <div className="h-[60vh] min-h-80 bg-ink">
            <Museum3D museum={museum} selectedId={selected.id} onSelect={setSelected} />
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {museum.slots.map(({ work }) => (
              <li key={work.id}>
                <button
                  type="button"
                  onClick={() => setSelected(work)}
                  aria-pressed={work.id === selected.id}
                  className="flex w-full flex-col gap-2 bg-paper p-3 text-left aria-pressed:outline-3 aria-pressed:outline-ink"
                >
                  {work.media_kind === "image" && (
                    <Image src={work.media_url} alt="" width={400} height={300} className="aspect-[4/3] w-full object-cover" />
                  )}
                  <span className="font-bold">{work.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <aside aria-live="polite" className="flex flex-col gap-4">
          <h2 className="font-heading text-5xl leading-none">{selected.title}</h2>
          <ProofSeal work={selected} />
          {selected.media_kind === "audio" && <audio controls src={selected.media_url} className="w-full" />}
          {selected.media_kind === "video" && <video controls src={selected.media_url} className="w-full" />}
          {selected.story && <p>{selected.story}</p>}
          <p>
            {votes(selected)} {votes(selected) === 1 ? "vote" : "votes"} this month
          </p>
          <VoteButton
            key={selected.id}
            work={selected}
            onVoted={() => setExtraVotes((v) => ({ ...v, [selected.id]: (v[selected.id] ?? 0) + 1 }))}
          />
          {selected.proof_urls.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-bold">Proof of process</h3>
              <div className="grid grid-cols-3 gap-2">
                {selected.proof_urls.map((url, i) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="bg-paper">
                    {/\.(jpg|png|webp)$/.test(url) ? (
                      <Image src={url} alt={`Process step ${i + 1}`} width={200} height={150} className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[4/3] items-center justify-center text-sm">Step {i + 1}</span>
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
