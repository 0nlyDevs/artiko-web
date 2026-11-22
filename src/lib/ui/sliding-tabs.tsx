"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Tabs whose underline slides to the selected one. The panels are the caller's, labelled by `${id}-tab-${key}`. */
export function SlidingTabs<K extends string>({
  id,
  tabs,
  value,
  onChange,
  label,
}: {
  id: string;
  tabs: { key: K; label: ReactNode }[];
  value: K;
  onChange: (key: K) => void;
  label: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => {
      const on = el.querySelector<HTMLElement>('[aria-selected="true"]');
      setLine(on ? { x: on.offsetLeft, w: on.offsetWidth } : null);
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [value]);

  // Arrow keys move between tabs, as screen-reader users expect from a tablist.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = tabs[(tabs.findIndex((t) => t.key === value) + step + tabs.length) % tabs.length].key;
    onChange(next);
    list.current?.querySelector<HTMLElement>(`#${id}-tab-${next}`)?.focus();
  };

  return (
    <div ref={list} role="tablist" aria-label={label} className="tabs no-scrollbar" onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.key}
          id={`${id}-tab-${t.key}`}
          type="button"
          role="tab"
          aria-selected={t.key === value}
          aria-controls={`${id}-panel`}
          tabIndex={t.key === value ? 0 : -1}
          onClick={() => onChange(t.key)}
          className="tab"
        >
          {t.label}
        </button>
      ))}
      {line && <span aria-hidden="true" className="tabs-line" style={{ width: line.w, transform: `translateX(${line.x}px)` }} />}
    </div>
  );
}
