import type { Ref } from 'react';
import backPaperAsset from '../../../assets/icons/back-paper.svg';
import nextPaperAsset from '../../../assets/icons/next-paper.svg';
import zoomPaperAsset from '../../../assets/icons/zoom-paper.svg';
import { cx } from '../../../lib/cx';
import type { Artwork } from '../data/rooms';
import { chromeStyles, FocusBackButton, pad } from '../GalleryChrome';
import styles from './FocusHud.module.css';
import { resetView, turnStep } from './gallery-store';
import type { SceneKind } from './scene-annex';

// Next imports an image as { src, width, height }: the markup needs its URL.
const backPaper = backPaperAsset.src;
const nextPaper = nextPaperAsset.src;
const zoomPaper = zoomPaperAsset.src;

export interface FocusHudProps {
  /** The work in focus, or the last one while the controls fade out. */
  artwork: Artwork | undefined;
  /** Number of works in its room, for the counter. */
  total: number;
  kind: SceneKind;
  /** Off stage: no work is in focus, or the notice covers the controls. */
  hidden: boolean;
  navDisabled: boolean;
  onLeave: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onReadNotice: () => void;
  /** "Observer de près", for a painting. */
  onObserve: () => void;
  backRef: Ref<HTMLButtonElement>;
  noticeRef: Ref<HTMLButtonElement>;
  observeRef: Ref<HTMLButtonElement>;
}

interface TurnIconProps {
  direction: 1 | -1;
}

/** A round arrow, clockwise for 1 and mirrored for -1. */
function TurnIcon({ direction }: TurnIconProps) {
  return (
    <svg
      className={direction === -1 ? styles.mirrored : undefined}
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.3 12.6A5.6 5.6 0 1 1 13.9 6.3" />
      <path d="M14.2 2.6v3.9h-3.9" />
    </svg>
  );
}

/**
 * The controls of the focus: "Retour à la salle" top left, and at the
 * bottom a compact caption between the previous and next arrows, the
 * button that opens the notice, then what the work allows. A 3D work turns
 * under the hand, with two buttons for the keyboard and a reset; a painting
 * opens the close-up viewer. Nothing here opens by itself: the notice only
 * comes from "Lire la notice".
 */
export function FocusHud({
  artwork,
  total,
  kind,
  hidden,
  navDisabled,
  onLeave,
  onPrevious,
  onNext,
  onReadNotice,
  onObserve,
  backRef,
  noticeRef,
  observeRef,
}: FocusHudProps) {
  return (
    <section
      className={styles.hud}
      aria-label="Œuvre vue de près"
      inert={hidden}
    >
      <FocusBackButton ref={backRef} onLeave={onLeave} hidden={hidden} />

      {artwork !== undefined && (
        <div className={styles.dock}>
          <div className={styles.heading}>
            <button
              type="button"
              className={cx(chromeStyles.glassButton, styles.round)}
              data-anim="focus-in"
              onClick={onPrevious}
              disabled={navDisabled}
              aria-label="Œuvre précédente"
            >
              <img src={backPaper} width={16} height={16} alt="" />
            </button>
            <p className={styles.caption} data-anim="focus-in">
              <span className={styles.number}>
                {artwork.number} / {pad(total)}
              </span>
              <span className={styles.title}>{artwork.title}</span>
              <span className={styles.technique}>{artwork.technique}</span>
            </p>
            <button
              type="button"
              className={cx(chromeStyles.glassButton, styles.round)}
              data-anim="focus-in"
              onClick={onNext}
              disabled={navDisabled}
              aria-label="Œuvre suivante"
            >
              <img src={nextPaper} width={16} height={16} alt="" />
            </button>
          </div>

          <div className={styles.actions}>
            <button
              ref={noticeRef}
              type="button"
              className={cx(chromeStyles.glassButton, styles.primary)}
              data-anim="focus-in"
              onClick={onReadNotice}
              aria-haspopup="dialog"
            >
              Lire la notice
            </button>

            {kind === 'sculpture' ? (
              <div
                className={cx(chromeStyles.artworkNav, styles.turn)}
                data-anim="focus-in"
                role="group"
                aria-label="Faire pivoter l’objet"
              >
                <span className={styles.hint}>Glisser pour faire pivoter</span>
                <button
                  type="button"
                  className={chromeStyles.navArrow}
                  onClick={() => {
                    turnStep(-1);
                  }}
                  aria-label="Tourner à gauche"
                >
                  <TurnIcon direction={-1} />
                </button>
                <button
                  type="button"
                  className={chromeStyles.navArrow}
                  onClick={() => {
                    turnStep(1);
                  }}
                  aria-label="Tourner à droite"
                >
                  <TurnIcon direction={1} />
                </button>
                <button
                  type="button"
                  className={styles.reset}
                  onClick={resetView}
                >
                  Réinitialiser
                </button>
              </div>
            ) : (
              <button
                ref={observeRef}
                type="button"
                className={chromeStyles.glassButton}
                data-anim="focus-in"
                onClick={onObserve}
                aria-haspopup="dialog"
              >
                <img src={zoomPaper} width={18} height={18} alt="" />
                <span>Observer de près</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
