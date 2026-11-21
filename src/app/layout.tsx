import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Link from "next/link";
import { AccountLink } from "@/components/AccountLink";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Artiko", template: "%s | Artiko" },
  description:
    "Scan any artwork to see who made it and whether it is proven human-made, walk each artist's museum, vote, and keep endangered arts alive.",
};

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/heritage", label: "Heritage index" },
  { href: "/scan", label: "Check a photo" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <header className="border-b border-ink/15">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-8">
            <Link href="/" className="mr-auto text-2xl font-extrabold tracking-tight">
              Artiko
            </Link>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline underline-offset-4">
                {item.label}
              </Link>
            ))}
            <AccountLink />
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-8">{children}</main>
        <footer className="bg-ink text-ground">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 sm:px-8">
            <p className="text-xl font-bold">Made by people. Kept by people.</p>
            <p className="text-ground/80">
              No work on Artiko may be used to train AI. Every file keeps its fingerprint and date.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
