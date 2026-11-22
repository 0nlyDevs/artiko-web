import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BRAND } from "@/lib/brand";

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: { user: { name: "Rova Rasoanaivo" } } }) } }));

const { BAR_LINKS, BarNav, TAB_LINKS, TabBar, isCurrent } = await import("./app-shell");

const links = (markup: string) => [...markup.matchAll(/<a[^>]*href="([^"]*)"[^>]*>/g)].map((m) => ({ href: m[1], current: m[0].includes('aria-current="page"') }));

describe("app shell navigation", () => {
  it("keeps the entries of the frames at the team's addresses, then the team's Publish entry and My space", () => {
    expect(BAR_LINKS.map((l) => l.href)).toEqual(["/musee", "/explore", "/hall-of-fame", "/heritage", "/scan", "/me?tab=publish"]);
    const markup = renderToStaticMarkup(<BarNav pathname="/heritage" />);
    expect(links(markup).map((l) => l.href)).toEqual([...BAR_LINKS.map((l) => l.href), "/me"]);
    for (const label of ["The museum", "Artists", "Hall of Fame", "Living heritage", "Scan", "Publish", "My space"]) expect(markup).toContain(label);
    expect(links(markup).filter((l) => l.current).map((l) => l.href)).toEqual(["/heritage"]);
  });

  it("shows the initials of the signed-in person on the account disc", () => {
    expect(renderToStaticMarkup(<BarNav pathname="/me" />)).toContain(">RR<");
  });

  it("keeps the five tabs of the phones", () => {
    expect(TAB_LINKS.map((l) => l.href)).toEqual(["/explore", "/hall-of-fame", "/me?tab=publish", "/heritage"]);
    const markup = renderToStaticMarkup(<TabBar pathname="/me" />);
    expect(links(markup).map((l) => l.href)).toEqual(["/explore", "/hall-of-fame", "/me?tab=publish", "/heritage", "/me"]);
    expect(links(markup).filter((l) => l.current).map((l) => l.href)).toEqual(["/me"]);
  });

  it("counts works and artist pages under the artists' entry, and never marks Publish", () => {
    expect(isCurrent("/explore", "/works/w1")).toBe(true);
    expect(isCurrent("/explore", "/artists/a1/museum")).toBe(true);
    expect(isCurrent("/hall-of-fame", "/hall-of-fame")).toBe(true);
    expect(isCurrent("/me?tab=publish", "/me")).toBe(false);
    expect(isCurrent("/scan", "/explore")).toBe(false);
  });

  it("is named after the brand, written once", () => {
    expect(BRAND).toBe("KANTO");
  });
});
