"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, createExposition, createWork, unwrap, type Category, type CategoryId, type Exposition, type Work } from "@/lib/api";
import { apiErrorText } from "@/lib/api-messages";
import { callWithToken } from "@/lib/api-token";
import { IconAdd, IconUpload } from "@/lib/ui/icons";
import { CategoryLabel } from "@/lib/works/category-label";
import { isImportableModel } from "@/features/model-import/import-model";
import { canPublish } from "@/features/model-import/import-state";
import { ModelImportPanel } from "@/features/model-import/model-import-panel";
import { useModelImport } from "@/features/model-import/use-model-import";
import { publishBody } from "@/features/artist-space/publish-body";

const ACCEPT_WORK = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,.glb,.usdz";
const ACCEPT_PROOF = "image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm";
const MAX_PROOFS = 5;
const NEW_EXPOSITION = "__new";

type Visibility = "public" | "reviewers";

/** Object URLs for the chosen image files, released when the selection changes. */
function usePreviews(files: File[]) {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  useEffect(() => {
    const next = files.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : null));
    const frame = requestAnimationFrame(() => setUrls(next));
    return () => {
      cancelAnimationFrame(frame);
      next.forEach((u) => u && URL.revokeObjectURL(u));
    };
  }, [files]);
  return urls;
}

export function PublishForm({
  categories,
  expositions,
  onPublished,
}: {
  categories: Category[];
  expositions: Exposition[];
  onPublished: (work: Work, exposition: Exposition | null) => void;
}) {
  const { t, rich } = useT();
  const [file, setFile] = useState<File[]>([]);
  const [proofs, setProofs] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("reviewers");
  const [expo, setExpo] = useState("");
  // An API error is translated on render (api-messages.ts); null is any other failure, translated too.
  const [state, setState] = useState<"idle" | "publishing" | Work | { error: ApiError | null }>("idle");
  const [workPreview] = usePreviews(file);
  const proofPreviews = usePreviews(proofs);
  const modelImport = useModelImport();
  const importBlocksPublishing = modelImport.state.status !== "idle" && !canPublish(modelImport.state);

  async function publish(form: FormData) {
    if (!file[0] || importBlocksPublishing) return;
    setState("publishing");
    try {
      let created: Exposition | null = null;
      if (expo === NEW_EXPOSITION) {
        const title = String(form.get("expo_title") ?? "");
        created = await callWithToken((auth) => createExposition({ body: { title }, ...auth }).then(unwrap));
      }
      const expositionId = created?.id ?? (expo || undefined);
      const fields = {
        title: String(form.get("title") ?? ""),
        category: String(form.get("category") ?? "") as CategoryId,
        story: String(form.get("story") ?? ""),
        ai_declared: form.get("ai_declared") === "true",
        proof: proofs,
        proof_visibility: visibility,
        ...(expositionId && { exposition_id: expositionId }),
      };
      const imported = modelImport.state.status === "ready" ? modelImport.state.model : null;
      const body = publishBody(fields, file[0], imported);
      // A call of its own: replaying it after a refused token must not create the exposition a second time.
      const work = await callWithToken((auth) => createWork({ body, ...auth }).then(unwrap));
      setState(work);
      onPublished(work, created);
    } catch (e) {
      setState({ error: e instanceof ApiError ? e : null });
    }
  }

  return (
    <form
      onSubmit={(event) => {
        // Not `action={...}`: React resets the fields after an action even when it fails, wiping what was typed.
        event.preventDefault();
        void publish(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-8"
    >
      <p className="max-w-[70ch] leading-relaxed">{t("publish.intro")}</p>
      <div className="flex flex-col gap-8 md:flex-row">
        <div className="flex flex-col gap-6 md:flex-1">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">{t("publish.file")}</span>
            <label className="relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-md bg-surface p-6 text-center transition-colors hover:bg-[var(--surface-hover)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
              {workPreview ? (
                // A local object URL: next/image cannot optimise it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={workPreview} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <>
                  <IconUpload size={32} strokeWidth={1.6} />
                  <span className="font-semibold">{file[0]?.name ?? t("publish.drop")}</span>
                </>
              )}
              <input
                id="file"
                name="file"
                type="file"
                required
                accept={ACCEPT_WORK}
                aria-describedby="file-help"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  setFile(chosen ? [chosen] : []);
                  if (chosen && isImportableModel(chosen)) void modelImport.start(chosen);
                  else modelImport.reset();
                }}
                className="sr-only"
              />
            </label>
            <p id="file-help" className="text-[13px] text-muted">{t("publish.fileHelp")}</p>
            <ModelImportPanel state={modelImport.state} alt={t("import.previewAlt")} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">{t("publish.proof")}</span>
            <div className="grid grid-cols-5 gap-2">
              {proofs.map((p, i) => (
                <button
                  key={`${p.name}-${i}`}
                  type="button"
                  onClick={() => setProofs(proofs.filter((_, j) => j !== i))}
                  aria-label={t("publish.removeProof", { name: p.name })}
                  className="pop relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-surface p-1 text-[11px] break-all"
                >
                  {proofPreviews[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proofPreviews[i] as string} alt="" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    p.name
                  )}
                </button>
              ))}
              {proofs.length < MAX_PROOFS && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md bg-surface transition-colors hover:bg-[var(--surface-hover)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink">
                  <IconAdd size={24} />
                  <span className="sr-only">{t("publish.addProof")}</span>
                  <input
                    type="file"
                    multiple
                    accept={ACCEPT_PROOF}
                    aria-describedby="proof-help"
                    onChange={(e) => {
                      setProofs([...proofs, ...Array.from(e.target.files ?? [])].slice(0, MAX_PROOFS));
                      e.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
            <p id="proof-help" className="text-[13px] text-muted">{t("publish.proofHelp")}</p>
          </div>

          <div className="flex flex-col gap-2">
            <span id="visibility" className="font-semibold">{t("publish.visibility")}</span>
            <div role="group" aria-labelledby="visibility" className="seg seg--light">
              <span aria-hidden="true" className="seg-pill" data-at={visibility === "reviewers" ? 1 : 0} />
              <button type="button" aria-pressed={visibility === "public"} onClick={() => setVisibility("public")}>
                {t("publish.public")}
              </button>
              <button type="button" aria-pressed={visibility === "reviewers"} onClick={() => setVisibility("reviewers")}>
                {t("publish.reviewers")}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 md:flex-1">
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="font-semibold">{t("publish.workTitle")}</label>
            <input id="title" name="title" required maxLength={200} className="input" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="category" className="font-semibold">{t("publish.category")}</label>
            <select id="category" name="category" required className="input">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  <CategoryLabel category={c} />
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="expo" className="font-semibold">{t("publish.exposition")}</label>
            <select id="expo" value={expo} onChange={(e) => setExpo(e.target.value)} className="input">
              <option value="">{t("publish.noExposition")}</option>
              {expositions.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
              <option value={NEW_EXPOSITION}>{t("publish.newExposition")}</option>
            </select>
            {expo === NEW_EXPOSITION && (
              <input name="expo_title" required maxLength={200} aria-label={t("publish.expositionTitle")} placeholder={t("publish.expositionTitle")} className="input pop" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="story" className="font-semibold">{t("publish.story")}</label>
            <textarea id="story" name="story" rows={5} maxLength={5000} className="input" />
          </div>
          <label className="flex cursor-pointer items-start gap-3 leading-relaxed">
            <input type="checkbox" name="ai_declared" value="true" className="mt-1 size-5 shrink-0 accent-[var(--ink)]" />
            {t("publish.ai")}
          </label>
          <button type="submit" disabled={state === "publishing" || importBlocksPublishing} className="btn btn-ink min-h-[52px]">
            {state === "publishing" && <span className="spin" aria-hidden="true" />}
            {state === "publishing" ? t("publish.publishing") : t("publish.submit")}
          </button>
          {typeof state === "object" && "error" in state && (
            <p role="alert" className="rounded-md bg-[#FBE9E3] p-4 text-[#8E3524]">{state.error ? apiErrorText(state.error, t) : t("publish.failed")}</p>
          )}
          {typeof state === "object" && "id" in state && (
            <p role="status" className="pop rounded-md bg-surface p-4 font-semibold">
              {rich(state.human_proven ? "publish.doneProven" : "publish.donePlain", {
                link: (text) => <Link href={`/works/${state.id}`} className="underline underline-offset-4">{text}</Link>,
              })}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
