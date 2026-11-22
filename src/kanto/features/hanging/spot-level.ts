/**
 * How close the visitor is to the work, from 0 (away) to 1 (on it), for a
 * distance and the reach of the lamp in the same unit. The rooms of the
 * museum light a work the same way as the visitor walks up to it: a
 * smoothstep, so the lamp never flickers.
 */
export function nearness(distance: number, reach: number): number {
  if (!(reach > 0)) {
    return 0;
  }
  const t = Math.min(1, Math.max(0, 1 - Math.abs(distance) / reach));
  return t * t * (3 - 2 * t);
}
