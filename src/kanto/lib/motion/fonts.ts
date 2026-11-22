/**
 * How many times the wait follows `document.fonts.ready`. One pass covers a
 * page that loads its fonts in one batch; the spare passes cover a batch that
 * starts while the previous one settles.
 */
const MAX_READY_PASSES = 3;

/**
 * Loads the given shorthands, then waits until the document has no font left
 * loading. Never rejects: a font file that is missing is replaced by the next
 * font of its stack, which the document wait covers.
 */
async function settleFonts(
  fontSet: FontFaceSet,
  fonts: readonly string[],
): Promise<void> {
  try {
    await Promise.all(fonts.map((font) => fontSet.load(font)));
  } catch {
    // A missing or unreadable file: its fallback loads with the document.
  }
  try {
    for (let pass = 0; pass < MAX_READY_PASSES; pass += 1) {
      // The browser requests a face when it lays out text that needs it. A
      // screen rendered a moment ago has not been laid out yet, so measure
      // once: the status below then counts the faces of the new content.
      document.documentElement.getBoundingClientRect();
      if (fontSet.status !== 'loading') {
        return;
      }
      await fontSet.ready;
    }
  } catch {
    // An incomplete Font Loading API: carry on with the fonts at hand.
  }
}

/**
 * Resolves once the given CSS font shorthands have loaded and the document
 * fonts are settled, or after the timeout so a missing or slow font never
 * blocks the page. Text is split only afterwards: SplitText measures lines
 * with the fonts in place, and warns when the document is still loading some.
 */
export async function waitForFonts(
  fonts: readonly string[],
  timeoutMs = 1200,
): Promise<void> {
  if (!('fonts' in document)) {
    return;
  }
  let timer = 0;
  const timeout = new Promise<void>((resolve) => {
    timer = window.setTimeout(resolve, timeoutMs);
  });
  await Promise.race([settleFonts(document.fonts, fonts), timeout]);
  window.clearTimeout(timer);
}
