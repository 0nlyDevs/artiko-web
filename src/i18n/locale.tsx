"use client";

import { Fragment, useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DEFAULT_LOCALE, dictionaries, format, isLocale, matchLocale, pluralKey, type Locale, type PluralBase, type Vars } from "./locales";
import type { Key } from "./en";

// The locale lives in a tiny module-level store rather than React context: the home gallery draws
// through react-three-fiber and drei's <Html>, which render in separate React roots where context
// does not reach, and imperative code (canvas textures) needs the same value. Pages stay
// prerendered in English; the browser switches to the saved or detected locale after hydration.

const STORAGE_KEY = "artiko.locale";
const listeners = new Set<() => void>();
let current: Locale | undefined;

function detect(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Storage can be blocked: fall through to the browser language.
  }
  return matchLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

/** The active locale. English on the server, saved choice > browser language > English in the browser. */
export function getLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return (current ??= detect());
}

export function setLocale(locale: Locale) {
  current = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // The choice still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the language.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    current = detect();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => DEFAULT_LOCALE);
}

/** Translate outside React (canvas textures, imperative code). Not reactive: call it again on locale change. */
export function translate(key: Key, vars?: Vars, locale: Locale = getLocale()): string {
  return format(dictionaries[locale][key], vars);
}

type Tags = Record<string, (chunk: string) => ReactNode>;

/** Splits `before <tag>chunk</tag> after` and renders each tagged chunk with its callback. */
function rich(template: string, tags: Tags): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  for (const match of template.matchAll(pattern)) {
    if (match.index > last) parts.push(template.slice(last, match.index));
    const render = tags[match[1]];
    parts.push(render ? render(match[2]) : match[2]);
    last = match.index + match[0].length;
  }
  if (last < template.length) parts.push(template.slice(last));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}

export function useT() {
  const locale = useLocale();
  const dictionary = dictionaries[locale];
  const t = useCallback((key: Key, vars?: Vars) => format(dictionary[key], vars), [dictionary]);
  const plural = useCallback(
    (base: PluralBase, n: number, vars?: Vars) => format(dictionary[pluralKey(locale, base, n)], { n, ...vars }),
    [dictionary, locale],
  );
  const richT = useCallback((key: Key, tags: Tags, vars?: Vars) => rich(format(dictionary[key], vars), tags), [dictionary]);
  return useMemo(() => ({ t, plural, rich: richT, locale }), [t, plural, richT, locale]);
}

/** Keeps `<html lang>` in step with the active locale. Mount once, in the root layout. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return children;
}

/** A translated string for server components, which cannot call hooks: `<T k="explore.title" />`. */
export function T({ k, vars }: { k: Key; vars?: Vars }) {
  return useT().t(k, vars);
}

/** Sets the tab title in the active language (the static `metadata` title stays English). */
export function PageTitle({ k, vars }: { k: Key; vars?: Vars }) {
  const title = useT().t(k, vars);
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
