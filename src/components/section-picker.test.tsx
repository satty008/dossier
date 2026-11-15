import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionPicker } from "./section-picker";

const list = (
  <nav aria-label="Sections">
    <a href="/one">One</a>
    <a href="/two">Two</a>
  </nav>
);

describe("SectionPicker", () => {
  it("names the section that's open, with its list folded away on a phone", () => {
    render(
      <SectionPicker label="Section" current="One">
        {list}
      </SectionPicker>,
    );
    const button = screen.getByRole("button", { name: /^Section:\s*One$/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    // Folded by CSS below 768px only; from there up the list is always shown, and the row isn't.
    expect(button).toHaveClass("md:hidden");
    expect(button.getAttribute("aria-controls")).toBe(screen.getByRole("navigation", { name: "Sections" }).parentElement!.id);
    expect(screen.getByRole("navigation", { name: "Sections" }).parentElement).toHaveClass("max-md:hidden");
  });

  it("opens and folds the list", async () => {
    const user = userEvent.setup();
    render(
      <SectionPicker label="Section" current="One">
        {list}
      </SectionPicker>,
    );
    const button = screen.getByRole("button", { name: /^Section:\s*One$/ });
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("navigation", { name: "Sections" }).parentElement).not.toHaveClass("max-md:hidden");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("folds again once another section is open", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <SectionPicker label="Section" current="One">
        {list}
      </SectionPicker>,
    );
    await user.click(screen.getByRole("button", { name: /^Section:\s*One$/ }));
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    rerender(
      <SectionPicker label="Section" current="Two">
        {list}
      </SectionPicker>,
    );
    const button = screen.getByRole("button", { name: /^Section:\s*Two$/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("navigation", { name: "Sections" }).parentElement).toHaveClass("max-md:hidden");
  });
});
