import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({ authClient: {} }));

import { ApiError, type Exposition, type MediaKind, type Work } from "@/lib/api";
import type { Space } from "@/features/artist-space/load-space";
import { SignedOut, SpaceDashboard, SpaceFailure, SpaceSkeleton } from "./space-view";
import { ProofList } from "./works-section";

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
const noop = () => {};
const links = (markup: string) => [...markup.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
/** The markup of the list item that holds `text`. */
const row = (markup: string, text: string) => markup.split("<li").find((item) => item.includes(text)) ?? "";

const MONTH = "2026-11";
const ARTIST = { id: "a1", display_name: "Rova", bio: "Peintre des Hautes Terres.", region: "Antananarivo" };
const CATEGORIES = [
  { id: "painting", label: "Painting" },
  { id: "music", label: "Music" },
  { id: "crafts", label: "Crafts" },
] as Space["categories"];

function work(id: string, over: Partial<Work> = {}): Work {
  return {
    id,
    artist_id: "a1",
    artist_name: "Rova",
    title: `Work ${id}`,
    story: "",
    category: "painting",
    exposition_id: null,
    series_id: null,
    media_url: `http://localhost:8000/media/${id}`,
    media_hd_url: null,
    poster_url: null,
    media_kind: "image",
    proof_urls: [],
    sha256: "0".repeat(64),
    human_proven: true,
    ai_declared: false,
    month: MONTH,
    created_at: "2026-11-03T10:00:00Z",
    votes: 0,
    ...over,
  };
}

const EXPOSITION: Exposition = { id: "e1", artist_id: "a1", artist_name: "Rova", title: "Lumières des Hautes Terres", description: "", cover_url: null, works_count: 3, created_at: "2026-11-03T10:00:00Z" };

function space(over: Partial<Space> = {}): Space {
  return {
    me: { id: "u1", email: "rova@example.test", name: "Rova Rasoanaivo", artist: ARTIST },
    categories: CATEGORIES,
    works: [work("w1", { votes: 14 }), work("w2", { votes: 4 })],
    worksComplete: true,
    expositions: [EXPOSITION],
    month: MONTH,
    votes: [],
    ...over,
  };
}

const dashboard = (loaded: Space, tab: Parameters<typeof SpaceDashboard>[0]["tab"] = null) =>
  html(<SpaceDashboard space={loaded} tab={tab} signOutFailed={false} onSignOut={noop} onProfileSaved={noop} onExpositionCreated={noop} />);

describe("my space before it loads", () => {
  it("invites someone who is not signed in to the two doors of the account", () => {
    const markup = html(<SignedOut notice={null} />);
    expect(markup).toContain("<h1");
    expect(markup).toContain("My space");
    expect(links(markup)).toEqual(["/sign-in", "/sign-up"]);
  });

  it("tells a signed-out visitor what the verification link did", () => {
    expect(html(<SignedOut notice="auth.verified" />)).toContain("Address confirmed");
    expect(html(<SignedOut notice="auth.linkInvalid" />)).toMatch(/role="alert"/);
  });

  it("is marked busy while it loads", () => {
    expect(html(<SpaceSkeleton />)).toMatch(/^<div aria-busy="true"/);
  });
});

describe("my space when it did not load", () => {
  const failure = (error: ApiError | null, resent = false) =>
    html(<SpaceFailure error={error} signOutFailed={false} resent={resent} onResend={noop} onRetry={noop} onSignOut={noop} />);
  const buttons = (markup: string) => [...markup.matchAll(/<button[^>]*>(.*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));

  it("says so as an alert, with a way to try again and a way out", () => {
    const markup = failure(null);
    expect(markup).toMatch(/role="alert"[^>]*>.*Your space could not load/);
    expect(buttons(markup)).toEqual(["Try again", "Sign out"]);
  });

  it("offers to send the link again to an address that is not confirmed", () => {
    const unverified = new ApiError(403, "email_not_verified", "Verify your email address first");
    expect(failure(unverified)).toContain("Confirm your email address to use your space");
    expect(buttons(failure(unverified))).toEqual(["Send the link again", "Try again", "Sign out"]);
    expect(failure(unverified, true)).toMatch(/<button[^>]*disabled=""/);
  });

  it("tells a refused token from an API that did not answer", () => {
    const refused = failure(new ApiError(401, "invalid_token", "Invalid token"));
    const silent = failure(new ApiError(0, "unreachable", "unreachable"));
    expect(refused).toContain("We could not confirm your sign-in.");
    expect(silent).toContain("Your space could not load");
    expect(refused).not.toContain("Your space could not load");
  });

  it("says when the sign-out itself failed", () => {
    expect(html(<SpaceFailure error={null} signOutFailed resent={false} onResend={noop} onRetry={noop} onSignOut={noop} />)).toContain("You are still signed in");
  });
});

describe("my space of an artist", () => {
  it("shows the profile in reading, with the ways to edit it, publish, see the room and sign out", () => {
    const markup = dashboard(space());
    expect(markup).toMatch(/<h1[^>]*>.*Tongasoa.*Rova\..*<\/h1>/);
    expect(markup).toContain("Rova Rasoanaivo · Antananarivo");
    expect(markup).toContain("Peintre des Hautes Terres.");
    expect(links(markup)).toEqual(expect.arrayContaining(["/me?tab=profile", "/me?tab=publish", "/artists/a1/museum"]));
    expect(markup).toMatch(/<button[^>]*>Sign out<\/button>/);
    expect(markup).not.toContain('name="display_name"');
  });

  it("edits the profile in place when the address asks for it, with the three fields and a way back", () => {
    const markup = dashboard(space(), "profile");
    expect(markup).toMatch(/<input[^>]*name="display_name"[^>]*value="Rova"/);
    expect(markup).toMatch(/<input[^>]*name="region"[^>]*value="Antananarivo"/);
    expect(markup).toMatch(/<textarea[^>]*name="bio"/);
    expect(links(markup)).toContain("/me");
    expect(links(markup)).not.toContain("/me?tab=profile");
  });

  it("gives each section the element its address scrolls to", () => {
    const markup = dashboard(space());
    for (const id of ["space-profile", "space-works", "space-expositions", "space-votes"]) expect(markup).toContain(`id="${id}"`);
  });

  it("counts the works and the votes received only when every work was read", () => {
    const whole = dashboard(space());
    expect(whole).toMatch(/<h2 id="space-works-title"[^>]*>My works · 2 · 18 votes received<\/h2>/);
    const cut = dashboard(space({ worksComplete: false }));
    expect(cut).toMatch(/<h2 id="space-works-title"[^>]*>My works<\/h2>/);
  });

  it("says where each work stands in the contest", () => {
    const markup = dashboard(
      space({ works: [work("open"), work("closed", { month: "2026-10" }), work("out", { human_proven: false })] }),
    );
    expect(row(markup, "Work open")).toContain("Painting · November 2026 · <span");
    expect(row(markup, "Work open")).toContain(">in the contest<");
    expect(row(markup, "Work closed")).toContain("October 2026");
    expect(row(markup, "Work closed")).toContain(">contest closed<");
    expect(row(markup, "Work out")).toContain(">not in the contest<");
  });

  it("wears one of the three badges", () => {
    const markup = dashboard(
      space({ works: [work("human"), work("ai", { human_proven: false, ai_declared: true }), work("none", { human_proven: false })] }),
    );
    expect(row(markup, "Work human")).toContain('data-badge="human"');
    expect(row(markup, "Work ai")).toContain('data-badge="ai"');
    expect(row(markup, "Work none")).toContain('data-badge="none"');
    expect(row(markup, "Work none")).toContain("No proof of process yet");
  });

  it("shows the votes of a work, and a dash for a work outside the contest that has none", () => {
    const markup = dashboard(space({ works: [work("voted", { votes: 14 }), work("out", { human_proven: false })] }));
    expect(row(markup, "Work voted")).toContain("14 votes");
    expect(row(markup, "Work out")).toContain("—");
  });

  it("draws a picture for an image and a named pictogram for a sound, a video and a 3D object", () => {
    const kinds: MediaKind[] = ["image", "audio", "video", "model"];
    const markup = dashboard(space({ works: kinds.map((kind) => work(kind, { media_kind: kind })) }));
    expect(row(markup, "Work image")).toMatch(/<img[^>]*alt=""/);
    expect(row(markup, "Work audio")).toMatch(/<svg.*Sound/);
    expect(row(markup, "Work video")).toMatch(/<svg.*Video/);
    expect(row(markup, "Work model")).toMatch(/<svg.*3D object/);
    expect(row(markup, "Work audio")).not.toContain("<img");
  });

  it("uses the poster of a 3D work when the API gives one", () => {
    const markup = dashboard(space({ works: [work("model", { media_kind: "model", poster_url: "http://localhost:8000/media/poster" })] }));
    expect(row(markup, "Work model")).toContain("<img");
  });

  it("links each work to its page and offers its proofs, and nothing to edit or delete it", () => {
    const markup = dashboard(space());
    expect(links(markup)).toEqual(expect.arrayContaining(["/works/w1", "/works/w2", "/artists/a1"]));
    expect(row(markup, "Work w1")).toMatch(/<button[^>]*aria-expanded="false"[^>]*>Proofs<span class="visually-hidden">, Work w1<\/span><\/button>/);
    expect(markup).not.toMatch(/Edit(?! my profile)|Delete|Remove|Withdraw/);
  });

  it("invites an artist with no work to publish", () => {
    const markup = dashboard(space({ works: [] }));
    expect(markup).toContain("Your museum is still empty.");
    expect(markup).toMatch(/<h2 id="space-works-title"[^>]*>My works · 0<\/h2>/);
    expect(links(markup).filter((href) => href === "/me?tab=publish")).toHaveLength(2);
  });

  it("lists the expositions with their works, their date and a link to their page", () => {
    const markup = dashboard(space());
    expect(markup).toMatch(/<h2 id="space-expositions-title"[^>]*>My expositions · 1<\/h2>/);
    expect(row(markup, "Lumières des Hautes Terres")).toContain("3 works · created on November 3, 2026");
    expect(links(markup)).toContain("/expositions/e1");
    expect(markup).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-controls="space-new-exposition"/);
    expect(dashboard(space({ expositions: [] }))).toContain("No exposition yet.");
  });
});

describe("my votes", () => {
  it("names the month, and shows each vote with its work and a link to it", () => {
    const voted = work("v1", { title: "Allée des baobabs, soir", artist_name: "Hei", category: "music" });
    const markup = dashboard(space({ votes: [{ category: "music", work: voted }] }));
    expect(markup).toMatch(/<h2 id="space-votes-title"[^>]*>My votes · November 2026<\/h2>/);
    expect(row(markup, "Allée des baobabs, soir")).toContain("Music");
    expect(row(markup, "Allée des baobabs, soir")).toContain("“Allée des baobabs, soir” by Hei");
    expect(links(markup)).toEqual(expect.arrayContaining(["/works/v1", "/hall-of-fame"]));
  });

  it("keeps a vote whose work can no longer be read as a vote", () => {
    const markup = dashboard(space({ votes: [{ category: "music", work: null }] }));
    expect(markup).toContain("Vote recorded. The work can no longer be opened.");
    expect(links(markup)).not.toContain("/explore?category=music");
    expect(markup).toContain("2 other art forms without a vote this month");
  });

  it("leads to Explore for each art form without a vote", () => {
    const none = dashboard(space());
    expect(none).toContain("No vote yet this month.");
    expect(links(none)).toEqual(expect.arrayContaining(["/explore?category=painting", "/explore?category=music", "/explore?category=crafts"]));
    const one = dashboard(space({ votes: [{ category: "painting", work: work("v1") }] }));
    expect(links(one)).not.toContain("/explore?category=painting");
  });

  it("offers no way to withdraw a vote", () => {
    const markup = dashboard(space({ votes: [{ category: "music", work: work("v1") }] }));
    expect(row(markup, "Work v1")).not.toContain("<button");
  });
});

describe("my space without an artist profile", () => {
  const visitor = space({ me: { id: "u1", email: "rova@example.test", name: "Rova Rasoanaivo", artist: null }, works: [], expositions: [] });

  it("shows the invitation to open a profile and the votes, nothing else", () => {
    const markup = dashboard(visitor);
    expect(markup).toContain("Become an artist");
    expect(markup).toMatch(/<input[^>]*name="display_name"/);
    expect(markup).toContain('id="space-votes"');
    expect(markup).not.toContain('id="space-works"');
    expect(markup).not.toContain('id="space-expositions"');
    expect(links(markup)).not.toContain("/me?tab=publish");
    expect(links(markup)).toContain("/explore");
    expect(markup).toMatch(/<button[^>]*>Sign out<\/button>/);
  });

  it("greets by the account's name, or shows the address when it has none", () => {
    expect(dashboard(visitor)).toMatch(/<h1[^>]*>.*Tongasoa.*Rova Rasoanaivo\..*<\/h1>/);
    const nameless = dashboard({ ...visitor, me: { ...visitor.me, name: null } });
    expect(nameless).toMatch(/<h1[^>]*>Tongasoa\.<\/h1>/);
    expect(nameless).toContain("rova@example.test");
  });
});

describe("the proofs of a work", () => {
  const proofs = (state: Parameters<typeof ProofList>[0]["state"]) => html(<ProofList id="space-proofs-w1" title="Work w1" state={state} />);

  it("says it is loading", () => {
    expect(proofs("loading")).toMatch(/role="status"[^>]*>Loading the proofs/);
  });

  it("opens each proof in a new tab and says what it is", () => {
    const markup = proofs([
      { id: "p1", visibility: "public", source: "in_app", signed: true, url: "https://api.example/media/p1" },
      { id: "p2", visibility: "reviewers", source: "imported", signed: false, url: "https://api.example/proofs/p2/file?exp=1&sig=x" },
    ]);
    expect(markup).toMatch(/^<div id="space-proofs-w1" role="region" aria-label="Proofs of Work w1"/);
    expect(markup).toMatch(/<a href="https:\/\/api\.example\/media\/p1" target="_blank" rel="noreferrer">Proof 1<\/a><span>public · captured in the app · signed<\/span>/);
    expect(markup).toContain("<span>private · imported</span>");
    expect(markup).toContain("Private links stop working after a few minutes");
  });

  it("says when there is none, and when they could not be read", () => {
    expect(proofs([])).toContain("No proof can be opened for this work.");
    expect(proofs({ error: null })).toMatch(/role="alert"[^>]*>The proofs could not be loaded/);
    expect(proofs({ error: new ApiError(404, "work_not_found", "No work with this id") })).toContain("This work was not found.");
  });
});
