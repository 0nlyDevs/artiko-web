"use client";

import { setLocale, useT } from "./locale";
import { LOCALES, LOCALE_NAMES } from "./locales";

const SITE_BUTTON =
  "-ml-0.5 border-2 border-ink px-2 py-1 text-sm leading-none font-bold first:ml-0 aria-pressed:bg-ink aria-pressed:text-paper";

/**
 * EN / FR / MG toggle. Each button is named in its own language (`lang` + `aria-label`), so it stays
 * readable and is announced correctly whichever language is active.
 * `site` matches the app pages' header; `gallery` matches the home gallery's frosted bar and menu.
 */
export function LanguageSwitcher({ variant }: { variant: "site" | "gallery" }) {
  const { t, locale } = useT();
  return (
    <div role="group" aria-label={t("lang.label")} className={variant === "gallery" ? "g-lang" : "flex"}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={code === locale}
          aria-label={LOCALE_NAMES[code]}
          title={LOCALE_NAMES[code]}
          onClick={() => setLocale(code)}
          className={variant === "site" ? SITE_BUTTON : undefined}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
