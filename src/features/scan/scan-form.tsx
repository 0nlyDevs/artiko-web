"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ProofSeal } from "@/lib/works/proof-seal";
import { ApiError, scanImage, unwrap, type ScanResult } from "@/lib/api";

const HEADLINE: Record<ScanResult["status"], string> = {
  human_proven: "Human-made, proven",
  artiko_work: "On Artiko, without proof of process",
  known_work: "A known work",
  ai_made: "Made with AI, proven by its Content Credentials",
  unknown: "Not found",
};

export function ScanForm() {
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "checking" | ScanResult | { error: string }>("idle");

  async function check(file: File) {
    setPreview(URL.createObjectURL(file));
    setState("checking");
    try {
      setState(unwrap(await scanImage({ body: { file } })));
    } catch (e) {
      setState({ error: e instanceof ApiError ? e.message : "The check did not go through. Try again." });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <label htmlFor="photo" className="font-bold">
          Photo to check
        </label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="photo-help"
          onChange={(e) => e.target.files?.[0] && check(e.target.files[0])}
          className="file:mr-4 file:bg-ink file:px-4 file:py-2 file:font-bold file:text-paper"
        />
        <p id="photo-help">JPEG, PNG or WebP, up to 20 MB.</p>
        {preview && (
          // A local object URL: next/image cannot optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="The photo being checked" className="max-h-96 w-full bg-paper object-contain" />
        )}
      </div>

      <div aria-live="polite">
        {state === "checking" && <p className="text-xl">Checking the photo.</p>}
        {typeof state === "object" && "error" in state && (
          <p role="alert" className="border-l-4 border-red pl-3">
            {state.error}
          </p>
        )}
        {typeof state === "object" && "status" in state && <Answer result={state} />}
      </div>
    </div>
  );
}

function Answer({ result }: { result: ScanResult }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-6xl leading-none">{HEADLINE[result.status]}</h2>
      {result.status !== "unknown" && result.status !== "ai_made" && (
        <p>Match confidence {Math.round(result.confidence * 100)}%.</p>
      )}

      {result.work && (
        <div className="flex flex-col gap-3">
          <p className="text-xl">
            <span className="font-bold">{result.work.title}</span> by {result.work.artist_name}.
          </p>
          <ProofSeal work={result.work} />
          <Link href={`/artists/${result.work.artist_id}`} className="self-start bg-ink px-5 py-3 font-bold text-paper">
            Visit {result.work.artist_name}&apos;s museum
          </Link>
        </div>
      )}

      {result.known && (
        <div className="flex gap-4">
          <Image src={result.known.image_url} alt={result.known.title} width={160} height={200} className="h-auto w-32 bg-paper object-contain" />
          <p className="text-xl">
            <span className="font-bold">{result.known.title}</span>, {result.known.artist_name}, {result.known.date}.{" "}
            {result.known.museum}. You are looking at an image or a copy of this work.
          </p>
        </div>
      )}

      {result.status === "unknown" && (
        <p>
          Artiko found no match. This never means the work is fake: it may simply not be published yet. If you
          made it, publish it with its proof of process.
        </p>
      )}

      {result.sources.length > 0 && (
        <div>
          <h3 className="font-bold">Sources</h3>
          <ul className="list-disc pl-5">
            {result.sources.map((s) => (
              <li key={s.url + s.label}>
                <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
