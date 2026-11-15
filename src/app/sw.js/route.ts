import { serviceWorkerSource } from "@/lib/service-worker";

// Computed on each request, so the headers below are the ones sent.
export const dynamic = "force-dynamic";

/**
 * The service worker (src/lib/service-worker.ts). The proxy lets it through
 * without a session, like a public file: a browser fetches it to install the
 * app, and it holds nothing private.
 */
export function GET() {
  return new Response(serviceWorkerSource(), {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // Looked at again on every visit, so a new version is picked up at once.
      "cache-control": "no-cache",
    },
  });
}
