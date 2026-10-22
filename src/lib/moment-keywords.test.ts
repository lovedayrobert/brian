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

import { distinctiveWords, teamKeywords } from "./moment-keywords";

describe("spotting words nobody listed", () => {
  it("finds words that suddenly appear around the moment", () => {
    const window = ["Stakeoween is here 🦇 spin now", "Stakeoween drop two 🦇", "Stakeoween finale tonight", "Weekly raffle results"];
    const before = ["Weekly raffle results", "New slot live now", "Weekly raffle results again"];
    const found = distinctiveWords(window, before, ["halloween"]);
    expect(found).toContain("stakeoween");
    expect(found).toContain("🦇");
    expect(found).not.toContain("weekly");
  });
  it("leaves out words already on the list and generic ones", () => {
    expect(distinctiveWords(["halloween giveaway", "halloween giveaway"], [], ["halloween"])).toEqual([]);
  });
  it("applies the team's edits", () => {
    const k = teamKeywords("Halloween", { added: ["stakeoween"], removed: ["trick"] });
    expect(k).toContain("stakeoween");
    expect(k).not.toContain("trick");
  });
  it("ignores everyday emoji", () => {
    expect(distinctiveWords(["done ✅ 🦇", "again ✅ 🦇"], ["nothing here"])).toEqual(["🦇"]);
  });
});
