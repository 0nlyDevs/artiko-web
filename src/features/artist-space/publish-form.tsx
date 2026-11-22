"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Ref } from "react";
import { useT } from "@/i18n/locale";
import { createExposition, createWork, unwrap, type ApiError, type Artist, type Category, type Exposition, type Work } from "@/lib/api";
import { callWithToken } from "@/lib/api-token";
import { authClient } from "@/lib/auth-client";
import { categoryLabel } from "@/lib/works/category-label";
import { isImportableModel } from "@/features/model-import/import-model";
import { canPublish } from "@/features/model-import/import-state";
import { useModelImport } from "@/features/model-import/use-model-import";
import {
  clearDraft,
  draftStorage,
  EMPTY_DRAFT,
  forgetFiles,
  isEmptyDraft,
  NEW_EXPOSITION,
  readDraft,
  rememberedFiles,
  rememberFiles,
  withCreatedExposition,
  withKnownExposition,
  writeDraft,
  type Draft,
} from "@/features/artist-space/publish/draft";
import { addProofs, checkWorkFile, mediaKind, validProofs, type FileProblem, type ProofItem } from "@/features/artist-space/publish/file-checks";
import { extensionOf, kindKey, sizeLabel } from "@/features/artist-space/publish/file-labels";
import { FileThumb } from "@/features/artist-space/publish/file-thumb";
import { MiniProfile } from "@/features/artist-space/publish/mini-profile";
import { failedOutcome } from "@/features/artist-space/publish/outcome";
import { ProofsStep } from "@/features/artist-space/publish/proofs-step";
import { PublishCeremony } from "@/features/artist-space/publish/publish-ceremony";
import { PublishDone, roomHref, useDoneCopy } from "@/features/artist-space/publish/publish-done";
import { PublishFrame } from "@/features/artist-space/publish/publish-frame";
import { PublishRefused } from "@/features/artist-space/publish/publish-refused";
import styles from "@/features/artist-space/publish/publish.module.css";
import { submitWork, type PublishApi } from "@/features/artist-space/publish/submit-work";
import { useImageSize, useObjectUrl } from "@/features/artist-space/publish/use-file-facts";
import { WorkStep } from "@/features/artist-space/publish/work-step";

// The two writes of a publication, as the signed-in artist. Each is a call of its own: replaying `POST /works`
// after a refused token must not create the exposition a second time.
const api: PublishApi = {
  createExposition: (body) => callWithToken((auth) => createExposition({ body, ...auth }).then(unwrap)),
  createWork: (body) => callWithToken((auth) => createWork({ body, ...auth }).then(unwrap)),
};

/** The states of `/me?tab=publish`: the two steps (frames R1 and R2), the refusal (R6) and the confirmation (R5). */
type View =
  | { name: "work" }
  | { name: "proofs" }
  | { name: "refused"; caseId: string | null; at: Date }
  | { name: "done"; work: Work; proofsSent: number; ceremony: boolean };

/** A work file refused before anything was sent: the file already chosen, if any, stays. */
type RefusedFile = { name: string; size: number; problem: FileProblem };

/** The confirmation with, over it, the hanging ceremony until the artist leaves the stage. */
function Published({ view, headingRef, onAnother, onCloseCeremony }: { view: Extract<View, { name: "done" }>; headingRef: Ref<HTMLHeadingElement>; onAnother: () => void; onCloseCeremony: () => void }) {
  const copy = useDoneCopy(view.work);
  return (
    <>
      <PublishDone work={view.work} proofsSent={view.proofsSent} headingRef={headingRef} onAnother={onAnother} />
      {view.ceremony && <PublishCeremony work={view.work} copy={copy} roomHref={roomHref(view.work)} onAnother={onAnother} onClose={onCloseCeremony} />}
    </>
  );
}

export function PublishForm({
  categories,
  expositions,
  artist = null,
  onPublished,
}: {
  categories: Category[];
  expositions: Exposition[];
  /** The artist who signs the work, for « Signée … » and for the profile asked by a 403 `not_an_artist`. */
  artist?: Artist | null;
  onPublished: (work: Work, exposition: Exposition | null) => void;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  // The draft belongs to the signed-in account: another account on this browser never reads it.
  const owner = authClient.useSession().data?.user.id ?? "";
  const restore = () => ({
    draft: withKnownExposition(readDraft(draftStorage(), owner), expositions.map((e) => e.id)),
    files: rememberedFiles(owner),
  });
  const [restored] = useState(restore);
  const [draft, setDraft] = useState<Draft>(restored.draft);
  const [file, setFile] = useState<File | null>(restored.files.work);
  const [proofs, setProofs] = useState<ProofItem[]>(restored.files.proofs);
  // The session can be read after the form is drawn, or change under it: the form then takes what belongs to
  // that account, and nothing typed for another one is saved under its name.
  const [restoredFor, setRestoredFor] = useState(owner);
  if (restoredFor !== owner) {
    const next = restore();
    setRestoredFor(owner);
    setDraft(next.draft);
    setFile(next.files.work);
    setProofs(next.files.proofs);
  }
  const [view, setView] = useState<View>({ name: "work" });
  const [refusedFile, setRefusedFile] = useState<RefusedFile | null>(null);
  // Which step was sent at least once: its empty required fields are then pointed out.
  const [tried, setTried] = useState({ work: false, proofs: false });
  const [overflow, setOverflow] = useState(0);
  const [sending, setSending] = useState(false);
  // The last refusal, shown under the button. `error` is null when no answer came, absent once dealt with.
  const [failure, setFailure] = useState<{ error?: ApiError | null; profile: boolean } | null>(null);
  // Expositions created by a try of this publication: the page learns of them once the work is published.
  const [created, setCreated] = useState<Exposition[]>([]);
  const [profile, setProfile] = useState<Artist | null>(artist);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const modelImport = useModelImport();
  const heading = useRef<HTMLHeadingElement>(null);

  // Who signs: the profile when the page hands it over, else the name the API puts on the artist's expositions.
  const signatory = profile?.display_name ?? expositions[0]?.artist_name ?? null;
  const kind = file ? mediaKind(file) : null;
  const isModel = kind === "model";
  // A scan is published as the files the import prepares: until they are ready, nothing can be sent.
  const importBlocks = isModel && !canPublish(modelImport.state);
  const imported = isModel && modelImport.state.status === "ready" ? modelImport.state.model : null;
  const imageUrl = useObjectUrl(kind === "image" ? file : null);
  const previewUrl = isModel && modelImport.state.status === "ready" ? modelImport.state.preview.poster : imageUrl;
  const pixels = useImageSize(kind === "image" ? file : null);

  // The text of the draft stays in this browser, the files in memory, until the work is published.
  useEffect(() => writeDraft(draftStorage(), owner, draft), [owner, draft]);
  useEffect(() => rememberFiles(owner, { work: file, proofs }), [owner, file, proofs]);

  // A scan kept from an earlier visit of this form is prepared again: its variants were not kept.
  const { start: startImport } = modelImport;
  const importIdle = modelImport.state.status === "idle";
  useEffect(() => {
    if (file && isImportableModel(file) && importIdle) void startImport(file);
  }, [file, importIdle, startImport]);

  // A new screen is read from its top: the headline takes the focus. The ceremony covers the confirmation first.
  const screen = view.name === "done" && view.ceremony ? "ceremony" : view.name;
  const shown = useRef(screen);
  useEffect(() => {
    if (shown.current === screen) return;
    shown.current = screen;
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
  }, [screen]);

  const patch = (change: Partial<Draft>) => setDraft((current) => ({ ...current, ...change }));

  function chooseFile(chosen: File) {
    const problem = checkWorkFile(chosen);
    if (problem) {
      setRefusedFile({ name: chosen.name, size: chosen.size, problem });
      return;
    }
    setRefusedFile(null);
    setFailure(null);
    setFile(chosen);
    if (isImportableModel(chosen)) void modelImport.start(chosen);
    else modelImport.reset();
  }

  function removeFile() {
    setRefusedFile(null);
    setFile(null);
    modelImport.reset();
  }

  function emptyForm() {
    clearDraft(draftStorage());
    forgetFiles();
    setDraft(EMPTY_DRAFT);
    setFile(null);
    setProofs([]);
    setRefusedFile(null);
    setTried({ work: false, proofs: false });
    setOverflow(0);
    setFailure(null);
    setCreated([]);
    setConfirmingCancel(false);
    modelImport.reset();
  }

  function continueToProofs() {
    setTried((current) => ({ ...current, work: true }));
    if (!draft.title.trim()) document.getElementById("title")?.focus();
    if (!file || !draft.title.trim() || !draft.category || importBlocks) return;
    setRefusedFile(null);
    setView({ name: "proofs" });
  }

  async function publish() {
    setTried((current) => ({ ...current, proofs: true }));
    if (!file || sending || importBlocks) return;
    if (draft.exposition === NEW_EXPOSITION && !draft.expositionTitle.trim()) return;
    setSending(true);
    setFailure(null);
    const sent = validProofs(proofs);
    const made: Exposition[] = [];
    try {
      const work = await submitWork(api, { draft, file, imported, proofs: sent }, (exposition) => {
        // Remembered at once: if the work is refused, the next try joins this exposition instead of creating another.
        made.push(exposition);
        setCreated((current) => [exposition, ...current]);
        setDraft((current) => withCreatedExposition(current, exposition.id));
      });
      const joined = [...made, ...created].find((exposition) => exposition.id === work.exposition_id) ?? null;
      emptyForm();
      setView({ name: "done", work, proofsSent: sent.length, ceremony: true });
      onPublished(work, joined);
    } catch (error) {
      const outcome = failedOutcome(error);
      if (outcome.view === "refused") setView({ name: "refused", caseId: outcome.caseId, at: new Date() });
      else if (outcome.view === "form") setFailure({ error: outcome.error, profile: outcome.profile });
    } finally {
      setSending(false);
    }
  }

  function backToWork() {
    setFailure(null);
    setView({ name: "work" });
  }

  function cancel(erase: boolean) {
    setConfirmingCancel(false);
    if (!erase) return;
    emptyForm();
    router.push("/me");
  }

  if (view.name === "done") {
    return <Published view={view} headingRef={heading} onAnother={() => setView({ name: "work" })} onCloseCeremony={() => setView({ ...view, ceremony: false })} />;
  }

  if (view.name === "refused") {
    return <PublishRefused caseId={view.caseId} title={draft.title} category={draft.category} at={view.at} headingRef={heading} onChooseAnother={backToWork} />;
  }

  if (view.name === "work") {
    const fileError = refusedFile
      ? `${refusedFile.name} — ${t(`publish.file.error.${refusedFile.problem}`, { size: sizeLabel(refusedFile.size, locale) })}`
      : tried.work && !file
        ? t("publish.file.error.missing")
        : null;
    return (
      <PublishFrame step={1} headingRef={heading}>
        <WorkStep
          categories={categories}
          draft={draft}
          onDraft={patch}
          file={file}
          kind={kind}
          previewUrl={previewUrl}
          pixels={pixels}
          fileError={fileError}
          missing={{ title: tried.work && !draft.title.trim(), category: tried.work && !draft.category }}
          importState={modelImport.state}
          importBlocks={importBlocks}
          artistName={signatory}
          confirmingCancel={confirmingCancel}
          onAskCancel={() => (file || proofs.length > 0 || !isEmptyDraft(draft) ? setConfirmingCancel(true) : cancel(true))}
          onCancel={cancel}
          onChoose={chooseFile}
          onRemove={removeFile}
          onContinue={continueToProofs}
        />
      </PublishFrame>
    );
  }

  const known = [...created.filter((exposition) => !expositions.some((e) => e.id === exposition.id)), ...expositions];
  const fileLine = file ? [kind ? `${t(kindKey(kind))} ${extensionOf(file.name)}`.trim() : extensionOf(file.name), sizeLabel(file.size, locale)].filter(Boolean).join(", ") : "";
  return (
    <PublishFrame
      step={2}
      headingRef={heading}
      onEdit={sending ? undefined : backToWork}
      recap={
        <div className={styles.recap}>
          <FileThumb url={previewUrl} kind={kind} sizes="56px" />
          <div>
            <p className={styles.recapTitle}>{draft.title.trim() || t("publish.untitled")}</p>
            <p className={styles.recapLine}>{[draft.category && categoryLabel({ id: draft.category }, locale), fileLine].filter(Boolean).join(" · ")}</p>
            {signatory && <p className={styles.recapLine}>{[t("publish.signed", { name: signatory }), profile?.region].filter(Boolean).join(" · ")}</p>}
          </div>
        </div>
      }
    >
      <ProofsStep
        draft={draft}
        onDraft={patch}
        proofs={proofs}
        overflow={overflow}
        onAddProofs={(files, replace) => {
          const next = addProofs(proofs, files, Math.max(0, ...proofs.map((item) => item.id)) + 1, replace);
          setProofs(next.items);
          setOverflow(next.overflow);
        }}
        onRemoveProof={(id) => {
          setProofs(proofs.filter((item) => item.id !== id));
          setOverflow(0);
        }}
        expositions={known}
        missingExpositionTitle={tried.proofs && draft.exposition === NEW_EXPOSITION && !draft.expositionTitle.trim()}
        sending={sending}
        blocked={!file || importBlocks}
        failure={failure && "error" in failure ? failure.error : undefined}
        onBack={backToWork}
        onPublish={() => void publish()}
      />
      {failure?.profile && (
        <MiniProfile
          artist={profile}
          onSaved={(saved) => {
            setProfile(saved);
            setFailure({ profile: true });
          }}
        />
      )}
    </PublishFrame>
  );
}
