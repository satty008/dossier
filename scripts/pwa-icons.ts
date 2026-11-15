// Draws the installable app's icons into public/icons from the brand mark in
// src/app/icon.svg, with the Chromium Playwright already has for PDFs:
//
//   docker/bin/yarn pwa-icons
//
// icon-192.png and icon-512.png keep the mark's rounded corners. maskable-512.png
// is full bleed, with the mark shrunk into the circle a launcher may crop it to
// (the safe zone is 80% of the icon's width), so nothing is cut off. The
// manifest (src/app/manifest.ts) names all three. The files are kept in the
// repository; run this only when the mark changes.

import { readFileSync } from "node:fs";

import { chromium } from "playwright-core";

const source = readFileSync("src/app/icon.svg", "utf8");
const mark = source.match(/<path[^>]*\/>/)?.[0];
if (!mark) throw new Error("src/app/icon.svg has no path to draw.");

// The mark is centred on 32,32 of its 64 box; 0.82 puts its far corners inside the safe zone.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1d1c1a"/><g transform="translate(32 32) scale(0.82) translate(-32 -32)">${mark}</g></svg>`;

const icons = [
  { file: "icon-192.png", size: 192, svg: source },
  { file: "icon-512.png", size: 512, svg: source },
  { file: "maskable-512.png", size: 512, svg: maskable },
];

async function main() {
  const browser = await chromium.launch();
  try {
    for (const { file, size, svg } of icons) {
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      await page.setContent(
        `<!doctype html><body style="margin:0;background:transparent"><img style="display:block" width="${size}" height="${size}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}">`,
      );
      await page.screenshot({ path: `public/icons/${file}`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
      await page.close();
      console.log(`public/icons/${file}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
