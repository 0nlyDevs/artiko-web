/*
 * Leaving the museum for the end of the visit: the lights go out (the room
 * fades to gallery black), the address changes on that black, then the end
 * page lifts it. Plain DOM, so it works from either rendering of the room.
 */

const FADE_OUT_MS = 900;
const LIFT_MS = 1100;
const REDUCED_MS = 200;

let curtain: HTMLDivElement | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Makes the browser take the starting style into account, so the change that follows is animated. */
function commitStyle(element: HTMLElement): void {
  void element.offsetHeight;
}

/** Fades the screen to gallery black. Resolves when the room is dark. */
export function playMuseumExit(): Promise<void> {
  const duration = prefersReducedMotion() ? REDUCED_MS : FADE_OUT_MS;
  curtain?.remove();
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  element.dataset['museumExit'] = '';
  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '60',
    background: 'var(--color-gallery-black)',
    opacity: '0',
    transition: `opacity ${String(duration)}ms cubic-bezier(0.65, 0, 0.35, 1)`,
  });
  document.body.append(element);
  curtain = element;
  return new Promise((resolve) => {
    // No frame callback here: a busy or hidden page would start the fade late.
    commitStyle(element);
    element.style.opacity = '1';
    window.setTimeout(resolve, duration + 60);
  });
}

/** Called by the end page once it is on screen: the black lifts. */
export function liftMuseumExit(): void {
  const element = curtain;
  if (element === null) {
    return;
  }
  curtain = null;
  const duration = prefersReducedMotion() ? REDUCED_MS : LIFT_MS;
  element.style.pointerEvents = 'none';
  element.style.transition = `opacity ${String(duration)}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  commitStyle(element);
  element.style.opacity = '0';
  window.setTimeout(() => {
    element.remove();
  }, duration + 120);
}
