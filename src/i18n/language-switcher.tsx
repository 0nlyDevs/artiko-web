"use client";

import type { CSSProperties } from "react";
import { setLocale, useT } from "./locale";
import { LOCALES, LOCALE_NAMES } from "./locales";

/**
 * EN / FR / MG picker: a pill fixed at the bottom right, with a marker that slides to the active language.
 * Each button is named in its own language (`lang` + `aria-label`), so it stays readable and is announced
 * correctly whichever language is active. `home` leaves room for the home gallery's chat button;
 * `inline` sits inside the app navigation instead of floating.
 */
export function LanguageSwitcher({ placement = "page" }: { placement?: "home" | "page" | "inline" }) {
  const { t, locale } = useT();
  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={placement === "page" ? "lang-pill" : `lang-pill lang-pill--${placement}`}
      style={{ "--i": Math.max(0, LOCALES.indexOf(locale)) } as CSSProperties}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={code === locale}
          aria-label={LOCALE_NAMES[code]}
          title={LOCALE_NAMES[code]}
          onClick={() => setLocale(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
