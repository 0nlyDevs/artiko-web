import type { HangingSources, HangingStand } from './hanging-content';

/*
 * What drops onto the stand, and what replaces it when it cannot be shown:
 * the live model, then a still standing on the plinth; the framed picture;
 * and the label of the work when no image can be shown at all.
 */
export type WorkKind = 'model' | 'poster' | 'frame' | 'label';

export interface WorkState {
  kind: WorkKind;
  /** Index of the still shown, in the images of the sources. */
  image: number;
  /** Loaded and drawn: the work may drop. */
  ready: boolean;
}

export type WorkAction = { type: 'ready' } | { type: 'failed' };

const LABEL: WorkState = { kind: 'label', image: 0, ready: true };

export function initialWork(
  stand: HangingStand,
  sources: HangingSources,
  webgl: boolean,
): WorkState {
  if (stand === 'label' || (stand === 'rail' && sources.images.length === 0)) {
    return LABEL;
  }
  if (stand === 'rail') {
    return { kind: 'frame', image: 0, ready: false };
  }
  if (webgl && sources.model !== null) {
    return { kind: 'model', image: 0, ready: false };
  }
  return sources.images.length === 0
    ? LABEL
    : { kind: 'poster', image: 0, ready: false };
}

/** `stills` is the number of images the work can fall back to. */
export function nextWork(
  state: WorkState,
  action: WorkAction,
  stills: number,
): WorkState {
  if (state.kind === 'label') {
    return state;
  }
  if (action.type === 'ready') {
    return state.ready ? state : { ...state, ready: true };
  }
  if (state.kind === 'model') {
    return stills === 0 ? LABEL : { kind: 'poster', image: 0, ready: false };
  }
  return state.image + 1 < stills
    ? { kind: state.kind, image: state.image + 1, ready: false }
    : LABEL;
}
