"use client";

import { useGSAP } from "@gsap/react";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import Lenis from "lenis";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { PageTitle, useT } from "@/i18n/locale";
import { ArtikoLogo } from "../brand/ArtikoLogo";
import { stops } from "./content";
import { GalleryScene, type CameraPath } from "./Scene";

gsap.registerPlugin(useGSAP);

const SCROLL_LENGTH = "1500vh";
// Upper bound of the render resolution; the performance monitor drops it to 1 on slow GPUs.
const MAX_DPR = 1.5;

const APP_PAGES = [
  { href: "/explore", label: "menu.explore" },
  { href: "/hall-of-fame", label: "nav.hallOfFame" },
  { href: "/heritage", label: "nav.heritage" },
  { href: "/scan", label: "nav.scan" },
  { href: "/me", label: "nav.mySpace" },
] as const;

// Loader: just the ARTIKO icon (public/brand/artiko-icon.svg), turning. When loading ends the screen lifts
// away like a curtain (skill "clip-path-bar-reveal").
function Preloader() {
  const { progress, active } = useProgress();
  const done = !active && progress >= 100;
  return (
    <div className={`g-preloader ${done ? "is-done" : ""}`} role="status" aria-live="polite" aria-label="Loading">
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static SVG, no optimisation needed */}
      <img className="g-loader-mark" src="/brand/artiko-icon.svg" width={120} height={120} alt="" />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M3 8 H13 M9 4 L13 8 L9 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Magnetic call to action: the button drifts toward the cursor and springs
// back when it leaves (animation-workflow skill "magnetic-element").
function JoinButton({ onClick }: { onClick: () => void }) {
  const { t } = useT();
  const wrap = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = wrap.current;
      const inner = el?.firstElementChild;
      if (!el || !inner) return;
      const strength = 0.35;
      const move = (e: PointerEvent) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * strength;
        const y = (e.clientY - rect.top - rect.height / 2) * strength;
        gsap.to(inner, { x, y, duration: 0.4, ease: "power2.out" });
      };
      const leave = () => gsap.to(inner, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { scope: wrap },
  );
  return (
    <div ref={wrap} className="g-magnetic">
      <button type="button" className="g-join" onClick={onClick}>
        <span className="g-join-label">{t("gallery.join")}</span>
        <span className="g-join-dot">
          <ArrowIcon />
        </span>
      </button>
    </div>
  );
}

export function Gallery() {
  const { t } = useT();
  const progress = useRef(0);
  const lenis = useRef<Lenis | null>(null);
  const path = useRef<CameraPath | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [dprMax, setDprMax] = useState(MAX_DPR);

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
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = () => {
      const root = document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress.current = p;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
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

  // Menu: the panel unrolls from the top, then the links rise out of their
  // masks one after another (skills "clip-path-bar-reveal" and
  // "stagger-text-reveal").
  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ease = "power4.inOut";
      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      tl.set(menu.current, { visibility: "visible" })
        .fromTo(".g-menu-veil", { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" }, 0)
        .fromTo(
          ".g-menu-panel",
          { clipPath: "inset(0% 0% 100% 0% round 26px)" },
          { clipPath: "inset(0% 0% 0% 0% round 26px)", duration: 0.75, ease },
          0,
        )
        .fromTo(".g-menu-divider", { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease }, 0.25)
        .fromTo(".g-menu-link-text", { yPercent: 115 }, { yPercent: 0, duration: 0.9, stagger: 0.055 }, 0.35)
        .fromTo(".g-menu-num", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.055 }, 0.45)
        .fromTo(
          ".g-menu-card",
          { opacity: 0, rotate: 9, scale: 0.85, y: 30 },
          { opacity: 1, rotate: -4, scale: 1, y: 0, duration: 0.9, ease: "back.out(1.7)" },
          0.5,
        );
      if (reduce) tl.duration(0.01);
      timeline.current = tl;
    },
    { scope: menu },
  );

  useEffect(() => {
    document.documentElement.classList.toggle("g-menu-open", menuOpen);
    const tl = timeline.current;
    if (menuOpen) {
      lenis.current?.stop();
      tl?.timeScale(1).play();
    } else {
      lenis.current?.start();
      tl?.timeScale(1.7).reverse();
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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

  const columns = [stops.slice(0, 4), stops.slice(4)];

  return (
    <>
      <PageTitle k="meta.home" />
      <Preloader />

      <header className={`g-header ${menuOpen ? "is-menu" : ""}`}>
        <div className="g-bar">
          <button
            type="button"
            className="g-burger"
            aria-expanded={menuOpen}
            aria-controls="g-menu"
            aria-label={menuOpen ? t("gallery.menuClose") : t("gallery.menuOpen")}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
          <Link className="g-logo" href="/" aria-label={t("nav.homeAria")}>
            <ArtikoLogo height={26} />
          </Link>
          <nav className="g-quick" aria-label={t("gallery.quick")}>
            {[1, 3, 4, 5].map((i) => (
              <button key={stops[i].label} type="button" className={active === i ? "is-active" : ""} onClick={() => navigate(i)}>
                {t(stops[i].label)}
              </button>
            ))}
          </nav>
        </div>
        <JoinButton onClick={() => navigate(stops.length - 1)} />
      </header>

      <div id="g-menu" ref={menu} className="g-menu" inert={!menuOpen}>
        <div className="g-menu-veil" onClick={() => setMenuOpen(false)} />
        <div className="g-menu-panel" role="dialog" aria-modal="true" aria-label={t("gallery.menu")}>
          <nav className="g-menu-cols" aria-label={t("gallery.main")}>
            {columns.map((column, c) => (
              <ul key={c} className="g-menu-list">
                {column.map((stop) => {
                  const index = stops.findIndex((s) => s.label === stop.label);
                  return (
                    <li key={stop.label}>
                      <button type="button" className={index === active ? "is-active" : ""} onClick={() => navigate(index)}>
                        <span className="g-menu-num">{String(index + 1).padStart(2, "0")}</span>
                        <span className="g-menu-mask">
                          <span className="g-menu-link-text">{t(stop.label)}</span>
                        </span>
                        <span className="g-menu-arrow" aria-hidden="true">
                          <ArrowIcon />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ))}
            <span className="g-menu-divider" aria-hidden="true" />
          </nav>
          <aside className="g-menu-card">
            <p className="g-menu-card-tag">{t("menu.tag")}</p>
            <p className="g-menu-card-text">{t("menu.text")}</p>
            <ul className="g-menu-card-links">
              {APP_PAGES.map((page) => (
                <li key={page.href}>
                  <Link href={page.href}>{t(page.label)}</Link>
                </li>
              ))}
            </ul>
            <div className="g-menu-card-row">
              <span>{t("menu.web")}</span>
              <span>{t("menu.android")}</span>
              <span>{t("menu.free")}</span>
            </div>
          </aside>
        </div>
      </div>

      <div className="g-stage" aria-hidden={menuOpen}>
        <Canvas
          dpr={[1, dprMax]}
          gl={{ antialias: !(typeof window !== "undefined" && window.devicePixelRatio >= 1.5), powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}
          camera={{ fov: 22.9, near: 1, far: 12000, position: [0, 272, 1862] }}
          onCreated={({ gl }) => gl.setClearColor("#FBF0E4")}
        >
          <PerformanceMonitor onDecline={() => setDprMax(1)} onIncline={() => setDprMax(MAX_DPR)} />
          <Suspense fallback={null}>
            <GalleryScene progress={progress} onPath={onPath} goTo={goTo} />
          </Suspense>
        </Canvas>
      </div>

      <div className="g-scroll" style={{ height: SCROLL_LENGTH }} aria-hidden="true" />

      <div className="g-room" aria-live="polite">
        <span className="g-room-num">{String(active + 1).padStart(2, "0")}</span>
        <span className="g-room-track">
          <span ref={bar} />
        </span>
        <span className="g-room-name">{t(stops[active].label)}</span>
      </div>

      <LanguageSwitcher placement="home" />
      <button type="button" className="g-chat" aria-label={t("gallery.contactAria")} onClick={() => navigate(stops.length - 1)}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M4 5 H16 V13 H9 L5 16 V13 H4 Z M18 8 H20 V17 H19 V20 L15.5 17 H10 V15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}
