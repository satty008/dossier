import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { THEME_COLORS, themeColors } from "./pwa";

describe("themeColors", () => {
  it("gives the browser's bar the colour of a scheme that was chosen in the sidebar", () => {
    expect(themeColors("dark")).toBe("#22201d");
    expect(themeColors("light")).toBe("#f4f2ed");
  });

  it("follows the system's scheme when none was chosen", () => {
    expect(themeColors(undefined)).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#f4f2ed" },
      { media: "(prefers-color-scheme: dark)", color: "#22201d" },
    ]);
  });

  it("is the colour of the screen's own top, --color-surface in globals.css", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain(`--color-surface: light-dark(${THEME_COLORS.light}, ${THEME_COLORS.dark});`);
  });
});
