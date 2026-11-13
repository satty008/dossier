import { describe, expect, it } from "vitest";

import {
  ACCENTS,
  BUILT_IN_THEMES,
  contrastRatio,
  DENSITIES,
  FIT_LEVELS,
  hasColumns,
  hasSidebar,
  layoutDensity,
  printCss,
  readableOnWhite,
  resolveTheme,
  squeeze,
  TWO_COLUMN_DENSITY,
  unitsToMm,
  withoutSidebar,
} from "./themes";

const theme = (id: string) => BUILT_IN_THEMES.find((entry) => entry.id === id)!;

describe("resolveTheme", () => {
  it("sizes the name by the heading font", () => {
    expect(resolveTheme(theme("editorial")).name).toEqual({ size: 30, weight: 500 });
    expect(resolveTheme(theme("modern")).name).toEqual({ size: 25, weight: 600 });
  });

  it("left-aligns the header of sidebar layouts", () => {
    const classic = theme("classic");
    expect(resolveTheme(classic).centered).toBe(true);
    expect(resolveTheme({ ...classic, layout: "SPLIT" })).toMatchObject({ split: true, centered: false });
  });

  it("lets a layout override the theme's", () => {
    expect(resolveTheme(theme("modern"), "SINGLE").split).toBe(false);
    expect(resolveTheme(theme("editorial"), "SPLIT").split).toBe(true);
  });

  it("resolves the newer structures: sidebar side and tint, side headings, banner and timeline", () => {
    expect(resolveTheme(theme("studio"))).toMatchObject({ split: true, sidebarEnd: true, tintedSidebar: true, sideHeadings: false });
    expect(resolveTheme(theme("folio"))).toMatchObject({ split: false, sideHeadings: true });
    expect(resolveTheme(theme("atlas"))).toMatchObject({ banner: true, timeline: true, centered: true });
    expect(resolveTheme(theme("console")).heading.marker).toBe("band");
    expect(resolveTheme(theme("signal")).heading.marker).toBe("bar");
    // A tint only shows on a sidebar.
    expect(resolveTheme(theme("studio"), "SINGLE")).toMatchObject({ split: false, sidebarEnd: false, tintedSidebar: false });
  });

  it("resolves the two-column layouts: their own spacing, and neither a sidebar nor a timeline", () => {
    const columns = resolveTheme(theme("default-ram"));
    expect(columns).toMatchObject({ columns: true, compactRoles: false, split: false, sideHeadings: false, timeline: false, banner: false });
    expect(columns.density).toBe(TWO_COLUMN_DENSITY);
    expect(resolveTheme(theme("editorial"))).toMatchObject({ columns: false, compactRoles: false });
    // Any theme in a two-column layout has it, whatever its density says.
    expect(resolveTheme({ ...theme("editorial"), layout: "TWO_COLUMN", density: "AIRY" }).density).toBe(TWO_COLUMN_DENSITY);
    expect(resolveTheme(theme("default-ram"), "SINGLE")).toMatchObject({ columns: false, density: DENSITIES.COMPACT });
  });

  it("has Ram's and Priya's formats as the two-column layouts, the second with compact roles", () => {
    expect(theme("default-ram")).toMatchObject({ name: "Ram", builtIn: true, layout: "TWO_COLUMN" });
    expect(theme("default-priya")).toMatchObject({ name: "Priya", builtIn: true, layout: "TWO_COLUMN_COMPACT" });
    const priya = resolveTheme(theme("default-priya"));
    expect(priya).toMatchObject({ columns: true, compactRoles: true, split: false, timeline: false });
    expect(priya.density).toBe(TWO_COLUMN_DENSITY);
    expect(resolveTheme(theme("default-priya"), "SINGLE")).toMatchObject({ columns: false, compactRoles: false });
    expect(hasColumns("TWO_COLUMN")).toBe(true);
    expect(hasColumns("TWO_COLUMN_COMPACT")).toBe(true);
    expect(hasColumns("SPLIT")).toBe(false);
    expect(layoutDensity("TWO_COLUMN_COMPACT", "AIRY")).toBe(TWO_COLUMN_DENSITY);
  });

  it("puts white on dark accents and ink on light ones", () => {
    expect(resolveTheme(theme("signal")).onAccent).toBe("#ffffff");
    expect(resolveTheme({ ...theme("signal"), accent: "#f2c94c" }).onAccent).toBe("#1d1c1a");
  });

  it("puts the script fallbacks and a Greek face in the style of the font before the theme's fonts", () => {
    expect(resolveTheme(theme("technical"))).toMatchObject({
      headFamily: "var(--script-fonts), var(--typeface-greek-sans), var(--typeface-plex-mono)",
      bodyFamily: "var(--script-fonts), var(--typeface-greek-sans), var(--typeface-plex-sans)",
    });
    expect(resolveTheme(theme("editorial")).headFamily).toBe(
      "var(--script-fonts), var(--typeface-greek-serif), var(--typeface-newsreader)",
    );
  });
});

describe("layouts and colours", () => {
  it("folds only sidebars into a single column", () => {
    expect(withoutSidebar("SPLIT")).toBe("SINGLE");
    expect(withoutSidebar("SPLIT_END")).toBe("SINGLE");
    expect(withoutSidebar("SIDE_HEADINGS")).toBe("SIDE_HEADINGS");
    expect(hasSidebar("SIDE_HEADINGS")).toBe(false);
    expect(withoutSidebar("TWO_COLUMN")).toBe("TWO_COLUMN");
    expect(withoutSidebar("TWO_COLUMN_COMPACT")).toBe("TWO_COLUMN_COMPACT");
    expect(hasSidebar("TWO_COLUMN")).toBe(false);
  });

  it("offers swatches that read as text on white, and tells light colours apart", () => {
    for (const accent of ACCENTS) expect(readableOnWhite(accent.value), accent.name).toBe(true);
    for (const theme of BUILT_IN_THEMES) expect(readableOnWhite(theme.accent), theme.name).toBe(true);
    expect(readableOnWhite("#f2c94c")).toBe(false);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("names every built-in uniquely, with its own id", () => {
    expect(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size).toBe(BUILT_IN_THEMES.length);
    expect(new Set(BUILT_IN_THEMES.map((theme) => theme.name)).size).toBe(BUILT_IN_THEMES.length);
  });
});

describe("printCss", () => {
  it("prints on the configured paper with the theme's padding as page margins", () => {
    // Regular: 50 × 54 units; a unit is 210 / 640 mm on A4.
    expect(printCss(theme("editorial"), "A4")).toMatch(
      /^@page \{ size: 210mm 297mm; margin: 16.406mm 17.719mm; \}\n:root \{ --u: 0.328125mm; \}\n/,
    );
    expect(printCss(theme("technical"), "LETTER")).toMatch(/^@page \{ size: 215.9mm 279.4mm; margin: 12.819mm 14.168mm; \}/);
  });

  it("gives the two-column layout margins above and below only, a sliver smaller than the template's 10 mm", () => {
    // 10 mm (30.48 units) less the 0.9 mm each page gets back as padding; the sides are padding too, so the photo can reach into them.
    expect(printCss(theme("default-ram"), "A4")).toMatch(
      /^@page \{ size: 210mm 297mm; margin: 9.101mm 0; \}\n:root \{ --u: 0.328125mm; --tail: 0.9mm; \}\n/,
    );
    expect(printCss(theme("default-ram"), "A4", 2)).toContain(`margin: ${Math.round((unitsToMm(squeeze(TWO_COLUMN_DENSITY, 2).paddingY, "A4") - 0.9) * 1000) / 1000}mm 0;`);
    expect(printCss(theme("editorial"), "A4")).not.toContain("--tail");
    expect(printCss(theme("default-ram"), "A4")).not.toContain("--raise");
  });

  it("gives Priya's layout a smaller margin above on the first page's behalf, where its photo reaches up 6.5 mm", () => {
    // The 9.101 mm above is 6.5 mm less, and the photo's reach is padding on every page instead (--raise), so the text starts where it does.
    expect(printCss(theme("default-priya"), "A4")).toMatch(
      /^@page \{ size: 210mm 297mm; margin: 2.601mm 0 9.101mm; \}\n:root \{ --u: 0.328125mm; --tail: 0.9mm; --raise: 6.5mm; \}\n/,
    );
    // Never more than the margin it has.
    expect(printCss(theme("default-priya"), "A4", 4)).toMatch(/margin: [0-9.]+mm 0 [0-9.]+mm;/);
  });

  it("prints a document drawn in another layout than the theme's with that layout's margins", () => {
    // A cover letter is always in a single column: the theme's own density, margins all round, and no --tail.
    const letter = printCss(theme("default-ram"), "A4", 0, "SINGLE");
    expect(letter).toContain(`margin: ${unitsToMm(DENSITIES.COMPACT.paddingY, "A4")}mm ${unitsToMm(DENSITIES.COMPACT.paddingX, "A4")}mm;`);
    expect(letter).not.toContain("--tail");
    expect(printCss(theme("default-priya"), "A4", 0, "SINGLE")).not.toContain("--raise");
  });

  it("converts page units to millimetres", () => {
    expect(unitsToMm(640, "A4")).toBe(210);
    expect(unitsToMm(640, "LETTER")).toBe(215.9);
  });
});

describe("the two-column layout's spacing", () => {
  it("is what its Typst template sets, on A4", () => {
    // 15 mm at the sides, 10 mm above and below, and 9.5 pt text, where a unit is 210 / 640 mm.
    expect(unitsToMm(TWO_COLUMN_DENSITY.paddingX, "A4")).toBeCloseTo(15, 1);
    expect(unitsToMm(TWO_COLUMN_DENSITY.paddingY, "A4")).toBeCloseTo(10, 1);
    expect((TWO_COLUMN_DENSITY.fontSize * 210 * 72) / (640 * 25.4)).toBeCloseTo(9.5, 1);
    expect(layoutDensity("TWO_COLUMN", "AIRY")).toBe(TWO_COLUMN_DENSITY);
    expect(layoutDensity("SINGLE", "AIRY")).toBe(DENSITIES.AIRY);
  });

  it("is tightened for one page without ever loosening a line", () => {
    for (let level = 1; level <= FIT_LEVELS; level++) {
      const squeezed = squeeze(TWO_COLUMN_DENSITY, level);
      expect(squeezed.lineHeight).toBeLessThanOrEqual(TWO_COLUMN_DENSITY.lineHeight);
      expect(squeezed.fontSize).toBeLessThanOrEqual(TWO_COLUMN_DENSITY.fontSize);
      expect(squeezed.gap).toBeLessThan(TWO_COLUMN_DENSITY.gap);
    }
  });
});

describe("squeeze (public issue 69)", () => {
  it("tightens the spacing first, then the line height, then the type, never under the floors", () => {
    const regular = DENSITIES.REGULAR;
    expect(squeeze(regular, 0)).toBe(regular);
    const levels = Array.from({ length: FIT_LEVELS }, (_, index) => squeeze(regular, index + 1));
    expect(levels[0]).toMatchObject({ paddingY: 35, gap: 12, itemGap: 7, lineHeight: regular.lineHeight, fontSize: regular.fontSize });
    expect(levels[1].lineHeight).toBeLessThan(regular.lineHeight);
    expect(levels[1].fontSize).toBe(regular.fontSize);
    expect(levels[2].fontSize).toBeLessThan(regular.fontSize);
    for (let index = 1; index < levels.length; index++) {
      for (const key of ["paddingY", "gap", "itemGap", "lineHeight", "fontSize"] as const) expect(levels[index][key]).toBeLessThanOrEqual(levels[index - 1][key]);
    }
    const tightest = squeeze(DENSITIES.COMPACT, FIT_LEVELS);
    expect(tightest.fontSize).toBeGreaterThanOrEqual(9.25);
    expect(tightest.lineHeight).toBeGreaterThanOrEqual(1.35);
    expect(tightest.paddingY).toBeGreaterThanOrEqual(28);
    expect(squeeze(regular, FIT_LEVELS + 5)).toEqual(squeeze(regular, FIT_LEVELS));
  });

  it("reaches the resolved theme and the print margins", () => {
    const editorial = theme("editorial");
    expect(resolveTheme(editorial, undefined, 2).density.gap).toBeLessThan(resolveTheme(editorial).density.gap);
    expect(printCss(editorial, "A4", 1)).toContain(`margin: ${unitsToMm(35, "A4")}mm`);
    expect(printCss(editorial, "A4")).toContain(`margin: ${unitsToMm(50, "A4")}mm`);
  });
});
