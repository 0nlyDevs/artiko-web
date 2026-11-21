import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Bricolage_Grotesque, Cormorant_Garamond } from "next/font/google";
import { LocaleProvider } from "@/i18n/locale";
import "./globals.css";

// Main font: headings, body text and UI.
const sans = Bricolage_Grotesque({
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

// Quotations only: Cormorant Garamond Italic 500.
const serif = Cormorant_Garamond({
  variable: "--font-serif",
  weight: ["500"],
  style: ["italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARTIKO: every art deserves a museum",
  description:
    "ARTIKO scans any artwork, gives every artist a 3D museum, lets the public vote for the best works and teaches the skills that keep art alive.",
};

export const viewport: Viewport = { themeColor: "#FBF0E4" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
