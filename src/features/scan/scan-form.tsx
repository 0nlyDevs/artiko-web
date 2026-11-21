"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import { ProofSeal } from "@/lib/works/proof-seal";
import { ApiError, scanImage, unwrap, type ScanResult } from "@/lib/api";

export function ScanForm() {
  const { t } = useT();
  const [preview, setPreview] = useState<string | null>(null);
  // A failed check keeps the API's own message; a network failure is stored as null and translated on render.
  const [state, setState] = useState<"idle" | "checking" | ScanResult | { error: string | null }>("idle");

  async function check(file: File) {
    setPreview(URL.createObjectURL(file));
    setState("checking");
    try {
      setState(unwrap(await scanImage({ body: { file } })));
    } catch (e) {
      setState({ error: e instanceof ApiError ? e.message : null });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <label htmlFor="photo" className="font-bold">
          {t("scan.photo")}
        </label>
        <input
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="photo-help"
          onChange={(e) => e.target.files?.[0] && check(e.target.files[0])}
          className="file:mr-4 file:bg-ink file:px-4 file:py-2 file:font-bold file:text-paper"
        />
        <p id="photo-help">{t("scan.photoHelp")}</p>
        {preview && (
          // A local object URL: next/image cannot optimise it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={t("scan.previewAlt")} className="max-h-96 w-full bg-paper object-contain" />
        )}
      </div>

      <div aria-live="polite">
        {state === "checking" && <p className="text-xl">{t("scan.checking")}</p>}
        {typeof state === "object" && "error" in state && (
          <p role="alert" className="border-l-4 border-red pl-3">
            {state.error ?? t("scan.failed")}
          </p>
        )}
        {typeof state === "object" && "status" in state && <Answer result={state} />}
      </div>
    </div>
  );
}

function Answer({ result }: { result: ScanResult }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-6xl leading-none">{t(`scan.${result.status}`)}</h2>
      {result.status !== "unknown" && result.status !== "ai_made" && (
        <p>{t("scan.confidence", { percent: Math.round(result.confidence * 100) })}</p>
      )}

      {result.work && (
        <div className="flex flex-col gap-3">
          <p className="text-xl">
            <span className="font-bold">{result.work.title}</span> {t("scan.by", { artist: result.work.artist_name })}
          </p>
          <ProofSeal work={result.work} />
          <Link href={`/artists/${result.work.artist_id}`} className="self-start bg-ink px-5 py-3 font-bold text-paper">
            {t("scan.visit", { artist: result.work.artist_name })}
          </Link>
        </div>
      )}

      {result.known && (
        <div className="flex gap-4">
          <Image src={result.known.image_url} alt={result.known.title} width={160} height={200} className="h-auto w-32 bg-paper object-contain" />
          <p className="text-xl">
            <span className="font-bold">{result.known.title}</span>, {result.known.artist_name}, {result.known.date}.{" "}
            {result.known.museum}. {t("scan.knownNote")}
          </p>
        </div>
      )}

      {result.status === "unknown" && <p>{t("scan.noMatch")}</p>}

      {result.sources.length > 0 && (
        <div>
          <h3 className="font-bold">{t("scan.sources")}</h3>
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
