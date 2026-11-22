import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession } }));

const { MyVoteNote, MyVoteView } = await import("./my-vote");

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;

describe("« Votre vote »", () => {
  it("names the work voted for and opens its notice", () => {
    const markup = html(<MyVoteView vote={{ workId: "w3", title: "Allée des baobabs, soir" }} />);
    expect(markup).toMatch(/^<a[^>]*href="\/works\/w3"/);
    expect(markup).toContain("Your vote: “Allée des baobabs, soir”");
  });

  it("still opens the notice when the title could not be read, without quoting an empty title", () => {
    const markup = html(<MyVoteView vote={{ workId: "gone", title: null }} />);
    expect(markup).toMatch(/^<a[^>]*href="\/works\/gone"/);
    expect(markup).toContain("Your vote is counted in this room");
    expect(markup).not.toContain("“");
  });

  it("keeps the whole title in the link, however long: only the stylesheet shortens what is drawn", () => {
    const title = "Hautes Terres ".repeat(14).trim(); // 195 characters, the contract allows 200
    expect(html(<MyVoteView vote={{ workId: "w1", title }} />)).toContain(`“${title}”`);
  });

  it("draws nothing for a visitor, nor for a signed-in person before their vote is read", () => {
    useSession.mockReturnValue({ data: null });
    expect(html(<MyVoteNote category="painting" month="2026-11" entries={[]} />)).toBe("");
    useSession.mockReturnValue({ data: { user: { id: "u1" } } });
    expect(html(<MyVoteNote category="painting" month="2026-11" entries={[]} />)).toBe("");
  });
});
