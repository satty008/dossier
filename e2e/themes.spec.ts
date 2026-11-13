import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { portraitPng, resetData, sql } from "./support";

// Managing themes (E5-7): duplicate, export, delete and import again.
test.beforeAll(resetData);

test("duplicates, exports, deletes and imports a theme", async ({ page }) => {
  await page.goto("/resume");
  const inUse = page.getByText(/^In use:/);
  const original = (await inUse.textContent())!.replace("In use: ", "");

  await page.getByRole("button", { name: `Duplicate ${original}` }).click();
  await expect(inUse).toHaveText(`In use: ${original} copy`);

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: `Export ${original} copy` }).click()]);
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported).toMatchObject({
    format: "dossier-theme",
    version: 3,
    theme: {
      name: `${original} copy`,
      headerStyle: expect.any(String),
      sidebarStyle: expect.any(String),
      dateStyle: expect.any(String),
      photoShape: expect.any(String),
      photoPosition: expect.any(String),
    },
  });

  await page.getByRole("button", { name: `Delete ${original} copy…` }).click();
  const dialog = page.getByRole("alertdialog", { name: `Delete “${original} copy”?` });
  await expect(dialog).toContainText("No application uses it.");
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  await dialog.getByRole("button", { name: "Delete theme" }).click();
  await expect(inUse).toHaveText("In use: Editorial");
  await expect(page.getByRole("button", { name: `${original} copy theme` })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Editorial theme, in use" })).toBeFocused();

  await page.locator("input[type=file][accept*=json]").setInputFiles({
    name: "theme.dossier-theme.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(inUse).toHaveText(`In use: ${original} copy`);
  await page.reload();
  await expect(page.getByRole("button", { name: `${original} copy theme, in use` })).toBeVisible();
});

// A theme for one application (#226, public issue 10): its resume and cover
// letter change together, in the preview and the PDF.
test("changes an application's theme from its Resume tab", async ({ page }) => {
  const [ledgerly] = await sql<{ id: string }>(`SELECT id FROM "Application" WHERE company = 'Ledgerly' LIMIT 1`);
  const pdf = async () => (await (await page.request.get(`/api/pdf?doc=resume&application=${ledgerly.id}`)).body()).toString("latin1");
  expect(await pdf()).not.toContain("Garamond");

  await page.goto(`/applications/${ledgerly.id}`);
  await page.getByRole("button", { name: "Editorial theme" }).click();
  await page.getByRole("menuitemradio", { name: "Classic" }).click();
  await expect(page.getByRole("button", { name: "Classic theme" })).toBeVisible();
  const name = page.getByRole("article", { name: "Resume" }).getByRole("heading", { level: 1 });
  await expect(name).toHaveCSS("font-family", /Garamond/);

  await page.reload();
  await page.getByRole("tab", { name: "Cover letter" }).click();
  await expect(page.getByRole("button", { name: "Classic theme" })).toBeVisible();
  const documents = await sql(`SELECT kind, "themeId" FROM "Document" WHERE "applicationId" = $1 AND kind <> 'EMAIL' ORDER BY kind`, [ledgerly.id]);
  expect(documents).toEqual([
    { kind: "RESUME", themeId: "classic" },
    { kind: "COVER_LETTER", themeId: "classic" },
  ]);
  expect(await pdf()).toContain("Garamond");
});

// Chromium can't embed a variable font in a PDF and draws its glyphs as Type 3
// outlines instead, which other viewers and parsers misread (public issues 64
// and 67): every theme font is a static face, and a synthesised weight would
// bring Type 3 back too, so each built-in theme's PDF is checked for it.
test("prints every built-in theme with real, embedded text, never Type 3 fonts", async ({ page }) => {
  const themes = await sql<{ id: string }>(`SELECT id FROM "Theme" WHERE "builtIn" ORDER BY id`);
  expect(themes.length).toBeGreaterThanOrEqual(14);
  for (const { id } of themes) {
    await sql(`INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('baseThemeId', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, [id]);
    const response = await page.request.get("/api/pdf?doc=base");
    expect(response.ok(), id).toBe(true);
    const pdf = (await response.body()).toString("latin1");
    expect(pdf, `${id}: a Type 3 font`).not.toMatch(/\/Type3\b/);
    expect(pdf, `${id}: no embedded TrueType`).toMatch(/\/CIDFontType2\b/);
  }
  await sql(`UPDATE "Setting" SET value = 'editorial' WHERE key = 'baseThemeId'`);
});

// The Ram and Priya themes, which follow the modern-cv Typst templates, bring their own fonts.
for (const [id, name] of [["default-ram", "Ram"], ["default-priya", "Priya"]]) {
  test(`prints the ${name} theme in Source Sans and Roboto`, async ({ page }) => {
    await sql(`INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('baseThemeId', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, [id]);
    try {
      const response = await page.request.get("/api/pdf?doc=base");
      expect(response.ok()).toBe(true);
      const pdf = (await response.body()).toString("latin1");
      expect(pdf).toMatch(/SourceSans3-Bold/);
      expect(pdf).toMatch(/Roboto-Thin/);
      expect(pdf).not.toMatch(/\/Type3\b/);
    } finally {
      await sql(`UPDATE "Setting" SET value = 'editorial' WHERE key = 'baseThemeId'`);
    }
  });
}

// Their photo is in the top corner, a little into the margin (Priya's also up into the top one), and in the PDF.
for (const [id, name] of [["default-ram", "Ram"], ["default-priya", "Priya"]]) {
  test(`puts the ${name} theme's photo in the corner, over the margin, in the preview and the PDF`, async ({ page }) => {
    await photoInTheCorner(page, id);
  });
}

async function photoInTheCorner(page: Page, id: string) {
  const photo = `data:image/png;base64,${portraitPng().toString("base64")}`;
  await sql(`INSERT INTO "ProfileField" (key, value, "updatedAt") VALUES ('photo', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, [photo]);
  await sql(`INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('baseThemeId', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, [id]);
  try {
    await page.goto("/resume");
    const resume = page.getByRole("article", { name: "Resume" });
    await expect(resume).toHaveClass(/twoColumn/);
    const image = resume.getByRole("img", { name: "Jane Doe" });
    await expect(image).toBeVisible();
    expect(await image.evaluate((element) => getComputedStyle(element).position)).toBe("absolute");
    const box = (await image.boundingBox())!;
    // 3 × 3.8 cm, reaching past the right end of the section titles' rules.
    expect(box.height / box.width).toBeCloseTo(3.8 / 3, 1);
    const rule = (await resume.getByRole("heading", { level: 2 }).first().boundingBox())!;
    expect(box.x + box.width).toBeGreaterThan(rule.x + rule.width + 1);
    expect((await (await page.request.get("/api/pdf?doc=base")).body()).toString("latin1")).toContain("/Subtype /Image");
  } finally {
    await sql(`DELETE FROM "ProfileField" WHERE key = 'photo'`);
    await sql(`UPDATE "Setting" SET value = 'editorial' WHERE key = 'baseThemeId'`);
  }
}

// Ram's and Priya's formats are the two defaults to choose from: Settings → Documents sets the base theme, like Resume → Themes.
test("chooses the default resume format in Settings → Documents", async ({ page }) => {
  const saved = () => sql<{ value: string }>(`SELECT value FROM "Setting" WHERE key = 'baseThemeId'`).then((rows) => rows[0]?.value);
  try {
    await page.goto("/settings?section=documents");
    const format = page.getByLabel("Default resume format");
    await expect(format).toHaveValue("editorial");
    expect(await format.locator("option").allTextContents()).toEqual(expect.arrayContaining(["Ram", "Priya"]));

    await format.selectOption({ label: "Priya" });
    await expect.poll(saved).toBe("default-priya");
    await page.goto("/resume");
    await expect(page.getByRole("article", { name: "Resume" })).toHaveClass(/twoColumnCompact/);
    await expect(page.getByText(/^In use:/)).toHaveText("In use: Priya");

    // Resume → Themes sets the same choice, and Settings shows it.
    await page.getByRole("button", { name: "Ram theme" }).click();
    await expect.poll(saved).toBe("default-ram");
    await page.goto("/settings?section=documents");
    await expect(page.getByLabel("Default resume format")).toHaveValue("default-ram");
  } finally {
    await sql(`UPDATE "Setting" SET value = 'editorial' WHERE key = 'baseThemeId'`);
  }
});

// Date of birth, driving licence and residence status are optional: under the header of the two-column formats once filled in
// (Priya's puts the residence status after the place, as her template does), and with the contact details of the others.
test("lists the personal details a profile has, as the format has them", async ({ page }) => {
  const personal = { dob: "1989-11-08", showDob: "true", license: "Class B", residence: "Permanent residence" };
  for (const [key, value] of Object.entries(personal)) {
    await sql(`INSERT INTO "ProfileField" (key, value, "updatedAt") VALUES ($1, $2, now()) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, value]);
  }
  const setTheme = (id: string) => sql(`INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('baseThemeId', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1`, [id]);
  try {
    await setTheme("default-ram");
    await page.goto("/resume");
    const resume = page.getByRole("article", { name: "Resume" });
    await expect(resume.getByText("Date of birth: Nov 8, 1989")).toBeVisible();
    await expect(resume.getByText("Driving licence: Class B")).toBeVisible();
    await expect(resume.getByText("Residence status: Permanent residence")).toBeVisible();

    await setTheme("default-priya");
    await page.goto("/resume");
    await expect(resume.getByText("Date of birth: Nov 8, 1989")).toBeVisible();
    await expect(resume.getByText("Residence status:")).toHaveCount(0);
    await expect(resume.getByText(/· Permanent residence$/)).toBeVisible();

    await setTheme("editorial");
    await page.goto("/resume");
    await expect(resume.getByText(/Driving licence: Class B/)).toBeVisible();
  } finally {
    await sql(`DELETE FROM "ProfileField" WHERE key = ANY($1)`, [Object.keys(personal)]);
    await sql(`UPDATE "Setting" SET value = 'editorial' WHERE key = 'baseThemeId'`);
  }
});
