import { afterEach, describe, expect, it, vi } from 'vitest';
import { liftMuseumExit, playMuseumExit } from './museum-exit';

describe('museum exit', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('[data-museum-exit]').forEach((node) => {
      node.remove();
    });
  });

  it('covers the screen with gallery black and resolves once the room is dark', async () => {
    vi.useFakeTimers();
    let dark = false;
    const exit = playMuseumExit().then(() => {
      dark = true;
    });
    const curtain = document.querySelector<HTMLElement>('[data-museum-exit]');

    expect(curtain?.style.position).toBe('fixed');
    expect(dark).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    await exit;

    expect(dark).toBe(true);
    expect(document.querySelectorAll('[data-museum-exit]')).toHaveLength(1);
  });

  it('lifts the black once the end page is on screen, then removes it', async () => {
    vi.useFakeTimers();
    const exit = playMuseumExit();
    await vi.advanceTimersByTimeAsync(1000);
    await exit;

    liftMuseumExit();
    await vi.advanceTimersByTimeAsync(1300);

    expect(document.querySelector('[data-museum-exit]')).toBeNull();
  });

  it('does nothing when the end page opens without coming from the museum', () => {
    liftMuseumExit();

    expect(document.querySelector('[data-museum-exit]')).toBeNull();
  });
});
