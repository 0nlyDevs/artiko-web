/*
 * Rendering budget of the device, decided once at mount. WebGL support
 * itself is checked by the artwork viewer's `isWebGLAvailable`.
 */

function matches(query: string): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;
}

/** Phones and small tablets, or machines with few cores, get a lighter scene. */
export function detectLowPower(): boolean {
  const coarsePointer = matches('(pointer: coarse)');
  const narrow = matches('(max-width: 900px)');
  const threads =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 8;
  return (coarsePointer && narrow) || threads <= 4;
}
