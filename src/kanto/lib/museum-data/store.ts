import { useSyncExternalStore } from 'react';
import type { MuseumPlan } from './plan';

/*
 * The plan read by the server, kept outside React: the shell receives it at
 * the top of the document while the plan is drawn deep inside a room, behind
 * components that do not carry it. Null until the server answer arrives.
 */

const listeners = new Set<() => void>();
let current: MuseumPlan | null = null;

export function setMuseumPlan(plan: MuseumPlan | null): void {
  current = plan;
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getMuseumPlan(): MuseumPlan | null {
  return current;
}

/** The plan read by the server, or null while it has not arrived. */
export function useMuseumPlan(): MuseumPlan | null {
  return useSyncExternalStore(subscribe, getMuseumPlan, () => null);
}
