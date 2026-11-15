import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The module keeps the browser's offer between calls, so each test starts from a fresh one.
async function load() {
  vi.resetModules();
  return import("./install-prompt");
}

/** Chrome's offer: an event with the dialog to open and what was chosen in it. */
function offer(outcome: "accepted" | "dismissed" = "accepted") {
  const prompt = vi.fn(async () => undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome }) });
  return { event, prompt };
}

let appMode = false;
beforeEach(() => {
  appMode = false;
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: appMode && query.includes("standalone") }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("installing the app", () => {
  it("points to the browser's menu where there's no offer", async () => {
    const { installWay, listenForInstallPrompt } = await load();
    listenForInstallPrompt();
    expect(installWay()).toBe("menu");
  });

  it("points to the Share sheet in Safari on an iPhone or an iPad, which has no offer", async () => {
    const { installWay } = await load();
    const agent = vi.spyOn(navigator, "userAgent", "get");
    agent.mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1");
    expect(installWay()).toBe("ios");
    // An iPad asking for the desktop site says it's a Mac, but only an iPad is touched.
    agent.mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15");
    vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
    // jsdom has no touch screen to ask.
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    expect(installWay()).toBe("ios");
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
    expect(installWay()).toBe("menu");
    Reflect.deleteProperty(navigator, "maxTouchPoints");
  });

  it("says a page on plain HTTP can't be installed, whatever the browser offers", async () => {
    const { installWay, listenForInstallPrompt } = await load();
    listenForInstallPrompt();
    vi.stubGlobal("isSecureContext", false);
    expect(installWay()).toBe("insecure");
    window.dispatchEvent(offer().event);
    expect(installWay()).toBe("insecure");
    vi.stubGlobal("isSecureContext", true);
    expect(installWay()).toBe("prompt");
  });

  it("keeps the browser's offer, and opens its dialog when asked", async () => {
    const { install, installWay, listenForInstallPrompt, subscribeToInstall } = await load();
    listenForInstallPrompt();
    const changed = vi.fn();
    subscribeToInstall(changed);
    const { event, prompt } = offer();
    window.dispatchEvent(event);
    // Without this the browser would show its own banner, at its own time.
    expect(event.defaultPrevented).toBe(true);
    expect(installWay()).toBe("prompt");
    expect(changed).toHaveBeenCalledTimes(1);

    expect(await install()).toBe(true);
    expect(prompt).toHaveBeenCalledTimes(1);
    // The offer works once.
    expect(installWay()).toBe("menu");
    expect(await install()).toBe(false);
    expect(prompt).toHaveBeenCalledTimes(1);
  });

  it("says no when the dialog was dismissed", async () => {
    const { install, listenForInstallPrompt } = await load();
    listenForInstallPrompt();
    window.dispatchEvent(offer("dismissed").event);
    expect(await install()).toBe(false);
  });

  it("listens once, however often it's asked to", async () => {
    const { installWay, listenForInstallPrompt } = await load();
    const added = vi.spyOn(window, "addEventListener");
    listenForInstallPrompt();
    listenForInstallPrompt();
    expect(added.mock.calls.filter(([type]) => type === "beforeinstallprompt")).toHaveLength(1);
    expect(installWay()).toBe("menu");
  });

  it("knows it's installed, running as an app or just becoming one", async () => {
    const { installWay, listenForInstallPrompt } = await load();
    appMode = true;
    expect(installWay()).toBe("installed");
    appMode = false;
    expect(installWay()).toBe("menu");

    listenForInstallPrompt();
    window.dispatchEvent(offer().event);
    expect(installWay()).toBe("prompt");
    window.dispatchEvent(new Event("appinstalled"));
    expect(installWay()).toBe("installed");
  });

  it("stops telling a screen that has gone", async () => {
    const { listenForInstallPrompt, subscribeToInstall } = await load();
    listenForInstallPrompt();
    const changed = vi.fn();
    const stop = subscribeToInstall(changed);
    stop();
    window.dispatchEvent(offer().event);
    expect(changed).not.toHaveBeenCalled();
  });
});
