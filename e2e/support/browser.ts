import { existsSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";

export const CHROME_PATH = process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable";
export const hasChrome = existsSync(CHROME_PATH);

export interface RecordedBrowser {
  browser: Browser;
  /** Every request URL, in order, from every page. */
  requests: string[];
  newPage(options?: { noWebGL?: boolean }): Promise<Page>;
}

// SwiftShader renders WebGL on the CPU, so the 3D views work on machines without a GPU.
export async function launchBrowser(): Promise<RecordedBrowser> {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const requests: string[] = [];
  return {
    browser,
    requests,
    async newPage({ noWebGL = false } = {}) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
      context.on("request", (request) => requests.push(request.url()));
      await signIn(context);
      if (noWebGL) await context.addInitScript(disableWebGL);
      return context.newPage();
    },
  };
}

/** Better Auth answers from the app's own database; the browser gets a signed-in session instead. */
async function signIn(context: Awaited<ReturnType<Browser["newContext"]>>) {
  const user = { id: "u1", email: "rova@example.test", name: "Rova", emailVerified: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
  await context.route("**/api/auth/get-session", (route) =>
    route.fulfill({ json: { session: { id: "s1", userId: "u1", expiresAt: "2099-01-01T00:00:00Z", token: "t" }, user } }),
  );
  const payload = Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url");
  await context.route("**/api/auth/token", (route) => route.fulfill({ json: { token: `e30.${payload}.sig` } }));
}

function disableWebGL() {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
    return kind.startsWith("webgl") ? null : Reflect.apply(original, this, [kind, ...rest]);
  } as typeof original;
}

/** model-viewer only loads once it is on screen; React sets its src as a property, not reflected to the attribute. */
export async function loadedModel(page: Page, selector: string): Promise<string> {
  await page.locator(selector).scrollIntoViewIfNeeded();
  const handle = await page.waitForFunction(
    (target) => {
      const viewer = document.querySelector(target) as (Element & { loaded?: boolean; src?: string }) | null;
      return viewer?.loaded === true ? viewer.src : null;
    },
    selector,
    { timeout: 60_000 },
  );
  return (await handle.jsonValue()) as string;
}
