import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Cormorant_Garamond, League_Gothic, Rock_Salt } from "next/font/google";
import { LocaleProvider } from "@/i18n/locale";
import "./globals.css";

const display = League_Gothic({
  variable: "--font-display",
  subsets: ["latin"],
});

const salt = Rock_Salt({
  variable: "--font-salt",
  weight: "400",
  subsets: ["latin"],
});

const sans = Bricolage_Grotesque({
  variable: "--font-sans",
  subsets: ["latin"],
});

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  weight: ["500", "600"],
  style: ["italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARTIKO: every art deserves a museum",
  description:
    "ARTIKO scans any artwork, gives every artist a 3D museum, lets the public vote for the best works and teaches the skills that keep art alive.",
};

export const viewport: Viewport = { themeColor: "#e8e6e1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${salt.variable} ${sans.variable} ${serif.variable}`}>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
