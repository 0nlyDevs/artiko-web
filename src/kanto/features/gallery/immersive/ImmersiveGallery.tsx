import { useEffect, useId, useRef, useState } from 'react';
import zoomPaperAsset from '../../../assets/icons/zoom-paper.svg';
import { ambience } from '../../../lib/audio/ambience';
import { useReducedMotion } from '../../../lib/motion/reduced-motion';
import { navigate } from '../../../lib/router/router';
import { ArtworkNotice } from '../ArtworkNotice';
import { CloseUpViewer } from '../CloseUpViewer';
import type { Artwork, Room } from '../data/rooms';
import { artworkPath, rooms } from '../data/rooms';
import { paths } from '../../../app/routes';
import {
  chromeStyles,
  GalleryBottomBar,
  GalleryTopBar,
  pad,
  ArtworkWallText,
  WallTextSheet,
} from '../GalleryChrome';
import { MuseumPlan } from '../MuseumPlan';
import { recordVisit } from '../visit-log';
import { GalleryDialog } from '../GalleryDialog';
import { useFocusChrome } from '../useFocusChrome';
import { useGalleryArrival } from '../useGalleryArrival';
import { ApproachButton } from './ApproachButton';
import { FocusHud } from './FocusHud';
import { FocusVeil } from './FocusVeil';
import { GalleryScene } from './GalleryScene';
import { ImmersiveCartel } from './ImmersiveCartel';
import styles from './ImmersiveGallery.module.css';
import { placeArtworks, railBounds } from './gallery-layout';
import { goToWork, stepWork } from './gallery-navigation';
import {
  galleryStore,
  input,
  rail,
  railTo,
  setRailBounds,
  subjectIndex,
  useGallery,
} from './gallery-store';
import { detectLowPower } from './profile';
import { sceneIndexOf, sceneWorks } from './scene-annex';

// Next imports an image as { src, width, height }: the markup needs its URL.
const zoomPaper = zoomPaperAsset.src;

/*
 * The WebGL museum: one continuous wall that hangs every room with works,
 * walked along a rail. The FE-02 chrome (bars, wall text, wall label and
 * dialogs) sits in the DOM above the canvas. The URL and the visitor's
 * position stay in step: moving in the room rewrites the address, and a new
 * address moves the visitor.
 *
 * A click on a work, or Enter, brings the visitor close to it (the focus):
 * the room goes dark around the work, the chrome steps back and a caption
 * takes its place. The notice never opens by itself. It comes from "Lire
 * la notice", on the wall label or in the caption, in a panel that leaves
 * the work lit.
 */

const WORKS = sceneWorks();
const PLACED = placeArtworks(WORKS);

type Layer = 'closeUp' | 'wallText' | 'roomMenu' | null;

export interface ImmersiveGalleryProps {
  room: Room;
  /** Index of the artwork from the URL. Rooms without artworks use the photographic room. */
  artworkIndex: number | null;
  /** WebGL failed after mount: the route shows the photographic room instead. */
  onFailure: () => void;
}

interface Hung {
  readonly room: Room;
  readonly artwork: Artwork;
}

/** The room and artwork hung at a scene position. */
function hungAt(sceneIndex: number): Hung | null {
  const work = WORKS[sceneIndex];
  if (work === undefined) {
    return null;
  }
  const room = rooms[work.roomIndex];
  const artwork = room?.artworks[work.artworkIndex];
  return room !== undefined && artwork !== undefined ? { room, artwork } : null;
}

export function ImmersiveGallery({
  room,
  artworkIndex,
  onFailure,
}: ImmersiveGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cartelRef = useRef<HTMLButtonElement>(null);
  const approachRef = useRef<HTMLButtonElement>(null);
  const observeButtonRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const hudNoticeRef = useRef<HTMLButtonElement>(null);
  const hudObserveRef = useRef<HTMLButtonElement>(null);
  // The control that had the keyboard when the focus began, to give it back.
  const focusOriginRef = useRef<HTMLElement | null>(null);
  const wasFocusedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const [lowPower] = useState(detectLowPower);
  const [layer, setLayer] = useState<Layer>(null);
  const state = useGallery();
  const ids = {
    notice: useId(),
    closeUp: useId(),
    wallText: useId(),
    roomMenu: useId(),
  };
  // Where the visitor enters, read once by the mount effect.
  const entry = useRef({
    slug: room.slug,
    index: artworkIndex,
    skipIntro: reducedMotion,
  });

  const hung = hungAt(state.activeIndex);
  const shownRoom = hung?.room ?? room;
  const artwork = hung?.artwork;
  const total = shownRoom.artworks.length;
  const focused = state.phase === 'focus';
  // What stands in front of the visitor: a canvas, or an object to turn.
  const kind = PLACED[subjectIndex(state)]?.kind ?? 'painting';

  // The bars and the wall text light up once; the camera travelling is the entrance.
  useGalleryArrival(rootRef, { roomKey: 'immersive', reducedMotion });
  useFocusChrome(rootRef, {
    focused,
    noticeOpen: state.noticeOpen,
    reducedMotion,
  });

  // Mount: stand in front of the work of the URL, then start the travelling.
  useEffect(() => {
    const { slug, index, skipIntro } = entry.current;
    const bounds = railBounds(PLACED);
    setRailBounds(bounds.min, bounds.max);
    const sceneIndex = sceneIndexOf(WORKS, slug, index);
    const work = PLACED[sceneIndex];
    if (work !== undefined) {
      railTo(work.x);
      rail.current = work.x;
      galleryStore.setActive(sceneIndex);
    }
    galleryStore.start(performance.now(), skipIntro);
    return () => {
      galleryStore.reset();
    };
  }, []);

  // Address to room: tabs, the room menu and the back button move the visitor.
  useEffect(() => {
    const sceneIndex = sceneIndexOf(WORKS, room.slug, artworkIndex);
    if (sceneIndex !== galleryStore.getState().activeIndex) {
      goToWork(PLACED, sceneIndex);
    }
  }, [room.slug, artworkIndex]);

  // Room to address: wheel, drag and keys move the visitor, the address follows.
  useEffect(() => {
    // The mount effect above has just moved the visitor: this render is stale.
    if (
      hung === null ||
      galleryStore.getState().activeIndex !== state.activeIndex
    ) {
      return;
    }
    const path = artworkPath(hung.room, hung.artwork);
    if (path !== window.location.pathname) {
      navigate(`${path}${window.location.search}`, { replace: true });
    }
  }, [hung, state.activeIndex]);

  useEffect(() => {
    ambience.setTrack(shownRoom.ambience.track);
  }, [shownRoom.ambience.track]);

  // The visit log feeds the end-of-visit page (Figma A6).
  useEffect(() => {
    recordVisit(
      shownRoom.slug,
      artwork === undefined ? null : `${shownRoom.slug}/${artwork.number}`,
    );
  }, [shownRoom.slug, artwork]);

  // Dialogs own the input while open: the room ignores wheel, drag and keys.
  useEffect(() => {
    input.locked = layer !== null || state.noticeOpen;
  }, [layer, state.noticeOpen]);

  // The keyboard follows the focus: to "Retour à la salle" on the way in,
  // back to the control that asked for it, or to the work, on the way out.
  useEffect(() => {
    if (focused === wasFocusedRef.current) {
      return;
    }
    wasFocusedRef.current = focused;
    if (focused) {
      backRef.current?.focus({ preventScroll: true });
      return;
    }
    const origin = focusOriginRef.current;
    focusOriginRef.current = null;
    const target =
      origin !== null && origin.isConnected ? origin : approachRef.current;
    target?.focus({ preventScroll: true });
  }, [focused]);

  /** Comes close to a work from a control of the page, which gets the keyboard back afterwards. */
  const focusWork = (index: number): void => {
    focusOriginRef.current =
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== document.body
        ? document.activeElement
        : null;
    galleryStore.focus(index);
  };

  /** The action of the bottom bar: turn a 3D work in the room, or open the close-up of a painting. */
  const observe = (): void => {
    if (artwork === undefined) {
      return;
    }
    if (kind === 'sculpture') {
      focusWork(state.activeIndex);
    } else {
      setLayer('closeUp');
    }
  };

  const step = (direction: 1 | -1): void => {
    stepWork(PLACED, direction);
  };

  let announcement = `${shownRoom.titleLines.join(' ')}.`;
  if (artwork !== undefined) {
    const work = `Œuvre ${artwork.number} sur ${pad(total)} : ${artwork.title}, ${artwork.technique}.`;
    announcement = !focused
      ? work
      : kind === 'sculpture'
        ? `Vue rapprochée. ${work} Objet en 3D : glissez, ou utilisez les boutons, pour le faire pivoter.`
        : `Vue rapprochée. ${work}`;
  }

  return (
    <div
      ref={rootRef}
      className={styles.gallery}
      data-motion="pending"
      data-phase={state.phase}
      data-focus-kind={focused ? kind : undefined}
      data-notice={state.noticeOpen ? 'open' : undefined}
      data-layer={state.noticeOpen ? 'notice' : (layer ?? undefined)}
    >
      <div className={styles.stage} data-g="scene" aria-hidden="true">
        <GalleryScene
          works={WORKS}
          placed={PLACED}
          lowPower={lowPower}
          reducedMotion={reducedMotion}
          onFailure={onFailure}
        />
      </div>
      <div className={styles.vignette} data-g="spot" aria-hidden="true" />
      <FocusVeil kind={kind} />
      <div className={chromeStyles.topScrim} aria-hidden="true" />

      <GalleryTopBar
        room={shownRoom}
        onOpenRoomMenu={() => {
          setLayer('roomMenu');
        }}
        focused={focused}
      />

      <main className={styles.room} aria-labelledby="room-title">
        <div key={shownRoom.slug} className={styles.wallSwap}>
          <ArtworkWallText
            room={shownRoom}
            artwork={artwork}
            onRead={() => {
              setLayer('wallText');
            }}
            faded={focused || state.noticeOpen}
          />
        </div>

        {artwork !== undefined && (
          <>
            <ApproachButton
              onApproach={() => {
                focusWork(state.activeIndex);
              }}
              buttonRef={approachRef}
              inert={state.phase !== 'visiting'}
            />
            <ImmersiveCartel
              artwork={artwork}
              total={total}
              onOpen={galleryStore.openNotice}
              buttonRef={cartelRef}
              inert={state.phase !== 'visiting'}
            />
          </>
        )}

        <FocusHud
          artwork={artwork}
          total={total}
          kind={kind}
          hidden={!focused}
          navDisabled={PLACED.length < 2}
          onLeave={galleryStore.unfocus}
          onPrevious={() => {
            step(-1);
          }}
          onNext={() => {
            step(1);
          }}
          onReadNotice={galleryStore.openNotice}
          onObserve={() => {
            setLayer('closeUp');
          }}
          backRef={backRef}
          noticeRef={hudNoticeRef}
          observeRef={hudObserveRef}
        />

        <p className="visually-hidden" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </main>

      <GalleryBottomBar
        activeRoomSlug={shownRoom.slug}
        room={shownRoom}
        artwork={artwork}
        total={total}
        onPrevious={() => {
          step(-1);
        }}
        onNext={() => {
          step(1);
        }}
        navDisabled={PLACED.length < 2}
        endOfVisitPath={
          state.activeIndex === PLACED.length - 1 ? paths.end : undefined
        }
        focused={focused}
        actions={
          <button
            ref={observeButtonRef}
            type="button"
            className={chromeStyles.glassButton}
            data-anim="focus-out"
            onClick={observe}
            disabled={artwork === undefined}
            aria-haspopup={kind === 'sculpture' ? undefined : 'dialog'}
          >
            <img src={zoomPaper} width={18} height={18} alt="" />
            <span>
              {kind === 'sculpture' ? 'Manipuler en 3D' : 'Observer de près'}
            </span>
          </button>
        }
      />

      <div className={styles.curtain} data-g="curtain" aria-hidden="true" />

      {/* No backdrop: the panel opens beside the work, which stays lit. */}
      <GalleryDialog
        open={state.noticeOpen && artwork !== undefined}
        onClose={galleryStore.closeNotice}
        labelledBy={ids.notice}
        variant="side"
        dim={false}
        reducedMotion={reducedMotion}
        returnFocusRef={focused ? hudNoticeRef : cartelRef}
      >
        {(close) =>
          artwork !== undefined && (
            <ArtworkNotice
              room={shownRoom}
              artwork={artwork}
              titleId={ids.notice}
              onClose={close}
              onObserve={() => {
                galleryStore.closeNotice();
                if (kind === 'sculpture') {
                  galleryStore.focus(state.activeIndex);
                } else {
                  setLayer('closeUp');
                }
              }}
              onNext={
                PLACED.length > 1
                  ? () => {
                      step(1);
                    }
                  : undefined
              }
            />
          )
        }
      </GalleryDialog>

      <GalleryDialog
        open={layer === 'closeUp' && artwork !== undefined}
        onClose={() => {
          setLayer(null);
        }}
        labelledBy={ids.closeUp}
        variant="fullscreen"
        reducedMotion={reducedMotion}
        returnFocusRef={focused ? hudObserveRef : observeButtonRef}
      >
        {(close) =>
          artwork !== undefined && (
            <CloseUpViewer
              artwork={artwork}
              titleId={ids.closeUp}
              onClose={close}
            />
          )
        }
      </GalleryDialog>

      <GalleryDialog
        open={layer === 'wallText'}
        onClose={() => {
          setLayer(null);
        }}
        labelledBy={ids.wallText}
        variant="sheet"
        reducedMotion={reducedMotion}
      >
        {(close) => (
          <WallTextSheet
            room={shownRoom}
            titleId={ids.wallText}
            onClose={close}
          />
        )}
      </GalleryDialog>

      <GalleryDialog
        open={layer === 'roomMenu'}
        onClose={() => {
          setLayer(null);
        }}
        labelledBy={ids.roomMenu}
        variant="fullscreen"
        reducedMotion={reducedMotion}
      >
        {(close) => (
          <MuseumPlan
            activeRoomSlug={shownRoom.slug}
            titleId={ids.roomMenu}
            onClose={close}
          />
        )}
      </GalleryDialog>
    </div>
  );
}
