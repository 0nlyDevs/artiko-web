import Link from "next/link";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/hall-of-fame", label: "Hall of Fame" },
  { href: "/heritage", label: "Heritage index" },
  { href: "/scan", label: "Check a photo" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-ink/15">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-8">
        <Link href="/" className="mr-auto text-[34px] leading-none font-medium tracking-[-0.04em]" aria-label="Artiko, home">
          artiko<span aria-hidden="true" className="text-red">·</span>
        </Link>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
            {item.label}
          </Link>
        ))}
        <Link href="/me" className="bg-ink px-4 py-2 text-paper">
          My space
        </Link>
      </nav>
    </header>
  );
}
