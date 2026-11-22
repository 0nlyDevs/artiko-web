"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Chip = { key: string; href: string; label: ReactNode; current: boolean };

/**
 * Filter links on a track: a dark pill slides from the old choice to the new one. The chip moves on
 * click, before the server answers; the server's choice takes over again when it arrives (or on Back).
 */
export function SlidingChips({ chips, label }: { chips: Chip[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const serverKey = chips.find((c) => c.current)?.key ?? null;
  const [choice, setChoice] = useState({ serverKey, picked: null as string | null });
  if (choice.serverKey !== serverKey) setChoice({ serverKey, picked: null });
  const active = choice.picked ?? serverKey;
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const on = el.querySelector<HTMLElement>('[aria-current="page"]');
      setPill(on ? { x: on.offsetLeft, w: on.offsetWidth } : null);
      on?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    const frame = requestAnimationFrame(measure);
    // Labels change width with the language and the web font.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [active]);

  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav ref={track} aria-label={label} className="chips-track" data-measured={pill ? "" : undefined}>
        {pill && <span aria-hidden="true" className="chips-pill" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} />}
        {chips.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            scroll={false}
            aria-current={c.key === active ? "page" : undefined}
            onClick={() => setChoice({ serverKey, picked: c.key })}
            className="chip"
          >
            {c.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
