/**
 * Starts loading the ceremony while the wizard fades to black, so it opens
 * as soon as the screen is dark. The app loads the same module on demand.
 */
export function preloadHangingPage(): void {
  void import('./HangingPage').catch(() => {
    // The route loads it again and shows its own error if it still fails.
  });
}
