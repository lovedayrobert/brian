import { afterEach, describe, expect, it } from "vitest";
import { allowanceLeft, watchlists } from "./x";
import { parseTrends24, topicCurves } from "./xtrends";

describe("X budget", () => {
  afterEach(() => {
    delete process.env.X_MONTHLY_BUDGET_USD;
  });
  it("spreads the monthly budget evenly across the days", () => {
    process.env.X_MONTHLY_BUDGET_USD = "9";
    const now = new Date("2026-10-20T10:00:00Z"); // October has 31 days
    expect(allowanceLeft(undefined, now)).toBeCloseTo(9 / 31, 5);
    const state = { month: "2026-10", monthUsd: 2, day: "2026-10-20", dayUsd: 0.2, pulls: 1, posts: [] };
    expect(allowanceLeft(state, now)).toBeCloseTo(9 / 31 - 0.2, 5);
    expect(allowanceLeft({ ...state, monthUsd: 9 }, now)).toBe(0); // month used up
    expect(allowanceLeft({ ...state, day: "2026-10-19" }, now)).toBeCloseTo(9 / 31, 5); // new day
  });
  it("reads watchlists", () => {
    expect(watchlists()[0]).toEqual({ name: "rivals", handles: ["Stake", "shufflecom", "Roobet", "rollbit", "bcgame", "rainbetcom"] });
  });
});

describe("X trends", () => {
  const html = `<div class=list-container><h3 class=title data-timestamp=1000>a</h3><ol><li><a href="x" class=trend-link>Alpha</a></li><li><a href="x" class=trend-link>Beta</a></li></ol></div>
  <div class=list-container><h3 class=title data-timestamp=4600>b</h3><ol><li><a href="x" class=trend-link>Beta</a></li><li><a href="x" class=trend-link>Gamma &amp; Co</a></li></ol></div>`;
  it("parses hourly lists in time order and builds curves", () => {
    const hours = parseTrends24(html);
    expect(hours.map((h) => h.topics)).toEqual([["Alpha", "Beta"], ["Beta", "Gamma & Co"]]);
    const c = topicCurves(hours);
    expect(c.get("beta")).toMatchObject({ series: [49, 50], hoursIn: 2, bestRank: 1, nowRank: 1 });
    expect(c.get("alpha")).toMatchObject({ series: [50, 0], nowRank: null });
  });
});
