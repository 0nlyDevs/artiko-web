import type { Ref } from 'react';
import { cx } from '../../../lib/cx';
import { chromeStyles } from '../GalleryChrome';
import styles from './ImmersiveGallery.module.css';
import { workAnchor } from './label-anchor';

interface ApproachButtonProps {
  readonly onApproach: () => void;
  readonly buttonRef: Ref<HTMLButtonElement>;
  /** Off the keyboard outside the visit: the entrance, and the focus itself. */
  readonly inert: boolean;
}

/**
 * The keyboard way to come close to the work in front of the visitor: a
 * button centred on the work by the frame loop, which shows only when it
 * has the keyboard. A pointer goes through it and clicks the work itself.
 */
export function ApproachButton({
  onApproach,
  buttonRef,
  inert,
}: ApproachButtonProps) {
  return (
    <div
      ref={(element) => {
        workAnchor.element = element;
      }}
      className={styles.workAnchor}
      style={{ opacity: 0 }}
      data-visible="false"
      inert={inert}
    >
      <button
        ref={buttonRef}
        type="button"
        className={cx(chromeStyles.glassButton, styles.approach)}
        onClick={onApproach}
      >
        S’approcher de l’œuvre
      </button>
    </div>
  );
}
