import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { useEffect, useId, useReducer, useRef, useState } from 'react';
import sceneRedRoom1280Asset from '../../assets/gallery/scene-red-room-1280.webp';
import sceneRedRoom1920Asset from '../../assets/gallery/scene-red-room-1920.webp';
import sceneRedRoom2880Asset from '../../assets/gallery/scene-red-room-2880.webp';
import spotBeamAsset from '../../assets/gallery/spot-beam.svg';
import spotCoreAsset from '../../assets/gallery/spot-core.svg';
import { useReducedMotion } from '../../lib/motion/reduced-motion';
import type { RoomAmbience } from '../gallery/data/rooms';
import { isWebGLAvailable } from '../artwork-viewer/webgl';
import type {
  HangingCartel,
  HangingSources,
  HangingStand,
  HangingStatus,
} from './hanging-content';
import styles from './HangingPage.module.css';
import type { ViewerLabels } from './HangingWork';
import { CartelLines, HangingWork } from './HangingWork';
import { useSetPlacement } from './set-placement';
import { nearness } from './spot-level';
import type { ExitTone } from './useHangingCeremony';
import { useHangingCeremony } from './useHangingCeremony';
import type { WorkAction, WorkState } from './work-state';
import { initialWork, nextWork } from './work-state';

// Next imports an image as { src, width, height }: the markup needs its URL.
const sceneRedRoom1280 = sceneRedRoom1280Asset.src;
const sceneRedRoom1920 = sceneRedRoom1920Asset.src;
const sceneRedRoom2880 = sceneRedRoom2880Asset.src;
const spotBeam = spotBeamAsset.src;
const spotCore = spotCoreAsset.src;

/** Reach of the lamp around the work, as a share of the diagonal of the work. */
const LAMP_REACH = 0.62;

/** What the stage says beside the work. */
export interface HangingStageCopy {
  eyebrow: string;
  /** First headline line, in Malagasy: the markup marks its language. */
  thanks: string;
  /** The two headline lines under it. */
  lines: readonly [string, string];
  paragraph: string;
}

/** The walls behind the work. */
export interface HangingStageWall {
  tone: RoomAmbience['wallTone'];
  /** The photograph of the red room instead of a wall tone. */
  photo: boolean;
}

/** Texts of the controls of the stage itself. */
export interface HangingStageLabels {
  skip: string;
  skipAria: string;
  /** Read by model-viewer for a scanned work; French when absent. */
  viewer?: ViewerLabels | undefined;
}

/**
 * What the stage hands to the screen that fills its bar and its actions: the
 * exit fade to play before leaving, and the classes that dress a link or a
 * button on the dark wall.
 */
export interface HangingStageSlots {
  /** The lamp goes out and the screen fades; resolves when the visitor may leave. */
  leave: (tone: ExitTone) => Promise<void>;
  classes: {
    /** The wordmark of the bar. */
    logo: string;
    /** A badge of the bar shown on wide screens, and its short form for narrow ones. */
    badgeWide: string;
    badgeNarrow: string;
    /** The main action, the second one, and the paragraph of a quiet text link. */
    primary: string;
    secondary: string;
    more: string;
  };
}

export interface HangingStageProps {
  status: HangingStatus;
  stand: HangingStand;
  sources: HangingSources;
  cartel: HangingCartel;
  /** Text alternative of the work. */
  alt: string;
  wall: HangingStageWall;
  copy: HangingStageCopy;
  labels: HangingStageLabels;
  /** Title of the tab while the stage shows; the tab keeps its title when absent. */
  documentTitle?: string | undefined;
  /**
   * `page`: the stage is the page, with its banner and main landmarks.
   * `overlay`: it covers a page that already has them.
   */
  landmarks?: 'page' | 'overlay' | undefined;
  /** The wordmark on the left of the bar. */
  brand: (slots: HangingStageSlots) => ReactNode;
  /** What stands before « Passer » on the right of the bar. */
  badges?: ((slots: HangingStageSlots) => ReactNode) | undefined;
  /** The ways out, under the paragraph. */
  actions: (slots: HangingStageSlots) => ReactNode;
  /** Tests replace the WebGL check and the loading of model-viewer. */
  detectWebGL?: (() => boolean) | undefined;
  loadModelViewer?: (() => Promise<void>) | undefined;
}

/** What waits in the light before the work arrives. */
function Stand({ stand }: { stand: HangingStand }) {
  if (stand === 'plinth') {
    return (
      <>
        <div className={styles.plinthShadow} />
        <div className={styles.plinth}>
          <div className={styles.plinthTop} />
          <div className={styles.plinthFront} />
        </div>
      </>
    );
  }
  if (stand === 'rail') {
    return (
      <>
        <div className={styles.rail} />
        <div className={styles.wire} />
        <div className={styles.hook} />
        <div className={styles.template} data-h="template" />
      </>
    );
  }
  return (
    <>
      <div className={styles.template} data-h="template" />
      <div className={styles.pin} />
      <div className={styles.pin} />
    </>
  );
}

/**
 * The hanging ceremony itself, without knowing where the work comes from:
 * the room lights up, the work comes down onto its stand, then the text and
 * the ways out appear. The museum drives it with one of its items
 * (HangingPage); the publication of the application drives it with the Work
 * that the API returned.
 */
export function HangingStage({
  status,
  stand,
  sources,
  cartel,
  alt,
  wall,
  copy,
  labels,
  documentTitle,
  landmarks = 'page',
  brand,
  badges,
  actions,
  detectWebGL = isWebGLAvailable,
  loadModelViewer,
}: HangingStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  // True while the keyboard is on one of the actions.
  const onActionRef = useRef(false);
  const titleId = useId();
  const reducedMotion = useReducedMotion();
  const stills = sources.images.length;

  const [webgl] = useState(detectWebGL);
  const [work, dispatch] = useReducer(
    (state: WorkState, action: WorkAction) => nextWork(state, action, stills),
    undefined,
    () => initialWork(stand, sources, webgl),
  );
  const [landed, setLanded] = useState(false);
  const [done, setDone] = useState(false);
  // Width of a scanned object, so its contact shadow has its size.
  const [span, setSpan] = useState<number | null>(null);

  const ceremony = useHangingCeremony(rootRef, {
    reducedMotion,
    onLanded: () => {
      setLanded(true);
    },
    onDone: () => {
      setDone(true);
    },
  });
  useSetPlacement(setRef, probeRef);

  // The work drops once it is loaded and drawn.
  useEffect(() => {
    if (work.ready) {
      ceremony.release();
    }
  }, [work.ready, ceremony]);

  // The headline takes the focus at the end, unless the visitor already reached an action.
  useEffect(() => {
    if (done && !onActionRef.current) {
      headlineRef.current?.focus({ preventScroll: true });
    }
  }, [done]);

  // Escape skips the sequence, like the control of the top bar.
  useEffect(() => {
    if (done) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        ceremony.skip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [done, ceremony]);

  useEffect(() => {
    if (documentTitle === undefined) {
      return;
    }
    const previous = document.title;
    document.title = documentTitle;
    return () => {
      document.title = previous;
    };
  }, [documentTitle]);

  const slots: HangingStageSlots = {
    leave: ceremony.leave,
    classes: {
      logo: styles.logo ?? '',
      badgeWide: styles.badgeWide ?? '',
      badgeNarrow: styles.badgeNarrow ?? '',
      primary: styles.primary ?? '',
      secondary: styles.secondary ?? '',
      more: styles.more ?? '',
    },
  };

  // The lamp follows the mouse: brighter as it comes close to the work,
  // back to rest as it moves away, like the spots of the rooms.
  const followPointer = (event: PointerEvent<HTMLDivElement>): void => {
    if (!done || event.pointerType !== 'mouse') {
      return;
    }
    const placed = event.currentTarget.querySelector('[data-h="work"]');
    if (placed === null) {
      return;
    }
    const box = placed.getBoundingClientRect();
    const distance = Math.hypot(
      event.clientX - (box.left + box.width / 2),
      event.clientY - (box.top + box.height / 2),
    );
    ceremony.approach(
      nearness(distance, Math.hypot(box.width, box.height) * LAMP_REACH),
    );
  };

  const spanStyle: (CSSProperties & Record<'--work-span', string>) | undefined =
    span === null ? undefined : { '--work-span': String(span) };

  const Bar = landmarks === 'page' ? 'header' : 'div';
  const Body = landmarks === 'page' ? 'main' : 'div';

  return (
    <div
      ref={rootRef}
      className={styles.page}
      style={spanStyle}
      data-motion="pending"
      data-status={status}
      data-stand={stand}
      data-kind={work.kind}
      data-wall={wall.tone}
      data-scene={wall.photo ? 'photo' : 'tone'}
      onPointerMove={followPointer}
      onPointerLeave={() => {
        ceremony.approach(0);
      }}
    >
      <div ref={setRef} className={styles.set} aria-hidden="true">
        <div className={styles.scene} data-h="scene">
          {wall.photo ? (
            <img
              className={styles.photo}
              src={sceneRedRoom1920}
              srcSet={`${sceneRedRoom1280} 1280w, ${sceneRedRoom1920} 1920w, ${sceneRedRoom2880} 2880w`}
              sizes="130vw"
              width={2880}
              height={1591}
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          ) : (
            <>
              <div className={styles.wall} />
              <div className={styles.baseboard} />
              <div className={styles.floor} />
            </>
          )}
          <div className={styles.floorFade} />
        </div>
        <div className={styles.spot} data-h="spot">
          <img
            className={styles.spotBeam}
            src={spotBeam}
            width={492}
            height={817}
            alt=""
          />
          <img
            className={styles.spotCore}
            src={spotCore}
            width={420}
            height={591}
            alt=""
          />
        </div>
        <div className={styles.flare} data-h="flare" />
        <div className={styles.stand} data-h="stand">
          <Stand stand={stand} />
        </div>
        <div className={styles.shadow} data-h="shadow" />
        {stand === 'plinth' && work.kind !== 'label' && (
          <div className={styles.overhang} data-h="shadow" />
        )}
        <div className={styles.topScrim} />
        <div className={styles.copyScrim} />
        <i ref={probeRef} className={styles.probe} data-h="probe" />
      </div>

      <Bar className={styles.bar}>
        {brand(slots)}
        <div className={styles.barRight}>
          {badges?.(slots)}
          {!done && !reducedMotion && (
            <button
              type="button"
              className={styles.skip}
              aria-label={labels.skipAria}
              onClick={ceremony.skip}
            >
              {labels.skip}
            </button>
          )}
        </div>
      </Bar>

      <Body>
        <section className={styles.copy} aria-labelledby={titleId}>
          <p className={styles.eyebrow} data-h="eyebrow">
            {copy.eyebrow}
          </p>
          <h1
            ref={headlineRef}
            id={titleId}
            className={styles.headline}
            data-h="headline"
            tabIndex={-1}
          >
            {/* The spaces keep the lines apart in the accessible name. */}
            <span lang="mg">{copy.thanks}</span> <br />
            {copy.lines[0]} <br />
            {copy.lines[1]}
          </h1>
          <p className={styles.paragraph} data-h="paragraph">
            {copy.paragraph}
          </p>
          {/* Reaching an action with the keyboard ends the sequence: no control is ever focused unseen. */}
          <div
            className={styles.actions}
            data-h="actions"
            onFocus={() => {
              onActionRef.current = true;
              ceremony.skip();
            }}
            onBlur={() => {
              onActionRef.current = false;
            }}
          >
            {actions(slots)}
          </div>
        </section>

        <figure className={styles.exhibit}>
          <HangingWork
            work={work}
            dispatch={dispatch}
            sources={sources}
            alt={alt}
            cartel={cartel}
            landed={landed}
            onNear={(near) => {
              ceremony.approach(near ? 1 : 0);
            }}
            onSpan={setSpan}
            loadModelViewer={loadModelViewer}
            viewerLabels={labels.viewer}
          />
          {work.kind !== 'label' && (
            <figcaption className={styles.cartel} data-h="cartel">
              <CartelLines cartel={cartel} />
            </figcaption>
          )}
        </figure>
      </Body>

      <div className={styles.veil} data-h="veil" aria-hidden="true" />
    </div>
  );
}
