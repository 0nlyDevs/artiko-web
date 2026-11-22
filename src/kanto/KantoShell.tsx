'use client';

import dynamic from 'next/dynamic';
import { Suspense, use, useRef } from 'react';
import type { ReactNode } from 'react';
import { installPublishedWorks } from './features/gallery/data/published';
import { Opening } from './features/opening/Opening';
import {
  beginOpening,
  markAppLoaded,
  useOpeningPhase,
} from './features/opening/opening-store';
import { MuseumPlanFeed } from './lib/museum-data/MuseumPlanFeed';
import type { MuseumPlan } from './lib/museum-data/plan';
import type { PublishedWork } from './lib/museum-data/published-works';

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

export interface KantoShellProps {
  /**
   * The museum plan read by the server from the real API, still on its way:
   * the shell renders at once and the plan fills in when the answer arrives.
   */
  museumPlan?: Promise<MuseumPlan> | undefined;
  /** The works published on the real API, hung in the rooms before the museum renders. */
  publishedWorks?: Promise<PublishedWork[]> | undefined;
}

/** Waits for the published works, hangs them, then lets the museum load. */
function WithPublishedWorks({
  works,
  children,
}: {
  works: Promise<PublishedWork[]>;
  children: ReactNode;
}) {
  installPublishedWorks(use(works));
  return children;
}

export function KantoShell({ museumPlan, publishedWorks }: KantoShellProps) {
  const appRef = useRef<HTMLDivElement>(null);
  const phase = useOpeningPhase();
  // Under the ivory cover the app is not reachable, by keyboard or otherwise.
  const covered = phase === 'loading' || phase === 'revealing';

  return (
    <>
      {/* Outside the dynamic boundary: the opening is in the server HTML and stays mounted when the App chunk arrives. */}
      <Opening appRef={appRef} />
      {museumPlan !== undefined && <MuseumPlanFeed plan={museumPlan} />}
      <div id="root" ref={appRef} inert={covered}>
        {publishedWorks === undefined ? (
          <App />
        ) : (
          <Suspense>
            <WithPublishedWorks works={publishedWorks}>
              <App />
            </WithPublishedWorks>
          </Suspense>
        )}
      </div>
    </>
  );
}
