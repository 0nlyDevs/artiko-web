import type { CSSProperties, Dispatch, SyntheticEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import frameGilded1200Asset from '../../assets/gallery/frame-gilded-1200.webp';
import frameGilded600Asset from '../../assets/gallery/frame-gilded-600.webp';
import frameGilded800Asset from '../../assets/gallery/frame-gilded-800.webp';
import { loadModelViewer as defaultLoadModelViewer } from '../artwork-viewer/load-model-viewer';
import type { ModelViewerHandle } from '../artwork-viewer/model-viewer-element';
import type { HangingCartel, HangingSources } from './hanging-content';
import styles from './HangingPage.module.css';
import type { TrimBox } from './poster-trim';
import { measureTrim } from './poster-trim';
import {
  afterFrames,
  isStageViewer,
  STAGE_POLAR_DEG,
  standOnPlinth,
} from './stage-model';
import type { WorkAction, WorkState } from './work-state';

// Next imports an image as { src, width, height }: the markup needs its URL.
const frameGilded1200 = frameGilded1200Asset.src;
const frameGilded600 = frameGilded600Asset.src;
const frameGilded800 = frameGilded800Asset.src;

/** A model that has not loaded by then gives way to its still. */
const MODEL_TIMEOUT_MS = 10000;
/** A picture still loading by then drops as it is, and fills in when it arrives. */
const STILL_TIMEOUT_MS = 5000;

/** What model-viewer reads aloud for a scanned work: its four sides and how to turn it. */
export interface ViewerLabels {
  front: string;
  right: string;
  back: string;
  left: string;
  prompt: string;
}

const VIEWER_LABELS: ViewerLabels = {
  front: 'Vue de face',
  right: 'Vue de droite',
  back: 'Vue de dos',
  left: 'Vue de gauche',
  prompt: 'Faites glisser ou utilisez les flèches pour faire tourner l’œuvre.',
};

/*
 * model-viewer settings of the plinth, set as attributes because the typing
 * of the viewer feature only knows the ones its own viewer uses. The object
 * can be turned, not zoomed, moved or re-centred: it stays on its plinth.
 */
function stageAttributes(
  labels: ViewerLabels,
): readonly (readonly [string, string])[] {
  return [
    ['loading', 'eager'],
    ['interaction-prompt', 'none'],
    ['disable-zoom', ''],
    ['disable-pan', ''],
    ['disable-tap', ''],
    ['camera-orbit', `0deg ${String(STAGE_POLAR_DEG)}deg auto`],
    [
      'a11y',
      JSON.stringify({
        front: labels.front,
        right: labels.right,
        back: labels.back,
        left: labels.left,
        'interaction-prompt': labels.prompt,
      }),
    ],
  ];
}

export interface CartelLinesProps {
  cartel: HangingCartel;
}

/** The lines of the wall label: deposit number, title, author, medium. */
export function CartelLines({ cartel }: CartelLinesProps) {
  return (
    <>
      <span className={styles.cartelNumber}>
        {cartel.reference ?? `N° ${cartel.number}`}
      </span>
      <span className={styles.cartelTitle}>{cartel.title}</span>
      {cartel.author !== '' && (
        <span className={styles.cartelAuthor}>{cartel.author}</span>
      )}
      <span className={styles.cartelMedium}>
        <span>{cartel.medium}</span>
        {cartel.note !== null && <span>{cartel.note}</span>}
        {cartel.isDemo && <span>Œuvre de démonstration</span>}
      </span>
    </>
  );
}

interface StageModelProps {
  src: string;
  alt: string;
  interactive: boolean;
  dispatch: Dispatch<WorkAction>;
  /** Width of the object, as a share of the zone above the plinth. */
  onSpan: (span: number) => void;
  loadModelViewer: () => Promise<void>;
  labels: ViewerLabels;
}

/** The scanned work itself, standing on the plinth once its camera is set. */
function StageModel({
  src,
  alt,
  interactive,
  dispatch,
  onSpan,
  loadModelViewer,
  labels,
}: StageModelProps) {
  useEffect(() => {
    let active = true;
    loadModelViewer().catch(() => {
      if (active) {
        dispatch({ type: 'failed' });
      }
    });
    return () => {
      active = false;
    };
  }, [loadModelViewer, dispatch]);

  const viewerRef = useCallback(
    (element: ModelViewerHandle | null) => {
      if (element === null) {
        return;
      }
      for (const [name, value] of stageAttributes(labels)) {
        element.setAttribute(name, value);
      }
      let active = true;
      let loaded = false;
      let standing = false;
      const stand = async (): Promise<void> => {
        if (standing) {
          return;
        }
        if (!isStageViewer(element)) {
          // Not the model-viewer this was written for: its still is shown instead.
          dispatch({ type: 'failed' });
          return;
        }
        standing = true;
        try {
          const span = await standOnPlinth(element);
          // The work drops only after model-viewer drew it with this camera.
          await afterFrames(2);
          if (active) {
            if (span !== null) {
              onSpan(span);
            }
            dispatch({ type: 'ready' });
          }
        } catch {
          if (active) {
            dispatch({ type: 'failed' });
          }
        } finally {
          standing = false;
        }
      };
      const onLoad = (): void => {
        loaded = true;
        void stand();
      };
      const onError = (): void => {
        if (active) {
          dispatch({ type: 'failed' });
        }
      };
      // The size of the element follows the viewport: the camera follows it.
      const observer =
        typeof ResizeObserver === 'function'
          ? new ResizeObserver(() => {
              if (loaded) {
                void stand();
              }
            })
          : null;
      observer?.observe(element);
      element.addEventListener('load', onLoad);
      element.addEventListener('error', onError);
      return () => {
        active = false;
        observer?.disconnect();
        element.removeEventListener('load', onLoad);
        element.removeEventListener('error', onError);
      };
    },
    [dispatch, onSpan, labels],
  );

  return (
    <model-viewer
      ref={viewerRef}
      className={styles.model}
      src={src}
      alt={alt}
      tone-mapping="neutral"
      {...(interactive ? { 'camera-controls': true } : {})}
    />
  );
}

const WHOLE: TrimBox = { left: 0, top: 0, width: 1, height: 1 };

interface StillProps {
  src: string;
  alt: string;
  dispatch: Dispatch<WorkAction>;
}

/**
 * A still standing on the plinth when the 3D view cannot be shown: the
 * object cut out of its poster, or a photograph as a small print.
 */
function StandingStill({ src, alt, dispatch }: StillProps) {
  const [shape, setShape] = useState<{
    ratio: number;
    trim: TrimBox | null;
  } | null>(null);

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    const image = event.currentTarget;
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      dispatch({ type: 'failed' });
      return;
    }
    const trim = measureTrim(image);
    const box = trim ?? WHOLE;
    setShape({
      ratio:
        (image.naturalWidth * box.width) / (image.naturalHeight * box.height),
      trim,
    });
    dispatch({ type: 'ready' });
  };

  const box = shape?.trim ?? WHOLE;
  const boxStyle: CSSProperties & Record<'--still-ratio', string> = {
    '--still-ratio': String(shape?.ratio ?? 1),
  };
  const imageStyle: CSSProperties = {
    width: `${String(100 / box.width)}%`,
    transform: `translate(${String(-box.left * 100)}%, ${String(-box.top * 100)}%)`,
  };

  return (
    <div
      className={styles.still}
      data-cutout={shape !== null && shape.trim !== null}
      style={boxStyle}
    >
      <img
        className={styles.stillImage}
        style={imageStyle}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={handleLoad}
        onError={() => {
          dispatch({ type: 'failed' });
        }}
      />
    </div>
  );
}

/** The picture in the gilded frame of the painting room. */
function FramedPicture({ src, alt, dispatch }: StillProps) {
  // The frame drops once the picture and its frame are both decoded.
  const decoded = useRef({ picture: false, frame: false });
  const mark = (part: 'picture' | 'frame'): void => {
    decoded.current[part] = true;
    if (decoded.current.picture && decoded.current.frame) {
      dispatch({ type: 'ready' });
    }
  };

  return (
    <>
      <div className={styles.opening}>
        <img
          className={styles.openingImage}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => {
            mark('picture');
          }}
          onError={() => {
            dispatch({ type: 'failed' });
          }}
        />
      </div>
      <img
        className={styles.gilded}
        src={frameGilded1200}
        srcSet={`${frameGilded600} 600w, ${frameGilded800} 800w, ${frameGilded1200} 1200w`}
        sizes="(max-width: 767px) 64vw, 38vw"
        width={1200}
        height={1200}
        alt=""
        draggable={false}
        onLoad={() => {
          mark('frame');
        }}
        onError={() => {
          mark('frame');
        }}
      />
    </>
  );
}

export interface HangingWorkProps {
  work: WorkState;
  dispatch: Dispatch<WorkAction>;
  sources: HangingSources;
  alt: string;
  cartel: HangingCartel;
  /** The work has landed: it can be reached, and a model can be turned. */
  landed: boolean;
  /** A finger or the keyboard is on the work, or leaves it. A mouse is followed by the page. */
  onNear: (near: boolean) => void;
  /** Width of a scanned object once it stands, as a share of its zone. */
  onSpan: (span: number) => void;
  loadModelViewer?: (() => Promise<void>) | undefined;
  /** Texts model-viewer reads aloud; French when absent. */
  viewerLabels?: ViewerLabels | undefined;
}

/**
 * The work that drops onto its stand. The wrapper is the same element for
 * every kind, so the choreography keeps its hold on it when a model gives
 * way to its still, or a picture to the label.
 */
export function HangingWork({
  work,
  dispatch,
  sources,
  alt,
  cartel,
  landed,
  onNear,
  onSpan,
  loadModelViewer = defaultLoadModelViewer,
  viewerLabels = VIEWER_LABELS,
}: HangingWorkProps) {
  // The ceremony never waits for a slow file: a model gives way to its
  // still, and a picture drops while it finishes loading. A file that is
  // really missing reports its error at once and is replaced without waiting.
  useEffect(() => {
    if (work.ready) {
      return;
    }
    const model = work.kind === 'model';
    const timer = window.setTimeout(
      () => {
        dispatch({ type: model ? 'failed' : 'ready' });
      },
      model ? MODEL_TIMEOUT_MS : STILL_TIMEOUT_MS,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [work.kind, work.image, work.ready, dispatch]);

  const still = sources.images[work.image];

  return (
    <div
      className={styles.drop}
      data-h="work"
      data-kind={work.kind}
      data-ready={work.ready}
      inert={!landed}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') {
          onNear(true);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') {
          onNear(false);
        }
      }}
      onFocus={() => {
        onNear(true);
      }}
      onBlur={() => {
        onNear(false);
      }}
    >
      <div className={styles.sway} data-h="sway">
        <div className={styles.visual}>
          {work.kind === 'model' && sources.model !== null && (
            <StageModel
              src={sources.model}
              alt={alt}
              interactive={landed}
              dispatch={dispatch}
              onSpan={onSpan}
              loadModelViewer={loadModelViewer}
              labels={viewerLabels}
            />
          )}
          {work.kind === 'poster' && still !== undefined && (
            <StandingStill
              key={still}
              src={still}
              alt={alt}
              dispatch={dispatch}
            />
          )}
          {work.kind === 'frame' && still !== undefined && (
            <FramedPicture
              key={still}
              src={still}
              alt={alt}
              dispatch={dispatch}
            />
          )}
          {work.kind === 'label' && (
            <div className={styles.labelCard}>
              <CartelLines cartel={cartel} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
