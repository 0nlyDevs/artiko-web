import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Averia_Serif_Libre, Bebas_Neue, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { LocaleProvider } from "@/i18n/locale";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// The fonts of the KANTO art direction. globals.css puts each one at the head of the matching token
// (--font-text, --font-display, --font-condensed, --font-serif-italic).

// Text and interface, 400 to 700: it takes the place of the Helvetica Now Display of the mockups.
const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });

// Titles, when the licensed New Icon Serif is not on the machine.
const serif = Instrument_Serif({ variable: "--font-instrument-serif", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });

// Condensed capitals of the room and board headings.
const condensed = Bebas_Neue({ variable: "--font-bebas-neue", weight: "400", subsets: ["latin"] });

// The italic serif of work titles, cartels and category chips.
const italic = Averia_Serif_Libre({ variable: "--font-averia-serif", weight: "400", style: "italic", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${BRAND}: every art deserves a museum`,
  description: `${BRAND} scans any artwork, gives every artist a 3D museum, lets the public vote for the best works and teaches the skills that keep art alive.`,
};

// The ivory wall of the tokens (--color-wall-ivory).
export const viewport: Viewport = { themeColor: "#fefefe" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${condensed.variable} ${italic.variable}`}>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
