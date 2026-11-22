import type { RefObject } from 'react';
import { useGSAP } from './gsap';

/**
 * Returns an event handler whose animations belong to a GSAP context scoped
 * to `scope`, so they are reverted when the component unmounts. The handler
 * is wrapped when it runs, never during render, so it may read refs. Like
 * `contextSafe` of useGSAP, the returned function is new on every render and
 * runs the handler of that render.
 */
export function useContextSafe<Args extends unknown[]>(
  scope: RefObject<Element | null>,
  handler: (...args: Args) => void,
): (...args: Args) => void {
  const { contextSafe } = useGSAP({ scope });
  return (...args: Args): void => {
    contextSafe(handler)(...args);
  };
}
