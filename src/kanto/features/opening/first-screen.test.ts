import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  firstScreenImages,
  hasScreenContent,
  watchFirstScreen,
  whenImageSettled,
} from './first-screen';

/** An image element in a known loading state, like the ones a page renders. */
function image(state: 'pending' | 'loaded' | 'broken', loading: 'eager' | 'lazy' = 'eager'): HTMLImageElement {
  const element = document.createElement('img');
  element.loading = loading;
  Object.defineProperty(element, 'complete', {
    configurable: true,
    get: () => state !== 'pending',
  });
  Object.defineProperty(element, 'naturalWidth', {
    configurable: true,
    get: () => (state === 'loaded' ? 480 : 0),
  });
  return element;
}

function settle(element: HTMLImageElement, type: 'load' | 'error'): void {
  element.dispatchEvent(new Event(type));
}

/** Lets promise callbacks and mutation observers run. */
async function flush(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('first screen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('does not take an empty app, or the empty frame of a loading route, for a screen', () => {
    const root = document.createElement('div');
    expect(hasScreenContent(root)).toBe(false);

    root.innerHTML = '<div aria-hidden="true"></div>';
    expect(hasScreenContent(root)).toBe(false);

    // What the server leaves in the app while the client bundle loads.
    root.innerHTML = '<template data-msg="Switched to client rendering"></template>';
    expect(hasScreenContent(root)).toBe(false);
  });

  it('recognises a screen by its text or its media', () => {
    const root = document.createElement('div');
    root.innerHTML = '<main><h1>Page introuvable</h1></main>';
    expect(hasScreenContent(root)).toBe(true);

    root.innerHTML = '<div><img alt=""></div>';
    expect(hasScreenContent(root)).toBe(true);

    root.innerHTML = '<div><canvas></canvas></div>';
    expect(hasScreenContent(root)).toBe(true);
  });

  it('waits for the eager images, and for the lazy ones only when they are in the viewport', () => {
    const root = document.createElement('div');
    const eager = image('pending');
    const lazyBelow = image('pending', 'lazy');
    const lazyVisible = image('pending', 'lazy');
    vi.spyOn(lazyVisible, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(40, 60, 200, 120),
    );
    vi.spyOn(lazyBelow, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(40, window.innerHeight + 400, 200, 120),
    );
    root.append(eager, lazyBelow, lazyVisible);

    expect(firstScreenImages(root)).toEqual([eager, lazyVisible]);
  });

  it('settles an image that is already loaded, and one that is already broken', async () => {
    await expect(whenImageSettled(image('loaded'))).resolves.toBeUndefined();
    await expect(whenImageSettled(image('broken'))).resolves.toBeUndefined();
  });

  it('settles a pending image on load and on error alike: a missing file never blocks', async () => {
    const loading = image('pending');
    const missing = image('pending');
    const done = vi.fn();
    void whenImageSettled(loading).then(() => done('loaded'));
    void whenImageSettled(missing).then(() => done('missing'));

    await flush();
    expect(done).not.toHaveBeenCalled();

    settle(missing, 'error');
    await flush();
    expect(done).toHaveBeenCalledWith('missing');

    settle(loading, 'load');
    await flush();
    expect(done).toHaveBeenCalledWith('loaded');
    expect(done).toHaveBeenCalledTimes(2);
  });

  it('decodes a loaded image before calling it settled, and survives a failed decode', async () => {
    const element = image('loaded');
    const decode = vi.fn().mockRejectedValue(new Error('cannot decode'));
    Object.defineProperty(element, 'decode', { configurable: true, value: decode });

    await expect(whenImageSettled(element)).resolves.toBeUndefined();
    expect(decode).toHaveBeenCalledTimes(1);
  });

  it('never creates an image of its own: it only listens to the ones in the page', async () => {
    const created = vi.spyOn(document, 'createElement');
    const root = document.createElement('div');
    created.mockClear();
    const first = image('pending');
    created.mockClear();
    root.append(first);
    const stop = watchFirstScreen(root, () => undefined);
    settle(first, 'load');
    await flush();
    stop();

    expect(created).not.toHaveBeenCalled();
  });

  it('follows the images of the screen from the moment the screen exists', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div aria-hidden="true"></div>';
    document.body.append(root);
    const onChange = vi.fn();
    const stop = watchFirstScreen(root, onChange);

    // Only the frame of a loading route so far: nobody knows the images yet.
    await flush();
    expect(onChange).not.toHaveBeenCalled();

    const first = image('pending');
    const second = image('pending');
    const screen = document.createElement('main');
    screen.append('Accueil', first, second);
    root.replaceChildren(screen);
    await flush();
    expect(onChange).toHaveBeenLastCalledWith({ total: 2, settled: 0 });

    settle(first, 'load');
    await flush();
    expect(onChange).toHaveBeenLastCalledWith({ total: 2, settled: 1 });

    settle(second, 'error');
    await flush();
    expect(onChange).toHaveBeenLastCalledWith({ total: 2, settled: 2 });

    // An image that appears later joins the count; the ones already settled stay settled.
    const late = image('pending');
    screen.append(late);
    await flush();
    expect(onChange).toHaveBeenLastCalledWith({ total: 3, settled: 2 });

    stop();
    const calls = onChange.mock.calls.length;
    settle(late, 'load');
    screen.append(image('pending'));
    await flush();
    expect(onChange.mock.calls.length).toBe(calls);
  });

  it('reports a screen without images as known and empty', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<main><h1>Déposer une œuvre</h1></main>';
    const onChange = vi.fn();
    const stop = watchFirstScreen(root, onChange);
    await flush();
    stop();

    expect(onChange).toHaveBeenLastCalledWith({ total: 0, settled: 0 });
  });
});
