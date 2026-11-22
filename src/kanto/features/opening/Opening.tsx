import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';
import { useLocationPath } from '../../lib/router/router';
import { isMuseumPath } from './boot';
import { hasScreenContent } from './first-screen';
import styles from './Opening.module.css';
import { runOpening } from './opening-controller';
import { endOpening, useOpeningPhase } from './opening-store';
import { OPENING_CAP_MS } from './progress';
import { CLOSED_COVER_PATH } from './reveal-geometry';

const LETTERS = ['K', 'A', 'N', 'T', 'O'] as const;

export interface OpeningProps {
  /** The element the app renders into, so the opening can follow its first screen. */
  appRef: RefObject<HTMLElement | null>;
}

/*
 * The ivory opening. Its markup is in the server-rendered HTML and its
 * letters and creeping hairline are CSS, so it plays before the client bundle
 * has loaded. Once hydrated, `runOpening` drives the hairline with real
 * progress and opens the cover through the O.
 */
function Loader({ appRef }: OpeningProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<SVGPathElement>(null);
  const seamRef = useRef<SVGPathElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const glyphRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const path = useLocationPath();

  useEffect(() => {
    const root = rootRef.current;
    const cover = coverRef.current;
    const seam = seamRef.current;
    const word = wordRef.current;
    const glyph = glyphRef.current;
    const baseline = baselineRef.current;
    const bar = barRef.current;
    const fill = fillRef.current;
    const app = appRef.current;
    if (
      root === null ||
      cover === null ||
      seam === null ||
      word === null ||
      glyph === null ||
      baseline === null ||
      bar === null ||
      fill === null ||
      app === null
    ) {
      endOpening();
      return;
    }
    return runOpening({
      root,
      cover,
      seam,
      word,
      glyph,
      baseline,
      bar,
      fill,
      app,
    });
  }, [appRef]);

  // A redirect into the museum while loading: its black screen takes over at once.
  useEffect(() => {
    if (isMuseumPath(path)) {
      endOpening();
    }
  }, [path]);

  return (
    <div ref={rootRef} className={styles.opening} role="status">
      <svg className={styles.cover} aria-hidden="true" focusable="false">
        <path
          ref={coverRef}
          className={styles.coverPath}
          d={CLOSED_COVER_PATH}
          fillRule="evenodd"
        />
        <path ref={seamRef} className={styles.seam} d="" fillRule="evenodd" />
      </svg>
      <span ref={wordRef} className={styles.word} aria-hidden="true">
        {LETTERS.map((letter) =>
          letter === 'O' ? (
            <span key={letter} ref={glyphRef} className={styles.letter}>
              {letter}
              <span ref={baselineRef} className={styles.baseline} />
            </span>
          ) : (
            <span key={letter} className={styles.letter}>
              {letter}
            </span>
          ),
        )}
      </span>
      <span className="visually-hidden">Chargement de KANTO…</span>
      <span ref={barRef} className={styles.bar} aria-hidden="true">
        <span className={styles.creep} />
        <span ref={fillRef} className={styles.fill} />
      </span>
    </div>
  );
}

/*
 * A full load of a museum address: a black wall until the museum shows its
 * own loading screen, so no ivory flashes before the black room and no
 * second loader ever shows.
 */
function MuseumVeil({ appRef }: OpeningProps) {
  useEffect(() => {
    const app = appRef.current;
    if (app === null || hasScreenContent(app)) {
      endOpening();
      return;
    }
    const observer = new MutationObserver(() => {
      if (hasScreenContent(app)) {
        endOpening();
      }
    });
    observer.observe(app, { childList: true, subtree: true });
    const cap = window.setTimeout(endOpening, OPENING_CAP_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(cap);
    };
  }, [appRef]);

  return <div className={styles.veil} aria-hidden="true" />;
}

/**
 * The cover of a full page load: the ivory opening on every KANTO address
 * except the museum, which gets a plain black wall. Renders nothing once the
 * page is revealed, and never again after that.
 */
export function Opening({ appRef }: OpeningProps) {
  const phase = useOpeningPhase();
  if (phase === 'none') {
    return null;
  }
  if (phase === 'boot') {
    return <MuseumVeil appRef={appRef} />;
  }
  return <Loader appRef={appRef} />;
}
