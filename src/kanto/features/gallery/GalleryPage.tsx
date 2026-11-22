import type { MouseEvent } from 'react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import frameGilded1200Asset from '../../assets/gallery/frame-gilded-1200.webp';
import frameGilded600Asset from '../../assets/gallery/frame-gilded-600.webp';
import frameGilded800Asset from '../../assets/gallery/frame-gilded-800.webp';
import sceneRedRoom1280Asset from '../../assets/gallery/scene-red-room-1280.webp';
import sceneRedRoom1920Asset from '../../assets/gallery/scene-red-room-1920.webp';
import sceneRedRoom2880Asset from '../../assets/gallery/scene-red-room-2880.webp';
import spotBeamAsset from '../../assets/gallery/spot-beam.svg';
import spotCoreAsset from '../../assets/gallery/spot-core.svg';
import zoomPaperAsset from '../../assets/icons/zoom-paper.svg';
import { MediaImage } from '../../components/media-image/MediaImage';
import { ambience } from '../../lib/audio/ambience';
import { useReducedMotion } from '../../lib/motion/reduced-motion';
import { navigate } from '../../lib/router/router';
import { paths } from '../../app/routes';
import { ArtworkNotice } from './ArtworkNotice';
import { CloseUpViewer } from './CloseUpViewer';
import type { Artwork, Room } from './data/rooms';
import { artworkPath, rooms } from './data/rooms';
import { EmptyRoom } from './EmptyRoom';
import { MuseumPlan } from './MuseumPlan';
import { recordVisit } from './visit-log';
import {
  chromeStyles,
  FocusBackButton,
  GalleryBottomBar,
  GalleryTopBar,
  pad,
  WallCartel,
  ArtworkWallText,
  WallTextSheet,
} from './GalleryChrome';
import { GalleryDialog } from './GalleryDialog';
import styles from './GalleryPage.module.css';
import { ModelViewerPanel } from './ModelViewerPanel';
import type { ModelViewerRenderer } from './model-viewer-slot';
import { useArtworkSwap } from './useArtworkSwap';
import type { SwapDirection } from './useArtworkSwap';
import { useFocusChrome } from './useFocusChrome';
import { useGalleryArrival } from './useGalleryArrival';
import { useHungFocus } from './useHungFocus';
import { useImagePreload } from './useImagePreload';
import { useScenePlacement } from './useScenePlacement';
import { useSwipe } from './useSwipe';

// Next imports an image as { src, width, height }: the markup needs its URL.
const frameGilded1200 = frameGilded1200Asset.src;
const frameGilded600 = frameGilded600Asset.src;
const frameGilded800 = frameGilded800Asset.src;
const sceneRedRoom1280 = sceneRedRoom1280Asset.src;
const sceneRedRoom1920 = sceneRedRoom1920Asset.src;
const sceneRedRoom2880 = sceneRedRoom2880Asset.src;
const spotBeam = spotBeamAsset.src;
const spotCore = spotCoreAsset.src;
const zoomPaper = zoomPaperAsset.src;

/*
 * The photographic room (Figma node 114:3877): the red room photograph, one
 * framed work in the spotlight and the museum chrome. It stands in for the
 * WebGL room when WebGL is unavailable, when a room has nothing to hang yet,
 * or on request with `?rendu=photo`.
 *
 * A click on the hung work brings it into focus: the frame grows, the room
 * dims around it and the wall text steps back. A work with a 3D model opens
 * its viewer instead, where it can be turned. The notice only opens from
 * the wall label, in a panel that leaves the work lit.
 */

export interface GalleryPageProps {
  room: Room;
  /** Index of the artwork from the URL. Rooms without artworks pass null. */
  artworkIndex: number | null;
  /** Renders the 3D viewer of a modelled work. Without it, "Voir en 3D" shows the poster close up. */
  renderModelViewer?: ModelViewerRenderer | undefined;
}

type Layer = 'notice' | 'closeUp' | 'viewer' | 'wallText' | 'roomMenu' | null;

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

export function GalleryPage({
  room,
  artworkIndex,
  renderModelViewer,
}: GalleryPageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cartelRef = useRef<HTMLButtonElement>(null);
  const observeButtonRef = useRef<HTMLButtonElement>(null);
  const hungButtonRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const wasFocusedRef = useRef(false);
  const reducedMotion = useReducedMotion();
  const ids = {
    notice: useId(),
    closeUp: useId(),
    viewer: useId(),
    wallText: useId(),
    roomMenu: useId(),
  };

  // What hangs on the wall follows the URL once the outgoing animation hides the old content.
  const [shownIndex, setShownIndex] = useState(artworkIndex);
  const [shownRoom, setShownRoom] = useState(room);
  const [layer, setLayer] = useState<Layer>(null);
  const pendingIndexRef = useRef<number | null>(artworkIndex);
  const handledRef = useRef({ slug: room.slug, index: artworkIndex });

  // The focus belongs to one work of the address: walking on ends it.
  const workKey = `${room.slug}/${String(artworkIndex)}`;
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const focused = focusedKey === workKey;
  const leaveFocus = (): void => {
    setFocusedKey(null);
  };

  const arrival = useGalleryArrival(rootRef, {
    roomKey: shownRoom.slug,
    reducedMotion,
  });
  const swap = useArtworkSwap(rootRef, {
    reducedMotion,
    onSwap: () => {
      setShownIndex(pendingIndexRef.current);
    },
  });
  const swapRef = useRef(swap);
  // Layout effects run before the effect below that plays the swap.
  useLayoutEffect(() => {
    swapRef.current = swap;
  });

  useScenePlacement(sceneRef);
  useFocusChrome(rootRef, {
    focused,
    noticeOpen: layer === 'notice',
    reducedMotion,
  });
  useHungFocus(rootRef, { focused, reducedMotion });

  // The keyboard follows the focus: to "Retour à la salle" on the way in,
  // back to the work on the way out.
  useEffect(() => {
    if (focused === wasFocusedRef.current) {
      return;
    }
    wasFocusedRef.current = focused;
    (focused ? backRef : hungButtonRef).current?.focus({
      preventScroll: true,
    });
  }, [focused]);

  // Room change: fade to black, swap wall, text and track, then light the room again.
  useEffect(() => {
    if (room.slug === shownRoom.slug) {
      return;
    }
    if (handledRef.current.slug === room.slug) {
      return;
    }
    handledRef.current = { slug: room.slug, index: artworkIndex };
    setLayer(null);
    arrival.leaveRoom(() => {
      pendingIndexRef.current = artworkIndex;
      setShownRoom(room);
      setShownIndex(artworkIndex);
      ambience.setTrack(room.ambience.track);
    });
  }, [room, artworkIndex, shownRoom.slug, arrival]);

  // Artwork change within the room: slide in the navigation direction.
  useEffect(() => {
    if (room.slug !== shownRoom.slug || artworkIndex === null) {
      return;
    }
    const handled = handledRef.current;
    if (handled.slug === room.slug && handled.index === artworkIndex) {
      return;
    }
    const previous = handled.index ?? 0;
    handledRef.current = { slug: room.slug, index: artworkIndex };
    const count = room.artworks.length;
    const forward = (artworkIndex - previous + count) % count <= count / 2;
    pendingIndexRef.current = artworkIndex;
    arrival.complete();
    swapRef.current(forward ? 1 : -1);
  }, [room, artworkIndex, shownRoom.slug, arrival]);

  useEffect(() => {
    ambience.setTrack(room.ambience.track);
  }, [room.ambience.track]);

  const artworks = shownRoom.artworks;
  const artwork: Artwork | undefined =
    shownIndex === null ? undefined : artworks[shownIndex];
  const total = artworks.length;

  const navigateBy = (direction: SwapDirection): void => {
    if (artworkIndex === null || total < 2) {
      return;
    }
    const next = (artworkIndex + direction + total) % total;
    const target = room.artworks[next];
    if (target !== undefined) {
      navigate(artworkPath(room, target));
    }
  };

  /** Navigation from the room itself, which a dialog suspends. */
  const go = (direction: SwapDirection): void => {
    if (layer === null) {
      navigateBy(direction);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // A dialog takes Escape first; the focus only hears it once alone.
      if (isEditable(event.target) || layer !== null) {
        return;
      }
      if (event.key === 'ArrowRight') {
        go(1);
      } else if (event.key === 'ArrowLeft') {
        go(-1);
      } else if (event.key === 'Escape' && focused) {
        leaveFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });

  useSwipe(sceneRef, go);

  const neighbours = useMemo(() => {
    if (artworkIndex === null || total < 2) {
      return [];
    }
    const previous = room.artworks[(artworkIndex - 1 + total) % total];
    const next = room.artworks[(artworkIndex + 1) % total];
    return [previous, next]
      .filter((item): item is Artwork => item !== undefined)
      .map((item) => item.image);
  }, [room, artworkIndex, total]);
  useImagePreload(neighbours);

  const observeLayer = (): Layer =>
    artwork?.model !== undefined && renderModelViewer !== undefined
      ? 'viewer'
      : 'closeUp';

  /** A click on the hung work: its 3D viewer when it has a model, the focus otherwise. */
  const modelled = artwork?.model !== undefined;
  const activateHung = (): void => {
    if (modelled) {
      setLayer(observeLayer());
    } else {
      setFocusedKey(focused ? null : workKey);
    }
  };

  /** In focus, a click anywhere but on a control steps back to the room. */
  const handleRoomClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (
      focused &&
      event.target instanceof Element &&
      event.target.closest('button, a, dialog') === null
    ) {
      leaveFocus();
    }
  };

  const wallTitle = shownRoom.titleLines.join(' ');

  // The visit log feeds the end-of-visit page (Figma A6).
  useEffect(() => {
    const current =
      artworkIndex === null ? undefined : room.artworks[artworkIndex];
    recordVisit(
      room.slug,
      current === undefined ? null : `${room.slug}/${current.number}`,
    );
  }, [room, artworkIndex]);

  // Figma A5: the work could not be hung. Remounting the image retries the load.
  const [missing, setMissing] = useState(false);
  const [retry, setRetry] = useState(0);
  // Another work on the wall starts without the error of the previous one.
  const [hung, setHung] = useState({
    slug: shownRoom.slug,
    index: shownIndex,
  });
  if (hung.slug !== shownRoom.slug || hung.index !== shownIndex) {
    setHung({ slug: shownRoom.slug, index: shownIndex });
    setMissing(false);
  }

  const lastRoomWithWorks = [...rooms]
    .reverse()
    .find((candidate) => candidate.artworks.length > 0);
  const endOfVisitPath =
    lastRoomWithWorks !== undefined &&
    room.slug === lastRoomWithWorks.slug &&
    artworkIndex === lastRoomWithWorks.artworks.length - 1
      ? paths.end
      : undefined;

  return (
    <div
      ref={rootRef}
      className={styles.gallery}
      data-wall={shownRoom.ambience.wallTone}
      data-scene={shownRoom.ambience.usesRedRoomScene ? 'photo' : 'tone'}
      data-motion="pending"
      data-layer={layer ?? undefined}
      data-focus={focused ? 'true' : undefined}
      data-notice={layer === 'notice' ? 'open' : undefined}
      onClick={handleRoomClick}
    >
      <div
        ref={sceneRef}
        className={styles.scene}
        data-g="scene"
        aria-hidden="true"
      >
        {shownRoom.ambience.usesRedRoomScene ? (
          <img
            className={styles.sceneImage}
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
          <div className={styles.sceneWall} />
        )}
      </div>
      <div className={styles.spot} data-g="spot" aria-hidden="true">
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
      <div
        className={styles.focusVeil}
        data-anim="focus-veil"
        aria-hidden="true"
      />
      <div className={chromeStyles.topScrim} aria-hidden="true" />

      <GalleryTopBar
        room={shownRoom}
        onOpenRoomMenu={() => {
          setLayer('roomMenu');
        }}
        focused={focused}
      />

      <main className={styles.room} aria-labelledby="room-title">
        {/* The arrival splits this text into lines and rebuilds its nodes, so
            each room mounts its own wall text instead of patching the last. */}
        <ArtworkWallText
          key={shownRoom.slug}
          room={shownRoom}
          artwork={artwork}
          onRead={() => {
            setLayer('wallText');
          }}
          faded={focused || layer === 'notice'}
        />

        <FocusBackButton
          ref={backRef}
          onLeave={leaveFocus}
          hidden={!focused}
        />

        {artwork !== undefined ? (
          <figure className={styles.hung} data-g="hung">
            <div className={styles.zoom} data-anim="focus-zoom">
              <div className={styles.artwork} data-g="artwork">
                <div
                  key={`${artwork.number}-${String(retry)}`}
                  className={styles.artworkImageWrap}
                >
                  <MediaImage
                    className={styles.artworkImage}
                    image={artwork.image}
                    alt={artwork.alt}
                    sizes="(max-width: 767px) 40vw, 18vw"
                    objectPosition={artwork.focalPoint}
                    priority
                    onMissing={() => {
                      setMissing(true);
                    }}
                  />
                </div>
                {missing && (
                  <div className={styles.loadError} role="alert">
                    <p className={styles.loadErrorTitle}>
                      Cette œuvre n’a pas pu être accrochée.
                    </p>
                    <p className={styles.loadErrorHint}>
                      Vérifiez votre connexion.
                    </p>
                    <button
                      type="button"
                      className={chromeStyles.glassButton}
                      onClick={() => {
                        setMissing(false);
                        setRetry((value) => value + 1);
                      }}
                    >
                      Réessayer
                    </button>
                  </div>
                )}
              </div>
              <img
                className={styles.gildedFrame}
                src={frameGilded1200}
                srcSet={`${frameGilded600} 600w, ${frameGilded800} 800w, ${frameGilded1200} 1200w`}
                sizes="(max-width: 767px) min(84vw, 330px), 38vw"
                width={1200}
                height={1200}
                alt=""
                fetchPriority="high"
                decoding="async"
              />
              {/* Over the frame, so a click on the work reaches it. A work
                  that failed to load keeps its "Réessayer" button instead. */}
              {!missing && (
                <button
                  ref={hungButtonRef}
                  type="button"
                  className={styles.hungButton}
                  onClick={activateHung}
                  aria-label={
                    modelled ? 'Manipuler l’œuvre en 3D' : 'Agrandir l’œuvre'
                  }
                  aria-pressed={modelled ? undefined : focused}
                  aria-haspopup={modelled ? 'dialog' : undefined}
                />
              )}
            </div>
            <figcaption className="visually-hidden">
              {artwork.title}, {artwork.artist}, {artwork.technique}.
            </figcaption>
          </figure>
        ) : (
          <EmptyRoom medium={shownRoom.medium} />
        )}

        {artwork !== undefined && (
          <WallCartel
            ref={cartelRef}
            artwork={artwork}
            total={total}
            onOpen={() => {
              setLayer('notice');
            }}
          />
        )}

        <p className="visually-hidden" aria-live="polite" aria-atomic="true">
          {artwork === undefined
            ? `${wallTitle}. Salle en préparation.`
            : `Œuvre ${artwork.number} sur ${pad(total)} : ${artwork.title}, ${artwork.technique}.`}
        </p>
      </main>

      <GalleryBottomBar
        activeRoomSlug={room.slug}
        room={shownRoom}
        artwork={artwork}
        total={total}
        onPrevious={() => {
          go(-1);
        }}
        onNext={() => {
          go(1);
        }}
        navDisabled={total < 2}
        endOfVisitPath={endOfVisitPath}
        actions={
          <button
            ref={observeButtonRef}
            type="button"
            className={chromeStyles.glassButton}
            onClick={() => {
              setLayer(observeLayer());
            }}
            disabled={artwork === undefined}
            aria-haspopup="dialog"
          >
            <img src={zoomPaper} width={18} height={18} alt="" />
            <span>
              {artwork?.model === undefined
                ? 'Observer de près'
                : 'Manipuler en 3D'}
            </span>
          </button>
        }
      />

      <div className={styles.curtain} data-g="curtain" aria-hidden="true" />

      {/* No backdrop: the panel opens beside the work, which stays lit. */}
      <GalleryDialog
        open={layer === 'notice' && artwork !== undefined}
        onClose={() => {
          setLayer(null);
        }}
        labelledBy={ids.notice}
        variant="side"
        dim={false}
        reducedMotion={reducedMotion}
        returnFocusRef={cartelRef}
      >
        {(close) =>
          artwork !== undefined && (
            <ArtworkNotice
              room={shownRoom}
              artwork={artwork}
              titleId={ids.notice}
              onClose={close}
              onObserve={() => {
                setLayer(observeLayer());
              }}
              onNext={
                total > 1
                  ? () => {
                      navigateBy(1);
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
        returnFocusRef={observeButtonRef}
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
        open={
          layer === 'viewer' &&
          artwork?.model !== undefined &&
          renderModelViewer !== undefined
        }
        onClose={() => {
          setLayer(null);
        }}
        labelledBy={ids.viewer}
        variant="fullscreen"
        reducedMotion={reducedMotion}
        returnFocusRef={observeButtonRef}
      >
        {(close) =>
          artwork !== undefined &&
          artwork.model !== undefined &&
          renderModelViewer !== undefined && (
            <ModelViewerPanel
              artwork={artwork}
              titleId={ids.viewer}
              onClose={close}
            >
              {renderModelViewer(artwork, artwork.model)}
            </ModelViewerPanel>
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
            activeRoomSlug={room.slug}
            titleId={ids.roomMenu}
            onClose={close}
          />
        )}
      </GalleryDialog>
    </div>
  );
}
