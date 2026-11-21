"use client";

import { useEffect } from "react";
import { museumHtml } from "./museum-markup";

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

// The journey is an imperative Three.js/GSAP script that binds to the markup
// by id, so the markup is injected as static HTML and the script starts after
// hydration (React never diffs dangerouslySetInnerHTML content).
export function MuseumShell() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const w = window as unknown as { gsap?: unknown; ScrollTrigger?: unknown };
        if (!w.gsap) await loadScript("/museum/assets/gsap.min.js");
        if (!w.ScrollTrigger) await loadScript("/museum/assets/ScrollTrigger.min.js");
        if (!(window as unknown as { Lenis?: unknown }).Lenis) await loadScript("/museum/assets/lenis.min.js");
        if (cancelled) return;
        // Unique query: a remount gets a fresh instance bound to the new DOM.
        await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `/museum/app.js?v=${Date.now()}`);
      } catch (error) {
        console.warn("LOVA: failed to start the museum.", error);
      }
    })();
    return () => {
      cancelled = true;
      window.dispatchEvent(new Event("pagehide")); // lets app.js dispose its renderer
    };
  }, []);

  return <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: museumHtml }} />;
}
