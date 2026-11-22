import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RefObject } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KantoShell } from '../../KantoShell';
import { gsap } from '../../lib/motion/gsap';
import { setForcedReducedMotion } from '../../lib/motion/reduced-motion';
import { navigate } from '../../lib/router/router';
import { settleMotion } from '../../test/motion';
import { Opening } from './Opening';
import {
  beginOpening,
  getOpeningPhase,
  hasRevealStarted,
  markAppLoaded,
  resetOpening,
} from './opening-store';
import { PROGRESS_WEIGHTS } from './progress';

/** The app container next to the opening, as the shell renders it. */
function mountApp(): { app: HTMLDivElement; appRef: RefObject<HTMLElement | null> } {
  const app = document.createElement('div');
  app.id = 'root';
  document.body.append(app);
  return { app, appRef: { current: app } };
}

/** Lets promise callbacks and mutation observers run inside React's act. */
async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

function barValue(): number {
  const fill = document.querySelector<HTMLElement>('[role="status"] [class*="fill"]');
  return Number((fill?.style.transform ?? '').replace(/[^0-9.]/g, '') || 0);
}

describe('Opening', () => {
  beforeEach(() => {
    resetOpening();
    // jsdom has no canvas: the reveal then takes its simple, round form.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    setForcedReducedMotion(null);
    resetOpening();
    document.getElementById('root')?.remove();
  });

  it('is in the server-rendered HTML: a status with the five letters and a hidden label', () => {
    const html = renderToString(<Opening appRef={{ current: null }} />);
    const page = document.createElement('div');
    page.innerHTML = html;

    const status = page.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.querySelector('.visually-hidden')?.textContent).toBe(
      'Chargement de KANTO…',
    );
    const word = status?.querySelector('span[aria-hidden="true"]');
    expect(word?.textContent).toBe('KANTO');
    // One element per letter, in reading order, so CSS alone can bring them in one by one.
    expect([...(word?.children ?? [])].map((letter) => letter.textContent)).toEqual([
      'K',
      'A',
      'N',
      'T',
      'O',
    ]);
    // The cover has no hole before the reveal.
    expect(status?.querySelector('svg path')?.getAttribute('d')).toMatch(/^M-100000/);
  });

  it('renders nothing when no opening is running', () => {
    const { appRef } = mountApp();
    const { container } = render(<Opening appRef={appRef} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the loader on a full load of a hall or home address', () => {
    const { appRef } = mountApp();
    beginOpening('/contribuer');
    render(<Opening appRef={appRef} />);

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Chargement de KANTO…');
    expect(hasRevealStarted()).toBe(false);
  });

  it('shows no loader on a museum address: a plain wall, gone when the museum shows its own screen', async () => {
    const { app, appRef } = mountApp();
    window.history.replaceState(null, '', '/musee/peinture/01');
    beginOpening('/musee/peinture/01');
    const { container } = render(<Opening appRef={appRef} />);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('Chargement de KANTO…')).toBeNull();
    expect(container.textContent).toBe('');
    const veil = container.firstElementChild;
    expect(veil).not.toBeNull();
    expect(veil?.getAttribute('aria-hidden')).toBe('true');
    // Nothing waits for it: the museum arrival plays as usual.
    expect(hasRevealStarted()).toBe(true);

    app.innerHTML = '<div role="status">Salle 01 · Peinture</div>';
    await flush();
    expect(container.innerHTML).toBe('');
    expect(getOpeningPhase()).toBe('none');
    // The only status left is the museum's own.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('follows real progress, then opens the cover and leaves', async () => {
    const { app, appRef } = mountApp();
    beginOpening('/');
    render(<Opening appRef={appRef} />);
    await flush();
    expect(barValue()).toBe(0);

    await act(async () => {
      markAppLoaded();
      await Promise.resolve();
    });
    expect(barValue()).toBeCloseTo(PROGRESS_WEIGHTS.app, 5);
    expect(getOpeningPhase()).toBe('loading');

    // The first screen, with an image that has not arrived.
    const image = document.createElement('img');
    Object.defineProperty(image, 'complete', { get: () => false });
    const main = document.createElement('main');
    main.append('Accueil', image);
    await act(async () => {
      app.append(main);
      await Promise.resolve();
    });
    await flush();
    expect(barValue()).toBeCloseTo(PROGRESS_WEIGHTS.app + PROGRESS_WEIGHTS.fonts, 5);
    // The letters are in (jsdom has no CSS animation) but the image is not: the cover stays.
    expect(getOpeningPhase()).toBe('loading');
    expect(screen.getByRole('status')).toBeTruthy();

    image.dispatchEvent(new Event('load'));
    await flush();
    expect(getOpeningPhase()).toBe('revealing');
    expect(hasRevealStarted()).toBe(true);
    // The hole is cut in the cover.
    expect(
      document.querySelector('[role="status"] svg path')?.getAttribute('d'),
    ).toMatch(/^M0 0H/);

    await settleMotion();
    expect(getOpeningPhase()).toBe('none');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('counts a missing image as settled', async () => {
    const { app, appRef } = mountApp();
    beginOpening('/');
    render(<Opening appRef={appRef} />);
    const image = document.createElement('img');
    Object.defineProperty(image, 'complete', { get: () => false });
    const main = document.createElement('main');
    main.append('Accueil', image);
    await act(async () => {
      markAppLoaded();
      app.append(main);
      await Promise.resolve();
    });
    await flush();
    expect(getOpeningPhase()).toBe('loading');

    image.dispatchEvent(new Event('error'));
    await flush();
    expect(getOpeningPhase()).toBe('revealing');
  });

  it('fades out without moving under reduced motion', async () => {
    setForcedReducedMotion(true);
    const { app, appRef } = mountApp();
    beginOpening('/');
    render(<Opening appRef={appRef} />);
    await act(async () => {
      markAppLoaded();
      app.innerHTML = '<main>Accueil</main>';
      await Promise.resolve();
    });
    await flush();

    expect(getOpeningPhase()).toBe('revealing');
    const status = screen.getByRole('status');
    const word = status.querySelector<HTMLElement>('span[aria-hidden="true"]');
    // No zoom and no hole: the cover is whole and only its opacity changes.
    expect(word?.style.transform ?? '').toBe('');
    expect(status.querySelector('svg path')?.getAttribute('d')).toMatch(/^M-100000/);
    const fades = gsap.getTweensOf(status);
    expect(fades).toHaveLength(1);
    expect(fades[0]?.duration()).toBeCloseTo(0.4, 5);

    await settleMotion();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('opens at the cap when something never arrives', async () => {
    vi.useFakeTimers();
    try {
      const { app, appRef } = mountApp();
      beginOpening('/');
      render(<Opening appRef={appRef} />);
      const image = document.createElement('img');
      Object.defineProperty(image, 'complete', { get: () => false });
      const main = document.createElement('main');
      main.append('Accueil', image);
      await act(async () => {
        markAppLoaded();
        app.append(main);
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(getOpeningPhase()).toBe('loading');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(7000);
      });
      expect(getOpeningPhase()).toBe('loading');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100);
      });
      expect(getOpeningPhase()).toBe('revealing');
    } finally {
      vi.useRealTimers();
    }
  });

  it('never opens before the App chunk, even past the cap', async () => {
    vi.useFakeTimers();
    try {
      const { appRef } = mountApp();
      beginOpening('/');
      render(<Opening appRef={appRef} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(12000);
      });
      expect(getOpeningPhase()).toBe('loading');
      expect(screen.getByRole('status')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('gives way at once when the address becomes the museum', async () => {
    const { appRef } = mountApp();
    beginOpening('/galerie-de-test');
    render(<Opening appRef={appRef} />);
    expect(screen.getByRole('status')).toBeTruthy();

    act(() => {
      navigate('/musee/peinture/01');
    });
    await flush();
    expect(getOpeningPhase()).toBe('none');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('lets a key press end the wait for the letters, never the loading', async () => {
    const user = userEvent.setup();
    const { app, appRef } = mountApp();
    beginOpening('/');
    render(<Opening appRef={appRef} />);
    const image = document.createElement('img');
    Object.defineProperty(image, 'complete', { get: () => false });
    const main = document.createElement('main');
    main.append('Accueil', image);
    await act(async () => {
      markAppLoaded();
      app.append(main);
      await Promise.resolve();
    });
    await flush();

    await user.keyboard('{Enter}');
    await flush();
    // Still loading its image: the key did not open the cover.
    expect(getOpeningPhase()).toBe('loading');

    image.dispatchEvent(new Event('load'));
    await flush();
    expect(getOpeningPhase()).toBe('revealing');
  });
});

describe('KantoShell', () => {
  beforeEach(() => {
    resetOpening();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    resetOpening();
  });

  it('keeps the app out of reach under the cover, and gives it back when the cover is gone', async () => {
    beginOpening('/');
    render(<KantoShell />);

    const app = document.getElementById('root');
    expect(app).not.toBeNull();
    expect(screen.getByText('Chargement de KANTO…')).toBeTruthy();
    expect(app?.hasAttribute('inert')).toBe(true);
    // The opening is a sibling of the app, not inside its dynamic boundary.
    expect(app?.contains(screen.getByText('Chargement de KANTO…'))).toBe(false);

    act(() => {
      resetOpening();
    });
    expect(app?.hasAttribute('inert')).toBe(false);
    expect(screen.queryByText('Chargement de KANTO…')).toBeNull();
  });

  it('renders the app without any cover on a client-side visit', () => {
    render(<KantoShell />);
    expect(screen.queryByText('Chargement de KANTO…')).toBeNull();
    expect(document.getElementById('root')?.hasAttribute('inert')).toBe(false);
  });
});
