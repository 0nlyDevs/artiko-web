import { Logo } from '../../components/logo/Logo';
import { ambience, useAmbience } from '../../lib/audio/ambience';
import type { Room } from './data/rooms';
import styles from './MuseumLoading.module.css';

/**
 * Figma A1: shown while the WebGL room's code loads. The sound invitation is
 * the only place where a click may start the ambience before the room.
 */
export function MuseumLoading({ room }: { room: Room }) {
  const sound = useAmbience();
  const count = room.artworks.length;
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <div className={styles.mark}>
        <Logo size="display" />
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.room}>
          Salle {room.number} · {room.name}
          {count > 0 && ` — ${String(count)} œuvre${count > 1 ? 's' : ''}`}
        </p>
      </div>
      {!sound.enabled && (
        <p className={styles.sound}>
          Pour une visite complète, activez le son.
          <button
            type="button"
            className={styles.soundButton}
            onClick={() => {
              ambience.enable();
            }}
          >
            Activer le son
          </button>
        </p>
      )}
    </div>
  );
}
