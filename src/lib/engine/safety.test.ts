import { describe, expect, it } from "vitest";
import { assessSensitivity } from "./safety";
import { classify, overlap, tokens } from "./relevance";
import { SOURCES, RADAR_COSTS, presetMonthly, sumCosts } from "@/lib/config/sources";

describe("assessSensitivity", () => {
  it("blocks tragedies", () => {
    expect(assessSensitivity("Earthquake hits coastal city").level).toBe("blocked");
    expect(assessSensitivity("Gunman opens fire at mall").level).toBe("blocked");
  });

  it("blocks biographies that end this year", () => {
    const y = new Date().getUTCFullYear();
    expect(assessSensitivity("Some Singer", `American singer (1950–${y})`).level).toBe("blocked");
    expect(assessSensitivity("Some Singer", "American singer (born 1990)").level).toBe("clear");
  });

  it("flags caution topics without blocking", () => {
    const r = assessSensitivity("Exchange drained in $40m exploit");
    expect(r.level).toBe("caution");
  });

  it("clears ordinary culture", () => {
    expect(assessSensitivity("GTA 6 trailer breaks YouTube record").level).toBe("clear");
  });
});

describe("classify", () => {
  it("scores crypto-gambling crossover as highly relevant", () => {
    const r = classify("Bitcoin casino streamer on Kick");
    expect(r.relevance).toBeGreaterThan(0.9);
    expect(r.matched).toEqual(expect.arrayContaining(["crypto", "gambling", "streaming"]));
  });

  it("gives unrelated topics low relevance", () => {
    expect(classify("Medieval architecture of Lisbon").relevance).toBeLessThan(0.3);
  });
});

describe("overlap", () => {
  it("links the same story across sources", () => {
    expect(overlap(tokens("GTA 6 trailer three released"), tokens("Rockstar GTA trailer three"))).toBeGreaterThan(0.5);
  });
});

describe("cost totals", () => {
  it("sums ranges and keeps low ≤ high", () => {
    const total = sumCosts([...SOURCES, ...RADAR_COSTS]);
    expect(total.low).toBeLessThanOrEqual(total.high);
    for (const s of SOURCES) expect(s.monthlyCost.low).toBeLessThanOrEqual(s.monthlyCost.high);
  });
});

describe("presets", () => {
  it("cost more as coverage grows", () => {
    const lean = presetMonthly("lean");
    const standard = presetMonthly("standard");
    const full = presetMonthly("full");
    expect(lean.high).toBeLessThanOrEqual(standard.high);
    expect(standard.high).toBeLessThanOrEqual(full.high);
  });
  it("prices Lean as radar costs plus X Basic", () => {
    const radar = sumCosts(RADAR_COSTS);
    expect(presetMonthly("lean")).toEqual({ low: radar.low + 200, high: radar.high + 200 });
  });
});

import { parseTraffic } from "@/lib/adapters/sources/googletrends";
describe("parseTraffic", () => {
  it("reads Google's approximate volumes", () => {
    expect(parseTraffic("100+")).toBe(100);
    expect(parseTraffic("2K+")).toBe(2000);
    expect(parseTraffic("1M+")).toBe(1_000_000);
    expect(parseTraffic("50,000+")).toBe(50000);
    expect(parseTraffic(undefined)).toBe(0);
  });
});

import { trenchScore, isDying } from "@/lib/adapters/sources/trenches";
import { coinWords } from "@/lib/pipeline/sweep";
describe("trenches", () => {
  it("ranks recent activity above stale 24h volume", () => {
    const fresh = trenchScore({ volume1h: 200_000, volume6h: 600_000, buyers1h: 900, buyers24h: 3000 });
    const stale = trenchScore({ volume1h: 1_000, volume6h: 5_000, buyers1h: 3, buyers24h: 9000 });
    expect(fresh).toBeGreaterThan(stale);
  });
  it("drops coins that have collapsed or gone quiet", () => {
    expect(isDying({ change24h: -99, buyers1h: 50, volume1h: 10_000 })).toBe(true);
    expect(isDying({ change24h: 40, buyers1h: 0, volume1h: 10_000 })).toBe(true);
    expect(isDying({ change24h: 40, buyers1h: 80, volume1h: 20_000 })).toBe(false);
  });
  it("matches coins on distinctive words only", () => {
    expect([...coinWords("Humphrey Reserve")]).toEqual(["humphrey", "reserve"]);
    expect(coinWords("Baby Pepe Coin").size).toBe(0);
  });
});

import { classifyCoinHeuristic } from "@/lib/pipeline/narratives";
describe("classifyCoinHeuristic", () => {
  it("separates culture coins from AI, utility and generic launches", () => {
    expect(classifyCoinHeuristic("DGrid AI").kind).toBe("utility");
    expect(classifyCoinHeuristic("Catapult Trade").kind).toBe("utility");
    expect(classifyCoinHeuristic("Baby Doge").kind).toBe("generic");
    expect(classifyCoinHeuristic("Tip Toe In My Jordans").kind).toBe("culture");
  });
});
