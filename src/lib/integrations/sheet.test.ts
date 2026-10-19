import { describe, expect, it } from "vitest";
import { parseCsv, parseDate } from "./sheet";

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
