import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3 } from 'three';
import type { PlacedArtwork } from './gallery-layout';
import { galleryStore } from './gallery-store';
import {
  labelAnchor,
  labelAnchorFor,
  workAnchor,
  workAnchorFor,
} from './label-anchor';

interface LabelProjectorProps {
  readonly placed: readonly PlacedArtwork[];
}

/**
 * Projects the anchors of the active work to screen space each frame and
 * positions the DOM hung on them: its wall label and its keyboard target.
 * Both show in the visit only; the focus has its own caption and the open
 * notice says the same as the label. Lives inside the canvas so it reads
 * the live camera; renders nothing itself.
 */
export function LabelProjector({ placed }: LabelProjectorProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const point = useRef(new Vector3());

  useFrame(() => {
    const state = galleryStore.getState();
    const work = placed[state.activeIndex];
    const visiting = state.phase === 'visiting' && !state.noticeOpen;

    const place = (
      element: HTMLElement | null,
      anchor: readonly [number, number, number] | null,
    ): void => {
      if (!element) {
        return;
      }
      if (anchor === null) {
        element.style.opacity = '0';
        element.dataset['visible'] = 'false';
        return;
      }
      const projected = point.current
        .set(anchor[0], anchor[1], anchor[2])
        .project(camera);
      const left = ((projected.x + 1) / 2) * size.width;
      const top = ((1 - projected.y) / 2) * size.height;
      const visible = visiting && projected.z < 1;
      element.style.transform = `translate3d(${String(Math.round(left))}px, ${String(Math.round(top))}px, 0)`;
      element.style.opacity = visible ? '1' : '0';
      // The stylesheet enables pointer events only on a visible label.
      element.dataset['visible'] = visible ? 'true' : 'false';
    };

    place(labelAnchor.element, work ? labelAnchorFor(work) : null);
    place(workAnchor.element, work ? workAnchorFor(work) : null);
  });

  return null;
}
