'use client';

import type { ReactNode } from 'react';
import { Component, Suspense, use, useEffect } from 'react';
import type { MuseumPlan } from './plan';
import { setMuseumPlan } from './store';

function Arrival({ plan }: { plan: Promise<MuseumPlan> }) {
  const answer = use(plan);
  useEffect(() => {
    setMuseumPlan(answer);
  }, [answer]);
  return null;
}

/** A plan that never arrives (the stream was cut) leaves the museum as it is. */
class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Receives the plan the server streams and hands it to the store. It draws
 * nothing and holds nothing back: until the answer arrives, and if it never
 * does, the plan shows what it has.
 */
export function MuseumPlanFeed({ plan }: { plan: Promise<MuseumPlan> }) {
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Arrival plan={plan} />
      </Suspense>
    </Quiet>
  );
}
