import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Category, HallOfFameEntry, Work } from "@/lib/api";

// The server has no session: « Votre vote » is read in the browser (load-my-vote.test.ts, my-vote.test.tsx, room-aside.test.tsx).
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null }) } }));

const { CategoryBar, MonthNav, RoomEyebrow } = await import("./hall-nav");
const { HallRoom } = await import("./hall-room");
const { RoomAside, RoomWall, WallSkeleton } = await import("./honour-wall");

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
const MEDIA = "http://localhost:8000/media/";
const PAINTING = { id: "painting", label: "Painting" } as Category;
const CATEGORIES = [PAINTING, { id: "music", label: "Music" }, { id: "weaving", label: "Weaving" }] as Category[];

const work = (id: string, overrides: Partial<Work> = {}): Work =>
  ({ id, artist_id: "a1", artist_name: "Rova Rasoanaivo", title: `Title ${id}`, story: "", category: "painting", media_url: `${MEDIA}${id}.jpg`, media_kind: "image", proof_urls: [], sha256: "0".repeat(64), human_proven: true, ai_declared: false, month: "2026-11", created_at: "2026-11-02T08:00:00Z", votes: 1, ...overrides }) as Work;
const entry = (rank: number, votes: number, overrides: Partial<Work> = {}): HallOfFameEntry => ({ rank, votes, work: work(`w${rank}`, overrides) });
const entries = (count: number) => Array.from({ length: count }, (_, i) => entry(i + 1, 20 - i));
const wall = (list: HallOfFameEntry[], month = "2026-11") => html(<RoomWall entries={list} category={PAINTING} month={month} now="2026-11" />);
const aside = (list: HallOfFameEntry[], month = "2026-11") => html(<RoomAside entries={list} category={PAINTING} month={month} now="2026-11" />);

const count = (markup: string, pattern: RegExp) => (markup.match(pattern) ?? []).length;
const items = (markup: string) => markup.match(/<li[^>]*>.*?<\/li>/g) ?? [];
/** The addresses of the links, as a browser reads them (the markup writes `&` as `&amp;`). */
const hrefs = (markup: string) => [...markup.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));

describe("the wall of the room of honour", () => {
  it("hangs five gilded frames whatever the API sends, the missing ranks empty and « to be decided »", () => {
    for (let n = 1; n <= 5; n++) {
      const markup = wall(entries(n));
      expect(count(markup, /<figure/g)).toBe(5);
      expect(count(markup, /<figure[^>]*data-empty="true"/g)).toBe(5 - n);
      expect(count(markup, /To be decided/g)).toBe(5 - n);
      expect(items(markup)).toHaveLength(5);
    }
  });

  it("opens the notice of a work from its frame, and gives an empty frame no link", () => {
    const markup = wall(entries(3));
    expect(items(markup).map((li) => hrefs(li))).toEqual([["/works/w1"], ["/works/w2"], ["/works/w3"], [], []]);
  });

  it("shows the rank, the title, the artist and the votes of each entry of the API", () => {
    const [first, second] = items(wall([entry(1, 23), entry(2, 1)]));
    for (const text of ["No. 1", "Title w1", "Rova Rasoanaivo", "23 votes"]) expect(first).toContain(text);
    for (const text of ["No. 2", "Title w2", "Rova Rasoanaivo", "1 vote<"]) expect(second).toContain(text);
  });

  it("places an entry in the frame of the rank the API gives it", () => {
    const [first, second, third] = items(wall([entry(3, 4), entry(1, 9)]));
    expect(first).toContain("Title w1");
    expect(second).toContain("To be decided");
    expect(third).toContain("Title w3");
  });

  it("names the first of a month still open « in the lead », and of a closed month « laureate »", () => {
    expect(wall(entries(1))).toContain("In the lead · November 2026");
    expect(wall(entries(1))).not.toContain("Laureate");
    expect(wall(entries(1), "2026-10")).toContain("Laureate · October 2026");
  });

  it("frames every kind of work: a picture, the still of a 3D work, or the kind in words", () => {
    const markup = wall([
      entry(1, 9),
      entry(2, 8, { media_kind: "audio", media_url: `${MEDIA}w2.mp3` }),
      entry(3, 7, { media_kind: "video", media_url: `${MEDIA}w3.mp4` }),
      entry(4, 6, { media_kind: "model", media_url: `${MEDIA}w4.glb`, poster_url: `${MEDIA}w4.webp` }),
      entry(5, 5, { media_kind: "model", media_url: `${MEDIA}w5.glb`, poster_url: null }),
    ]);
    const [image, audio, video, poster, model] = items(markup);
    expect(count(markup, /<figure[^>]*data-empty/g)).toBe(0);
    expect(image).toContain("w1.jpg");
    expect(image).toContain('alt="Title w1 by Rova Rasoanaivo"');
    expect(audio).toContain(">Sound<");
    expect(audio).not.toContain("w2.mp3");
    expect(video).toContain(">Video<");
    expect(poster).toContain("w4.webp");
    expect(poster).not.toContain("w4.glb");
    expect(model).toContain(">3D object<");
  });

  it("keeps to the frames: the way to Explore belongs to the bottom bar", () => {
    expect(hrefs(wall(entries(5)))).toEqual(["/works/w1", "/works/w2", "/works/w3", "/works/w4", "/works/w5"]);
  });
});

describe("the right of the bottom bar", () => {
  it("links to the works of the art form and the month, in Explore", () => {
    expect(hrefs(aside(entries(5)))).toEqual(["/explore?category=painting&month=2026-11"]);
    expect(aside(entries(5))).toContain("This month&#x27;s works");
    expect(hrefs(aside(entries(5), "2026-10"))).toEqual(["/explore?category=painting&month=2026-10"]);
    expect(aside(entries(5), "2026-10")).toContain("Works published in October 2026");
  });

  it("opens every work of the art form, under the team's words, once Explore no longer lists the month", () => {
    expect(hrefs(aside(entries(5), "2024-03"))).toEqual(["/explore?category=painting"]);
    expect(aside(entries(5), "2024-03")).toContain("Explore and vote");
  });

  it("draws nothing for a room without entry: the dark room has its own button", () => {
    expect(aside([])).toBe("");
  });
});

describe("the dark room", () => {
  it("says there is no vote yet this month and links to the works of the month", () => {
    const markup = wall([]);
    expect(markup).toContain('data-dark="true"');
    expect(markup).toContain("No votes yet this month");
    expect(hrefs(markup)).toEqual(["/explore?category=painting&month=2026-11"]);
    expect(markup).not.toContain("<li");
    // The frames stay on the wall, empty, and say nothing to a screen reader.
    expect(count(markup, /<figure[^>]*data-empty="true"/g)).toBe(5);
  });

  it("tells which works can be voted for: those of the month that carry a proof", () => {
    expect(wall([])).toContain("Works published this month with proof of process can receive your vote.");
  });

  it("speaks of a closed month in the past, without the call to vote", () => {
    const lastMonth = wall([], "2026-10");
    expect(lastMonth).toContain("No votes were cast in October 2026");
    expect(lastMonth).not.toContain("No votes yet this month");
    expect(lastMonth).not.toContain("can receive your vote");
    expect(lastMonth).toContain("Works published in October 2026");
    expect(hrefs(lastMonth)).toEqual(["/explore?category=painting&month=2026-10"]);
  });

  it("keeps a button for a month Explore no longer lists: every work of the art form, as on the team's page", () => {
    const old = wall([], "2024-03");
    expect(old).toContain("No votes were cast in March 2024");
    expect(hrefs(old)).toEqual(["/explore?category=painting"]);
    expect(old).toContain("Explore and vote");
  });
});

describe("the room before any answer", () => {
  const markup = html(
    <HallRoom>
      <nav id="from-the-request" />
    </HallRoom>,
  );

  it("reads title, rule, then what the request brings: the order the keyboard and a screen reader follow", () => {
    const at = (text: string) => markup.indexOf(text);
    expect(at("<h1")).toBeGreaterThan(-1);
    expect(at("<h1")).toBeLessThan(at("Each month"));
    expect(at("Each month")).toBeLessThan(at('id="from-the-request"'));
    expect(markup).toMatch(/<section[^>]*aria-labelledby="hall-title"/);
  });

  it("asks the shell for its dark bars and a page without gutter", () => {
    expect(markup).toMatch(/<section[^>]*data-shell-theme="dark"[^>]*data-shell-bleed=""/);
  });

  it("loads the photograph of the room at once: it is the largest thing above the fold", () => {
    expect(markup).toMatch(/<img[^>]*alt=""[^>]*loading="eager"/);
  });
});

describe("the room while it loads", () => {
  it("keeps five empty frames and tells a screen reader the room is loading", () => {
    const markup = html(<WallSkeleton />);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("Loading the room.");
    expect(count(markup, /<figure[^>]*data-empty="true"/g)).toBe(5);
  });
});

describe("the months and the art forms", () => {
  it("links to the month before and the month after, on the same art form", () => {
    const markup = html(<MonthNav category="music" month="2026-10" canGoNext />);
    expect(hrefs(markup)).toEqual(["/hall-of-fame?category=music&month=2026-09", "/hall-of-fame?category=music&month=2026-11"]);
    for (const text of ["Previous month", "September", "October 2026", "Next month", "November"]) expect(markup).toContain(text);
    expect(markup).toMatch(/<h2[^>]*aria-live="polite"[^>]*>October 2026<\/h2>/);
  });

  it("never links to a month to come", () => {
    const markup = html(<MonthNav category="music" month="2026-11" canGoNext={false} />);
    expect(hrefs(markup)).toEqual(["/hall-of-fame?category=music&month=2026-10"]);
    expect(markup).toContain("December");
    expect(markup).not.toContain("Next month");
  });

  it("lists every art form of the API on the month shown and marks the current one", () => {
    const markup = html(<CategoryBar categories={CATEGORIES} category="music" month="2026-10" />);
    expect(markup).toContain('aria-label="Categories"');
    expect(hrefs(markup)).toEqual(["painting", "music", "weaving"].map((id) => `/hall-of-fame?category=${id}&month=2026-10`));
    expect([...markup.matchAll(/<a[^>]*aria-current="page"[^>]*>([^<]*)</g)].map((m) => m[1])).toEqual(["Music"]);
    // An art form without a translation keeps the label of the API.
    expect(markup).toContain(">Weaving<");
  });

  it("names the room after its art form", () => {
    // A no-break space before each dot: a line never starts with one.
    expect(html(<RoomEyebrow category={PAINTING} />)).toContain("Room of honour\u00a0· Painting\u00a0· The five most voted");
  });
});
