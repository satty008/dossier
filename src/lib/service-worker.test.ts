import { describe, expect, it, vi } from "vitest";

import { OFFLINE_PAGE, serviceWorkerSource } from "./service-worker";

type Listener = (event: unknown) => void;
type Request = { mode: string; url: string };

/** Runs the worker's script against stand-ins for what a worker has, and hands back what it registered. */
function load(network: (request: Request) => Promise<Response>) {
  const listeners = new Map<string, Listener>();
  const scope = {
    addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => undefined) },
  };
  new Function("self", "fetch", "Response", serviceWorkerSource())(scope, network, Response);
  return { listeners, scope };
}

/** Opens a request as the browser does; what the worker answered with, or undefined if it left it alone. */
async function open(listeners: Map<string, Listener>, request: Request): Promise<Response | undefined> {
  let answer: Promise<Response> | undefined;
  listeners.get("fetch")!({ request, respondWith: (promised: Promise<Response>) => (answer = promised) });
  return answer;
}

const page = { mode: "navigate", url: "https://dossier.example/applications" };

describe("the service worker's script", () => {
  it("takes over at once, since it has no cache to move", () => {
    const { listeners, scope } = load(async () => new Response("unused"));
    listeners.get("install")!({});
    expect(scope.skipWaiting).toHaveBeenCalled();
    const waitUntil = vi.fn();
    listeners.get("activate")!({ waitUntil });
    expect(scope.clients.claim).toHaveBeenCalled();
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("leaves everything but a page being opened to the network: the app's data, actions, scripts and files", async () => {
    const network = vi.fn(async () => new Response("unused"));
    const { listeners } = load(network);
    for (const mode of ["cors", "no-cors", "same-origin", "websocket"]) {
      expect(await open(listeners, { mode, url: "https://dossier.example/_next/static/app.js" }), mode).toBeUndefined();
    }
    expect(network).not.toHaveBeenCalled();
  });

  it("hands over what the server answers to a page, errors included: those are the app's own", async () => {
    for (const status of [200, 302, 401, 404, 500]) {
      const answer = new Response("from the server", { status });
      const { listeners } = load(async () => answer);
      expect(await open(listeners, page), String(status)).toBe(answer);
    }
  });

  it("answers a page it can't fetch with a page of its own", async () => {
    const { listeners } = load(async () => {
      throw new TypeError("Failed to fetch");
    });
    const response = (await open(listeners, page))!;
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe(OFFLINE_PAGE);
  });

  it("does the same when the reverse proxy is up and the app behind it isn't", async () => {
    for (const status of [502, 503, 504]) {
      const { listeners } = load(async () => new Response("Bad Gateway", { status }));
      const response = (await open(listeners, page))!;
      expect(await response.text(), String(status)).toBe(OFFLINE_PAGE);
    }
  });

  it("keeps nothing: no cache is opened, read or written", () => {
    expect(serviceWorkerSource()).not.toMatch(/\bcaches\b|\.put\(|\.addAll\(|indexedDB|localStorage/);
  });
});

describe("the offline page", () => {
  it("is a whole page that needs nothing from the server, and says what to do", () => {
    expect(OFFLINE_PAGE).toMatch(/^<!doctype html>\n<html lang="en">/);
    expect(OFFLINE_PAGE).toContain("<title>Dossier can't be reached</title>");
    expect(OFFLINE_PAGE).toContain("<h1>Dossier can't be reached</h1>");
    expect(OFFLINE_PAGE).toContain("this device keeps no copy of them");
    expect(OFFLINE_PAGE).toContain('<button type="button" onclick="location.reload()">Try again</button>');
    // It tries again by itself when the connection comes back.
    expect(OFFLINE_PAGE).toContain('addEventListener("online"');
    expect(OFFLINE_PAGE).not.toMatch(/(?:src|href)="(?:https?:)?\/\//);
  });

  it("follows the device's light or dark scheme, in the app's colours", () => {
    expect(OFFLINE_PAGE).toContain("--bg:#f4f2ed");
    expect(OFFLINE_PAGE).toContain("@media (prefers-color-scheme:dark){:root{--bg:#22201d");
  });
});
