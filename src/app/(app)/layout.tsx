import type { Metadata, Viewport } from "next";
import { Inter, League_Gothic, Rock_Salt } from "next/font/google";
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

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARTIKO: every art deserves a museum",
  description:
    "Scan any artwork, visit every artist's 3D museum, vote for the best works and learn the skills that keep art alive.",
};

export const viewport: Viewport = { themeColor: "#e8e6e1" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${salt.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
