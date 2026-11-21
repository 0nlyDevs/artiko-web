"use client";

import { useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Lenis from "lenis";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { stops } from "./content";
import { GalleryScene, type CameraPath } from "./Scene";

const SCROLL_LENGTH = "1500vh";

function Preloader() {
  const { progress, active } = useProgress();
  const done = !active && progress >= 100;
  return (
    <div className={`g-preloader ${done ? "is-done" : ""}`} role="status" aria-live="polite">
      <p className="g-logo g-preloader-logo">
        lova<span aria-hidden="true">·</span>
      </p>
      <div className="g-preloader-bar">
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <p className="g-preloader-count">{Math.round(progress)}%</p>
    </div>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      {open ? (
        <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M4 7 H16 M4 13 H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

export function Gallery() {
  const progress = useRef(0);
  const lenis = useRef<Lenis | null>(null);
  const path = useRef<CameraPath | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const instance = new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.current = instance;
    let frame = 0;
    const raf = (time: number) => {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  // The camera follows the native scroll position, which Lenis drives.
  const activeRef = useRef(0);
  useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.current = p;
      const finder = path.current;
      if (!finder) return;
      let index = 0;
      stops.forEach((stop, i) => {
        const at = Number.isFinite(stop.x) ? finder.progressForX(stop.x) : 1;
        if (p >= at - 0.03) index = i;
      });
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("g-menu-open", menuOpen);
    if (menuOpen) lenis.current?.stop();
    else lenis.current?.start();
  }, [menuOpen]);

  const onPath = useCallback((p: CameraPath) => {
    path.current = p;
  }, []);

  const goTo = useCallback((x: number) => {
    const l = lenis.current;
    if (!l) return;
    const target = Number.isFinite(x) ? (path.current?.progressForX(x) ?? 0) : 1;
    const distance = Math.abs(target - progress.current);
    l.scrollTo(target * l.limit, { duration: Math.min(4, 1.2 + distance * 6) });
  }, []);

  const navigate = (index: number) => {
    setMenuOpen(false);
    // Wait for the menu effect to restart Lenis before scrolling.
    setTimeout(() => goTo(stops[index].x), 50);
  };

  return (
    <>
      <Preloader />

      <header className="g-header">
        <Link className="g-logo" href="/" aria-label="Lova, home">
          lova<span aria-hidden="true">·</span>
        </Link>
        <div className="g-header-actions">
          <button
            type="button"
            className="g-icon-btn"
            aria-expanded={menuOpen}
            aria-controls="g-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <MenuIcon open={menuOpen} />
          </button>
          <button type="button" className="g-btn" onClick={() => navigate(stops.length - 1)}>
            Join Lova
          </button>
        </div>
      </header>

      <nav id="g-menu" className={`g-menu ${menuOpen ? "is-open" : ""}`} aria-label="Main" inert={!menuOpen}>
        <ul className="g-menu-list">
          {stops.map((stop, index) => (
            <li key={stop.label}>
              <button type="button" className={index === active ? "is-active" : ""} onClick={() => navigate(index)}>
                {stop.label}
              </button>
            </li>
          ))}
          <li>
            <Link href="/museum">Museum journey</Link>
          </li>
        </ul>
        <div className="g-menu-side">
          <p className="g-menu-label">The apps</p>
          <p className="g-menu-big">Web: explore and vote</p>
          <p className="g-menu-big">Android: scan, create, learn</p>
          <p className="g-menu-label">Get in touch</p>
          <button type="button" className="g-menu-big g-menu-link" onClick={() => navigate(stops.length - 1)}>
            Contact form
          </button>
          <p className="g-menu-label">More about us</p>
          <a className="g-menu-big g-menu-link" href="/museum/assets/artwork-sources.json" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M10 3 V13 M5 9 L10 14 L15 9 M4 17 H16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sources and credits
          </a>
        </div>
      </nav>

      <div className="g-stage" aria-hidden={menuOpen}>
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
          camera={{ fov: 22.9, near: 1, far: 12000, position: [0, 272, 1862] }}
          onCreated={({ gl }) => gl.setClearColor("#e8e6e1")}
        >
          <Suspense fallback={null}>
            <GalleryScene progress={progress} onPath={onPath} goTo={goTo} />
          </Suspense>
        </Canvas>
      </div>

      <div className="g-scroll" style={{ height: SCROLL_LENGTH }} aria-hidden="true" />

      <footer className="g-footer">
        <Link href="/museum">Museum journey</Link>
        <a href="/museum/assets/artwork-sources.json" target="_blank" rel="noopener noreferrer">
          Credits
        </a>
      </footer>

      <button type="button" className="g-chat" aria-label="Contact Lova" onClick={() => navigate(stops.length - 1)}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 5 H16 V13 H9 L5 16 V13 H4 Z M18 8 H20 V17 H19 V20 L15.5 17 H10 V15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}
