import { describe, expect, it } from "vitest";
import { keywordsFor, mentions } from "./moment-keywords";

describe("moment keywords", () => {
  it("has a proper list for the big moments", () => {
    expect(keywordsFor("Halloween")).toContain("🎃");
  });
  it("falls back to the moment's own words", () => {
    expect(keywordsFor("GTA 6 launch")).toEqual(["gta 6 launch", "gta", "launch"]);
  });
  it("matches whole short words only", () => {
    expect(mentions("Arr matey, treasure ahoy", ["arr"])).toBe(true);
    expect(mentions("We carry on", ["arr"])).toBe(false);
    expect(mentions("Happy HALLOWEEN 🎃", ["halloween"])).toBe(true);
    expect(mentions("spin to win", ["🎃"])).toBe(false);
  });
});
