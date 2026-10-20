import { describe, expect, it } from "vitest";
import { capsFromEnv, checkBudget, spendFromRuns, worstCaseCost } from "./spend";

describe("worstCaseCost", () => {
  it("prices the full output budget and a conservative input estimate", () => {
    // 30,000 chars ≈ 10,000 tokens × $4 + 16,000 × $20 = $0.04 + $0.32
    expect(worstCaseCost({ model: "claude-opus-5-5", inputChars: 30_000, maxOutputTokens: 16_000 })).toBeCloseTo(0.36, 4);
  });

  it("uses the pricier fallback when refusal fallback is on", () => {
    const plain = worstCaseCost({ model: "claude-sonnet-5-5", inputChars: 30_000, maxOutputTokens: 16_000 });
    const withFallback = worstCaseCost({ model: "claude-sonnet-5-5", inputChars: 30_000, maxOutputTokens: 16_000, fallback: true });
    expect(withFallback).toBeGreaterThan(plain);
  });

  it("reserves for every allowed web search", () => {
    const none = worstCaseCost({ model: "claude-sonnet-5-5", inputChars: 3_000, maxOutputTokens: 1_000 });
    const five = worstCaseCost({ model: "claude-sonnet-5-5", inputChars: 3_000, maxOutputTokens: 1_000, searches: 5 });
    expect(five - none).toBeCloseTo(5 * 0.01 + (5 * 25_000 * 2) / 1e6, 4);
  });

  it("treats unknown models at the worst known price", () => {
    expect(worstCaseCost({ model: "mystery", inputChars: 3_000, maxOutputTokens: 1_000 })).toBeGreaterThan(
      worstCaseCost({ model: "claude-opus-5-5", inputChars: 3_000, maxOutputTokens: 1_000 }),
    );
  });
});

describe("checkBudget", () => {
  const caps = { dailyUsd: 10, monthlyUsd: 100 };

  it("allows a call that fits", () => {
    expect(checkBudget({ spentToday: 5, spentThisMonth: 50, reserved: 0 }, 1, caps).ok).toBe(true);
  });

  it("refuses a call that would pass the daily cap", () => {
    const r = checkBudget({ spentToday: 9.5, spentThisMonth: 20, reserved: 0 }, 1, caps);
    expect(r.ok).toBe(false);
  });

  it("counts in-flight reservations so parallel calls can't overshoot", () => {
    expect(checkBudget({ spentToday: 6, spentThisMonth: 20, reserved: 3.5 }, 1, caps).ok).toBe(false);
  });

  it("refuses a call that would pass the monthly cap", () => {
    const r = checkBudget({ spentToday: 0, spentThisMonth: 99.8, reserved: 0 }, 0.5, caps);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Monthly/);
  });

  it("a zero cap stops all AI spend", () => {
    expect(checkBudget({ spentToday: 0, spentThisMonth: 0, reserved: 0 }, 0.01, { dailyUsd: 0, monthlyUsd: 0 }).ok).toBe(false);
  });
});

describe("spendFromRuns", () => {
  it("splits spend by UTC day and month", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    const s = spendFromRuns(
      [
        { startedAt: "2026-10-15T01:00:00Z", costUsd: 1 },
        { startedAt: "2026-10-03T01:00:00Z", costUsd: 2 },
        { startedAt: "2026-09-30T23:00:00Z", costUsd: 50 },
      ],
      now,
    );
    expect(s).toEqual({ spentToday: 1, spentThisMonth: 3 });
  });
});

describe("capsFromEnv", () => {
  it("defaults to $50 a day and $300 a month", () => {
    expect(capsFromEnv({})).toEqual({ dailyUsd: 50, monthlyUsd: 300 });
  });
  it("reads overrides and ignores junk", () => {
    expect(capsFromEnv({ BRIAN_DAILY_CAP_USD: "5", BRIAN_MONTHLY_CAP_USD: "abc" })).toEqual({ dailyUsd: 5, monthlyUsd: 300 });
  });
});

describe("total budget", () => {
  const caps = { dailyUsd: 5, monthlyUsd: 1000, budgetUsd: 20, budgetSince: "2026-10-20" };
  const runs = [
    { startedAt: "2026-10-19", costUsd: 14 }, // before the budget started: doesn't count
    { startedAt: "2026-10-20", costUsd: 3 },
    { startedAt: "2026-10-21", costUsd: 4.5 },
    { startedAt: "2026-10-22", costUsd: 4.5 },
    { startedAt: "2026-10-23", costUsd: 4.5 },
  ];
  it("counts only spend since the start date", () => {
    expect(spendFromRuns(runs, new Date("2026-10-24T09:00:00Z"), "2026-10-20").spentSinceBudget).toBe(16.5);
  });
  it("refuses a call that would pass the budget, even under the daily cap", () => {
    const s = { ...spendFromRuns(runs, new Date("2026-10-24T09:00:00Z"), "2026-10-20"), reserved: 0 };
    expect(checkBudget(s, 3, caps).ok).toBe(true);
    const d = checkBudget(s, 4, caps);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason).toContain("budget of $20");
  });
  it("reads the budget from the environment", () => {
    expect(capsFromEnv({ BRIAN_DAILY_CAP_USD: "5", BRIAN_BUDGET_USD: "20", BRIAN_BUDGET_SINCE: "2026-10-20" })).toMatchObject({ dailyUsd: 5, budgetUsd: 20, budgetSince: "2026-10-20" });
    expect(capsFromEnv({ BRIAN_BUDGET_USD: "20" }).budgetUsd).toBeUndefined(); // needs a start date too
  });
});
