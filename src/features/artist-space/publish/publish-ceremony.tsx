"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useT } from "@/i18n/locale";
import type { Work } from "@/lib/api";
import { Logo } from "@/kanto/components/logo/Logo";
import { HangingStage } from "@/kanto/features/hanging/HangingStage";
import { Button, ButtonLink } from "@/lib/ui/kanto";
import { cx } from "@/lib/ui/kanto/cx";
import { categoryLabel } from "@/lib/works/category-label";
import { workSources, workStand, workWall } from "./hanging-from-work";
import type { DoneCopy } from "./publish-done";
import styles from "./publish.module.css";
import { shortFingerprint } from "./work-facts";

export interface PublishCeremonyProps {
  /** The work of the 201 answer. */
  work: Work;
  copy: DoneCopy;
  /** Address of the artist's room. */
  roomHref: string;
  /** « Publier une autre œuvre »: back to an empty first step. */
  onAnother: () => void;
  /** Closes the stage on the confirmation it covers. */
  onClose: () => void;
}

/**
 * The hanging ceremony of the museum, played over the confirmation once a work is published: the room lights
 * up, the work comes down onto its stand, then « Misaotra ! Votre œuvre est accrochée. ». It is a modal
 * dialog in gallery black; its three ways out fade the stage before they act.
 */
export function PublishCeremony({ work, copy, roomHref, onAnother, onClose }: PublishCeremonyProps) {
  const { t, locale } = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || element.open || typeof element.showModal !== "function") return;
    element.showModal();
    return () => element.close();
  }, []);

  const title = work.title.trim() || t("publish.untitled");
  const cartel = useMemo(
    () => ({
      number: "",
      reference: t("publish.ceremony.fingerprint", { hash: shortFingerprint(work.sha256) }),
      title,
      author: work.artist_name,
      medium: categoryLabel({ id: work.category }, locale),
      note: null,
      isDemo: false,
    }),
    [t, locale, title, work.sha256, work.artist_name, work.category],
  );
  const sources = useMemo(() => workSources(work), [work]);
  const labels = useMemo(
    () => ({
      skip: t("publish.ceremony.skip"),
      skipAria: t("publish.ceremony.skipAria"),
      viewer: { front: t("viewer.view.front"), right: t("viewer.view.right"), back: t("viewer.view.back"), left: t("viewer.view.left"), prompt: t("publish.ceremony.turn") },
    }),
    [t],
  );

  return (
    <dialog
      ref={dialog}
      className={styles.ceremony}
      aria-label={t("publish.ceremony.label")}
      // Escape skips the animation, as in the museum; the stage is left through one of its three actions.
      onCancel={(event) => event.preventDefault()}
    >
      <p role="status" className="visually-hidden">
        {t("publish.done.announce", { title })}
      </p>
      <HangingStage
        status="published"
        landmarks="overlay"
        stand={workStand(work)}
        sources={sources}
        cartel={cartel}
        alt={`${title}, ${work.artist_name}`}
        wall={workWall(work.category)}
        copy={{ eyebrow: copy.eyebrow, thanks: copy.thanks, lines: copy.lines, paragraph: copy.paragraph }}
        labels={labels}
        brand={(slots) => (
          <span className={cx(slots.classes.logo, styles.ceremonyBrand)}>
            <Logo />
          </span>
        )}
        actions={(slots) => (
          <>
            <ButtonLink
              href={roomHref}
              withArrow
              className={slots.classes.primary}
              onClick={(event) => {
                // The lamp goes out before the room opens; the address stays on the link for a new tab.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                event.preventDefault();
                void slots.leave("museum").then(() => router.push(roomHref));
              }}
            >
              {t("publish.done.room")}
            </ButtonLink>
            <Button variant="secondary" className={slots.classes.secondary} onClick={() => void slots.leave("hall").then(onAnother)}>
              {t("publish.done.another")}
            </Button>
            <p className={slots.classes.more}>
              <button type="button" onClick={() => void slots.leave("hall").then(onClose)}>
                {t("publish.done.details")}
              </button>
            </p>
          </>
        )}
      />
    </dialog>
  );
}
