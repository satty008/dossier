import { THEME_COLORS } from "./pwa";

// The service worker's script, built here so its offline page can be written in
// the app's colours and tested. It's served by src/app/sw.js/route.ts.
//
// It keeps nothing: no pages, no data, no files. Everything Dossier shows comes
// from the user's own server and stays there, so a device that was signed in
// holds no copy of a profile or an application, and signing out leaves
// nothing behind. What the worker does is the two things an installed app
// needs: it answers when the server can't, with a short page instead of the
// browser's error, and its presence is what lets browsers install the app.

/** What the server answers when it's up but the app behind it isn't: the reverse proxy's own pages. */
const UNREACHABLE_STATUSES = [502, 503, 504];

const MARK_PATH =
  "M1179.8 691.9Q1179.8 974 1032.5 1107.7Q885.3 1241.3 625.7 1241.3H354.9L338.3 1350H674.8Q936.6 1350 1111 1279.8Q1285.4 1209.6 1372.4 1068.2Q1459.5 926.8 1459.5 714.2Q1459.5 486.8 1357.2 327.4Q1254.8 168 1077.9 84Q900.9 0 678.3 0H338.3L354.9 108.7H646.1Q807.3 108.7 927.1 168.3Q1047 227.8 1113.4 356.5Q1179.8 485.1 1179.8 691.9ZM72.3 0V41L223.4 95.9V1254.2L72.3 1308.9V1350H489.4V0Z";

/**
 * The page shown when the server can't be reached. It's one self-contained
 * document (no request to make, nothing to load), in the light or dark scheme
 * of the device, since the app's own choice lives in a cookie it can't count on.
 */
export const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Dossier can't be reached</title>
<style>
:root{color-scheme:light dark;--bg:${THEME_COLORS.light};--ink:#1d1c1a;--muted:#69655d;--primary:#222222;--on-primary:#fbfaf7}
@media (prefers-color-scheme:dark){:root{--bg:${THEME_COLORS.dark};--ink:#f0ede7;--muted:#aaa59c;--primary:#ebe7df;--on-primary:#1d1c1a}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:420px;display:flex;flex-direction:column;align-items:flex-start;gap:14px}
svg{width:40px;height:40px}
h1{margin:6px 0 0;font:500 30px/1.15 ui-serif,Georgia,"Times New Roman",serif;letter-spacing:-.01em}
p{margin:0;color:var(--muted)}
button{margin-top:6px;min-height:44px;padding:0 20px;border:0;border-radius:8px;background:var(--primary);color:var(--on-primary);font:600 15px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer}
button:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
</style>
</head>
<body>
<main>
<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14.08" fill="var(--primary)"/><path fill="var(--on-primary)" transform="matrix(0.02844 0 0 -0.02844 10.214 51.200)" d="${MARK_PATH}"/></svg>
<h1>Dossier can't be reached</h1>
<p>The server isn't answering, so there's nothing to show right now. Your applications and documents are kept on your server, and this device keeps no copy of them.</p>
<p>Check your connection, or your VPN if the server is at home, and try again.</p>
<button type="button" onclick="location.reload()">Try again</button>
</main>
<script>addEventListener("online",function(){location.reload()})</script>
</body>
</html>
`;

/** The worker's script. */
export function serviceWorkerSource(): string {
  return `// Dossier's service worker. It keeps no pages and no data: see src/lib/service-worker.ts.
"use strict";

const OFFLINE_PAGE = ${JSON.stringify(OFFLINE_PAGE)};
const UNREACHABLE = ${JSON.stringify(UNREACHABLE_STATUSES)};

const offline = () =>
  new Response(OFFLINE_PAGE, {
    status: 503,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });

// A new version takes over at once: there's no cache for it to migrate.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Only a page being opened is touched. Everything else (the app's data and
// actions, scripts, files) goes to the network as if the worker weren't there.
// When the app switches pages without a reload and the server can't be
// reached, it falls back to opening the page, which lands here.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).then(
      (response) => (UNREACHABLE.includes(response.status) ? offline() : response),
      offline,
    ),
  );
});
`;
}
