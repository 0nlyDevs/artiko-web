import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Museum, Work } from "@/lib/api";

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: true }) } }));
// The 3D room and the 3D viewer only load in the browser: their place is enough to know what reached them.
vi.mock("next/dynamic", () => ({
  default: () =>
    function Browser(props: { model1k?: string; poster?: string | null; selectedId?: string }) {
      return <div data-browser="" data-model={props.model1k ?? ""} data-poster={props.poster ?? ""} data-selected={props.selectedId ?? ""} />;
    },
}));

const { MuseumView } = await import("./museum-view");
const { MissingState } = await import("./missing-state");

// The server renders in English, the reference dictionary.
const work = (id: string, over: Partial<Work> = {}): Work => ({
  id,
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: `Work ${id}`,
  story: "",
  category: "painting",
  exposition_id: null,
  media_url: `http://localhost:8000/media/${id}.jpg`,
  media_kind: "image",
  proof_urls: [],
  sha256: "ab12".repeat(16),
  human_proven: true,
  ai_declared: false,
  month: "2026-11",
  created_at: "2026-11-05T10:00:00Z",
  votes: 3,
  ...over,
});
const museum = (...works: Work[]): Museum => ({
  artist: { id: "a1", display_name: "Rova Rasoanaivo", bio: "", region: "Antananarivo" },
  room: { width: 8, depth: 10, height: 3 },
  slots: works.map((w, i) => ({ work: w, kind: "wall", position: [i, 1.5, -5], rotation_y: 0 })),
});

const render = (...works: Work[]) => renderToStaticMarkup(<MuseumView museum={museum(...works)} />);
/** The panel of the open work: the end-to-end tests of the team look for the viewer and its poster in this <aside>. */
const panel = (html: string) => html.match(/<aside[^>]*>(.*)<\/aside>/)?.[1] ?? "";

describe("MuseumView", () => {
  it("opens the first work of the room in the panel, with its place, its seal and the way to its page", () => {
    const html = render(work("w1", { story: "Red earth at dusk." }), work("w2"));

    expect(html).toContain('aria-live="polite"');
    expect(panel(html)).toContain("Notice · 01 / 02");
    expect(panel(html)).toMatch(/<h2[^>]*>Work w1<\/h2>/);
    expect(panel(html)).toContain("Human-made, proven");
    expect(panel(html)).toContain("Red earth at dusk.");
    expect(panel(html)).toContain('href="/works/w1"');
    // The 3D room got the same work as selected.
    expect(html).toContain('data-selected="w1"');
  });

  it("keeps the switch to the simple gallery a button with that name, and the hint of the 3D room", () => {
    const html = render(work("w1"));

    expect(html).toMatch(/<button type="button"[^>]*>Simple gallery view<\/button>/);
    expect(html).toContain("Drag to look around");
  });

  it("gives a 3D work its viewer in the panel, with the model, the HD file left to the viewer and the poster", () => {
    const html = render(work("m1", { media_kind: "model", media_url: "http://localhost:8000/media/m1.glb", poster_url: "http://localhost:8000/media/m1.webp" }));

    expect(panel(html)).toContain('data-model="http://localhost:8000/media/m1.glb"');
    expect(panel(html)).toContain('data-poster="http://localhost:8000/media/m1.webp"');
    // No other picture in the panel: the viewer's poster is the only one.
    expect(panel(html)).not.toContain("<img");
  });

  it("gives a sound and a video their own player, and a picture none", () => {
    expect(panel(render(work("s1", { media_kind: "audio", media_url: "http://localhost:8000/media/s1.mp3" })))).toMatch(/<audio controls="" src="[^"]*s1\.mp3"/);
    expect(panel(render(work("v1", { media_kind: "video", media_url: "http://localhost:8000/media/v1.mp4" })))).toMatch(/<video controls="" src="[^"]*v1\.mp4"/);
    expect(panel(render(work("w1")))).not.toMatch(/<audio|<video/);
  });

  it("shows the proofs the caller may open: a picture for an image, a numbered step for the rest", () => {
    const html = panel(render(work("w1", { proof_urls: ["http://localhost:8000/media/p1.jpg", "http://localhost:8000/media/p2.mp4"] })));

    expect(html).toContain("Proof of process");
    expect(html).toContain('alt="Process step 1"');
    expect(html).toContain("Step 2");
    expect(panel(render(work("w1")))).not.toContain("Proof of process");
  });
});

describe("MissingState", () => {
  it("says what is missing in one h1 and offers two ways back", () => {
    const html = renderToStaticMarkup(<MissingState title="missing.exposition.title" />);

    expect(html).toMatch(/<h1[^>]*>This exposition cannot be found<\/h1>/);
    expect(html).toContain("Not found");
    expect(html).toContain('href="/explore"');
    expect(html).toContain('href="/"');
    expect(renderToStaticMarkup(<MissingState title="missing.artist.title" />)).toContain("This artist is not in the museum");
  });
});
