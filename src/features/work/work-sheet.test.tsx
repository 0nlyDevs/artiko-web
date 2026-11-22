import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Artist, Category, Exposition, Work } from "@/lib/api";
import { currentMonth } from "@/lib/months";

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: true }) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ back: () => {}, push: () => {} }) }));
// The 3D viewer only loads in the browser: its place is enough to know the model reached it.
vi.mock("next/dynamic", () => ({
  default: () =>
    function Viewer(props: { model1k: string; model2k: string | null; poster: string | null; alt: string }) {
      return <div data-viewer="" data-model={props.model1k} data-hd={props.model2k ?? ""} data-poster={props.poster ?? ""} data-alt={props.alt} />;
    },
}));

const { WorkSheet } = await import("./work-sheet");

// The server renders in English, the reference dictionary.
const artist: Artist = { id: "a1", display_name: "Rova Rasoanaivo", bio: "", region: "Antananarivo" };
const exposition = { id: "e1", artist_id: "a1", title: "Lumières des Hautes Terres" } as Exposition;
const rooms: Category[] = [
  { id: "painting", label: "Painting" },
  { id: "sculpture", label: "Sculpture" },
  { id: "music", label: "Music" },
];
const work: Work = {
  id: "w1",
  artist_id: "a1",
  artist_name: "Rova Rasoanaivo",
  title: "Hautes Terres, fin du jour",
  story: "La lumière rasante de la fin d’après-midi.",
  category: "painting",
  exposition_id: "e1",
  media_url: "http://localhost:8000/media/w1.jpg",
  media_kind: "image",
  proof_urls: ["http://localhost:8000/media/p1.jpg", "http://localhost:8000/media/p2.mp4"],
  sha256: "3f9a" + "0".repeat(56) + "c21e",
  human_proven: true,
  ai_declared: false,
  month: "2026-11",
  created_at: "2026-11-30T22:30:00Z",
  votes: 14,
};

const render = (over: Partial<Work> = {}, props: Partial<Parameters<typeof WorkSheet>[0]> = {}) =>
  renderToStaticMarkup(<WorkSheet work={{ ...work, ...over }} artist={artist} exposition={exposition} rooms={rooms} {...props} />);
/** The value of a line of the record, by its key. */
const fact = (markup: string, key: string) => markup.match(new RegExp(`<dt>${key}</dt><dd[^>]*>(.*?)</dd>`))?.[1];

describe("WorkSheet", () => {
  it("shows the fields of the Work schema: title, artist and region, category, exposition, day and contest, AI, fingerprint, story", () => {
    const markup = render();
    expect(markup).toMatch(/<h1[^>]*>Hautes Terres, fin du jour<\/h1>/);
    expect(markup).toMatch(/<a[^>]*href="\/artists\/a1"[^>]*>Rova Rasoanaivo<\/a> · Antananarivo/);
    expect(fact(markup, "Category")).toBe("Painting");
    expect(fact(markup, "Exposition")).toBe("Lumières des Hautes Terres");
    expect(fact(markup, "AI")).toBe("No AI declared by the artist");
    expect(fact(markup, "Fingerprint")).toBe("SHA-256 · 3f9a…c21e");
    expect(markup).toContain(`title="${work.sha256}"`);
    expect(markup).toContain("La lumière rasante de la fin d’après-midi.");
    expect(markup).toContain("Human-made");
  });

  it("writes the day of publication in UTC, beside the contest month", () => {
    // 30 November 22:30 UTC is 1 December in Antananarivo: the day must not contradict the contest.
    expect(fact(render(), "Published on")).toBe('<time dateTime="2026-11-30T22:30:00Z">November 30, 2026</time> · November contest');
  });

  it("asks the shell for its dark dress and the whole width", () => {
    expect(render()).toMatch(/<article[^>]*data-shell-theme="dark"[^>]*data-shell-bleed="true"/);
  });

  it("hides the exposition line without an exposition, and the separator without a region", () => {
    const bare = renderToStaticMarkup(<WorkSheet work={{ ...work, exposition_id: null }} artist={{ ...artist, region: "" }} exposition={null} />);
    expect(bare).not.toContain("<dt>Exposition</dt>");
    expect(bare).toMatch(/>Rova Rasoanaivo<\/a><\/span>/);
    expect(bare).not.toContain("Rova Rasoanaivo</a> ·");
  });

  it("hides the story when there is none, and says an AI was declared", () => {
    const markup = render({ story: "", ai_declared: true, human_proven: false });
    expect(markup).not.toContain("The story");
    expect(fact(markup, "AI")).toBe("AI assistance declared by the artist");
    expect(markup).toContain('data-badge="ai"');
  });

  it("renders a picture in its frame, with the text alternative", () => {
    const markup = render();
    expect(markup).toContain('data-kind="image"');
    expect(markup).toMatch(/<img[^>]*alt="Hautes Terres, fin du jour by Rova Rasoanaivo"/);
    expect(markup).toContain(encodeURIComponent("http://localhost:8000/media/w1.jpg"));
  });

  it("renders a sound with its player", () => {
    const markup = render({ media_kind: "audio", media_url: "http://localhost:8000/media/w1.mp3" });
    expect(markup).toContain('data-kind="audio"');
    expect(markup).toMatch(/<audio[^>]*controls=""[^>]*src="http:\/\/localhost:8000\/media\/w1.mp3"/);
  });

  it("renders a video with its player", () => {
    const markup = render({ media_kind: "video", media_url: "http://localhost:8000/media/w1.mp4" });
    expect(markup).toContain('data-kind="video"');
    expect(markup).toMatch(/<video[^>]*controls=""[^>]*src="http:\/\/localhost:8000\/media\/w1.mp4"/);
  });

  it("renders a 3D work in the viewer, with its HD model and its poster", () => {
    const markup = render({
      media_kind: "model",
      media_url: "http://localhost:8000/media/w1.glb",
      media_hd_url: "http://localhost:8000/media/w1-hd.glb",
      poster_url: "http://localhost:8000/media/w1.webp",
    });
    expect(markup).toContain('data-kind="model"');
    expect(markup).toContain('data-model="http://localhost:8000/media/w1.glb"');
    expect(markup).toContain('data-hd="http://localhost:8000/media/w1-hd.glb"');
    expect(markup).toContain('data-poster="http://localhost:8000/media/w1.webp"');
    expect(markup).toContain('data-alt="Hautes Terres, fin du jour by Rova Rasoanaivo"');
  });

  it("does not offer the double-click before the vote is known to be open, nor on a player", () => {
    // The session is not known on the server: the button waits, and so does the hint of the picture.
    expect(render({ month: currentMonth() })).toMatch(/<button[^>]*disabled=""[^>]*aria-busy="true"[^>]*>/);
    expect(render({ month: currentMonth() })).not.toContain("Double-click to vote");
    for (const kind of ["audio", "video", "model"] as const) expect(render({ media_kind: kind, month: currentMonth() })).not.toContain("Double-click to vote");
  });

  it("counts the work in its room and leads to the next one only when the room was read", () => {
    const placed = render({}, { place: { position: 1, total: 12, next: { id: "w2", title: "Rizières" } } });
    expect(placed).toContain("Notice · 01 / 12");
    expect(placed).toMatch(/<a[^>]*href="\/works\/w2"[^>]*>Next work/);
    const unknown = render({}, { place: { position: 4, total: null, next: null } });
    expect(unknown).not.toMatch(/\d{2} \/ \d{2}/);
    expect(unknown).not.toContain("Next work");
    expect(render()).not.toContain("Next work");
  });

  it("lists the rooms of the API and marks the one of the work", () => {
    const markup = render();
    expect(markup).toContain("Room 01 of 03 · Painting");
    const links = [...markup.matchAll(/<a[^>]*href="\/explore\?category=([a-z_]+)"[^>]*>/g)];
    expect(links.map((m) => m[1])).toEqual(["painting", "sculpture", "music"]);
    expect(links.filter((m) => m[0].includes("aria-current")).map((m) => m[1])).toEqual(["painting"]);
  });

  it("keeps the proofs block, the contest and the way to the artist's museum", () => {
    const markup = render({ month: currentMonth() });
    expect(markup).toContain("Proof of process");
    expect(markup).toContain("Human-made, proven");
    expect(markup).toContain("Process step 1");
    expect(markup).toContain("Step 2");
    expect(markup).toContain("votes this month");
    expect(markup).toMatch(/<a[^>]*href="\/artists\/a1\/museum"[^>]*>See the museum<\/a>/);
    expect(markup).toMatch(/<button[^>]*>Close/);
  });

  it("says before any click that a work without the badge, or of another month, takes no vote", () => {
    expect(render({ human_proven: false, month: currentMonth() })).toMatch(/data-reason="not_eligible"[^>]*>Only works with proof of process can receive votes\./);
    expect(render({ month: "2020-01" })).toMatch(/data-reason="not_in_contest"[^>]*>Only works published this month can receive votes\./);
  });

  it("shows nothing the Work schema does not have, and no way to edit, delete or withdraw", () => {
    const markup = render();
    for (const absent of [/technique/i, /dimension/i, /provenance/i, /rights|droits/i, /demonstration|démonstration/i, /reviewers|relecteurs/i]) expect(markup).not.toMatch(absent);
    const buttons = [...markup.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]*>/g, ""));
    expect(buttons).toEqual(["Close", "Vote for this work"]);
    expect(markup).not.toMatch(/>(Edit|Delete|Modifier|Supprimer|Withdraw)[^<]*</);
  });
});
