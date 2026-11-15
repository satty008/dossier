import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listenForInstallPrompt } from "@/lib/install-prompt";

import { ServiceWorker } from "./service-worker";

vi.mock("@/lib/install-prompt", () => ({ listenForInstallPrompt: vi.fn() }));

const register = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  register.mockResolvedValue({});
  Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });
  window.history.pushState({}, "", "/");
});
afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("ServiceWorker", () => {
  it("registers the worker for the whole app, on a built server", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<ServiceWorker />);
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/", updateViaCache: "none" });
  });

  it("leaves a development server alone, where pages change on every save", () => {
    render(<ServiceWorker />);
    expect(register).not.toHaveBeenCalled();
  });

  it("leaves the print pages the PDF renderer opens alone", () => {
    vi.stubEnv("NODE_ENV", "production");
    window.history.pushState({}, "", "/print/resume/abc");
    render(<ServiceWorker />);
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without service workers", () => {
    vi.stubEnv("NODE_ENV", "production");
    Reflect.deleteProperty(navigator, "serviceWorker");
    expect(() => render(<ServiceWorker />)).not.toThrow();
  });

  it("leaves the app as it was when the browser refuses", async () => {
    vi.stubEnv("NODE_ENV", "production");
    register.mockRejectedValue(new Error("refused"));
    render(<ServiceWorker />);
    await Promise.resolve();
    expect(register).toHaveBeenCalled();
  });

  it("starts keeping the browser's offer to install, wherever it runs", () => {
    render(<ServiceWorker />);
    expect(listenForInstallPrompt).toHaveBeenCalledTimes(1);
  });
});
