import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "LOVA — Tout ne tient pas dans un cadre.",
  description:
    "Un voyage continu parmi les images, les objets, les langues, les musiques et les gestes. Le patrimoine se regarde, s’écoute et se transmet.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%2310130f' width='64' height='64'/%3E%3Ctext x='18' y='47' font-family='Arial' font-size='48' fill='%23f0eee5'%3EL%3C/text%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: "#171717" };

// Own root layout: the museum ships its own stylesheet and must not inherit
// Tailwind's preflight or the app-wide globals.
export default function MuseumLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preload" href="/museum/assets/syne-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/museum/assets/manrope-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-css-tags -- standalone stylesheet, kept out of Tailwind */}
        <link rel="stylesheet" href="/museum/style.css" />
      </head>
      <body className="no-js" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
