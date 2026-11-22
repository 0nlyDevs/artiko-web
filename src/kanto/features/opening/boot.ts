/*
 * What the document needs before the client bundle runs. This module has no
 * browser or React dependency: the server layout imports it to write the
 * inline script and the font face of the opening into <head>.
 */

/** Attribute the boot script sets on <html> before the first paint. */
export const BOOT_ATTRIBUTE = 'data-kanto-boot';

/** `opening`: the ivory loader plays. `museum`: a black wall waits for the museum's own loading screen. */
export type BootMode = 'opening' | 'museum';

/**
 * First path segments that open on the museum. `/galerie` is the former
 * address of the museum and redirects to it.
 */
export const MUSEUM_SEGMENTS: readonly string[] = ['musee', 'galerie'];

/** The first segment of a path, decoded the way the router decodes it. */
function firstSegment(pathname: string): string | undefined {
  const raw = pathname.split('/').find((segment) => segment !== '');
  if (raw === undefined) {
    return undefined;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** True when a full page load of this path lands in the museum, which has its own loading screen. */
export function isMuseumPath(pathname: string): boolean {
  const first = firstSegment(pathname);
  return first !== undefined && MUSEUM_SEGMENTS.includes(first);
}

export function bootModeFor(pathname: string): BootMode {
  return isMuseumPath(pathname) ? 'museum' : 'opening';
}

/**
 * Runs while the browser parses <head>, so the first paint already knows
 * whether the ivory opening or the black museum wall shows. It applies the
 * rule of `isMuseumPath` to the address; the page itself stays static.
 */
export const OPENING_BOOT_SCRIPT = `(function(){try{var s=location.pathname.split('/').filter(Boolean)[0];try{s=decodeURIComponent(s)}catch(e){}document.documentElement.setAttribute('${BOOT_ATTRIBUTE}',${JSON.stringify(MUSEUM_SEGMENTS)}.indexOf(s)>-1?'museum':'opening')}catch(e){}})()`;

/** Family of the opening letters. One face, resolved to the best display font at hand. */
export const OPENING_FONT_FAMILY = 'KANTO Opening';

const LICENSED_DISPLAY_FONT = '/fonts/licensed/NewIconSerif-Regular.woff2';
const OFL_DISPLAY_FONT = '/fonts/ofl/InstrumentSerif-Regular.woff2';

/**
 * The font face of the opening letters. `font-display: block` keeps them
 * invisible until their font is known, so they never show in a system serif
 * and then swap, which the `swap` faces of fonts.css would do.
 *
 * Its sources follow what the display stack ends up with: the licensed file
 * when the deployment has it, a copy of the licensed family installed on the
 * visitor's machine (Chrome falls back to it for the page as well), then the
 * committed OFL font. The licensed address is left out where the file is
 * absent, so no visitor waits for a request that can only fail.
 */
export function openingFontFace(hasLicensedDisplayFont: boolean): string {
  const sources = [
    ...(hasLicensedDisplayFont
      ? [`url('${LICENSED_DISPLAY_FONT}') format('woff2')`]
      : []),
    "local('New Icon Serif')",
    "local('NewIconSerif-Regular')",
    `url('${OFL_DISPLAY_FONT}') format('woff2')`,
  ];
  return `@font-face{font-family:'${OPENING_FONT_FAMILY}';font-style:normal;font-weight:400;font-display:block;src:${sources.join(',')}}`;
}
