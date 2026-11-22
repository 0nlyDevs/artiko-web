import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Category, HallOfFameEntry } from "@/lib/api";

// The note reads the visitor's vote in the browser (my-vote.test.tsx, load-my-vote.test.ts). Here it is a marker
// that shows what the bar hands it and where the bar puts it.
vi.mock("./my-vote", () => ({
  MyVoteNote: ({ category, month, entries }: { category: string; month: string; entries: HallOfFameEntry[] }) => (
    <span data-note="/the-vote-note" data-room={`${category}|${month}`} data-hung={entries.map((e) => e.work.id).join(",")} />
  ),
}));

const { RoomAside, RoomWall } = await import("./honour-wall");

const html = renderToStaticMarkup;
const MUSIC = { id: "music", label: "Music" } as Category;
const ENTRIES = [1, 2].map((rank) => ({ rank, votes: 5 - rank, work: { id: `w${rank}`, title: `Title ${rank}`, artist_name: "Rova", media_kind: "audio", media_url: "" } })) as HallOfFameEntry[];
const hrefs = (markup: string) => [...markup.matchAll(/(?:href|data-note)="([^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));

describe("the right of the bottom bar, for a signed-in visitor", () => {
  it("puts « Votre vote » before the button to Explore, as the frame draws them", () => {
    const markup = html(<RoomAside entries={ENTRIES} category={MUSIC} month="2026-10" now="2026-11" />);
    expect(hrefs(markup)).toEqual(["/the-vote-note", "/explore?category=music&month=2026-10"]);
  });

  it("hands the note the art form, the month and the works hung in the room", () => {
    const markup = html(<RoomAside entries={ENTRIES} category={MUSIC} month="2026-10" now="2026-11" />);
    expect(markup).toContain('data-room="music|2026-10"');
    expect(markup).toContain('data-hung="w1,w2"');
  });

  it("asks for no vote in a room without entry, and none from the wall", () => {
    expect(html(<RoomAside entries={[]} category={MUSIC} month="2026-10" now="2026-11" />)).toBe("");
    expect(hrefs(html(<RoomWall entries={ENTRIES} category={MUSIC} month="2026-10" now="2026-11" />))).toEqual(["/works/w1", "/works/w2"]);
    expect(hrefs(html(<RoomWall entries={[]} category={MUSIC} month="2026-10" now="2026-11" />))).toEqual(["/explore?category=music&month=2026-10"]);
  });
});
