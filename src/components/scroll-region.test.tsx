import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScrollRegion } from "./scroll-region";

// jsdom has no layout: the test says how wide the box and what's in it are, and when something changed size.
let notify: () => void = () => {};
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        notify = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

function size(element: HTMLElement, widths: { scrollWidth: number; clientWidth: number; scrollLeft?: number }) {
  Object.defineProperty(element, "scrollWidth", { value: widths.scrollWidth, configurable: true });
  Object.defineProperty(element, "clientWidth", { value: widths.clientWidth, configurable: true });
  Object.defineProperty(element, "scrollLeft", { value: widths.scrollLeft ?? 0, configurable: true });
}

/** The fade over the right edge, while there's more to scroll to. */
const FADE = "mask-r-from-[calc(100%-2rem)]";

describe("ScrollRegion", () => {
  it("is a plain box while what's in it fits: no tab stop to get past", () => {
    render(<ScrollRegion label="Funnel stages">Chart</ScrollRegion>);
    const box = screen.getByText("Chart");
    act(() => notify());
    expect(box).not.toHaveAttribute("tabindex");
    expect(box).not.toHaveAttribute("role");
    expect(box).toHaveClass("overflow-x-auto");
    expect(box).not.toHaveClass(FADE);
  });

  it("becomes a named region a keyboard can reach once it scrolls, and a plain box again when it doesn't", () => {
    render(<ScrollRegion label="Funnel stages">Chart</ScrollRegion>);
    const box = screen.getByText("Chart");
    size(box, { scrollWidth: 760, clientWidth: 358 });
    act(() => notify());
    expect(screen.getByRole("region", { name: "Funnel stages" })).toBe(box);
    expect(box).toHaveAttribute("tabindex", "0");

    size(box, { scrollWidth: 358, clientWidth: 358 });
    act(() => notify());
    expect(screen.queryByRole("region")).toBeNull();
    expect(box).not.toHaveAttribute("tabindex");
  });

  it("fades its right edge while there's more to see, and stops at the end", () => {
    render(<ScrollRegion label="Funnel stages">Chart</ScrollRegion>);
    const box = screen.getByText("Chart");
    size(box, { scrollWidth: 760, clientWidth: 358 });
    act(() => notify());
    expect(box).toHaveClass(FADE);

    // Scrolled all the way: 358 + 402 = 760.
    size(box, { scrollWidth: 760, clientWidth: 358, scrollLeft: 402 });
    act(() => void box.dispatchEvent(new Event("scroll")));
    expect(box).not.toHaveClass(FADE);
    // Still a region to reach, though.
    expect(box).toHaveAttribute("tabindex", "0");

    size(box, { scrollWidth: 760, clientWidth: 358, scrollLeft: 100 });
    act(() => void box.dispatchEvent(new Event("scroll")));
    expect(box).toHaveClass(FADE);
  });

  it("keeps the classes it's given", () => {
    render(
      <ScrollRegion label="Tokens" className="rounded-panel">
        Table
      </ScrollRegion>,
    );
    expect(screen.getByText("Table")).toHaveClass("rounded-panel", "relative");
  });
});
