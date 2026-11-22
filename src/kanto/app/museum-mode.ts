import { isWebGLAvailable } from '../features/artwork-viewer/webgl';

export type MuseumMode = 'immersive' | 'photo';

export interface MuseumModeInput {
  /** Query string of the page, for the `rendu` override. */
  search: string;
  webgl: boolean;
  hasArtworks: boolean;
}

/**
 * Which room to show. The WebGL room is the main experience. The
 * photographic room stands in when WebGL is unavailable, when the room has
 * nothing to hang yet, and when the visitor asks for it with `?rendu=photo`.
 */
export function resolveMuseumMode({
  search,
  webgl,
  hasArtworks,
}: MuseumModeInput): MuseumMode {
  if (new URLSearchParams(search).get('rendu') === 'photo') {
    return 'photo';
  }
  return webgl && hasArtworks ? 'immersive' : 'photo';
}

/** WebGL support, without creating a canvas in environments that have no WebGL at all. */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) {
    return false;
  }
  return isWebGLAvailable();
}
