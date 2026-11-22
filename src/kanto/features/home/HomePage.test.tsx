import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setForcedReducedMotion } from '../../lib/motion/reduced-motion';
import { settleMotion } from '../../test/motion';
import {
  beginOpening,
  resetOpening,
  startReveal,
} from '../opening/opening-store';
import { HomePage } from './HomePage';

const HOME_TITLE = 'L’art malagasy, à portée de regard.';

/** The four paintings of the home, by the wording of their description, with the work each opens. */
const FRAMES = [
  { alt: /femme malgache debout/i, cartel: 'Femme malgache', to: '/musee/peinture/01' },
  { alt: /colline rocheuse/i, cartel: 'Antongona', to: '/musee/peinture/02' },
  {
    alt: /chaussée traversant des rizières/i,
    cartel: 'Pont d’Ambaniala',
    to: '/musee/peinture/03',
  },
  {
    alt: /intérieur aux murs rouges/i,
    cartel: 'Scène de divination par le sikidy, Tananarive',
    to: '/musee/peinture/04',
  },
] as const;

describe('HomePage', () => {
  beforeEach(() => {
    resetOpening();
    setForcedReducedMotion(true);
  });

  afterEach(() => {
    setForcedReducedMotion(null);
    resetOpening();
  });

  it('hides content until its animation starts, then reveals it', async () => {
    const { container } = render(<HomePage />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.visibility).toBe('hidden');
    await settleMotion();
    expect(root.style.visibility).not.toBe('hidden');
    expect(root.dataset['motion']).toBe('done');
  });

  it('keeps the headline a real h1 with the Figma copy', async () => {
    render(<HomePage />);
    await settleMotion();

    expect(
      screen.getByRole('heading', { level: 1, name: HOME_TITLE }),
    ).toBeTruthy();
  });

  it('renders the two CTAs as links to the museum and the contribution flow', async () => {
    render(<HomePage />);
    await settleMotion();

    expect(
      screen
        .getByRole('link', { name: /Entrer dans le musée/ })
        .getAttribute('href'),
    ).toBe('/musee/peinture/01');
    expect(
      screen
        .getByRole('link', { name: /Déposer une œuvre/ })
        .getAttribute('href'),
    ).toBe('/contribuer');
  });

  it('hangs the four paintings as figures with alt text and a cartel, and skips objects without a photo', async () => {
    render(<HomePage />);
    await settleMotion();

    // Both pottery photos are pending (objectImages), so only the paintings hang.
    expect(screen.getAllByRole('figure')).toHaveLength(FRAMES.length);
    for (const frame of FRAMES) {
      expect(screen.getByRole('img', { name: frame.alt })).toBeTruthy();
      expect(screen.getByText(frame.cartel)).toBeTruthy();
    }
    expect(screen.queryByText('Sinibe')).toBeNull();
    expect(screen.queryByText('Vilany tany')).toBeNull();
  });

  it('links each frame to its own work in the hall', async () => {
    render(<HomePage />);
    await settleMotion();

    for (const frame of FRAMES) {
      const image = screen.getByRole('img', { name: frame.alt });
      expect(image.closest('a')?.getAttribute('href')).toBe(frame.to);
    }
  });

  it.each(FRAMES)(
    'plays the exit, then enters the hall on $to when its frame is clicked',
    async (frame) => {
      const user = userEvent.setup();
      render(<HomePage />);
      await settleMotion();

      const link = screen.getByRole('img', { name: frame.alt }).closest('a');
      expect(link).not.toBeNull();
      await user.click(link as HTMLAnchorElement);

      // The exit transition runs first: the address only changes once it has played.
      expect(window.location.pathname).toBe('/');
      await settleMotion();
      await waitFor(() => {
        expect(window.location.pathname).toBe(frame.to);
      });
    },
  );

  it('never starts audio on mount', async () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    render(<HomePage />);
    await settleMotion();

    expect(play).not.toHaveBeenCalled();
  });
});

describe('HomePage under the opening', () => {
  beforeEach(() => {
    resetOpening();
  });

  afterEach(() => {
    setForcedReducedMotion(null);
    resetOpening();
  });

  it('waits for the reveal before its reduced-motion entrance', async () => {
    setForcedReducedMotion(true);
    beginOpening('/');
    const { container } = render(<HomePage />);
    const root = container.firstElementChild as HTMLElement;

    await settleMotion();
    // Still covered: nothing has played, the content is hidden by the pending state.
    expect(root.dataset['motion']).toBe('pending');

    startReveal();
    expect(root.dataset['motion']).toBe('running');
    await settleMotion();
    expect(root.dataset['motion']).toBe('done');
    expect(root.style.visibility).not.toBe('hidden');
  });

  it('builds the hanging under the cover and plays it when the reveal starts', async () => {
    beginOpening('/');
    const { container } = render(<HomePage />);
    const root = container.firstElementChild as HTMLElement;

    // Fonts settle, the entrance is built and every element takes its first frame.
    await waitFor(() => {
      expect(root.dataset['motion']).toBe('ready');
    });
    const frames = container.querySelectorAll<HTMLElement>(
      '[data-anim="exhibit"][data-kind="frame"]',
    );
    expect(frames).toHaveLength(4);
    for (const frame of frames) {
      expect(frame.style.visibility).toBe('hidden');
    }

    startReveal();
    expect(root.dataset['motion']).toBe('running');
    await settleMotion();
    expect(root.dataset['motion']).toBe('done');
    for (const frame of frames) {
      expect(frame.style.visibility).not.toBe('hidden');
    }
  });

  it('plays at once when no loader covers the page', async () => {
    const { container } = render(<HomePage />);
    const root = container.firstElementChild as HTMLElement;

    await waitFor(() => {
      expect(root.dataset['motion']).toBe('running');
    });
  });
});
