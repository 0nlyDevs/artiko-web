import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Work } from "@/lib/api";

vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: null, isPending: false }) } }));

const { ProofBlock, proofKind, WorkProofs } = await import("./work-proofs");

const API = "http://localhost:8000";
const work = {
  id: "w1",
  title: "Hautes Terres, fin du jour",
  proof_urls: [`${API}/media/p1.jpg`, `${API}/media/p2.mp4`],
  sha256: "3f9a" + "0".repeat(56) + "c21e",
  human_proven: true,
  ai_declared: false,
} as Work;
const signed = `${API}/api/v1/proofs/p3/file?exp=1795000000&sig=abc`;
const tiles = (markup: string) => [...markup.matchAll(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((m) => ({ href: m[1].replace(/&amp;/g, "&"), tag: m[0], inner: m[2] }));

describe("proofKind", () => {
  it("tells a public picture by its extension, and any other public file", () => {
    expect(proofKind({ url: `${API}/media/p1.JPG`, private: false })).toBe("picture");
    expect(proofKind({ url: `${API}/media/p1.webp?v=2`, private: false })).toBe("picture");
    expect(proofKind({ url: `${API}/media/p2.mp4`, private: false })).toBe("file");
    expect(proofKind({ url: `${API}/media/p3.glb`, private: false })).toBe("file");
  });

  it("does not know what a signed link without extension is: the API does not say", () => {
    expect(proofKind({ url: signed, private: true })).toBe("unknown");
    expect(proofKind({ url: `${API}/media/p4`, private: false })).toBe("unknown");
  });
});

describe("ProofBlock", () => {
  it("keeps the seal in words, the public proofs and the fingerprint", () => {
    const markup = renderToStaticMarkup(<WorkProofs work={work} />);
    expect(markup).toContain('aria-label="Proof of process"');
    expect(markup).toContain("Human-made, proven");
    expect(markup).toContain("Fingerprint 3f9a00000000.");
    const [picture, file, ...others] = tiles(markup);
    expect(others).toHaveLength(0);
    expect(picture.tag).toContain('target="_blank"');
    expect(picture.tag).toContain('rel="noreferrer"');
    expect(picture.inner).toMatch(/<img[^>]*alt="Process step 1"/);
    expect(file.inner).toContain("Step 2");
    expect(markup).not.toContain("Private");
  });

  it("opens a private proof by its signed link, tagged, and never through the image optimizer", () => {
    const markup = renderToStaticMarkup(
      <ProofBlock work={work} proofs={[{ url: `${API}/media/p1.jpg`, private: false }, { url: signed, private: true }]} />,
    );
    const [open, shut] = tiles(markup);
    // The public picture goes through the optimizer; the signed link is the address of the picture itself.
    expect(open.inner).toContain("/_next/image?url=");
    expect(shut.href).toBe(signed);
    expect(shut.inner).not.toContain("/_next/image");
    expect(shut.inner.replace(/&amp;/g, "&")).toContain(`src="${signed}"`);
    expect(shut.inner).toContain('referrerPolicy="no-referrer"');
    expect(shut.inner).toContain("Private");
    expect(markup).toContain("Private proofs are not shown to the public. Their links expire after a few minutes.");
  });

  it("says when there is no proof yet", () => {
    const markup = renderToStaticMarkup(<ProofBlock work={{ ...work, human_proven: false }} proofs={[]} />);
    expect(markup).toContain("No proof of process yet");
    expect(tiles(markup)).toHaveLength(0);
  });
});
