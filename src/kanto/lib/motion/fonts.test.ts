import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForFonts } from './fonts';

interface FontSetStub {
  status?: 'loading' | 'loaded';
  ready?: Promise<unknown>;
  load: (font: string) => Promise<unknown>;
}

function stubFonts(stub: FontSetStub): FontSetStub {
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: stub,
  });
  return stub;
}

/** Runs the wait and reports whether it has resolved yet. */
function track(promise: Promise<void>): { done: boolean } {
  const state = { done: false };
  void promise.then(() => {
    state.done = true;
  });
  return state;
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('waitForFonts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves as soon as the listed fonts are loaded', async () => {
    const load = vi.fn(() => Promise.resolve([]));
    stubFonts({ status: 'loaded', ready: Promise.resolve(), load });

    await waitForFonts(['400 60px "Bebas Neue"', '500 13px "Instrument Sans"']);

    expect(load).toHaveBeenCalledTimes(2);
    expect(load).toHaveBeenCalledWith('400 60px "Bebas Neue"');
  });

  it('waits for the other fonts the document is still loading', async () => {
    vi.useFakeTimers();
    let finishLoading: () => void = () => undefined;
    const fonts = stubFonts({
      status: 'loading',
      load: () => Promise.resolve([]),
    });
    fonts.ready = new Promise<void>((resolve) => {
      finishLoading = () => {
        fonts.status = 'loaded';
        resolve();
      };
    });

    const wait = track(waitForFonts(['400 60px "Bebas Neue"']));
    await flush();
    expect(wait.done).toBe(false);

    finishLoading();
    await flush();
    expect(wait.done).toBe(true);
  });

  it('stops waiting at the timeout when the fonts never settle', async () => {
    vi.useFakeTimers();
    stubFonts({
      status: 'loading',
      ready: new Promise(() => undefined),
      load: () => Promise.resolve([]),
    });

    const wait = track(waitForFonts(['400 60px "Bebas Neue"'], 1200));
    await vi.advanceTimersByTimeAsync(1199);
    expect(wait.done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(wait.done).toBe(true);
  });

  it('does not wait for a set that keeps reporting loading fonts', async () => {
    vi.useFakeTimers();
    stubFonts({
      status: 'loading',
      ready: Promise.resolve(),
      load: () => Promise.resolve([]),
    });

    const wait = track(waitForFonts(['400 60px "Bebas Neue"'], 1200));
    await flush();

    expect(wait.done).toBe(true);
  });

  it('resolves when a font file is missing', async () => {
    stubFonts({
      status: 'loaded',
      ready: Promise.resolve(),
      load: () => Promise.reject(new Error('NetworkError')),
    });

    await expect(
      waitForFonts(['400 92px "New Icon Serif"']),
    ).resolves.toBeUndefined();
  });

  it('waits for the fallback of a missing font', async () => {
    vi.useFakeTimers();
    let finishLoading: () => void = () => undefined;
    const fonts = stubFonts({
      status: 'loading',
      load: () => Promise.reject(new Error('NetworkError')),
    });
    fonts.ready = new Promise<void>((resolve) => {
      finishLoading = () => {
        fonts.status = 'loaded';
        resolve();
      };
    });

    const wait = track(waitForFonts(['400 92px "New Icon Serif"']));
    await flush();
    expect(wait.done).toBe(false);

    finishLoading();
    await flush();
    expect(wait.done).toBe(true);
  });

  it('resolves without the Font Loading API', async () => {
    Reflect.deleteProperty(document, 'fonts');

    await expect(waitForFonts(['400 60px "Bebas Neue"'])).resolves.toBe(
      undefined,
    );
  });
});
