"use client";

import { useEffect } from "react";

import { listenForInstallPrompt } from "@/lib/install-prompt";
import { SERVICE_WORKER_PATH } from "@/lib/pwa";

/**
 * Registers the service worker, which makes Dossier installable and shows a
 * short page when the server can't be reached (src/lib/service-worker.ts), and
 * starts listening for the browser's offer to install it (Settings → About
 * has the button). Only on a built server: a development server's pages change
 * on every save. A browser that can't, or a refusal, leaves the app as it was.
 */
export function ServiceWorker() {
  useEffect(() => {
    listenForInstallPrompt();
    // The PDF renderer's headless browser opens print pages; it has no use for it.
    if (process.env.NODE_ENV !== "production" || location.pathname.startsWith("/print/")) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
