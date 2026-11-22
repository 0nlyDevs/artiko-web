import type { Ref } from 'react';
import { WallCartel } from '../GalleryChrome';
import type { Artwork } from '../data/rooms';
import styles from './ImmersiveGallery.module.css';
import { labelAnchor } from './label-anchor';

interface ImmersiveCartelProps {
  readonly artwork: Artwork;
  readonly total: number;
  readonly onOpen: () => void;
  readonly buttonRef: Ref<HTMLButtonElement>;
  /** The label is off the wall (entrance, focus): it leaves the keyboard too. */
  readonly inert: boolean;
}

/**
 * The FE-02 wall label, hung beside the work in the 3D room: the frame loop
 * moves this anchor to the projected position every frame.
 */
export function ImmersiveCartel({
  artwork,
  total,
  onOpen,
  buttonRef,
  inert,
}: ImmersiveCartelProps) {
  return (
    <div
      ref={(element) => {
        labelAnchor.element = element;
      }}
      className={styles.cartelAnchor}
      style={{ opacity: 0 }}
      data-visible="false"
      inert={inert}
    >
      <WallCartel
        ref={buttonRef}
        artwork={artwork}
        total={total}
        onOpen={onOpen}
        floating
      />
    </div>
  );
}
