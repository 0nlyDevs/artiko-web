import net from "node:net";
import type { AddressInfo } from "node:net";
import type { Page } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ModelViewerHandle } from "@/features/model-viewer/model-viewer-element";
import { cubeUsda, texturedCubeUsdz, usdz } from "@/features/model-import/testing/usdz-fixtures";
import { hasChrome, launchBrowser, loadedModel, type RecordedBrowser } from "./support/browser";
import { baseWork, MockApi, type SentFile } from "./support/mock-api";
import { buildApp, startApp } from "./support/next-app";

const shotsDir = process.env.E2E_SHOTS_DIR;

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

describe.skipIf(!hasChrome)("LiDAR scan import journey in Chrome", () => {
  const api = new MockApi();
  let app: Awaited<ReturnType<typeof startApp>>;
  let chrome: RecordedBrowser;
  let form: Page;

  beforeAll(async () => {
    await buildApp(await api.listen(await freePort()));
    app = await startApp(await freePort());
    chrome = await launchBrowser();
    form = await chrome.newPage();
    await form.goto(`${app.url}/me`);
    await form.locator("#title").waitFor({ timeout: 60_000 });
    await form.fill("#title", "Sobika");
  }, 600_000);

  afterAll(async () => {
    await chrome?.browser.close();
    app?.stop();
    await api.close();
  });

  const submit = () => form.locator('button[type="submit"]').last();
  const choose = (name: string, bytes: Uint8Array) =>
    form.setInputFiles("#file", { name, mimeType: "model/vnd.usdz+zip", buffer: Buffer.from(bytes) });

  it.each([
    ["a truncated USDZ", texturedCubeUsdz().slice(0, 300), "Unreadable USDZ file."],
    ["a USDZ without mesh", usdz({ "cube.usda": cubeUsda({ withMesh: false }), "0/color.png": new Uint8Array([1]) }), "No 3D object in this file."],
    ["a USDZ naming an outside texture", usdz({ "cube.usda": cubeUsda({ texturePath: "https://example.com/color.png" }) }), "This file uses files outside of it."],
  ])("CA4: refuses %s with a message and keeps publishing disabled", async (_, bytes, message) => {
    await choose("scan.usdz", bytes);

    await form.getByRole("alert").filter({ hasText: message }).waitFor({ timeout: 60_000 });
    expect(await submit().isDisabled()).toBe(true);
    expect(api.posts).toHaveLength(0);
  });

  it("CA1, CA6: shows each step, then a 3D preview of the 1K model with the size of each file, sending nothing", async () => {
    await choose("cube.usdz", texturedCubeUsdz());

    await form.getByText(/^Converting the scan: (in progress|done)$/).waitFor({ timeout: 30_000 });
    await form.getByText("Standard model").waitFor({ timeout: 120_000 });
    expect(await form.locator("dl").innerText()).toMatch(/Standard model\s+[\d.]+ kB\s+HD model\s+[\d.]+ kB\s+Poster image\s+[\d.]+ kB/);
    expect(await loadedModel(form, "model-viewer")).toMatch(/^blob:/);
    expect(api.posts).toHaveLength(0);
    expect(await submit().isDisabled()).toBe(false);
  });

  it("CA3: publishes the 1K variant as file, the 2K variant as model_hd and the WebP poster", async () => {
    await submit().click();

    await form.getByRole("status").filter({ hasText: "Published" }).waitFor({ timeout: 30_000 });
    const sent = api.posts[0] as Record<string, SentFile>;
    expect(sent.file).toMatchObject({ name: "cube-1k.glb", type: "model/gltf-binary", head: expect.stringMatching(/^glTF/) });
    expect(sent.model_hd).toMatchObject({ name: "cube-2k.glb", type: "model/gltf-binary", head: expect.stringMatching(/^glTF/) });
    expect(sent.poster).toMatchObject({ name: "cube-poster.webp", type: "image/webp", head: expect.stringMatching(/^RIFF[\s\S]{4}WEBP$/) });
  });

  describe("artist museum", () => {
    let museum: Page;

    beforeAll(async () => {
      api.museumWorks = [
        { ...baseWork, id: "w1", title: "Sobika", media_kind: "model", ...api.modelUrls("file") },
        { ...baseWork, id: "w2", title: "Flaky", media_kind: "model", ...api.modelUrls("flaky", false) },
      ];
      museum = await chrome.newPage();
      await museum.goto(`${app.url}/artists/a1`);
    }, 120_000);

    it("CA10: opens the 1K variant in the detail panel and moves the camera to a preset view", async () => {
      expect(await loadedModel(museum, "aside model-viewer")).toBe(`${api.url}/media/file`);

      await museum.getByRole("button", { name: "Back" }).click();

      const orbit = await museum.locator("aside model-viewer").evaluate((viewer) => (viewer as unknown as ModelViewerHandle).cameraOrbit);
      expect(orbit).toBe("180deg 75deg auto");
    });

    it("CA11: loads the 2K variant with HD", async () => {
      await museum.getByRole("button", { name: "High definition (HD)" }).click();

      await museum.waitForFunction(() => (document.querySelector("aside model-viewer") as Element & { src?: string })?.src?.endsWith("/media/model_hd"));
      expect(await loadedModel(museum, "aside model-viewer")).toBe(`${api.url}/media/model_hd`);
    });

    it("CA14: decodes Draco with artiko-web's decoder", () => {
      expect(chrome.requests.some((url) => url.startsWith(`${app.url}/draco/`))).toBe(true);
    });

    it("CA15: shows the poster as thumbnail in the 2D mode", async () => {
      await museum.getByRole("button", { name: "Simple gallery view" }).click();

      const thumbnail = museum.locator("ul img").first();
      await thumbnail.waitFor();
      // The image optimizer refuses 127.0.0.1 sources (Next 16 `dangerouslyAllowLocalIP`): only the markup is checked.
      expect(decodeURIComponent((await thumbnail.getAttribute("src")) ?? "")).toContain("/media/poster");
    });

    it("CA12: keeps the poster with Retry when the 1K variant fails, and Retry downloads it again", async () => {
      api.flakyFailures = 1;
      await museum.getByRole("button", { name: /Flaky/ }).click();

      await museum.getByRole("button", { name: "Retry" }).waitFor({ timeout: 60_000 });
      expect(await museum.locator("aside img").count()).toBe(1);

      await museum.getByRole("button", { name: "Retry" }).click();

      expect(await loadedModel(museum, "aside model-viewer")).toBe(`${api.url}/media/flaky#retry-1`);
      expect(chrome.requests.filter((url) => url.startsWith(`${api.url}/media/flaky`)).length).toBeGreaterThanOrEqual(2);
    });
  });

  it("CA13: without WebGL, shows the poster and a short message and downloads no model", async () => {
    const page = await chrome.newPage({ noWebGL: true });
    const before = chrome.requests.length;

    await page.goto(`${app.url}/artists/a1`);

    await page.getByText("3D is not available on this device.").waitFor({ timeout: 60_000 });
    expect(await page.locator("aside model-viewer").count()).toBe(0);
    expect(await page.locator("aside img").count()).toBe(1);
    // The room cannot be drawn either: the simple gallery takes its place instead of the page error.
    await page.getByRole("button", { name: /Sobika/ }).waitFor({ timeout: 30_000 });
    expect(await page.getByText("This page could not load its works").count()).toBe(0);
    expect(chrome.requests.slice(before).filter((url) => url.includes("/media/file") || url.includes("/media/model_hd"))).toEqual([]);
  });

  // Smoke test only: the placeholder itself is checked on the screenshot saved under E2E_SHOTS_DIR.
  it("CA16: keeps drawing the room while a plinth model downloads", async () => {
    const page = await chrome.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`${api.url}/media/file`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 8_000));
      await route.continue();
    });
    await page.goto(`${app.url}/artists/a1`);
    await page.locator("canvas").first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(3_000);

    const shot = await page.locator("canvas").first().screenshot(shotsDir ? { path: `${shotsDir}/ca16-placeholder.png` } : {});
    expect(shot.byteLength).toBeGreaterThan(0);
    expect(errors.filter((message) => !message.includes("/media/flaky"))).toEqual([]);
  });

  it("CA14: sends no request outside 127.0.0.1, and none to www.gstatic.com", () => {
    const outside = chrome.requests.filter((url) => {
      const { protocol, hostname } = new URL(url);
      return !["blob:", "data:"].includes(protocol) && hostname !== "127.0.0.1";
    });
    expect(outside).toEqual([]);
  });
});
