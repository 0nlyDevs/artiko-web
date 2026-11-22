"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, scanImage, unwrap, type ScanResult } from "@/lib/api";
import { IconCamera, IconSeal, IconUpload } from "@/lib/ui/icons";

const BADGE: Record<ScanResult["status"], string> = {
  human_proven: "bg-ink text-white",
  artiko_work: "bg-surface text-ink",
  known_work: "bg-surface text-ink",
  ai_made: "bg-[#FBE9E3] text-[#8E3524]",
  unknown: "bg-surface text-ink",
};

export function ScanForm() {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // A failed check keeps the API's own message; a network failure is stored as null and translated on render.
  const [state, setState] = useState<"idle" | "checking" | ScanResult | { error: string | null }>("idle");

  // The previous preview's object URL is released when a new photo replaces it.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

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
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <div className="flex flex-col gap-3 md:max-w-[460px] md:flex-1">
        <label htmlFor="photo" className="font-semibold">
          {t("scan.photo")}
        </label>
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface">
          {preview ? (
            // A local object URL: next/image cannot optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t("scan.previewAlt")} className="size-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center transition-colors hover:bg-[var(--surface-hover)]"
            >
              <IconUpload size={32} strokeWidth={1.6} />
              <span className="font-semibold">{t("scan.choose")}</span>
            </button>
          )}
          {state === "checking" && (
            <span aria-hidden="true" className="absolute inset-0 overflow-hidden bg-ink/30">
              <span className="scan-sweep" />
              <span className="absolute top-4 left-4 size-7 rounded-tl-md border-t-[3px] border-l-[3px] border-white" />
              <span className="absolute top-4 right-4 size-7 rounded-tr-md border-t-[3px] border-r-[3px] border-white" />
              <span className="absolute bottom-4 left-4 size-7 rounded-bl-md border-b-[3px] border-l-[3px] border-white" />
              <span className="absolute right-4 bottom-4 size-7 rounded-br-md border-r-[3px] border-b-[3px] border-white" />
            </span>
          )}
          {preview && state !== "checking" && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="absolute right-3 bottom-3 inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold"
            >
              <IconCamera size={18} strokeWidth={2} />
              {t("scan.change")}
            </button>
          )}
        </div>
        <input
          ref={input}
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-describedby="photo-help"
          onChange={(e) => e.target.files?.[0] && check(e.target.files[0])}
          className="sr-only"
        />
        <p id="photo-help" className="text-sm text-muted">
          {t("scan.photoHelp")}
        </p>
      </div>

      <div aria-live="polite" className="min-w-0 md:flex-1">
        {state === "idle" && <p className="rounded-md bg-surface p-6 text-muted">{t("scan.waiting")}</p>}
        {state === "checking" && (
          <div aria-busy="true" className="flex flex-col gap-3.5">
            <span className="sr-only">{t("scan.checking")}</span>
            <div className="skel h-9 w-56 rounded-full" />
            <div className="flex items-center gap-4">
              <div className="skel h-[140px] w-28" />
              <div className="flex flex-1 flex-col gap-2.5">
                <div className="skel h-6 w-3/4" />
                <div className="skel h-3.5 w-1/2" />
                <div className="skel h-3.5 w-3/5" />
              </div>
            </div>
          </div>
        )}
        {typeof state === "object" && "error" in state && (
          <p role="alert" className="rounded-md bg-[#FBE9E3] p-4 text-[#8E3524]">
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
    <div className="rise flex flex-col gap-5">
      <p className={`inline-flex min-h-9 items-center gap-2 self-start rounded-full px-3.5 py-1.5 font-bold ${BADGE[result.status]}`}>
        <IconSeal size={18} strokeWidth={2.2} />
        {t(`scan.${result.status}`)}
      </p>

      {result.work && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {result.work.media_kind === "image" && (
              <span className="relative block h-[140px] w-28 shrink-0 overflow-hidden rounded-md bg-surface">
                <Image src={result.work.media_url} alt={t("work.alt", { title: result.work.title, artist: result.work.artist_name })} fill sizes="112px" className="object-cover" />
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <Link href={`/works/${result.work.id}`} className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.04em] hover:underline">
                {result.work.title}
              </Link>
              <p>{t("scan.by", { artist: result.work.artist_name })}</p>
              <p className="text-sm text-muted">{t("scan.confidence", { percent: Math.round(result.confidence * 100) })}</p>
            </div>
          </div>
          <Link href={`/artists/${result.work.artist_id}`} className="btn btn-soft self-start">
            {t("scan.visit", { artist: result.work.artist_name })}
          </Link>
        </div>
      )}

      {result.known && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="relative block h-[140px] w-28 shrink-0 overflow-hidden rounded-md bg-surface">
              <Image src={result.known.image_url} alt={result.known.title} fill sizes="112px" className="object-contain" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.04em]">{result.known.title}</p>
              <p>
                {result.known.artist_name}, {result.known.date}. {result.known.museum}.
              </p>
              <p className="text-sm text-muted">{t("scan.confidence", { percent: Math.round(result.confidence * 100) })}</p>
            </div>
          </div>
          <p className="rounded-md bg-surface px-4 py-3.5">{t("scan.knownNote")}</p>
        </div>
      )}

      {result.status === "ai_made" && <p className="max-w-[52ch] leading-relaxed">{t("scan.aiNote")}</p>}

      {result.status === "unknown" && (
        <>
          <p className="max-w-[52ch] leading-relaxed">{t("scan.noMatch")}</p>
          <Link href="/me?tab=publish" className="btn btn-ink self-start">
            {t("explore.publish")}
          </Link>
        </>
      )}

      {result.sources.length > 0 && (
        <div className="border-t border-line pt-4">
          <h3 className="mb-2 text-[13px] font-bold text-muted">{t("scan.sources")}</h3>
          <ul className="flex flex-col gap-1.5">
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
