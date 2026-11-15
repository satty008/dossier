// Installing Dossier as an app from inside it. Chrome, Edge and Samsung's
// browser fire `beforeinstallprompt` once, early in a page's life, and let the
// page keep the event and show the install dialog when the user asks. Safari
// has no such event: on an iPhone or iPad the way is Share → Add to Home
// Screen, so the screen can only say so. The event is kept here, from the
// root layout on, so Settings can use it whenever it's opened.

/** The part of Chrome's `beforeinstallprompt` event that's used. */
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** How this browser installs Dossier. */
export type InstallWay =
  /** Already running as an app, or just installed. */
  | "installed"
  /** Served over plain HTTP: browsers install an app only from a secure page (HTTPS, or localhost). */
  | "insecure"
  /** The browser has a dialog for it: `install()` opens it. */
  | "prompt"
  /** Safari on an iPhone or iPad: Share → Add to Home Screen. */
  | "ios"
  /** Anything else: the browser's own menu, if it has the choice at all. */
  | "menu";

let offered: InstallEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Starts keeping the browser's install offer, once. Called by the root layout's ServiceWorker. */
export function listenForInstallPrompt(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    // Without this the browser shows its own banner at its own time; with it, the offer waits for the button.
    event.preventDefault();
    offered = event as InstallEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    offered = null;
    installed = true;
    notify();
  });
}

export function subscribeToInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether the page runs as an installed app: in its own window, not a browser tab. */
function runsAsApp(): boolean {
  if (typeof matchMedia === "undefined") return false;
  return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Whether this is Safari (or another browser) on an iPhone or iPad, which installs from the Share sheet. */
function onApple(): boolean {
  // An iPad asks for the desktop site and says it's a Mac, but only an iPad has a touch screen.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** How this browser installs the app, from what it can do now. */
export function installWay(): InstallWay {
  if (installed || runsAsApp()) return "installed";
  // A server on plain HTTP in a home network: no service worker, no offer, nothing to install.
  if (typeof isSecureContext === "boolean" && !isSecureContext) return "insecure";
  if (offered) return "prompt";
  return onApple() ? "ios" : "menu";
}

/** Opens the browser's install dialog; true when it was accepted. */
export async function install(): Promise<boolean> {
  const event = offered;
  if (!event) return false;
  // The event works once: a refusal brings a new one later, if the browser offers again.
  offered = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}
