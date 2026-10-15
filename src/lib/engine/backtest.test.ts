import { describe, expect, it } from "vitest";
import { backtest, isCorrect } from "./backtest";

describe("isCorrect", () => {
  it("scores rising calls on future growth", () => {
    expect(isCorrect("rising", 100, [105, 115, 120])).toBe(true);
    expect(isCorrect("rising", 100, [90, 95, 100])).toBe(false);
  });
  it("scores declining calls on a falling average", () => {
    expect(isCorrect("declining", 100, [80, 70, 60])).toBe(true);
    expect(isCorrect("declining", 100, [120, 130, 140])).toBe(false);
  });
  it("scores peaking calls on no big further growth", () => {
    expect(isCorrect("peaking", 100, [110, 120, 100])).toBe(true);
    expect(isCorrect("peaking", 100, [150, 200, 250])).toBe(false);
  });
});

describe("backtest", () => {
  it("never looks ahead and counts calls correctly", () => {
    const flat = Array.from({ length: 60 }, () => 1000);
    const r = backtest([flat], { minHistory: 21, horizon: 14 });
    // days 21..45 inclusive = 25 calls
    expect(r.overall.calls).toBe(25);
    expect(r.series).toBe(1);
  });

  it("does well on a clean rise-and-fall curve", () => {
    const curve = Array.from({ length: 90 }, (_, i) => Math.round(1000 + 9000 * Math.exp(-(((i - 45) / 10) ** 2))));
    const r = backtest([curve]);
    expect(r.overall.accuracy).toBeGreaterThan(0.6);
  });
});
