"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, createWork, unwrap, withToken, type Category, type Work } from "@/lib/api";
import { getApiToken } from "@/lib/api-token";
import { field } from "@/features/artist-space/profile-form";
import { CategoryLabel } from "@/lib/works/category-label";
import { isImportableModel } from "@/features/model-import/import-model";
import { canPublish } from "@/features/model-import/import-state";
import { ModelImportPanel } from "@/features/model-import/model-import-panel";
import { useModelImport } from "@/features/model-import/use-model-import";
import { publishBody } from "@/features/artist-space/publish-body";

const ACCEPT_WORK = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,.glb,.usdz";
const ACCEPT_PROOF = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm";

export function PublishForm({ artistId, categories }: { artistId: string; categories: Category[] }) {
  const { t, rich } = useT();
  // An API error keeps its own message; null means a network failure, translated on render.
  const [state, setState] = useState<"idle" | "publishing" | Work | { error: string | null }>("idle");
  const modelImport = useModelImport();
  const importBlocksPublishing = modelImport.state.status !== "idle" && !canPublish(modelImport.state);

  async function publish(form: FormData) {
    if (importBlocksPublishing) return;
    setState("publishing");
    try {
      const imported = modelImport.state.status === "ready" ? modelImport.state.model : null;
      const body = publishBody(form, imported);
      setState(unwrap(await createWork({ body, ...withToken(await getApiToken()) })));
    } catch (e) {
      setState({ error: e instanceof ApiError ? e.message : null });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-5xl">{t("publish.title")}</h2>
      <p className="max-w-2xl">{t("publish.intro")}</p>
      <form onSubmit={(event) => {
          // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
          event.preventDefault();
          void publish(new FormData(event.currentTarget));
        }} className="flex max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="title" className="font-bold">{t("publish.workTitle")}</label>
          <input id="title" name="title" required maxLength={200} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="font-bold">{t("publish.category")}</label>
          <select id="category" name="category" required className={field}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}><CategoryLabel category={c} /></option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="story" className="font-bold">{t("publish.story")}</label>
          <textarea id="story" name="story" rows={4} maxLength={5000} className={field} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="file" className="font-bold">{t("publish.file")}</label>
          <input
            id="file"
            name="file"
            type="file"
            required
            accept={ACCEPT_WORK}
            aria-describedby="file-help"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file && isImportableModel(file)) void modelImport.start(file);
              else modelImport.reset();
            }}
          />
          <p id="file-help">{t("publish.fileHelp")}</p>
          <ModelImportPanel state={modelImport.state} alt={t("import.previewAlt")} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="proof" className="font-bold">{t("publish.proof")}</label>
          <input id="proof" name="proof" type="file" multiple accept={ACCEPT_PROOF} aria-describedby="proof-help" />
          <p id="proof-help">{t("publish.proofHelp")}</p>
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="ai_declared" value="true" />
          {t("publish.ai")}
        </label>
        <button type="submit" disabled={state === "publishing" || importBlocksPublishing} className="self-start bg-ink px-5 py-3 font-bold text-paper disabled:opacity-60">
          {state === "publishing" ? t("publish.publishing") : t("publish.submit")}
        </button>
        {typeof state === "object" && "error" in state && (
          <p role="alert" className="border-l-4 border-red pl-3">{state.error ?? t("publish.failed")}</p>
        )}
        {typeof state === "object" && "id" in state && (
          <p role="status">
            {rich(state.human_proven ? "publish.doneProven" : "publish.donePlain", {
              link: (text) => (
                <Link href={`/artists/${artistId}`} className="underline underline-offset-4">{text}</Link>
              ),
            })}
          </p>
        )}
      </form>
    </section>
  );
}
