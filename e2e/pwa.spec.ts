import { expect, test } from "@playwright/test";

import { resetData } from "./support";

// Dossier as an installable app (PWA): the manifest and the service worker are
// public, since a browser fetches them without cookies; the service worker
// keeps nothing and shows a short page when the server can't be reached; and
// Settings → About offers the install.
test.beforeAll(resetData);

/** A PNG's width and height, from its header. */
const pngSize = (bytes: Buffer) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

test.describe("signed out, as a browser installing the app sees it", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the manifest names the app, and its icons are public", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("manifest+json");
    const manifest = await response.json();
    expect(manifest).toMatchObject({ id: "/", name: "Dossier", short_name: "Dossier", start_url: "/", scope: "/", display: "standalone" });
    expect(manifest.shortcuts.map((shortcut: { url: string }) => shortcut.url)).toEqual(["/new?fresh=1", "/applications", "/inbox"]);

    // Browsers want a 192 and a 512 icon, and a maskable one that a launcher can crop to a circle.
    const icons: { src: string; sizes: string; type: string; purpose: string }[] = manifest.icons;
    expect(icons.map(({ sizes, purpose }) => `${sizes} ${purpose}`)).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
    for (const icon of icons) {
      const image = await request.get(icon.src);
      expect(image.status(), icon.src).toBe(200);
      expect(image.headers()["content-type"]).toBe(icon.type);
      const [width, height] = icon.sizes.split("x").map(Number);
      expect(pngSize(await image.body()), icon.src).toEqual({ width, height });
    }
  });

  test("the service worker is served as a script, looked at again on every visit, and keeps nothing", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("javascript");
    expect(response.headers()["cache-control"]).toBe("no-cache");
    const script = await response.text();
    // A page being opened is all it answers; no cache is ever written.
    expect(script).toContain('event.request.mode !== "navigate"');
    expect(script).not.toMatch(/caches\.|cache\.put|\.addAll\(/);
  });

  test("a page links the manifest, colours the browser's bar, and never stops pinch zoom", async ({ page }) => {
    const response = await page.goto("/login");
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "Dossier");
    await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(viewport).toContain("width=device-width");
    expect(viewport).not.toMatch(/maximum-scale|user-scalable/);

    // The policy names the worker and the manifest outright: 'strict-dynamic' would otherwise leave a worker without a source.
    const policy = (await response!.allHeaders())["content-security-policy"];
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain("manifest-src 'self'");
  });

  test("a chosen scheme colours the bar in its colour alone", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "dossier_theme", value: "dark", url: baseURL! }]);
    await page.goto("/login");
    await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#22201d");
  });

  test.describe("with the service worker allowed", () => {
    test.use({ serviceWorkers: "allow" });

    test("the browser itself finds the manifest sound and nothing in the way of installing the app", async ({ page, context }) => {
      await page.goto("/login");
      await page.evaluate(() => navigator.serviceWorker.ready);
      const browser = await context.newCDPSession(page);
      const manifest = await browser.send("Page.getAppManifest");
      expect(manifest.errors).toEqual([]);
      expect(JSON.parse(manifest.data!)).toMatchObject({ name: "Dossier", display: "standalone", start_url: "/" });
      // What Chrome's own install check says: a secure page, a manifest with a name, icons of the sizes it wants, a start URL in scope.
      expect((await browser.send("Page.getInstallabilityErrors")).installabilityErrors).toEqual([]);
    });

    test("registers for the whole app, and answers a page it can't fetch with a page of its own", async ({ page, context }) => {
      await page.goto("/login");
      const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
      expect(scope).toBe(`${new URL(page.url()).origin}/`);
      // It takes control of the page it was registered from, with no reload.
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null)).toMatch(/\/sw\.js$/);

      // A page the worker is asked for that redirects (signed out, to the sign-in page) still gets there.
      await page.goto("/applications");
      await expect(page).toHaveURL(/\/login\?next=%2Fapplications$/);
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();

      await context.setOffline(true);
      await page.goto("/login").catch(() => undefined);
      await expect(page.getByRole("heading", { level: 1, name: "Dossier can't be reached" })).toBeVisible();
      await expect(page.getByText("this device keeps no copy of them")).toBeVisible();

      // "Try again" opens the page again: a mark on this one is gone after it, and with no connection the answer is the same page.
      await page.evaluate(() => ((window as unknown as { shownBefore?: boolean }).shownBefore = true));
      const reloaded = page.waitForEvent("load");
      await page.getByRole("button", { name: "Try again" }).click();
      await reloaded;
      expect(await page.evaluate(() => (window as unknown as { shownBefore?: boolean }).shownBefore)).toBeUndefined();
      await expect(page.getByRole("heading", { level: 1, name: "Dossier can't be reached" })).toBeVisible();

      // The way back needs no press: once the connection is back, the page opens the one that was asked for.
      await context.setOffline(false);
      await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    });
  });
});

test("Settings → About offers to install, with the browser's own dialog", async ({ page }) => {
  await page.goto("/settings?section=about");
  const row = page.getByText("Install as an app").locator("..").locator("..");
  // Headless Chromium isn't offered the install, so it says where to look; then the browser makes the offer.
  await expect(row).toContainText("Open your browser's menu and choose Install app");
  await expect(row.getByRole("button", { name: "Install" })).toHaveCount(0);

  await page.evaluate(() => {
    const offer = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt: async () => {
        (window as unknown as { installPrompted: boolean }).installPrompted = true;
      },
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(offer);
  });
  await row.getByRole("button", { name: "Install" }).click();
  expect(await page.evaluate(() => (window as unknown as { installPrompted?: boolean }).installPrompted)).toBe(true);
  await expect(page.getByText("Dossier is installed.")).toBeVisible();
  // The offer works once.
  await expect(row.getByRole("button", { name: "Install" })).toHaveCount(0);
});
