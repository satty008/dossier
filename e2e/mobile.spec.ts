import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { keepScore, LONG_SCORE, resetData, roomAround, sql } from "./support";

// Dossier on a phone: below 768px the sidebar gives way to a bar of the main
// sections at the bottom of the screen and a menu with the rest, every screen
// fits the width without scrolling sideways, and a tap does what hovering does
// on a computer.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const serious = violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(" ")).join(", ")})`);
  expect(serious).toEqual([]);
}

/** How far the page scrolls sideways: nothing should stick out. */
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

let application = "";
test.beforeAll(async () => {
  await resetData();
  const [ledgerly] = await sql<{ id: string }>(`SELECT id FROM "Application" WHERE company = 'Ledgerly' LIMIT 1`);
  application = `/applications/${ledgerly.id}`;
});

const SCREENS = [
  "/",
  "/applications",
  "/applications?view=table",
  "/new",
  "/profile",
  "/profile?section=skills",
  "/profile?section=experience",
  "/profile/import",
  "/resume",
  "/jobs",
  "/startups",
  "/agent",
  "/inbox",
  "/usage",
  "/settings?section=ai",
  "/settings?section=jobs",
  "/settings?section=scoring",
  "/settings?section=agent",
  "/settings?section=documents",
  "/settings?section=google",
  "/settings?section=data",
  "/settings?section=about",
  "/nowhere",
];

for (const path of SCREENS) {
  test(`fits the width, and is accessible: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await sideways(page)).toBe(0);
    await expectAccessible(page);
  });
}

test("fits the width, and is accessible: an application, on every tab", async ({ page }) => {
  await page.goto(application);
  for (const tab of ["Resume", "Cover letter", "Email", /^Job posting/, /^Notes/]) {
    await page.getByRole("tab", { name: tab }).tap();
    await page.waitForLoadState("networkidle");
    expect(await sideways(page)).toBe(0);
    await expectAccessible(page);
  }
});

// The narrowest phones still in use.
test.describe("320px wide", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of [...SCREENS, "/jobs?view=history"]) {
    test(`fits the width: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await sideways(page)).toBe(0);
    });
  }

  test("fits the width: an application", async ({ page }) => {
    await page.goto(application);
    await page.waitForLoadState("networkidle");
    expect(await sideways(page)).toBe(0);
  });

  // A fixed bar doesn't make the page scroll sideways, so its own tabs are measured.
  test("the bar of sections fits: every tab inside the window, with its whole name", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "Main" }).locator("li > a, li > button");
    await expect(tabs).toHaveCount(5);
    for (const tab of await tabs.all()) {
      const box = (await tab.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320.5);
      expect(await tab.evaluate((element) => element.scrollWidth <= element.clientWidth), await tab.innerText()).toBe(true);
    }
  });
});

test("the main sections are in a bar at the bottom, and the sidebar is gone", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("aside")).toBeHidden();
  const bar = page.getByRole("navigation", { name: "Main" });
  await expect(bar.getByRole("link")).toHaveText(["Dashboard", "Find jobs", "Applications", "Inbox"]);
  await expect(bar.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByRole("button", { name: "Menu" })).toBeVisible();
  // Fixed to the bottom of the window, whatever the page does.
  await page.getByRole("heading", { level: 2, name: "Calendar" }).scrollIntoViewIfNeeded();
  const box = (await bar.boundingBox())!;
  expect(Math.round(box.y + box.height)).toBe(844);
  await expect(page.getByRole("heading", { level: 2, name: "Calendar" })).toBeInViewport();

  await bar.getByRole("link", { name: "Applications" }).tap();
  await expect(page).toHaveURL("/applications");
  await expect(bar.getByRole("link", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page");
});

test("the menu holds the rest, closes by a link, by Escape, and gives focus back", async ({ page }) => {
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Menu" });
  await menuButton.tap();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  for (const name of ["New application", "Profile", "Base resume", "Startups", "Agent", "Usage", "Settings"]) {
    await expect(menu.getByRole("link", { name })).toBeVisible();
  }
  await expect(menu.getByRole("button", { name: "Dark mode" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expectAccessible(page);

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(menuButton).toBeFocused();

  await menuButton.tap();
  await menu.getByRole("link", { name: "Settings" }).tap();
  await expect(page).toHaveURL(/\/settings/);
  await expect(menu).toBeHidden();
  // A section the bar doesn't show: the Menu stands for it.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current", "page");

  // Choosing the page that's already open closes it too.
  await menuButton.tap();
  await menu.getByRole("link", { name: "Settings" }).tap();
  await expect(menu).toBeHidden();
});

test("the menu switches the scheme, and the browser's bar follows", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Menu" }).tap();
  await page.getByRole("dialog", { name: "Menu" }).getByRole("button", { name: /^(Dark|Light) mode$/ }).tap();
  const scheme = await page.locator("html").getAttribute("data-theme");
  expect(scheme).toMatch(/^(light|dark)$/);
  await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", scheme === "dark" ? "#22201d" : "#f4f2ed");
});

test("a long list of sections folds into one row, and choosing one closes it", async ({ page }) => {
  await page.goto("/settings?section=ai");
  const picker = page.getByRole("button", { name: /^Section:/ });
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await expect(picker).toContainText("AI provider");
  await expect(page.getByRole("link", { name: "Documents" })).toBeHidden();

  await picker.tap();
  await expect(picker).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("link", { name: "Documents" }).tap();
  await expect(page).toHaveURL(/section=documents/);
  await expect(page.getByRole("heading", { level: 2, name: "Documents" })).toBeVisible();
  await expect(picker).toContainText("Documents");
  await expect(picker).toHaveAttribute("aria-expanded", "false");

  await page.goto("/profile");
  const profile = page.getByRole("button", { name: /^Section:/ });
  await expect(profile).toContainText("Basics");
  await profile.tap();
  await page.getByRole("navigation", { name: "Profile sections" }).getByRole("link", { name: /^Skills/ }).tap();
  await expect(page).toHaveURL(/section=skills/);
  await expect(profile).toContainText("Skills");
});

test("a tap on a part of a document opens its tools, as hovering does on a computer", async ({ page }) => {
  await page.goto(application);
  await expect(page.getByText("Tap a section to edit or regenerate it")).toBeVisible();
  await expect(page.getByText("Hover a section to edit or regenerate it")).toBeHidden();
  const summary = page.locator('[data-unit="summary"]');
  await summary.scrollIntoViewIfNeeded();
  await summary.tap();
  // Only a toolbar that can be reached can be tapped.
  await summary.getByRole("button", { name: "Edit" }).tap();
  await expect(summary.getByRole("textbox")).toBeVisible();
  await expectAccessible(page);
});

test("the bar of sections gives way to the keyboard while a field is being typed in", async ({ page }) => {
  await page.goto("/new?fresh=1");
  const bar = page.getByRole("navigation", { name: "Main" });
  await expect(bar).toBeVisible();
  await page.getByLabel("Job posting").tap();
  await expect(bar).toBeHidden();
  await page.getByRole("heading", { level: 1 }).tap();
  await page.getByLabel("Job posting").blur();
  await expect(bar).toBeVisible();
});

test("a field's text is 16px, so iOS doesn't zoom the page in when it's tapped", async ({ page }) => {
  await page.goto("/new?fresh=1");
  await expect(page.getByLabel("Job posting")).toHaveCSS("font-size", "16px");
  await page.goto("/jobs");
  await expect(page.getByLabel("What")).toHaveCSS("font-size", "16px");
  await expect(page.getByLabel("Country")).toHaveCSS("font-size", "16px");
});

test("a long score stays in the posting's panel, which ends above the list of postings", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByRole("search", { name: "Search postings" }).getByRole("button", { name: "Search" }).tap();
  const panel = page.locator("section", { has: page.getByRole("region", { name: "Posting text" }) });
  await expect(panel.getByRole("heading", { level: 2, name: "Senior Product Designer, Payments" })).toBeVisible();

  // The longest score there can be, as a model words it; the fake AI's is a line, which never filled the panel.
  await keepScore("e2e-ledgerly", LONG_SCORE);
  try {
    await page.reload();
    await expect(panel.getByText("Good fit · 82 of 100")).toBeVisible();
    const lastWorry = panel.getByText(LONG_SCORE.redFlags[2]);
    const text = panel.getByRole("region", { name: "Posting text" });

    // The panel grows to hold the score, so nothing reaches out of it over the postings below, and the posting's text keeps its room.
    expect(await panel.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0);
    await lastWorry.scrollIntoViewIfNeeded();
    expect((await roomAround(lastWorry, panel)).below).toBeGreaterThanOrEqual(0);
    expect((await text.boundingBox())!.height).toBeGreaterThan(150);
    const [panelBox, listBox] = [(await panel.boundingBox())!, (await page.getByRole("list", { name: "Postings" }).boundingBox())!];
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(listBox.y);
    expect(await sideways(page)).toBe(0);
    await expectAccessible(page);
  } finally {
    await sql(`DELETE FROM "PostingScore"`);
  }
});

test("a computer's window narrowed to a phone's gets the phone's layout, and back", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await expect(page.locator("aside")).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  await page.setViewportSize({ width: 700, height: 800 });
  await expect(page.locator("aside")).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(page.locator("aside")).toBeVisible();
});
