import type { CSSProperties, PointerEvent } from 'react';
import { useEffect, useId, useReducer, useRef, useState } from 'react';
import sceneRedRoom1280Asset from '../../assets/gallery/scene-red-room-1280.webp';
import sceneRedRoom1920Asset from '../../assets/gallery/scene-red-room-1920.webp';
import sceneRedRoom2880Asset from '../../assets/gallery/scene-red-room-2880.webp';
import spotBeamAsset from '../../assets/gallery/spot-beam.svg';
import spotCoreAsset from '../../assets/gallery/spot-core.svg';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import { DemoBadge } from '../../components/demo-badge/DemoBadge';
import { Logo } from '../../components/logo/Logo';
import { api, useAsync } from '../../lib/api';
import type { Item } from '../../lib/api/types';
import { useReducedMotion } from '../../lib/motion/reduced-motion';
import { Link } from '../../lib/router/Link';
import { navigate } from '../../lib/router/router';
import { useSession } from '../../lib/session/session';
import { paths } from '../../app/routes';
import { RequireSession } from '../account/RequireSession';
import { isWebGLAvailable } from '../artwork-viewer/webgl';
import { GalleryBlack } from './GalleryFade';
import type { HangingCopy, HangingStand } from './hanging-content';
import {
  hangingAlt,
  hangingCartel,
  hangingCopy,
  hangingRoom,
  hangingSources,
  hangingStand,
} from './hanging-content';
import styles from './HangingPage.module.css';
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

export interface HangingPageProps {
  itemId: string;
  /** Tests replace the WebGL check and the loading of model-viewer. */
  detectWebGL?: (() => boolean) | undefined;
  loadModelViewer?: (() => Promise<void>) | undefined;
}

/** Reach of the lamp around the work, as a share of the diagonal of the work. */
const LAMP_REACH = 0.62;

/** The museum is dark, the hall pages are ivory: the screen fades to where it goes. */
function exitTone(to: string): ExitTone {
  return to.startsWith('/musee') ? 'museum' : 'hall';
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

interface CeremonyProps {
  item: Item;
  copy: HangingCopy;
  detectWebGL: () => boolean;
  loadModelViewer?: (() => Promise<void>) | undefined;
}

function Ceremony({ item, copy, detectWebGL, loadModelViewer }: CeremonyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  // True while the keyboard is on one of the actions.
  const onActionRef = useRef(false);
  const titleId = useId();
  const reducedMotion = useReducedMotion();

  const room = hangingRoom(item);
  const stand = hangingStand(item);
  const sources = hangingSources(item);
  const cartel = hangingCartel(item, copy.status);
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
    const previous = document.title;
    document.title = `KANTO — ${copy.eyebrow}`;
    return () => {
      document.title = previous;
    };
  }, [copy.eyebrow]);

  const leaveTo = (to: string) => (): Promise<void> =>
    ceremony.leave(exitTone(to));

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

  return (
    <div
      ref={rootRef}
      className={styles.page}
      style={spanStyle}
      data-motion="pending"
      data-status={copy.status}
      data-stand={stand}
      data-kind={work.kind}
      data-wall={room.wallTone}
      data-scene={room.usesRedRoomScene ? 'photo' : 'tone'}
      onPointerMove={followPointer}
      onPointerLeave={() => {
        ceremony.approach(0);
      }}
    >
      <div ref={setRef} className={styles.set} aria-hidden="true">
        <div className={styles.scene} data-h="scene">
          {room.usesRedRoomScene ? (
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

      <header className={styles.bar}>
        <Link
          to={paths.home}
          className={styles.logo}
          aria-label="KANTO, retour à l’accueil"
          beforeNavigate={leaveTo(paths.home)}
        >
          <Logo />
        </Link>
        <div className={styles.barRight}>
          <DemoBadge theme="dark" className={styles.badgeWide} />
          <DemoBadge
            theme="dark"
            label="Démonstration"
            className={styles.badgeNarrow}
          />
          {!done && !reducedMotion && (
            <button
              type="button"
              className={styles.skip}
              aria-label="Passer l’animation"
              onClick={ceremony.skip}
            >
              Passer
            </button>
          )}
        </div>
      </header>

      <main>
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
            <ButtonLink
              to={copy.primary.to}
              variant="primary"
              withArrow
              className={styles.primary}
              beforeNavigate={leaveTo(copy.primary.to)}
            >
              {copy.primary.label}
            </ButtonLink>
            <ButtonLink
              to={copy.secondary.to}
              variant="secondary"
              className={styles.secondary}
              beforeNavigate={leaveTo(copy.secondary.to)}
            >
              {copy.secondary.label}
            </ButtonLink>
            <p className={styles.more}>
              <Link
                to={copy.tertiary.to}
                beforeNavigate={leaveTo(copy.tertiary.to)}
              >
                {copy.tertiary.label}
              </Link>
            </p>
          </div>
        </section>

        <figure className={styles.exhibit}>
          <HangingWork
            work={work}
            dispatch={dispatch}
            sources={sources}
            alt={hangingAlt(item)}
            cartel={cartel}
            landed={landed}
            onNear={(near) => {
              ceremony.approach(near ? 1 : 0);
            }}
            onSpan={setSpan}
            loadModelViewer={loadModelViewer}
          />
          {work.kind !== 'label' && (
            <figcaption className={styles.cartel} data-h="cartel">
              <CartelLines cartel={cartel} />
            </figcaption>
          )}
        </figure>
      </main>

      <div className={styles.veil} data-h="veil" aria-hidden="true" />
    </div>
  );
}

function HangingScreen({
  itemId,
  detectWebGL = isWebGLAvailable,
  loadModelViewer,
}: HangingPageProps) {
  const { account } = useSession();
  const state = useAsync(`hanging:${itemId}`, () => api.items.get(itemId));
  const item = state.data;
  const owner =
    item !== null && account !== null && item.ownerId === account.accountId;
  const copy = item !== null && owner ? hangingCopy(item) : null;

  // No ceremony: the submission page tells where the work stands, or why it
  // cannot be opened. A published work of someone else has its public notice.
  let away: string | null = null;
  if (state.status === 'error') {
    away = paths.submission(itemId);
  } else if (item !== null && copy === null) {
    away =
      !owner && item.publication === 'published'
        ? paths.item(item.id)
        : paths.submission(item.id);
  }
  useEffect(() => {
    if (away !== null) {
      navigate(away, { replace: true });
    }
  }, [away]);

  if (item === null || copy === null) {
    return <GalleryBlack label="Préparation de l’accrochage…" />;
  }
  return (
    <Ceremony
      key={item.id}
      item={item}
      copy={copy}
      detectWebGL={detectWebGL}
      loadModelViewer={loadModelViewer}
    />
  );
}

/**
 * `/contribuer/:id/accrochage`: the hanging ceremony shown to the owner of a
 * work once it is sent or published. Any other status has no ceremony and
 * goes to the submission page.
 */
export function HangingPage(props: HangingPageProps) {
  return (
    <RequireSession>
      <HangingScreen {...props} />
    </RequireSession>
  );
}
