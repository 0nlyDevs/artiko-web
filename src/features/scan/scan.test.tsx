import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApiError, type ScanResult, type Work } from "@/lib/api";
import { ScanAnswer } from "./scan-answer";
import { ScanForm } from "./scan-form";
import { canRetry, DEFAULT_WAIT, isWebLink, refuseFile, retryWait, SCAN_MAX_BYTES, scanErrorKey, secondsLeft, VERDICT_BADGE } from "./scan-logic";
import { ScanPage } from "./scan-page";

// The server renders in English, the reference dictionary.
const html = renderToStaticMarkup;
const hrefs = (markup: string) => [...markup.matchAll(/<a[^>]*href="([^"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));

const WORK = { id: "w1", artist_id: "a1", artist_name: "Rova Rasoanaivo", title: "Hautes Terres", story: "", category: "painting", media_url: "http://localhost:8000/media/w1.jpg", media_kind: "image", proof_urls: [], sha256: "0".repeat(64), human_proven: true, ai_declared: false, month: "2026-11", created_at: "2026-11-02T08:00:00Z", votes: 3 } as Work;
const answer = (overrides: Partial<ScanResult>): ScanResult => ({ status: "unknown", confidence: 0, work: null, known: null, sources: [], ...overrides });
const rateLimited = (retryAfter: number | null) => new ApiError(429, "rate_limited", "Too many requests", null, retryAfter);

describe("the check of a photo before it is sent", () => {
  it("accepts 5 MB to the byte and refuses one byte more", () => {
    expect(SCAN_MAX_BYTES).toBe(5_242_880);
    expect(refuseFile({ size: 5_242_880, type: "image/jpeg" })).toBeNull();
    expect(refuseFile({ size: 5_242_881, type: "image/jpeg" })).toBe("file_too_large");
  });

  it("refuses a file that is not a picture, and an empty one", () => {
    expect(refuseFile({ size: 12, type: "text/plain" })).toBe("not_an_image");
    expect(refuseFile({ size: 12, type: "application/pdf" })).toBe("not_an_image");
    expect(refuseFile({ size: 0, type: "image/png" })).toBe("empty_file");
  });

  it("lets the API decide for a file whose type the browser does not know", () => {
    expect(refuseFile({ size: 12, type: "" })).toBeNull();
    expect(refuseFile({ size: 12, type: "image/heic" })).toBeNull();
  });

  it("says each refusal in the dictionary, the size limit in the words of the scan", () => {
    expect(scanErrorKey("file_too_large")).toBe("scan.tooLarge");
    expect(scanErrorKey("not_an_image")).toBe("api.not_an_image");
    expect(scanErrorKey("empty_file")).toBe("api.empty_file");
    expect(scanErrorKey("no_such_code")).toBeUndefined();
  });
});

describe("the wait after too many checks", () => {
  it("is the API's own when it is known, 60 seconds otherwise", () => {
    expect(retryWait(rateLimited(12))).toBe(12);
    expect(retryWait(rateLimited(null))).toBe(DEFAULT_WAIT);
    expect(DEFAULT_WAIT).toBe(60);
  });

  it("is a whole number of seconds between one and an hour", () => {
    expect(retryWait(rateLimited(0))).toBe(1);
    expect(retryWait(rateLimited(2.2))).toBe(3);
    expect(retryWait(rateLimited(86_400))).toBe(3600);
    expect(retryWait(rateLimited(-5))).toBe(DEFAULT_WAIT);
    expect(retryWait(rateLimited(Number.NaN))).toBe(DEFAULT_WAIT);
  });

  it("does not exist for another failure", () => {
    expect(retryWait(null)).toBeNull();
    expect(retryWait(new ApiError(413, "file_too_large", "too large"))).toBeNull();
    expect(retryWait(new ApiError(0, "unreachable", "unreachable"))).toBeNull();
  });

  it("counts down to zero, by the clock", () => {
    const start = 1_000_000;
    const deadline = start + 60_000;
    expect(secondsLeft(deadline, start)).toBe(60);
    expect(secondsLeft(deadline, start + 250)).toBe(60);
    expect(secondsLeft(deadline, start + 1_000)).toBe(59);
    expect(secondsLeft(deadline, start + 59_001)).toBe(1);
    expect(secondsLeft(deadline, start + 60_000)).toBe(0);
    expect(secondsLeft(deadline, start + 90_000)).toBe(0);
  });

  it("offers to send the same photo again only when that can work", () => {
    expect(canRetry(null)).toBe(true);
    expect(canRetry(new ApiError(0, "unreachable", "unreachable"))).toBe(true);
    expect(canRetry(rateLimited(null))).toBe(true);
    expect(canRetry(new ApiError(503, "not_ready", "not ready"))).toBe(true);
    expect(canRetry(new ApiError(400, "not_an_image", "not an image"))).toBe(false);
    expect(canRetry(new ApiError(413, "file_too_large", "too large"))).toBe(false);
  });
});

describe("the answer to a photo", () => {
  it("never shows « not found » as a fake", () => {
    expect(VERDICT_BADGE.unknown).toBe("none");
    expect(Object.entries(VERDICT_BADGE).filter(([, badge]) => badge === "ai").map(([status]) => status)).toEqual(["ai_made"]);
    expect(Object.entries(VERDICT_BADGE).filter(([, badge]) => badge === "human").map(([status]) => status)).toEqual(["human_proven"]);

    const markup = html(<ScanAnswer result={answer({})} />);
    expect(markup).toMatch(/data-badge="none"[^>]*>Not found</);
    expect(markup).toContain("This never means the work is fake");
    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain('data-badge="ai"');
    expect(markup).not.toContain("Made with AI");
    expect(hrefs(markup)).toEqual(["/me?tab=publish"]);
  });

  it("shows a work of the museum with its notice, its artist and the confidence of the match", () => {
    const markup = html(<ScanAnswer result={answer({ status: "human_proven", confidence: 0.968, work: WORK })} />);
    expect(markup).toMatch(/data-badge="human"[^>]*>Human-made, proven</);
    expect(hrefs(markup)).toEqual(["/works/w1", "/artists/a1"]);
    for (const text of ["Hautes Terres", "by Rova Rasoanaivo.", "Match confidence 97%.", "Visit Rova Rasoanaivo&#x27;s museum"]) expect(markup).toContain(text);
    expect(markup).toContain('alt="Hautes Terres by Rova Rasoanaivo"');
  });

  it("shows no thumbnail for a work that is not a picture", () => {
    const markup = html(<ScanAnswer result={answer({ status: "artiko_work", confidence: 0.9, work: { ...WORK, media_kind: "audio", human_proven: false } })} />);
    expect(markup).not.toContain("<img");
    expect(markup).toMatch(/data-badge="none"[^>]*>On KANTO, without proof of process</);
  });

  it("shows a known work with its museum, and says it is an image or a copy", () => {
    const known = { title: "Mona Lisa", artist_name: "Leonardo da Vinci", date: "c. 1503–1519", museum: "Musée du Louvre", source_url: "https://commons.wikimedia.org/wiki/File:Mona_Lisa.jpg", image_url: "https://upload.wikimedia.org/mona.jpg" };
    const markup = html(<ScanAnswer result={answer({ status: "known_work", confidence: 0.88, known })} />);
    for (const text of ["A known work", "Mona Lisa", "Leonardo da Vinci, c. 1503–1519. Musée du Louvre.", "Match confidence 88%.", "You are looking at an image or a copy of this work."]) expect(markup).toContain(text);
    expect(hrefs(markup)).toEqual([]);
  });

  it("gives the AI label to Content Credentials only, with their note", () => {
    const markup = html(<ScanAnswer result={answer({ status: "ai_made", confidence: 1 })} />);
    expect(markup).toMatch(/data-badge="ai"[^>]*>Made with AI, proven by its Content Credentials</);
    expect(markup).toContain("It enters neither the museums nor the vote.");
  });

  it("lists every source, as a link that opens apart when it is a web address", () => {
    const sources = [
      { label: "Artiko, published 21 Nov 2026", url: "https://kanto.example/artists/a1" },
      { label: "Musée du Louvre", url: "http://example.org/louvre" },
      { label: "Not a link", url: "javascript:alert(1)" },
    ];
    const markup = html(<ScanAnswer result={answer({ sources })} />);
    expect(markup).toContain(">Sources</h3>");
    const items = markup.match(/<li>.*?<\/li>/g) ?? [];
    expect(items).toHaveLength(3);
    expect(items[0]).toBe('<li><a href="https://kanto.example/artists/a1" target="_blank" rel="noreferrer">Artiko, published 21 Nov 2026</a></li>');
    expect(items[1]).toContain('href="http://example.org/louvre"');
    expect(items[2]).toBe("<li>Not a link</li>");
    expect(isWebLink("javascript:alert(1)")).toBe(false);
    expect(html(<ScanAnswer result={answer({})} />)).not.toContain("Sources");
  });
});

describe("the page of the scan", () => {
  it("draws the title and what becomes of the photo", () => {
    const markup = html(<ScanPage />);
    expect(markup).toMatch(/<h1[^>]*><span>Check<\/span><span[^>]*>a photo\.<\/span><\/h1>/);
    expect(markup).toContain("The photo is not kept.");
  });

  it("waits for a photo: three pictures types, 5 MB, and a camera input beside the file one", () => {
    const markup = html(<ScanForm />);
    const inputs = markup.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(3);
    for (const input of inputs) expect(input).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(inputs.filter((input) => input.includes('capture="environment"'))).toHaveLength(1);
    expect(markup).toMatch(/role="group" aria-labelledby="scan-photo" aria-describedby="scan-photo-help"/);
    expect(markup).toMatch(/<p id="scan-photo-help"[^>]*>JPEG, PNG or WebP, 5 MB at most\.<\/p>/);
    expect(markup).toContain("Drop the photo here");
  });

  it("announces the answer where it appears", () => {
    const markup = html(<ScanForm />);
    expect(markup).toMatch(/<div aria-live="polite"[^>]*><p[^>]*>The answer appears here once the photo is checked\.<\/p><\/div>/);
    expect(markup).not.toContain('role="alert"');
  });
});
