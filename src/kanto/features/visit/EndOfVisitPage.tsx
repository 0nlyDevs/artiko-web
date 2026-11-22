import { useEffect, useMemo } from 'react';
import { paths } from '../../app/routes';
import { ButtonLink } from '../../components/button-link/ButtonLink';
import { HallLayout } from '../../components/hall-layout/HallLayout';
import { rooms } from '../gallery/data/rooms';
import { readVisit, resetVisit } from '../gallery/visit-log';
import { liftMuseumExit } from './museum-exit';
import styles from './EndOfVisitPage.module.css';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Figma A6: the visitor leaves the last room and lands back in the hall.
 * Figures come from the visit log kept by the rooms (sessionStorage).
 */
export function EndOfVisitPage() {
  const visit = useMemo(() => readVisit(), []);
  const totalWorks = rooms.reduce((sum, room) => sum + room.artworks.length, 0);
  const minutes = Math.max(1, Math.round(visit.durationMs / 60000));

  useEffect(() => {
    document.title = 'KANTO — Fin de la visite';
    // Arriving from the museum: the black of the exit lifts on this page.
    liftMuseumExit();
  }, []);

  return (
    <HallLayout width="wide" currentPath={paths.end}>
      <section className={styles.page} aria-labelledby="end-title">
        <p className={styles.eyebrow}>Fin de la visite</p>
        <h1 id="end-title" className={styles.title}>
          Misaotra
          <br />
          nitsidika.
        </h1>
        <p className={styles.lede}>
          « Merci de votre visite. » Vous avez parcouru{' '}
          {visit.roomsVisited.length === rooms.length
            ? `les ${String(rooms.length)} salles`
            : `${String(visit.roomsVisited.length)} salle${visit.roomsVisited.length > 1 ? 's' : ''} sur ${String(rooms.length)}`}
          , de la peinture à la musique.
        </p>
        <ul className={styles.figures}>
          <li className={styles.figure}>
            <span className={styles.number}>
              {pad(visit.roomsVisited.length)}
            </span>
            <span className={styles.caption}>Salles</span>
          </li>
          <li className={styles.figure}>
            <span className={styles.number}>
              {pad(visit.worksSeen.length)}
              <span className="visually-hidden"> sur {String(totalWorks)}</span>
            </span>
            <span className={styles.caption}>Œuvres</span>
          </li>
          <li className={styles.figure}>
            <span className={styles.number}>{String(minutes)} min</span>
            <span className={styles.caption}>De visite</span>
          </li>
        </ul>
        <div className={styles.actions}>
          <ButtonLink to={paths.contribute} variant="primary">
            Déposer une œuvre
          </ButtonLink>
          <ButtonLink
            to={paths.museum()}
            variant="secondary"
            beforeNavigate={() => {
              resetVisit();
              return Promise.resolve();
            }}
          >
            Recommencer la visite
          </ButtonLink>
        </div>
      </section>
    </HallLayout>
  );
}
