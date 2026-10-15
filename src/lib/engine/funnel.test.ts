import { describe, expect, it } from "vitest";
import type { Input } from "@/lib/domain/types";
import {
  allocateBudget,
  compareToBaseline,
  computeAllScenarios,
  computeFunnel,
  scaleBudget,
  validateInput,
  type FunnelKey,
} from "./funnel";

const inp = (key: string, unit: Input["unit"], low: number, expected: number, high: number): Input => ({
  key, label: key, unit, low, expected, high, provenance: "assumption", origin: "test",
});

const inputs: Record<FunnelKey, Input> = {
  budget: inp("budget", "usd", 8000, 10000, 12000),
  reach: inp("reach", "count", 500_000, 1_000_000, 2_000_000),
  engagementRate: inp("engagementRate", "ratio", 0.01, 0.02, 0.04),
  clickThroughRate: inp("clickThroughRate", "ratio", 0.002, 0.005, 0.01),
  signupRate: inp("signupRate", "ratio", 0.05, 0.1, 0.15),
  ftdRate: inp("ftdRate", "ratio", 0.2, 0.3, 0.4),
};

describe("computeFunnel", () => {
  it("multiplies through the expected case", () => {
    const r = computeFunnel(inputs, "expected");
    expect(r.reach).toBe(1_000_000);
    expect(r.engagements).toBe(20_000);
    expect(r.visits).toBe(5_000);
    expect(r.signups).toBe(500);
    expect(r.ftds).toBe(150);
    expect(r.costPerFtd).toBeCloseTo(66.67, 2);
  });

  it("uses low volumes and high cost for the pessimistic case", () => {
    const r = computeFunnel(inputs, "pessimistic");
    expect(r.budget).toBe(12000);
    expect(r.visits).toBe(1000);
    expect(r.signups).toBe(50);
    expect(r.ftds).toBe(10);
    expect(r.costPerFtd).toBe(1200);
  });

  it("orders scenarios pessimistic ≤ expected ≤ optimistic on FTDs", () => {
    const [p, e, o] = computeAllScenarios(inputs);
    expect(p.ftds).toBeLessThanOrEqual(e.ftds);
    expect(e.ftds).toBeLessThanOrEqual(o.ftds);
    expect(p.costPerFtd!).toBeGreaterThanOrEqual(e.costPerFtd!);
  });

  it("returns null cost per FTD when no FTDs are forecast", () => {
    const zero = { ...inputs, ftdRate: inp("ftdRate", "ratio", 0, 0, 0) };
    expect(computeFunnel(zero, "expected").costPerFtd).toBeNull();
  });
});

describe("validateInput", () => {
  it("rejects ratios above 1, negatives and unordered ranges", () => {
    expect(() => validateInput(inp("r", "ratio", 0.1, 0.5, 1.2))).toThrow(/ratio/);
    expect(() => validateInput(inp("n", "count", -1, 0, 1))).toThrow(/negative/);
    expect(() => validateInput(inp("o", "count", 5, 3, 10))).toThrow(/low ≤ expected/);
  });
});

describe("compareToBaseline", () => {
  it("returns relative difference to current cost per FTD", () => {
    expect(compareToBaseline(50, 100)).toBe(-0.5);
    expect(compareToBaseline(150, 100)).toBe(0.5);
    expect(compareToBaseline(null, 100)).toBeNull();
  });
});

describe("scaleBudget", () => {
  it("halves budget and shrinks only the paid share of reach", () => {
    const s = scaleBudget(inputs, 0.5, 0.4);
    expect(s.budget.expected).toBe(5000);
    // 60% earned stays, 40% paid halves → 0.8 of reach
    expect(s.reach.expected).toBeCloseTo(800_000);
    expect(s.signupRate).toEqual(inputs.signupRate);
  });

  it("rejects invalid factors", () => {
    expect(() => scaleBudget(inputs, -1, 0.5)).toThrow();
    expect(() => scaleBudget(inputs, 1, 1.5)).toThrow();
  });
});

describe("allocateBudget", () => {
  it("always sums exactly to the total", () => {
    const a = allocateBudget(10_000, { creators: 3, x: 1, telegram: 1 });
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(10_000);
    expect(a.creators).toBe(6000);
  });

  it("handles awkward splits and zero weights", () => {
    const a = allocateBudget(100, { a: 1, b: 1, c: 1, d: 0 });
    expect(Object.values(a).reduce((x, y) => x + y, 0)).toBe(100);
    expect(a.d).toBe(0);
  });

  it("returns zeros when all weights are zero", () => {
    expect(allocateBudget(100, { a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
  });
});
