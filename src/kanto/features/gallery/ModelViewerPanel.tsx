import type { ReactNode } from 'react';
import type { Artwork } from './data/rooms';
import styles from './ModelViewerPanel.module.css';

export interface ModelViewerPanelProps {
  artwork: Artwork;
  titleId: string;
  onClose: () => void;
  /** The 3D viewer itself, provided by the app through ModelViewerRenderer. */
  children: ReactNode;
}

/**
 * "Voir en 3D": the full-screen frame around the artwork viewer, in the
 * same layout as the close-up viewer. Its stylesheet maps the tokens the
 * viewer reads onto the museum's dark theme.
 */
export function ModelViewerPanel({
  artwork,
  titleId,
  onClose,
  children,
}: ModelViewerPanelProps) {
  return (
    <div className={styles.panel}>
      <header className={styles.bar}>
        <p id={titleId} className={styles.title}>
          {artwork.title}{' '}
          <span className={styles.meta}>· {artwork.technique}</span>
        </p>
        <button type="button" className={styles.close} onClick={onClose}>
          Fermer
        </button>
      </header>
      <div className={styles.stage}>
        <div className={styles.viewer}>{children}</div>
      </div>
      <p className={styles.hint}>
        Glisser pour faire tourner, molette ou pincement pour zoomer, Échap pour
        sortir.
      </p>
    </div>
  );
}
