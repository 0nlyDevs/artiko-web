import styles from './ImmersiveGallery.module.css';
import type { SceneKind } from './scene-annex';
import { veilAnchor } from './label-anchor';

interface FocusVeilProps {
  /** What stands in front of the visitor: the ground under an object is darker. */
  readonly kind: SceneKind;
}

/**
 * The veil that closes on the room around a focused work. useFocusChrome
 * fades it in and the frame loop fits its clear centre to the work
 * (FocusFraming). It never takes a pointer: the canvas under it does.
 */
export function FocusVeil({ kind }: FocusVeilProps) {
  return (
    <div
      ref={(element) => {
        veilAnchor.element = element;
      }}
      className={styles.focusVeil}
      data-anim="focus-veil"
      data-kind={kind}
      aria-hidden="true"
    />
  );
}
