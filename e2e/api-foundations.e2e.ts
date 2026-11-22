import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import type { Page } from "playwright-core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Key } from "@/i18n/en";
import { dictionaries, format, type Locale, type Vars } from "@/i18n/locales";
import { currentMonth } from "@/lib/months";
import { hasChrome, launchBrowser, type RecordedBrowser } from "./support/browser";
import { buildApp, startApp } from "./support/next-app";

// The screens of docs/specs/api-foundations.md in a real browser: which call carries the token, what is replayed
// after a refused token, and the text each screen shows for a refusal. The unit tests cover the helpers; this
// covers their wiring in the screens, which `pnpm test` cannot reach without a DOM.

type Call = { method: string; path: string; search: string; bearer: string | null };
type Answer = readonly [status: number, body: unknown];

const MONTH = currentMonth();
const ARTIST = { id: "a1", display_name: "Rova", bio: "Vannier", region: "Ambositra" };
const ME = { id: "u1", email: "rova@example.test", name: "Rova", artist: ARTIST };
const INVALID_TOKEN: Answer = [401, { error: { code: "invalid_token", message: "Invalid token: Signature has expired" } }];

const refusal = (status: number, code: string, message: string, more: Record<string, string> = {}): Answer => [status, { error: { code, message, ...more } }];
const text = (locale: Locale, key: Key, vars?: Vars) => format(dictionaries[locale][key], vars);

/**
 * Stands in for artiko-api on 127.0.0.1 and keeps every call it received. A test sets how many works and artists
 * exist, which tokens are refused, and the answer of one route when it must be a refusal.
 */
class ScriptedApi {
  calls: Call[] = [];
  works = 0;
  artists = 3;
  /** Tokens ending in one of these signatures get 401 `invalid_token`, on every route. */
  refusedTokens: string[] = [];
  /** Number of upcoming POST /works that get 401 `invalid_token`. */
  refusedPublications = 0;
  answers: { me?: Answer; profile?: Answer; vote?: Answer; scan?: Answer; publish?: Answer } = {};
  private readonly server = http.createServer((req, res) => {
    this.handle(req, res).catch((error: unknown) => {
      res.writeHead(500).end(String(error));
    });
  });

  reset() {
    Object.assign(this, { calls: [], works: 0, artists: 3, refusedTokens: [], refusedPublications: 0, answers: {} });
  }

  async listen(port: number): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(port, "127.0.0.1", resolve));
    return this.url;
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  get url(): string {
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  to(method: string, path: string): Call[] {
    return this.calls.filter((call) => call.method === method && call.path === path);
  }

  private work(id: string) {
    return {
      id,
      artist_id: "a1",
      artist_name: "Rova",
      title: `Work ${id}`,
      story: "",
      category: "crafts",
      exposition_id: null,
      series_id: null,
      media_url: `${this.url}/media/${id}.mp3`,
      media_hd_url: null,
      poster_url: null,
      media_kind: "audio",
      proof_urls: [],
      sha256: "0".repeat(64),
      human_proven: true,
      ai_declared: false,
      month: MONTH,
      created_at: `${MONTH}-01T00:00:00Z`,
      votes: 0,
    };
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "authorization, content-type");
    res.setHeader("access-control-allow-methods", "GET, POST, PUT, OPTIONS");
    if (req.method === "OPTIONS") return void res.writeHead(204).end();
    for await (const chunk of req) void chunk;
    const url = new URL(req.url ?? "/", this.url);
    const path = url.pathname.replace("/api/v1", "");
    const method = req.method ?? "GET";
    const bearer = req.headers.authorization ?? null;
    this.calls.push({ method, path, search: url.search, bearer });
    const json = ([status, body]: Answer) => {
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    };
    // A list as the API pages it: `limit` (100 by default) and `offset`.
    const page = <T>(total: number, item: (index: number) => T): T[] => {
      const limit = Number(url.searchParams.get("limit") ?? 100);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => item(offset + i));
    };

    if (bearer && this.refusedTokens.some((signature) => bearer.endsWith(`.${signature}`))) return json(INVALID_TOKEN);
    if (path === "/me") return json(this.answers.me ?? [200, ME]);
    if (path === "/me/artist") return json(this.answers.profile ?? [200, ARTIST]);
    if (path === "/categories") return json([200, [{ id: "crafts", label: "Crafts" }, { id: "painting", label: "Painting" }]]);
    if (path === "/votes/mine") return json([200, []]);
    if (path === "/votes") return json(this.answers.vote ?? [201, { work_id: "w1", category: "crafts", month: MONTH }]);
    if (path === "/scan/image") return json(this.answers.scan ?? [200, { status: "unknown", confidence: 0, work: null, known: null }]);
    if (path === "/expositions" && method === "POST") {
      return json([201, { id: "e1", artist_id: "a1", artist_name: "Rova", title: "Vannerie", description: "", cover_url: null, works_count: 0, created_at: `${MONTH}-01T00:00:00Z` }]);
    }
    if (path === "/expositions") return json([200, []]);
    if (path === "/works" && method === "POST") {
      if (this.refusedPublications > 0) {
        this.refusedPublications--;
        return json(INVALID_TOKEN);
      }
      return json(this.answers.publish ?? [201, this.work("published")]);
    }
    if (path === "/works") return json([200, url.searchParams.get("artist_id") ? page(this.works, (i) => this.work(`w${i}`)) : []]);
    if (path.startsWith("/works/")) return json([200, this.work(path.slice("/works/".length))]);
    // One artist far beyond the first page is the only one a search for "zafimaniry" finds.
    if (path === "/artists") return json([200, page(this.artists, (i) => ({ id: `a${i}`, display_name: `Artist ${i}`, bio: i === 430 ? "zafimaniry" : "", region: "" }))]);
    if (path.startsWith("/artists/")) return json([200, ARTIST]);
    json([404, { detail: "Not Found" }]);
  }
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

describe.skipIf(!hasChrome)("API foundations journey in Chrome", () => {
  const api = new ScriptedApi();
  let app: Awaited<ReturnType<typeof startApp>>;
  let chrome: RecordedBrowser;
  let tokenRequests = 0;

  /**
   * A page in `locale`. Signed in, each request to /api/auth/token gets a new token for the user u1, ending in
   * `.sig1`, `.sig2`...; `token` makes that route answer with an error status instead (401 is what Better Auth
   * answers when nobody is signed in).
   */
  async function open(locale: Locale = "en", { session = true, token }: { session?: boolean; token?: number } = {}): Promise<Page> {
    const page = await chrome.newPage({ locale });
    // Routes added last are tried first: these replace the ones of support/browser.ts.
    if (!session) await page.context().route("**/api/auth/get-session", (route) => route.fulfill({ json: null }));
    const payload = Buffer.from(JSON.stringify({ exp: 4102444800, sub: "u1" })).toString("base64url");
    await page.context().route("**/api/auth/token", (route) => {
      tokenRequests++;
      return token ? route.fulfill({ status: token, json: { message: "refused" } }) : route.fulfill({ json: { token: `e30.${payload}.sig${tokenRequests}` } });
    });
    return page;
  }

  const signature = (call: Call) => call.bearer?.slice(call.bearer.lastIndexOf(".") + 1) ?? null;
  const alert = (page: Page, message: string) => page.getByRole("alert").filter({ hasText: message }).waitFor({ timeout: 60_000 });
  const status = (page: Page, message: string) => page.getByRole("status").filter({ hasText: message }).waitFor({ timeout: 60_000 });
  const submit = (page: Page) => page.locator('#space-panel button[type="submit"]').last();

  /** My space on the publish tab, with a title, a sound file and a category: ready to send. */
  async function publishForm(locale: Locale = "en"): Promise<Page> {
    const page = await open(locale);
    await page.goto(`${app.url}/me?tab=publish`);
    await page.locator("#title").waitFor({ timeout: 60_000 });
    await page.fill("#title", "Sobika");
    await page.setInputFiles("#file", { name: "song.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("ID3 not really a song") });
    await page.selectOption("#category", "crafts");
    return page;
  }

  beforeAll(async () => {
    await buildApp(await api.listen(await freePort()));
    app = await startApp(await freePort());
    chrome = await launchBrowser();
  }, 600_000);

  beforeEach(() => {
    api.reset();
    tokenRequests = 0;
  });

  afterAll(async () => {
    await chrome?.browser.close();
    app?.stop();
    await api.close();
  });

  describe("my space", () => {
    it("CA2, CA4, CA7: reads every page of the artist's works with the token, the public lists without, after one token request", async () => {
      api.works = 201;
      const page = await open();

      await page.goto(`${app.url}/me`);

      await page.getByText("201 works").waitFor({ timeout: 60_000 });
      expect(api.to("GET", "/works").map((call) => `${call.search} ${signature(call)}`)).toEqual(["?artist_id=a1&limit=200&offset=0 sig1", "?artist_id=a1&limit=200&offset=200 sig1"]);
      expect(api.to("GET", "/categories").map((call) => call.bearer)).toEqual([null]);
      expect(api.to("GET", "/expositions").map((call) => call.bearer)).toEqual([null]);
      expect(tokenRequests).toBe(1);
    });

    it("CA3: renews a refused token once and loads", async () => {
      api.refusedTokens = ["sig1"];
      const page = await open();

      await page.goto(`${app.url}/me`);

      await page.getByText("0 works").waitFor({ timeout: 60_000 });
      expect(api.to("GET", "/me").map(signature)).toEqual(["sig1", "sig2"]);
      expect(api.to("GET", "/votes/mine").map(signature)).toEqual(["sig1", "sig2"]);
      expect(tokenRequests).toBe(2);
    });

    it("CA3, CA5: after one replay, says that the sign-in could not be confirmed when the new token is refused too", async () => {
      api.refusedTokens = ["sig1", "sig2", "sig3", "sig4"];
      const page = await open();

      await page.goto(`${app.url}/me`);

      await alert(page, text("en", "api.invalid_token"));
      expect(api.to("GET", "/me")).toHaveLength(2);
      expect(tokenRequests).toBe(2);
    });

    it("CA5: keeps its own words and the resend button for an unverified address", async () => {
      api.answers.me = refusal(403, "email_not_verified", "Verify your email address first");
      const page = await open();

      await page.goto(`${app.url}/me`);

      await alert(page, text("en", "space.unverified"));
      expect(await page.getByRole("button", { name: text("en", "auth.resend") }).count()).toBe(1);
      expect(api.to("GET", "/me")).toHaveLength(1);
    });

    it("CA5: shows any other refusal in the active language, without the resend button", async () => {
      api.answers.me = refusal(500, "internal_error", "Something went wrong on our side");
      const page = await open("fr");

      await page.goto(`${app.url}/me`);

      await alert(page, text("fr", "api.internal_error"));
      expect(await page.getByRole("button", { name: text("fr", "auth.resend") }).count()).toBe(0);
    });

    it("CA3: says the space could not load, not to sign in, when /api/auth/token is down", async () => {
      const page = await open("en", { token: 500 });

      await page.goto(`${app.url}/me`);

      await alert(page, text("en", "space.error"));
      expect(api.to("GET", "/me")).toEqual([]);
    });
  });

  describe("profile", () => {
    it("CA3, CA5: sends the token, shows a refusal in the active language and an unknown code with the API's message", async () => {
      api.answers.profile = refusal(422, "invalid_request", "body.display_name: String should have at least 1 character");
      const page = await open("fr");
      await page.goto(`${app.url}/me?tab=profile`);
      await page.locator("#display_name").waitFor({ timeout: 60_000 });

      await submit(page).click();

      await status(page, text("fr", "api.invalid_request"));
      expect(api.to("PUT", "/me/artist").map(signature)).toEqual(["sig1"]);

      api.answers.profile = refusal(400, "something_new", "A refusal added after this build");
      await submit(page).click();

      await status(page, "A refusal added after this build");
    });
  });

  describe("vote", () => {
    const voteButton = (page: Page) => page.locator("button.btn-vote");

    it("CA5: keeps the text of a known refusal, in the active language", async () => {
      api.answers.vote = refusal(409, "already_voted", "You already voted in this category this month");
      const page = await open("fr");
      await page.goto(`${app.url}/works/w1`);

      await voteButton(page).click();

      await alert(page, text("fr", "vote.already_voted"));
      expect(api.to("POST", "/votes")).toHaveLength(1);
    });

    it("CA3: replays the vote once after a refused token, and the vote counts", async () => {
      api.refusedTokens = ["sig1"];
      const page = await open();
      await page.goto(`${app.url}/works/w1`);

      await voteButton(page).click();

      await status(page, text("en", "vote.done"));
      expect(api.to("POST", "/votes").map(signature)).toEqual(["sig1", "sig2"]);
      expect(tokenRequests).toBe(2);
    });

    it("CA3: asks a signed-out visitor to sign in, without calling the API", async () => {
      const page = await open("en", { session: false, token: 401 });
      await page.goto(`${app.url}/works/w1`);

      await voteButton(page).click();

      await page.getByRole("link", { name: text("en", "vote.signInCta") }).waitFor({ timeout: 60_000 });
      expect(api.to("POST", "/votes")).toEqual([]);
    });
  });

  describe("photo check", () => {
    it("CA5: shows a refusal in the active language, and sends no token", async () => {
      api.answers.scan = refusal(400, "not_an_image", "Send a JPEG, PNG or WebP image");
      const page = await open("fr");
      await page.goto(`${app.url}/scan`);

      await page.setInputFiles("#photo", { name: "photo.png", mimeType: "image/png", buffer: Buffer.from("not really a png") });

      await alert(page, text("fr", "api.not_an_image"));
      expect(api.to("POST", "/scan/image").map((call) => call.bearer)).toEqual([null]);
    });
  });

  describe("publication", () => {
    it("CA3: replays the work once after a refused token, and creates the new exposition once", async () => {
      api.refusedPublications = 1;
      const page = await publishForm();
      await page.selectOption("#expo", "__new");
      await page.fill('input[name="expo_title"]', "Vannerie");

      await submit(page).click();

      await page.locator('#space-panel [role="status"]').waitFor({ timeout: 60_000 });
      expect(api.to("POST", "/expositions")).toHaveLength(1);
      expect(api.to("POST", "/works").map(signature)).toEqual(["sig1", "sig2"]);
    });

    it("CA5: shows a refusal in the active language", async () => {
      api.answers.publish = refusal(409, "possible_copy", "This image looks like another work.", { case_id: "c1" });
      const page = await publishForm("fr");

      await submit(page).click();

      await alert(page, text("fr", "api.possible_copy"));
    });

    it("CA5: names the refused file", async () => {
      api.answers.publish = refusal(413, "file_too_large", "timelapse.mp4 is over 20 MB");
      const page = await publishForm("fr");

      await submit(page).click();

      await alert(page, text("fr", "api.file_too_large.named", { file: "timelapse.mp4", max: 20 }));
    });
  });

  describe("explore", () => {
    it("CA7: reads one page of artists without a search, every page with one", async () => {
      api.artists = 450;
      const page = await open();

      await page.goto(`${app.url}/explore`);

      await page.getByRole("link", { name: "Artist 0" }).first().waitFor({ timeout: 60_000 });
      expect(api.to("GET", "/artists").map((call) => call.search)).toEqual([""]);

      api.calls = [];
      await page.goto(`${app.url}/explore?q=zafimaniry`);

      await page.getByRole("link", { name: "Artist 430" }).waitFor({ timeout: 60_000 });
      expect(api.to("GET", "/artists").map((call) => `${call.search} ${call.bearer}`)).toEqual(["?limit=200&offset=0 null", "?limit=200&offset=200 null", "?limit=200&offset=400 null"]);
    });
  });
});
