import { afterEach, describe, expect, it } from 'vitest';
import {
  BOOT_ATTRIBUTE,
  bootModeFor,
  isMuseumPath,
  OPENING_BOOT_SCRIPT,
  OPENING_FONT_FAMILY,
  openingFontFace,
} from './boot';

const MUSEUM_PATHS = [
  '/musee',
  '/musee/',
  '/musee/peinture',
  '/musee/peinture/01',
  '/musee/sculpture/02',
  '/galerie',
  '/galerie/peinture',
  '/mus%65e/peinture/01',
];

const OPENING_PATHS = [
  '/',
  '/contribuer',
  '/contribuer/nouvelle',
  '/oeuvres',
  '/oeuvre/peinture-01',
  '/connexion',
  '/mon-espace',
  '/numerisation',
  '/admin',
  '/fin-de-visite',
  '/musees',
  '/nulle-part',
];

/** Runs the inline script as the browser does while it parses <head>. */
function runBootScript(pathname: string): string | null {
  window.history.replaceState(null, '', pathname);
  document.documentElement.removeAttribute(BOOT_ATTRIBUTE);
  // The script is the string the layout writes into the page: executing it is the point.
  new Function(OPENING_BOOT_SCRIPT)();
  return document.documentElement.getAttribute(BOOT_ATTRIBUTE);
}

describe('boot of the opening', () => {
  afterEach(() => {
    document.documentElement.removeAttribute(BOOT_ATTRIBUTE);
  });

  it.each(MUSEUM_PATHS)('shows no loader on the museum address %s', (path) => {
    expect(isMuseumPath(path)).toBe(true);
    expect(bootModeFor(path)).toBe('museum');
  });

  it.each(OPENING_PATHS)('plays the opening on %s', (path) => {
    expect(isMuseumPath(path)).toBe(false);
    expect(bootModeFor(path)).toBe('opening');
  });

  it.each([...MUSEUM_PATHS, ...OPENING_PATHS])(
    'marks the document before the first paint with the same rule on %s',
    (path) => {
      expect(runBootScript(path)).toBe(bootModeFor(path));
    },
  );

  it('is a self-contained script that cannot break the page', () => {
    expect(OPENING_BOOT_SCRIPT.startsWith('(function(){try{')).toBe(true);
    expect(OPENING_BOOT_SCRIPT).not.toContain('</');
  });
});

describe('font face of the opening letters', () => {
  it('blocks the letters until their font is known, so no system serif shows first', () => {
    for (const licensed of [true, false]) {
      const css = openingFontFace(licensed);
      expect(css).toContain(`font-family:'${OPENING_FONT_FAMILY}'`);
      expect(css).toContain('font-display:block');
    }
  });

  it('loads the licensed file first where the deployment has it, then falls back to the OFL font', () => {
    const css = openingFontFace(true);
    const licensed = css.indexOf('/fonts/licensed/NewIconSerif-Regular.woff2');
    const ofl = css.indexOf('/fonts/ofl/InstrumentSerif-Regular.woff2');
    expect(licensed).toBeGreaterThan(-1);
    expect(ofl).toBeGreaterThan(licensed);
  });

  it('never asks for the licensed file where it is absent', () => {
    const css = openingFontFace(false);
    expect(css).not.toContain('/fonts/licensed/');
    expect(css).toContain('/fonts/ofl/InstrumentSerif-Regular.woff2');
  });
});
