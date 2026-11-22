import type { ReactNode, Ref } from 'react';
import { Fragment, useEffect, useState } from 'react';
import backPaperAsset from '../../assets/icons/back-paper.svg';
import nextPaperAsset from '../../assets/icons/next-paper.svg';
import { Logo } from '../../components/logo/Logo';
import { NavLink } from '../../components/nav-link/NavLink';
import { SoundToggle } from '../../components/sound-toggle/SoundToggle';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { playMuseumExit } from '../visit/museum-exit';
import type { Artwork, Room } from './data/rooms';
import { roomPath, rooms } from './data/rooms';
import styles from './GalleryChrome.module.css';

// Next imports an image as { src, width, height }: the markup needs its URL.
const backPaper = backPaperAsset.src;
const nextPaper = nextPaperAsset.src;

/*
 * The museum chrome shared by the photographic room (GalleryPage) and the
 * WebGL room (ImmersiveGallery): top bar, wall text, wall label, bottom bar
 * and the mobile sheets. Markup and data-g hooks are those of the Figma
 * gallery frame, so the GSAP arrival can light them.
 *
 * While a work is in focus, part of this chrome steps back. The rooms say so
 * with the `focused` and `faded` props, which make those parts inert; the
 * fade itself is played by useFocusChrome on the data-anim hooks.
 */

export { styles as chromeStyles };

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export interface GalleryTopBarProps {
  room: Room;
  onOpenRoomMenu: () => void;
  /** A work is in focus: the logo and the room label step back, sound stays. */
  focused?: boolean | undefined;
}

/** Figma "Barre haute": logo, current room with progress dots, room menu and sound. */
export function GalleryTopBar({
  room,
  onOpenRoomMenu,
  focused = false,
}: GalleryTopBarProps) {
  const roomNumber = rooms.findIndex(
    (candidate) => candidate.slug === room.slug,
  );
  return (
    <header className={styles.topBar} data-g="topbar">
      <Link
        to="/"
        className={styles.logo}
        aria-label="KANTO, retour à l’accueil"
        data-anim="focus-out"
        inert={focused}
      >
        <Logo />
      </Link>
      <button
        type="button"
        className={styles.currentRoom}
        onClick={onOpenRoomMenu}
        aria-haspopup="dialog"
        aria-label={`Salle ${room.number} sur ${pad(rooms.length)} · ${room.name}. Ouvrir le plan du musée`}
        data-anim="focus-out"
        inert={focused}
      >
        <span>
          Salle {room.number} sur {pad(rooms.length)} · {room.name}
        </span>
        <span className={styles.progress} aria-hidden="true">
          {rooms.map((candidate, index) => (
            <span
              key={candidate.slug}
              className={cx(
                styles.dot,
                index === roomNumber && styles.dotActive,
              )}
            />
          ))}
        </span>
      </button>
      <div className={styles.topRight}>
        <button
          type="button"
          className={cx(styles.glassButton, styles.menuButton)}
          onClick={onOpenRoomMenu}
          aria-haspopup="dialog"
        >
          Salles
        </button>
        <SoundToggle theme="dark" className={styles.sound} />
      </div>
    </header>
  );
}

export interface WallTextProps {
  room: Room;
  /** The work in front of the visitor: the wall then tells its story instead of the room's. */
  artwork?: Artwork | undefined;
  onRead: () => void;
  /** The block steps back: a work is in focus, or the notice covers it. */
  faded?: boolean | undefined;
}

/** The wall text: the room label, then the title, the line under it and the paragraphs of the work, or of the room when no work is given. */
export function WallText({
  room,
  artwork,
  onRead,
  faded = false,
}: WallTextProps) {
  const titleLines = artwork === undefined ? room.titleLines : [artwork.title];
  const subtitle =
    artwork === undefined
      ? room.subtitle
      : `${artwork.artist}, ${artwork.year}`;
  const paragraphs = artwork === undefined ? room.wallText : artwork.story;
  return (
    <section
      className={styles.wallText}
      aria-label="Texte mural"
      data-anim="focus-wall"
      inert={faded}
    >
      <p className={styles.wallLabel} data-g="wall-label">
        Salle {room.number} · {room.name} — {room.malagasyLabel}
      </p>
      <h1 id="room-title" className={styles.wallTitle} data-g="wall-title">
        {titleLines.map((line, index) => (
          <Fragment key={line}>
            {index > 0 && (
              <>
                {' '}
                <br />
              </>
            )}
            {line}
          </Fragment>
        ))}
      </h1>
      <p className={styles.wallSubtitle} data-g="wall-subtitle">
        {subtitle}
      </p>
      <div className={styles.wallBody} data-g="wall-text">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <button
        type="button"
        className={cx(styles.glassButton, styles.readButton)}
        data-g="wall-read"
        onClick={onRead}
        aria-haspopup="dialog"
      >
        Lire
      </button>
    </section>
  );
}

/** How long the text of the work being left takes to fade before the next one comes in. */
const WALL_TEXT_LEAVE_MS = 260;

interface SettledWallText {
  key: string;
  room: Room;
  artwork: Artwork | undefined;
  /** The text arrived by a change of work, so it plays its entrance. */
  entering: boolean;
}

/**
 * The wall text follows the work in front of the visitor: the text of the
 * work they leave fades out, then the text of the next one rises in. A change
 * of room swaps at once, because the entrance of the room animates the wall.
 */
export function ArtworkWallText({ room, artwork, onRead, faded }: WallTextProps) {
  const key =
    artwork === undefined ? room.slug : `${room.slug}/${artwork.number}`;
  const [settled, setSettled] = useState<SettledWallText>({
    key,
    room,
    artwork,
    entering: false,
  });
  const sameRoom = settled.room.slug === room.slug;
  const leaving = sameRoom && settled.key !== key;

  useEffect(() => {
    if (settled.key === key) {
      return;
    }
    const timer = window.setTimeout(
      () => {
        setSettled({ key, room, artwork, entering: leaving });
      },
      leaving ? WALL_TEXT_LEAVE_MS : 0,
    );
    return () => {
      window.clearTimeout(timer);
    };
  }, [settled.key, key, room, artwork, leaving]);

  const shown: SettledWallText = sameRoom
    ? settled
    : { key, room, artwork, entering: false };
  return (
    <div
      key={shown.key}
      className={cx(
        styles.wallSwap,
        leaving && styles.wallSwapLeaving,
        shown.entering && styles.wallSwapEntering,
      )}
    >
      <WallText
        room={shown.room}
        artwork={shown.artwork}
        onRead={onRead}
        faded={faded}
      />
    </div>
  );
}

export interface WallCartelProps {
  artwork: Artwork;
  total: number;
  onOpen: () => void;
  ref?: Ref<HTMLButtonElement> | undefined;
  /** Positioned by the caller instead of the Figma stage coordinates. */
  floating?: boolean | undefined;
}

/** Figma "Cartel mural": the wall label that opens the notice. */
export function WallCartel({
  artwork,
  total,
  onOpen,
  ref,
  floating = false,
}: WallCartelProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(styles.cartel, floating && styles.cartelFloating)}
      data-g="cartel"
      onClick={onOpen}
      aria-haspopup="dialog"
    >
      <span className={styles.cartelNumber}>
        {artwork.number} / {pad(total)}
      </span>
      <span className={styles.cartelTitle}>{artwork.title}</span>
      <span className={styles.cartelTechnique}>
        {artwork.technique}
        {artwork.isDemo && (
          <>
            <br />
            Œuvre de démonstration
          </>
        )}
      </span>
      <span className={styles.cartelLink}>Lire la notice</span>
    </button>
  );
}

export interface GalleryBottomBarProps {
  /** Room of the URL, underlined in the tabs. */
  activeRoomSlug: string;
  /** Room shown on the wall, used by the counter. */
  room: Room;
  artwork: Artwork | undefined;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  navDisabled: boolean;
  /**
   * Right-hand action of the bar, for example "Observer de près". A room
   * that passes `focused` marks it data-anim="focus-out" to fade with the bar.
   */
  actions: ReactNode;
  /** Set on the last work of the museum: "Terminer la visite" replaces the next arrow (Figma C board). */
  endOfVisitPath?: string | undefined;
  /** A work is in focus: the bar steps back and the caption of the focus takes over. */
  focused?: boolean | undefined;
}

/** Figma "Barre basse": room tabs, previous and next, and the room's action. */
export function GalleryBottomBar({
  activeRoomSlug,
  room,
  artwork,
  total,
  onPrevious,
  onNext,
  navDisabled,
  actions,
  endOfVisitPath,
  focused = false,
}: GalleryBottomBarProps) {
  return (
    <footer className={styles.bottomBar} data-g="bottombar" inert={focused}>
      <nav
        className={styles.roomTabs}
        aria-label="Salles"
        data-anim="focus-out"
      >
        {rooms.map((candidate) => (
          <NavLink
            key={candidate.slug}
            to={roomPath(candidate)}
            theme="dark"
            current={candidate.slug === activeRoomSlug}
          >
            {candidate.name}
          </NavLink>
        ))}
      </nav>
      <div className={styles.artworkNav} data-anim="focus-out">
        <button
          type="button"
          className={styles.navArrow}
          onClick={onPrevious}
          disabled={navDisabled}
          aria-label="Œuvre précédente"
        >
          <img src={backPaper} width={16} height={16} alt="" />
        </button>
        <span className={styles.counter} data-g="counter">
          {artwork === undefined
            ? `Salle ${room.number}`
            : `Œuvre ${artwork.number} / ${pad(total)}`}
        </span>
        {endOfVisitPath === undefined ? (
          <button
            type="button"
            className={styles.navArrow}
            onClick={onNext}
            disabled={navDisabled}
            aria-label="Œuvre suivante"
          >
            <img src={nextPaper} width={16} height={16} alt="" />
          </button>
        ) : (
          <Link
            to={endOfVisitPath}
            className={styles.endLink}
            beforeNavigate={playMuseumExit}
          >
            Terminer la visite
            <img src={nextPaper} width={16} height={16} alt="" />
          </Link>
        )}
      </div>
      <div className={styles.actions}>{actions}</div>
    </footer>
  );
}

export interface FocusBackButtonProps {
  onLeave: () => void;
  /** The button is off stage: no work is in focus, or the notice covers it. */
  hidden: boolean;
  ref?: Ref<HTMLButtonElement> | undefined;
}

/**
 * "Retour à la salle", top left while a work is in focus, where the logo
 * stands in the visit. Escape does the same.
 */
export function FocusBackButton({
  onLeave,
  hidden,
  ref,
}: FocusBackButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(styles.glassButton, styles.focusBack)}
      data-anim="focus-in"
      inert={hidden}
      onClick={onLeave}
      aria-keyshortcuts="Escape"
    >
      <img src={backPaper} width={16} height={16} alt="" />
      <span>Retour à la salle</span>
    </button>
  );
}

export interface WallTextSheetProps {
  room: Room;
  titleId: string;
  onClose: () => void;
}

/** Mobile sheet with the full wall text. */
export function WallTextSheet({ room, titleId, onClose }: WallTextSheetProps) {
  return (
    <article className={styles.sheet}>
      <p className={styles.wallLabel}>
        Salle {room.number} · {room.name}
      </p>
      <h2 id={titleId} className={styles.sheetTitle}>
        {room.titleLines.join(' ')}
      </h2>
      <p className={styles.sheetSubtitle}>{room.subtitle}</p>
      {room.wallText.map((paragraph) => (
        <p key={paragraph} className={styles.sheetBody}>
          {paragraph}
        </p>
      ))}
      <button type="button" className={styles.sheetClose} onClick={onClose}>
        Fermer
      </button>
    </article>
  );
}

export interface RoomMenuSheetProps {
  activeRoomSlug: string;
  titleId: string;
  onClose: () => void;
}

/** Mobile sheet listing the rooms. */
export function RoomMenuSheet({
  activeRoomSlug,
  titleId,
  onClose,
}: RoomMenuSheetProps) {
  return (
    <nav className={styles.sheet} aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.sheetTitle}>
        Salles
      </h2>
      <ul className={styles.roomList}>
        {rooms.map((candidate) => (
          <li key={candidate.slug}>
            <Link
              to={roomPath(candidate)}
              className={styles.roomListLink}
              aria-current={
                candidate.slug === activeRoomSlug ? 'page' : undefined
              }
              onClick={onClose}
            >
              <span className={styles.roomListNumber}>{candidate.number}</span>
              {candidate.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
