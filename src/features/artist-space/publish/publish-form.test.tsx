import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Category, Exposition } from "@/lib/api";

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: { user: { id: "u1", name: "Rova" } } }) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

const { PublishForm } = await import("@/features/artist-space/publish-form");

const categories: Category[] = [
  { id: "painting", label: "Painting" },
  { id: "crafts", label: "Crafts" },
];
const expositions: Exposition[] = [{ id: "e1", artist_id: "a1", artist_name: "Rova Rasoanaivo", title: "Lumières des Hautes Terres", description: "", cover_url: null, works_count: 3, created_at: "2026-10-01T00:00:00Z" }];
const artist = { id: "a1", display_name: "Atelier Rova", bio: "", region: "Antananarivo" };

describe("PublishForm", () => {
  it("opens on the first step, with nothing chosen and nothing typed", () => {
    const html = renderToStaticMarkup(<PublishForm categories={categories} expositions={expositions} artist={artist} onPublished={() => {}} />);

    expect(html).toContain("Publish a work · 1 of 2");
    expect(html).toContain("Drop the file of the work here");
    expect(html).toContain('id="title"');
    expect(html).toContain('id="file"');
    expect(html).not.toContain("checked");
    expect(html).not.toContain("Proofs of process");
  });

  it("is signed by the artist profile, or by the name the API puts on the artist's expositions", () => {
    const withProfile = renderToStaticMarkup(<PublishForm categories={categories} expositions={expositions} artist={artist} onPublished={() => {}} />);
    const withoutProfile = renderToStaticMarkup(<PublishForm categories={categories} expositions={expositions} onPublished={() => {}} />);
    const unknown = renderToStaticMarkup(<PublishForm categories={categories} expositions={[]} onPublished={() => {}} />);

    expect(withProfile).toContain("Signed Atelier Rova");
    expect(withoutProfile).toContain("Signed Rova Rasoanaivo");
    expect(unknown).not.toContain("Signed");
    expect(unknown).toContain("draft kept on this device only");
  });

  it("keeps the continue button open: what is missing is said at the click, not by a disabled button", () => {
    const html = renderToStaticMarkup(<PublishForm categories={categories} expositions={expositions} artist={artist} onPublished={() => {}} />);

    expect(html).toContain("Continue · Proofs");
    expect(html).not.toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });
});
