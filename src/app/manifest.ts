import type { MetadataRoute } from "next";

import { THEME_COLORS } from "@/lib/pwa";

/**
 * The web app manifest, at /manifest.webmanifest: what a browser needs to
 * install Dossier as an app with its own window and icon, on a phone or a
 * computer. The proxy lets it through without a session, since browsers
 * fetch it without cookies; it holds nothing private. The icons are in
 * public/icons, drawn from the same mark as src/app/icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Dossier",
    short_name: "Dossier",
    description: "Your job search, on your server.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // The splash screen's, and the title bar's: the colour of the screen's own top.
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full bleed, with the mark inside the circle a launcher may crop it to.
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-pressing the app's icon.
    shortcuts: [
      { name: "New application", url: "/new?fresh=1" },
      { name: "Applications", url: "/applications" },
      { name: "Inbox", url: "/inbox" },
    ],
  };
}
