import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { THEME_COLORS } from "@/lib/pwa";

import manifest from "./manifest";

describe("the web app manifest", () => {
  const app = manifest();

  it("names the app and opens it in a window of its own, at the start of the app", () => {
    expect(app).toMatchObject({ id: "/", name: "Dossier", short_name: "Dossier", start_url: "/", scope: "/", display: "standalone" });
    expect(app.description).toBe("Your job search, on your server.");
  });

  it("uses the colour of the screen's top for the splash screen and the title bar", () => {
    expect(app.background_color).toBe(THEME_COLORS.light);
    expect(app.theme_color).toBe(THEME_COLORS.light);
  });

  it("has the icons browsers ask for, each as large as it says", () => {
    expect(app.icons?.map(({ sizes, purpose, type }) => `${sizes} ${purpose} ${type}`)).toEqual([
      "192x192 any image/png",
      "512x512 any image/png",
      "512x512 maskable image/png",
    ]);
    for (const icon of app.icons ?? []) {
      const file = readFileSync(`public${icon.src}`);
      expect(file.subarray(1, 4).toString(), icon.src).toBe("PNG");
      const [width, height] = (icon.sizes ?? "").split("x").map(Number);
      expect({ width: file.readUInt32BE(16), height: file.readUInt32BE(20) }, icon.src).toEqual({ width, height });
    }
  });

  it("offers a few places to go straight to, all inside the app", () => {
    const urls = app.shortcuts?.map(({ url }) => url);
    expect(urls).toEqual(["/new?fresh=1", "/applications", "/inbox"]);
    for (const url of urls ?? []) expect(url.startsWith(app.scope ?? "/")).toBe(true);
  });
});
