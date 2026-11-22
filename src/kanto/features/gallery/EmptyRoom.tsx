import { paths } from '../../app/routes';
import { Link } from '../../lib/router/Link';
import type { RoomMedium } from './data/rooms';
import styles from './EmptyRoom.module.css';

const HINT: Record<RoomMedium, string> = {
  painting:
    'Toiles, dessins, œuvres sur papier : vos œuvres ont leur place ici.',
  sculpture:
    'Bois, pierre, métal, numérisations 3D : vos sculptures ont leur place ici.',
  craft: 'Tissage, vannerie, travail du bois : vos gestes ont leur place ici.',
  music: 'Instruments, chants, enregistrements : vos voix ont leur place ici.',
};

const CTA: Record<RoomMedium, string> = {
  painting: 'Proposer une œuvre',
  sculpture: 'Proposer une sculpture',
  craft: 'Proposer un savoir-faire',
  music: 'Proposer un enregistrement',
};

/** Figma A4 "Salle vide — accrochage en cours": templates on the wall and a poster inviting a deposit. */
export function EmptyRoom({ medium }: { medium: RoomMedium }) {
  return (
    <div className={styles.empty} data-g="placeholder">
      <ul className={styles.templates} aria-hidden="true">
        <li className={styles.template} />
        <li className={styles.template} />
        <li className={styles.template} />
        <li className={styles.template} />
      </ul>
      <div className={styles.poster} role="status">
        <p className={styles.eyebrow}>
          Salle en préparation · accrochage en cours
        </p>
        <p className={styles.title}>Cette salle attend ses premières œuvres.</p>
        <p className={styles.hint}>{HINT[medium]}</p>
        <Link
          to={paths.contribute}
          className={styles.cta}
        >
          {CTA[medium]}
        </Link>
      </div>
    </div>
  );
}
