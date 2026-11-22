import type { CSSProperties } from 'react';
import { paths } from '../../app/routes';
import { cx } from '../../lib/cx';
import { Link } from '../../lib/router/Link';
import { playMuseumExit } from '../visit/museum-exit';
import type { RoomSlug } from './data/rooms';
import { roomPath, rooms } from './data/rooms';
import { chromeStyles } from './GalleryChrome';
import styles from './MuseumPlan.module.css';

/** Tone of each room card's top rule, Figma A3. */
const ROOM_TONES: Record<RoomSlug, string> = {
  peinture: '#8b2e23',
  sculpture: '#2e5a8c',
  'savoir-faire': '#9a5f2c',
  musique: '#3b6b4a',
};

export interface MuseumPlanProps {
  activeRoomSlug: string;
  titleId: string;
  onClose: () => void;
}

function countLabel(count: number): string {
  if (count === 0) {
    return 'Accrochage en cours';
  }
  return `${String(count).padStart(2, '0')} œuvre${count > 1 ? 's' : ''}`;
}

/** Figma A3 "Plan du musée": four room cards, where the visitor stands, the way back to the hall. */
export function MuseumPlan({
  activeRoomSlug,
  titleId,
  onClose,
}: MuseumPlanProps) {
  return (
    <nav className={styles.plan} aria-labelledby={titleId}>
      <div className={styles.bar}>
        <button
          type="button"
          className={chromeStyles.glassButton}
          onClick={onClose}
          aria-keyshortcuts="Escape"
        >
          Fermer · Échap
        </button>
      </div>
      <h2 id={titleId} className={styles.title}>
        Plan du musée
      </h2>
      <ul className={styles.rooms}>
        {rooms.map((room) => {
          const current = room.slug === activeRoomSlug;
          const style = {
            '--room-tone': ROOM_TONES[room.slug],
          } as CSSProperties;
          return (
            <li key={room.slug} className={styles.room}>
              <Link
                to={roomPath(room)}
                className={styles.card}
                style={style}
                aria-current={current ? 'page' : undefined}
                onClick={onClose}
              >
                <span className={styles.number}>Salle {room.number}</span>
                <span className={styles.name}>{room.name}</span>
                <span className={styles.count}>
                  {countLabel(room.artworks.length)}
                </span>
                <span className={cx(styles.enter, current && styles.here)}>
                  {current ? 'Vous êtes ici' : 'Entrer →'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className={styles.entrance}>↑ Entrée depuis le hall</p>
      <div className={styles.actions}>
        <Link
          to={paths.home}
          className={chromeStyles.glassButton}
          onClick={onClose}
        >
          Retour au hall d’accueil
        </Link>
        <Link
          to={paths.contribute}
          className={cx(chromeStyles.glassButton, styles.paperPill)}
          onClick={onClose}
        >
          Déposer une œuvre
        </Link>
        <Link
          to={paths.end}
          className={chromeStyles.glassButton}
          onClick={onClose}
          beforeNavigate={playMuseumExit}
        >
          Terminer la visite
        </Link>
      </div>
    </nav>
  );
}
