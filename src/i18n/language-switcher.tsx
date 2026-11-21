"use client";

import type { CSSProperties } from "react";
import { setLocale, useT } from "./locale";
import { LOCALES, LOCALE_NAMES } from "./locales";

/**
 * EN / FR / MG picker: a pill fixed at the bottom right, with a marker that slides to the active language.
 * Each button is named in its own language (`lang` + `aria-label`), so it stays readable and is announced
 * correctly whichever language is active. `home` leaves room for the home gallery's chat button.
 */
export function LanguageSwitcher({ placement = "page" }: { placement?: "home" | "page" }) {
  const { t, locale } = useT();
  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={placement === "home" ? "lang-pill lang-pill--home" : "lang-pill"}
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
