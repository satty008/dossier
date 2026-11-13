import { describe, expect, it } from "vitest";

import { LanguageLevel } from "@/generated/prisma/enums";

import { DOCUMENT_LANGUAGES } from "./document-language";
import {
  ageOn,
  BASICS_FIELDS,
  basicsFromFields,
  byStartDateDesc,
  inEntryOrder,
  fieldsFromBasics,
  filledBasics,
  formatBirthDate,
  formatDateRange,
  formatMonthYear,
  LANGUAGE_LEVELS,
  languageLevelLabel,
  profileStrength,
  type DateSpan,
} from "./profile";

const span = (overrides: Partial<DateSpan>): DateSpan => ({
  startYear: null,
  startMonth: null,
  endYear: null,
  endMonth: null,
  current: false,
  ...overrides,
});

describe("language levels", () => {
  it("lists every level with the prototype's labels, Native first", () => {
    expect(LANGUAGE_LEVELS.map((level) => level.label)).toEqual([
      "Native",
      "Fluent (C2)",
      "Advanced (C1)",
      "Upper intermediate (B2)",
      "Intermediate (B1)",
      "Elementary (A2)",
      "Beginner (A1)",
    ]);
    expect(LANGUAGE_LEVELS).toHaveLength(Object.keys(LanguageLevel).length);
    expect(languageLevelLabel(LanguageLevel.B1)).toBe("Intermediate (B1)");
  });
});

describe("dates", () => {
  it("formats a month and year, a year, or nothing", () => {
    expect(formatMonthYear(2021, 3)).toBe("Mar 2021");
    expect(formatMonthYear(2015, 9)).toBe("Sep 2015");
    expect(formatMonthYear(2013, null)).toBe("2013");
    expect(formatMonthYear(null, 5)).toBe("");
  });

  it("formats ranges as in the prototype", () => {
    expect(formatDateRange(span({ startYear: 2021, startMonth: 3, current: true }))).toBe(
      "Mar 2021 – Present",
    );
    expect(
      formatDateRange(span({ startYear: 2015, startMonth: 9, endYear: 2018, endMonth: 5 })),
    ).toBe("Sep 2015 – May 2018");
    expect(formatDateRange(span({ startYear: 2013, endYear: 2015 }))).toBe("2013 – 2015");
    expect(formatDateRange(span({ startYear: 2013 }))).toBe("2013");
    expect(formatDateRange(span({}))).toBe("");
  });

  it("uses the current flag instead of an end date", () => {
    expect(formatDateRange(span({ startYear: 2021, endYear: 2022, current: true }))).toBe(
      "2021 – Present",
    );
  });

  it("formats month names and 'Present' in the document's language", () => {
    expect(
      formatDateRange(span({ startYear: 2021, startMonth: 3, current: true }), {
        locale: "de",
        present: "heute",
      }),
    ).toBe("März 2021 – heute");
  });

  it("writes dates in the locale's own order and digits, in the Gregorian calendar", () => {
    expect(formatDateRange(span({ startYear: 2019, startMonth: 9, endYear: 2021, endMonth: 3 }), { locale: "ja" })).toBe("2019年9月 – 2021年3月");
    expect(formatDateRange(span({ startYear: 2013, endYear: 2015 }), { locale: "zh-Hans" })).toBe("2013年 – 2015年");
    // Persian's own calendar would make September 2021 "Shahrivar 1400".
    expect(formatMonthYear(2021, 9, { locale: "fa" })).toBe("سپتامبر ۲۰۲۱");
  });

  it("orders entries newest first, then by sort, with undated ones last", () => {
    const entries = [
      { id: "fieldnote", ...span({ startYear: 2018, startMonth: 6 }), sort: 0 },
      { id: "undated", ...span({}), sort: 0 },
      { id: "northwind", ...span({ startYear: 2021, startMonth: 3, current: true }), sort: 2 },
      { id: "brik", ...span({ startYear: 2015, startMonth: 9 }), sort: 0 },
      { id: "same-year", ...span({ startYear: 2021, startMonth: 3 }), sort: 1 },
    ];
    expect(entries.sort(byStartDateDesc).map((entry) => entry.id)).toEqual([
      "same-year",
      "northwind",
      "fieldnote",
      "brik",
      "undated",
    ]);
  });
});

describe("basics", () => {
  const empty = {
    name: "", headline: "", email: "", phone: "", dob: "", website: "",
    address: "", city: "", country: "", linkedin: "", license: "", residence: "", summary: "",
  };

  it("counts filled required fields, ignoring whitespace", () => {
    expect(BASICS_FIELDS).toHaveLength(13);
    expect(filledBasics(empty)).toBe(0);
    expect(filledBasics({ ...empty, name: "Jane", email: "jane.doe@example.com", city: "  " })).toBe(2);
  });

  it("computes the age from the date of birth", () => {
    const today = new Date(2026, 8, 28); // 28 September 2026, local time
    expect(ageOn("1992-04-18", today)).toBe(34);
    expect(ageOn("1992-09-28", today)).toBe(34); // birthday today
    expect(ageOn("1992-09-29", today)).toBe(33); // birthday tomorrow
    expect(ageOn("", today)).toBeNull();
    expect(ageOn("2030-01-01", today)).toBeNull();
  });
});

describe("numeric dates", () => {
  const span = { startYear: 2023, startMonth: 3, endYear: 2026, endMonth: 8, current: false };
  const ongoing = { startYear: 2023, startMonth: 3, endYear: null, endMonth: null, current: true };

  it("write the month as two digits and keep a year alone", () => {
    expect(formatMonthYear(2021, 3, { numeric: true })).toBe("03/2021");
    expect(formatMonthYear(2021, 11, { numeric: true })).toBe("11/2021");
    expect(formatMonthYear(2013, null, { numeric: true })).toBe("2013");
    expect(formatMonthYear(null, 3, { numeric: true })).toBe("");
    expect(formatDateRange(span, { numeric: true })).toBe("03/2023 – 08/2026");
    expect(formatDateRange(ongoing, { numeric: true, present: "heute" })).toBe("03/2023 – heute");
  });

  it("separate them with a dot in German, as dates are written there (08.11.1989, 03.2021)", () => {
    for (const locale of ["de", "de-AT", "de-CH"]) {
      expect(formatMonthYear(2021, 3, { numeric: true, locale }), locale).toBe("03.2021");
    }
    expect(formatMonthYear(2021, 11, { numeric: true, locale: "de" })).toBe("11.2021");
    expect(formatMonthYear(2013, null, { numeric: true, locale: "de" })).toBe("2013");
    expect(formatDateRange(span, { numeric: true, locale: "de" })).toBe("03.2023 – 08.2026");
    expect(formatDateRange(ongoing, { numeric: true, locale: "de", present: "heute" })).toBe("03.2023 – heute");
    // The same way as the date of birth it goes with.
    expect(formatBirthDate("1989-11-08", { locale: "de" })).toBe("08.11.1989");
  });

  it("follow each language's own numeric dates, in its order and its digits", () => {
    const written: Record<string, string> = {
      en: "03/2021",
      fr: "03/2021",
      nl: "03-2021",
      pl: "03.2021",
      no: "03.2021",
      cs: "03. 2021",
      sv: "2021-03",
      ja: "2021/03",
      "zh-Hans": "2021/03",
      ko: "2021. 03.",
      fa: "۲۰۲۱/۰۳",
    };
    for (const [locale, expected] of Object.entries(written)) {
      expect(formatMonthYear(2021, 3, { numeric: true, locale }), locale).toBe(expected);
    }
  });

  it("are only digits and separators, with the month and the year, in every document language", () => {
    for (const { name, tag } of DOCUMENT_LANGUAGES) {
      const digits = new Intl.NumberFormat(tag, { useGrouping: false });
      const written = formatMonthYear(2021, 3, { numeric: true, locale: tag });
      expect(written, name).toContain(digits.format(2021));
      expect(written, name).toContain(new Intl.NumberFormat(tag, { minimumIntegerDigits: 2, useGrouping: false }).format(3));
      expect(written, name).not.toMatch(/\p{L}/u);
      expect(written, name).toBe(written.trim());
    }
  });
});

describe("formatBirthDate", () => {
  it("writes the date in the locale's order and digits", () => {
    expect(formatBirthDate("1989-11-08", { locale: "de" })).toBe("08.11.1989");
    expect(formatBirthDate("1989-11-08")).toBe("Nov 8, 1989");
    // Gregorian, in Persian digits, not the Persian calendar's 1368.
    expect(formatBirthDate("1989-11-08", { locale: "fa" })).toContain("۱۹۸۹");
  });

  it("leaves out a date that isn't one", () => {
    expect(formatBirthDate("")).toBe("");
    expect(formatBirthDate("1989-02-30")).toBe("");
    expect(formatBirthDate("89-11-08")).toBe("");
    expect(formatBirthDate("0089-11-08")).toBe("");
  });
});

describe("profile strength", () => {
  const basics = Object.fromEntries(BASICS_FIELDS.map((field) => [field, ""])) as Record<(typeof BASICS_FIELDS)[number], string>;
  const none = { basics, experience: 0, education: 0, skills: 0 };
  const required = { ...basics, name: "L", headline: "h", email: "e", city: "c", country: "n", summary: "s" };

  it("weighs the required basics 40, experience 30, education 15 and skills 15", () => {
    expect(profileStrength(none).percent).toBe(0);
    expect(profileStrength({ ...none, experience: 1 }).percent).toBe(30);
    expect(profileStrength({ ...none, basics: required, experience: 3, education: 2, skills: 7 }).percent).toBe(100);
    // 4 of 6 required basics = 26.7 → 27, plus skills 15
    expect(profileStrength({ ...none, basics: { ...basics, name: "L", email: "e", city: "c", summary: "s" }, skills: 1 }).percent).toBe(42);
  });

  it("leaves out the optional basics (#216)", () => {
    const optional = { ...basics, phone: "p", dob: "1992-04-18", website: "w", address: "a", linkedin: "l", license: "B", residence: "r" };
    expect(profileStrength({ ...none, basics: optional }).percent).toBe(0);
    expect(filledBasics(optional)).toBe(0);
  });

  it("encourages at every level", () => {
    expect(profileStrength(none).hint).toBe("A good start. Experience matters most.");
    expect(profileStrength({ ...none, basics: required, experience: 1 }).hint).toBe(
      "Nice progress. A bit more detail makes tailoring sharper.",
    );
    expect(profileStrength({ ...none, basics: { ...required, summary: "" }, experience: 1, education: 1, skills: 1 }).percent).toBe(93);
    expect(profileStrength({ ...none, basics: { ...required, summary: "" }, experience: 1, education: 1, skills: 1 }).hint).toBe(
      "Looking great. The AI has plenty to work with.",
    );
    expect(profileStrength({ ...none, basics: required, experience: 1, education: 1, skills: 1 }).hint).toBe(
      "All set. The optional sections are there if they help.",
    );
  });
});

describe("stored basics", () => {
  const basics = {
    ...(Object.fromEntries(BASICS_FIELDS.map((field) => [field, ""])) as Record<(typeof BASICS_FIELDS)[number], string>),
    name: "Jane Doe",
    dob: "1992-04-18",
    license: "Class B",
    showAge: true,
    showDob: true,
  };

  it("stores filled-in fields as text and marks empty ones for removal", () => {
    expect(fieldsFromBasics(basics)).toMatchObject({ name: "Jane Doe", dob: "1992-04-18", license: "Class B", showAge: "true", showDob: "true", email: null, residence: null });
    expect(fieldsFromBasics({ ...basics, showAge: false }).showAge).toBeNull();
    expect(fieldsFromBasics({ ...basics, showDob: false }).showDob).toBeNull();
  });

  it("reads them back, with missing keys empty and unknown ones ignored", () => {
    const rows = Object.entries(fieldsFromBasics(basics)).flatMap(([key, value]) => (value === null ? [] : [{ key, value }]));
    expect(basicsFromFields(rows)).toEqual(basics);
    expect(basicsFromFields([{ key: "nickname", value: "Lee" }])).toEqual({ ...basics, name: "", dob: "", license: "", showAge: false, showDob: false });
  });
});

describe("inEntryOrder (E4-9)", () => {
  const entry = (id: string, startYear: number | null, sort: number) => ({ id, startYear, startMonth: null, endYear: null, endMonth: null, current: false, sort });
  const entries = [entry("old", 2015, 0), entry("undated", null, 1), entry("new", 2021, 2)];

  it("orders by date, or by the order set by hand, without changing the input", () => {
    expect(inEntryOrder(entries, "date").map((e) => e.id)).toEqual(["new", "old", "undated"]);
    expect(inEntryOrder(entries, "manual").map((e) => e.id)).toEqual(["old", "undated", "new"]);
    expect(entries.map((e) => e.id)).toEqual(["old", "undated", "new"]);
  });
});

