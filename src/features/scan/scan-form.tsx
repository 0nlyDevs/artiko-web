"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/locale";
import { ScanAnswer } from "@/features/scan/scan-answer";
import { canRetry, refuseFile, retryWait, SCAN_ACCEPT, scanErrorKey, type FileRefusal } from "@/features/scan/scan-logic";
import { useCountdown } from "@/features/scan/use-countdown";
import { useTouchScreen } from "@/features/scan/use-touch-screen";
import { ApiError, scanImage, unwrap, type ScanResult } from "@/lib/api";
import { IconCamera } from "@/lib/ui/icons";
import { Button, DropZone, StatusBanner } from "@/lib/ui/kanto";
import styles from "./scan.module.css";

// A failed check keeps the API's error, translated on render; any other failure is stored as null and translated too.
type State = { step: "idle" } | { step: "checking" } | { step: "answer"; result: ScanResult } | { step: "failed"; error: ApiError | null };

export function ScanForm() {
  const { t } = useT();
  const chooser = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const [refusal, setRefusal] = useState<FileRefusal | null>(null);
  const [state, setState] = useState<State>({ step: "idle" });
  const { left, start } = useCountdown();
  // On a touch screen the zone opens the photo library and a second button the camera; elsewhere a photo is dropped or chosen.
  const touch = useTouchScreen();
  const checking = state.step === "checking";
  // Nothing is sent during a check or while the API asks to wait: one call at a time.
  const locked = checking || left > 0;

  // The previous preview's object URL is released when a new photo replaces it.
  const url = photo?.url;
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  async function send(file: File) {
    if (sending.current) return;
    sending.current = true;
    setState({ step: "checking" });
    try {
      setState({ step: "answer", result: unwrap(await scanImage({ body: { file } })) });
    } catch (e) {
      const error = e instanceof ApiError ? e : null;
      const wait = retryWait(error);
      if (wait !== null) start(wait);
      setState({ step: "failed", error });
    } finally {
      sending.current = false;
    }
  }

  /** A chosen, dropped or shot file: checked here first (type, 5 MB), then sent. */
  function take(file: File | undefined) {
    if (!file || locked) return;
    const refused = refuseFile(file);
    setRefusal(refused);
    if (refused) return;
    setPhoto({ file, url: URL.createObjectURL(file) });
    void send(file);
  }

  const refusalText = refusal ? t(scanErrorKey(refusal) ?? "scan.failed") : undefined;
  const failure = state.step === "failed" ? state : null;
  const limited = failure !== null && retryWait(failure.error) !== null;

  return (
    <div className={styles.bench}>
      <section className={styles.step} role="group" aria-labelledby="scan-photo" aria-describedby="scan-photo-help">
        <h2 id="scan-photo" className={styles.sectionLabel}>
          <span aria-hidden="true">01 — </span>
          {t("scan.photo")}
        </h2>

        {photo ? (
          <figure className={styles.photo}>
            <Image src={photo.url} alt={t("scan.previewAlt")} fill unoptimized className={styles.photoImage} />
            {checking && (
              <span aria-hidden="true" className={styles.sweep}>
                <span className="scan-sweep" />
                <span className={`${styles.corner} ${styles.topLeft}`} />
                <span className={`${styles.corner} ${styles.topRight}`} />
                <span className={`${styles.corner} ${styles.bottomLeft}`} />
                <span className={`${styles.corner} ${styles.bottomRight}`} />
              </span>
            )}
          </figure>
        ) : (
          <DropZone title={t(touch ? "scan.choose" : "scan.drop")} accept={SCAN_ACCEPT} disabled={locked} error={refusalText} onFiles={(files) => take(files[0])} />
        )}
        {photo && refusalText && <StatusBanner tone="error">{refusalText}</StatusBanner>}

        <p id="scan-photo-help" className={styles.help}>
          {t("scan.photoHelp")}
        </p>

        {(photo || touch) && (
          <div className={styles.actions}>
            {photo && (
              <Button variant="secondary" size="small" disabled={locked} onClick={() => chooser.current?.click()}>
                {t("scan.change")}
              </Button>
            )}
            {touch && (
              <Button variant="secondary" size="small" disabled={locked} className={styles.shoot} onClick={() => camera.current?.click()}>
                <IconCamera size={16} />
                {t("scan.take")}
              </Button>
            )}
          </div>
        )}

        {/* Emptied after each choice, so choosing the same file again checks it again. */}
        <input
          ref={chooser}
          type="file"
          accept={SCAN_ACCEPT}
          hidden
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={camera}
          type="file"
          accept={SCAN_ACCEPT}
          capture="environment"
          hidden
          onChange={(e) => {
            take(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </section>

      <section className={styles.step} aria-labelledby="scan-answer">
        <h2 id="scan-answer" className={styles.sectionLabel}>
          <span aria-hidden="true">02 — </span>
          {t("scan.answer")}
        </h2>
        <div aria-live="polite" className={styles.answer}>
          {state.step === "idle" && <p className={styles.waiting}>{t("scan.waiting")}</p>}
          {checking && (
            <div aria-busy="true" className={styles.skeleton}>
              <span className="visually-hidden">{t("scan.checking")}</span>
              <div className={`skel ${styles.skelLabel}`} />
              <div className={styles.skelFound}>
                <div className={`skel ${styles.skelThumb}`} />
                <div className={styles.skelLines}>
                  <div className={`skel ${styles.skelTitle}`} />
                  <div className={`skel ${styles.skelLine}`} />
                  <div className={`skel ${styles.skelLine}`} />
                </div>
              </div>
            </div>
          )}
          {failure && (
            <>
              <StatusBanner tone="error">
                {limited ? t("scan.rateLimited") : failure.error ? t(scanErrorKey(failure.error.code) ?? "scan.failed") : t("scan.failed")}
                {/* The seconds tick without being read out one by one; the end of the wait is announced. */}
                {limited && (left > 0 ? <span role="timer" className={styles.timer}>{t("scan.retryIn", { seconds: left })}</span> : <span className={styles.timer}>{t("scan.retryNow")}</span>)}
              </StatusBanner>
              {photo && canRetry(failure.error) && (
                <Button size="small" disabled={locked} className={styles.retry} onClick={() => void send(photo.file)}>
                  {t("error.retry")}
                </Button>
              )}
            </>
          )}
          {state.step === "answer" && <ScanAnswer result={state.result} />}
        </div>
      </section>
    </div>
  );
}
