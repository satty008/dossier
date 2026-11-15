import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { MobileNav } from "./mobile-nav";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
// A link that doesn't leave the page, as jsdom can't navigate; the click still reaches the menu's own handler.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: ComponentProps<"a">) => <a href={href} onClick={(event) => event.preventDefault()} {...props} />,
}));

function setup(counts?: Record<string, number>) {
  return render(
    <MobileNav brand={<span>Dossier</span>} counts={counts}>
      <a href="/settings">Settings</a>
      <a href="/usage">Usage</a>
      <button type="button">Dark mode</button>
    </MobileNav>,
  );
}

const bar = () => screen.getByRole("navigation", { name: "Main" });

describe("MobileNav", () => {
  it("has the main sections in a bar, and a Menu for the rest", () => {
    pathname = "/";
    setup();
    expect(within(bar()).getAllByRole("link").map((link) => link.textContent)).toEqual(["Dashboard", "Find jobs", "Applications", "Inbox"]);
    expect(within(bar()).getByRole("button", { name: "Menu" })).toBeInTheDocument();
    // It's a phone's: from 768px up the sidebar is there instead.
    expect(bar()).toHaveClass("md:hidden", "fixed", "bottom-0");
  });

  it("marks the section that's open, and the Menu while one of its sections is", () => {
    pathname = "/applications/abc";
    const { unmount } = setup();
    expect(within(bar()).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page").map((link) => link.textContent)).toEqual(["Applications"]);
    expect(within(bar()).getByRole("button", { name: "Menu" }).firstElementChild).not.toHaveClass("bg-selected");
    unmount();

    pathname = "/settings";
    setup();
    expect(within(bar()).queryAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page")).toEqual([]);
    expect(within(bar()).getByRole("button", { name: "Menu" }).firstElementChild).toHaveClass("bg-selected");
  });

  it("shows what's waiting: on its section, and on the Menu for a section only it has", () => {
    pathname = "/";
    setup({ "/inbox": 2, "/agent": 3 });
    expect(within(bar()).getByRole("link", { name: /^Inbox\s*2 waiting$/ })).toHaveTextContent("2");
    // The agent's finds aren't on the bar, so the Menu says so, with a dot on its icon and no number.
    expect(within(bar()).getByRole("button", { name: /^Menu\s*\(3 waiting\)$/ })).toBeInTheDocument();
  });

  it("opens the sidebar's contents over the page, as a dialog", async () => {
    pathname = "/";
    const user = userEvent.setup();
    setup();
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const menu = screen.getByRole("dialog", { name: "Menu" });
    expect(within(menu).getByText("Dossier")).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Close menu" })).toBeInTheDocument();
  });

  it("closes with its button or Escape, and gives focus back to the Menu", async () => {
    pathname = "/";
    const user = userEvent.setup();
    setup();
    const open = screen.getByRole("button", { name: "Menu" });
    await user.click(open);
    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(open).toHaveFocus();

    await user.click(open);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(open).toHaveFocus();
  });

  it("closes when a link in it is chosen, even to the page that's already open", async () => {
    pathname = "/settings";
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Settings" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves it open for a button in it", async () => {
    pathname = "/";
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    await user.click(screen.getByRole("button", { name: "Dark mode" }));
    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
  });

  it("closes when the page changes some other way, as with Back", async () => {
    pathname = "/";
    const user = userEvent.setup();
    const { rerender } = setup();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    pathname = "/jobs";
    rerender(
      <MobileNav brand={<span>Dossier</span>}>
        <a href="/settings">Settings</a>
      </MobileNav>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    // And it doesn't come back by itself if the page does.
    pathname = "/";
    rerender(
      <MobileNav brand={<span>Dossier</span>}>
        <a href="/settings">Settings</a>
      </MobileNav>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("MobileNav, as the window changes", () => {
  it("closes the menu when the window grows to where the sidebar is shown", async () => {
    pathname = "/";
    let widened: ((event: { matches: boolean }) => void) | undefined;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_type: string, listener: (event: { matches: boolean }) => void) => (widened = listener),
      removeEventListener: () => {},
    }));
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Still narrow: nothing happens.
    act(() => widened?.({ matches: false }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    act(() => widened?.({ matches: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    vi.unstubAllGlobals();
  });
});
