import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { ROOM, focusFrame } from './gallery-layout';
import type { PlacedArtwork } from './gallery-layout';
import { footprints, galleryStore, lens } from './gallery-store';
import { veilAnchor } from './label-anchor';

interface FocusFramingProps {
  readonly placed: readonly PlacedArtwork[];
}

/** Half sizes are written in tenths of a percent of the viewport. */
function share(value: number): string {
  return `${(value * 50).toFixed(1)}%`;
}

/**
 * Fits the DOM veil of the focus to the work in focus: it writes the half
 * width and half height of the work, as shares of the viewport, on the veil
 * element, whose stylesheet opens its clear centre on them. Lives inside
 * the canvas for the size of the viewport and the measure of the models;
 * it writes only when the framing changes, and renders nothing.
 */
export function FocusFraming({ placed }: FocusFramingProps) {
  const written = useRef('');

  useFrame((frame) => {
    const element = veilAnchor.element;
    const state = galleryStore.getState();
    const work =
      state.phase === 'focus' && state.focusedIndex !== null
        ? placed[state.focusedIndex]
        : undefined;
    if (!element || !work) {
      return;
    }
    const measured = footprints.get(work.id) ?? work.width;
    const framed = focusFrame(work, frame.size.width / frame.size.height, {
      dolly: lens.dolly,
      // The top of the pedestal belongs to what stays lit under an object.
      footprint:
        work.kind === 'sculpture'
          ? Math.max(measured, ROOM.pedestalSize)
          : undefined,
    });
    const next = `${share(framed.width)} ${share(framed.height)}`;
    if (next === written.current) {
      return;
    }
    written.current = next;
    element.style.setProperty('--hole-x', share(framed.width));
    element.style.setProperty('--hole-y', share(framed.height));
  });

  return null;
}
