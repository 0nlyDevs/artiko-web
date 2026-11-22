import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { ambience } from '../lib/audio/ambience';
import { pageLoad } from '../lib/router/router';

/*
 * jsdom lacks the browser APIs that the pages touch. These stubs make them
 * inert so tests assert behavior, not animation frames.
 */

// <dialog> may be missing in jsdom. The polyfill keeps the open state only.
const dialogPrototype: { showModal?: () => void; close?: () => void } =
  HTMLDialogElement.prototype;
dialogPrototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '');
};
dialogPrototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open');
};

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  // Font loading resolves immediately so intros start right away.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { load: () => Promise.resolve([]) },
  });

  // HTMLMediaElement has no playback in jsdom. A resolved play() means "allowed".
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() =>
    Promise.resolve(),
  );
  vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(
    () => undefined,
  );

  // jsdom cannot load another document: a full page load only moves the address, which tests read.
  vi.spyOn(pageLoad, 'go').mockImplementation((path, replace) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
  });

  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  ambience.reset();
  vi.restoreAllMocks();
});
