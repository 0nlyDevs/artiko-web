import type { PlacedArtwork } from './gallery-layout';

/*
 * Bridge between the frame loop and the DOM that hangs on the works. The 3D
 * side projects each anchor every frame and moves its element directly, so
 * the DOM follows the camera without React renders or portals.
 */

/** The wall label of the work in front of the visitor. */
export const labelAnchor: { element: HTMLElement | null } = { element: null };

/** The keyboard target of that work, centred on it. */
export const workAnchor: { element: HTMLElement | null } = { element: null };

/** The veil of the focus, whose clear centre is fitted to the work. */
export const veilAnchor: { element: HTMLElement | null } = { element: null };

/** World-space point beside a work where its wall label hangs. */
export function labelAnchorFor(
  work: PlacedArtwork,
): readonly [number, number, number] {
  if (work.kind === 'sculpture') {
    return [work.x - (work.width / 2 + 0.55), work.y - 0.1, work.z + 0.08];
  }
  return [
    work.x - (work.width / 2 + 0.62),
    work.y - work.height / 2 + 0.25,
    work.z + 0.08,
  ];
}

/** World-space centre of a work, where its keyboard target sits. */
export function workAnchorFor(
  work: PlacedArtwork,
): readonly [number, number, number] {
  return [work.x, work.y, work.z + 0.08];
}
