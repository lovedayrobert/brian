import { describe, expect, it } from "vitest";
import { parseCsv, parseDate, pickTabs, rowsToItems } from "./sheet";

describe("CRM sheet parsing", () => {
  it("reads quoted CSV cells with commas, quotes and newlines", () => {
    expect(parseCsv('Date,Campaign\n16/10/2026,"Welcome, part ""2"""\r\n17/10/2026,Plain\n')).toEqual([
      ["Date", "Campaign"],
      ["16/10/2026", 'Welcome, part "2"'],
      ["17/10/2026", "Plain"],
    ]);
  });
  it("reads dates as day/month by default and rejects impossible ones", () => {
    expect(parseDate("03/11/2026")).toBe("2026-11-03");
    expect(parseDate("2026-11-03")).toBe("2026-11-03");
    expect(parseDate("Tue 3 Nov 2026")).toBe("2026-11-03");
    expect(parseDate("Nov 3, 2026")).toBe("2026-11-03");
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("soon")).toBeNull();
  });
});



describe("CRM sheet rows", () => {
  const rows = [
    ["", "", "WORLD", "CAMPAIGN DETAILS"],
    ["Date", "Day", "Events", "Campaign Name", "Description", "Game", "Segment", "NL", "Onsite", "Push", "Blog", "AFF", "SM"],
    ["2026-11-06", "Fri", "", "Cashback Weekend", "25% cashback", "", "VIP", "x", "x", "x", "x", "", "x"],
    ["", "", "", "Push notification", "Reminder", "", "", "", "", "x", "", "", ""],
    ["", "", "", "Follow-up post", "", "", "", "", "", "", "", "", "x"],
    ["2026-11-07", "Sat", "", "Monday Reload", "50%", "", "", "x", "", "", "", "", ""],
  ];
  it("keeps only rows ticked in SM, carrying the date down", () => {
    const { items } = rowsToItems(rows, "NOVEMBER 2026", "t");
    expect(items.map((i) => [i.date, i.title])).toEqual([
      ["2026-11-06", "Cashback Weekend"],
      ["2026-11-06", "Follow-up post"],
    ]);
    expect(items[0].needsSocial).toBe(true);
    expect(items[0].notes).toContain("**Channels:** NL, Onsite, Push, Blog, SM");
    expect(items[0].notes).toContain("**Segment:** VIP");
  });
  it("reads month tabs from last month to three months ahead", () => {
    const now = new Date("2026-10-19T00:00:00Z");
    expect(pickTabs(["Major Dates", "AUGUST 2026", "SEPTEMBER 2026", "OCTOBER 2026", "JANUARY 2027", "FEBRUARY 2027"], now)).toEqual(["SEPTEMBER 2026", "OCTOBER 2026", "JANUARY 2027"]);
  });
});
