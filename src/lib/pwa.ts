// What makes Dossier installable as an app on a phone or a computer (a PWA):
// the manifest (src/app/manifest.ts), the service worker (src/app/sw.js,
// src/lib/service-worker.ts) and the colours of the browser's own bar.

import type { ColorScheme } from "./ui-preferences";

/** Where the service worker is served, and so the scope it controls: the whole app. */
export const SERVICE_WORKER_PATH = "/sw.js";

/**
 * The colour of the browser's bar (the status bar on a phone, the title bar of
 * an installed app) in each scheme: the screen's own, --color-surface in
 * globals.css, which is what a phone's page bar is drawn in.
 */
export const THEME_COLORS: Record<ColorScheme, string> = { light: "#f4f2ed", dark: "#22201d" };

/** Colours the browser's bar now, for a scheme just chosen in the sidebar; the next page load gets the same from the cookie. */
export function showThemeColor(scheme: ColorScheme): void {
  for (const tag of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    tag.content = THEME_COLORS[scheme];
    tag.removeAttribute("media");
  }
}

/** The theme-color meta tags for a scheme chosen in the sidebar, or for the system's two when none was. */
export function themeColors(chosen: ColorScheme | undefined): string | { media: string; color: string }[] {
  if (chosen) return THEME_COLORS[chosen];
  return [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ];
}
