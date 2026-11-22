import { useLayoutEffect, useRef } from 'react';
import { gsap, useGSAP } from '../../lib/motion/gsap';
import { useReducedMotion } from '../../lib/motion/reduced-motion';
import styles from './GalleryFade.module.css';

/** "L’écran se fade lentement": long enough to be felt, short enough not to wait. */
const FADE_SECONDS = 1.35;
const REDUCED_FADE_SECONDS = 0.3;
/** Margin after which the visitor moves on even if no frame was drawn. */
const SAFETY_MS = 600;

export interface GalleryFadeProps {
  /** Runs once, when the screen is black. */
  onDone: () => void;
}

/**
 * Slowly fades the screen to gallery black, then hands over. Shown by the
 * wizard once a work is sent, before the hanging ceremony opens on the same
 * black. It also blocks the page under it while it fades.
 */
export function GalleryFade({ onDone }: GalleryFadeProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const onDoneRef = useRef(onDone);
  const doneRef = useRef(false);
  useLayoutEffect(() => {
    onDoneRef.current = onDone;
  });

  useGSAP(
    () => {
      const finish = (): void => {
        if (!doneRef.current) {
          doneRef.current = true;
          onDoneRef.current();
        }
      };
      const duration = reducedMotion ? REDUCED_FADE_SECONDS : FADE_SECONDS;
      // If the fade cannot run (a hidden tab draws no frame), the timer hands over.
      const timer = window.setTimeout(finish, duration * 1000 + SAFETY_MS);
      if (ref.current !== null) {
        gsap.fromTo(
          ref.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration,
            ease: reducedMotion ? 'none' : 'power2.inOut',
            onComplete: finish,
          },
        );
      }
      return () => {
        window.clearTimeout(timer);
      };
    },
    { scope: ref, dependencies: [reducedMotion] },
  );

  return (
    <div ref={ref} className={styles.fade} data-gallery-fade="">
      <p className="visually-hidden" role="status">
        Œuvre envoyée. Ouverture de la galerie…
      </p>
    </div>
  );
}

export interface GalleryBlackProps {
  /** Announced to assistive technology while the frame shows. */
  label?: string | undefined;
}

/** The black frame shown while the ceremony or its item loads, so nothing flashes. */
export function GalleryBlack({ label }: GalleryBlackProps) {
  return (
    <div className={styles.fallback} aria-hidden={label === undefined}>
      {label !== undefined && (
        <p className="visually-hidden" role="status">
          {label}
        </p>
      )}
    </div>
  );
}
