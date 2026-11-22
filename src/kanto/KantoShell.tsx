'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { Opening } from './features/opening/Opening';
import {
  beginOpening,
  markAppLoaded,
  useOpeningPhase,
} from './features/opening/opening-store';

/*
 * The KANTO app renders in the browser only: its router reads
 * window.location and the mock API reads localStorage, so there is nothing
 * meaningful to prerender. The opening covers the page until the bundle and
 * the first screen are ready.
 */
const App = dynamic(
  () =>
    import('./app/App').then((module) => {
      markAppLoaded();
      return module.App;
    }),
  { ssr: false },
);

// This module is evaluated in the browser once per document, on a full page
// load: client-side navigations keep it, so the opening never replays.
if (typeof window !== 'undefined') {
  beginOpening(window.location.pathname);
}

export function KantoShell() {
  const appRef = useRef<HTMLDivElement>(null);
  const phase = useOpeningPhase();
  // Under the ivory cover the app is not reachable, by keyboard or otherwise.
  const covered = phase === 'loading' || phase === 'revealing';

  return (
    <>
      {/* Outside the dynamic boundary: the opening is in the server HTML and stays mounted when the App chunk arrives. */}
      <Opening appRef={appRef} />
      <div id="root" ref={appRef} inert={covered}>
        <App />
      </div>
    </>
  );
}
