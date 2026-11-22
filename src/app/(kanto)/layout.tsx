import { existsSync } from "node:fs";
import path from "node:path";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { OPENING_BOOT_SCRIPT, openingFontFace } from "@/kanto/features/opening/boot";
import "@/kanto/styles/global.css";

export const metadata: Metadata = {
  title: "KANTO — L’art malagasy, à portée de regard",
  description:
    "Peintures, sculptures, savoir-faire et musiques de Madagascar, à parcourir comme un véritable musée, à déposer, à numériser et à faire relire.",
};

export const viewport: Viewport = { themeColor: "#fefefe" };

// The licensed display font is not in Git: it exists on a machine that received it, never in CI or
// on a deployment built from the repository. Known when the server starts or the site is built, it
// tells the opening which file its letters load, so no visitor waits for a request that must fail.
const hasLicensedDisplayFont = existsSync(
  path.join(process.cwd(), "public", "fonts", "licensed", "NewIconSerif-Regular.woff2"),
);

// Own root layout: KANTO ships its own tokens, fonts and global rules (no page scroll in the
// museum) and must not inherit Tailwind's preflight or the Artiko app shell.
export default function KantoLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script marks <html> before React hydrates it, hence suppressHydrationWarning.
    <html lang="fr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: openingFontFace(hasLicensedDisplayFont) }} />
        {/* Runs before the first paint: ivory opening, or black wall on a museum address. */}
        <script dangerouslySetInnerHTML={{ __html: OPENING_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
