import { useSyncExternalStore } from "react";

// A phone or a tablet: no hover, a finger for pointer. There a file input with `capture` opens the camera.
const QUERY = "(hover: none) and (pointer: coarse)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True on a touch screen. False on the server and until hydration. */
export function useTouchScreen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
