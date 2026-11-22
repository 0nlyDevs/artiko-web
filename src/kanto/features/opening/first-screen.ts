/*
 * What the page under the opening has rendered. The loader looks at the
 * elements that are really in the document: it never fetches an image of its
 * own, so nothing is downloaded twice.
 */

const MEDIA_SELECTOR =
  'img, picture, canvas, video, svg, input, button, textarea, select';

/**
 * True once the app shows a screen. An empty app, or the empty frame a route
 * shows while its code loads, is not a screen yet.
 */
export function hasScreenContent(root: Element): boolean {
  if (root.querySelector(MEDIA_SELECTOR) !== null) {
    return true;
  }
  return (root.textContent ?? '').trim() !== '';
}

function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

/**
 * The images a screen shows on arrival: the eager ones, which the browser
 * fetches wherever they are, and the lazy ones already in the viewport. A
 * lazy image further down never loads, so nobody waits for it.
 */
export function firstScreenImages(root: Element): HTMLImageElement[] {
  return [...root.querySelectorAll('img')].filter(
    (image) => image.loading !== 'lazy' || isInViewport(image),
  );
}

async function decoded(image: HTMLImageElement): Promise<void> {
  if (typeof image.decode !== 'function') {
    return;
  }
  try {
    // Decoding now keeps the first frames of the reveal free of that work.
    await image.decode();
  } catch {
    // An image that cannot be decoded is shown as missing by its component.
  }
}

/**
 * Resolves when the browser has finished with this image: loaded and decoded,
 * or failed. A missing file counts as settled. Never rejects.
 */
export function whenImageSettled(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return image.naturalWidth > 0 ? decoded(image) : Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const settle = (event: Event): void => {
      image.removeEventListener('load', settle);
      image.removeEventListener('error', settle);
      if (event.type === 'load') {
        void decoded(image).then(resolve);
      } else {
        resolve();
      }
    };
    image.addEventListener('load', settle);
    image.addEventListener('error', settle);
  });
}

export interface ScreenImages {
  total: number;
  settled: number;
}

/**
 * Watches the app until it shows a screen, then follows the images of that
 * screen. `onChange` receives the counts each time one settles or a new one
 * appears. Returns the function that stops the watch.
 */
export function watchFirstScreen(
  root: Element,
  onChange: (images: ScreenImages) => void,
): () => void {
  const seen = new Set<HTMLImageElement>();
  let settled = 0;
  let stopped = false;
  let rendered = false;

  const report = (): void => {
    if (!stopped) {
      onChange({ total: seen.size, settled });
    }
  };

  const scan = (): void => {
    if (stopped) {
      return;
    }
    if (!rendered) {
      if (!hasScreenContent(root)) {
        return;
      }
      rendered = true;
    }
    for (const image of firstScreenImages(root)) {
      if (seen.has(image)) {
        continue;
      }
      seen.add(image);
      void whenImageSettled(image).then(() => {
        settled += 1;
        report();
      });
    }
    report();
  };

  const observer =
    typeof MutationObserver === 'function' ? new MutationObserver(scan) : null;
  observer?.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  scan();

  return () => {
    stopped = true;
    observer?.disconnect();
  };
}
