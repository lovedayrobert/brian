import type { Input } from "@/lib/domain/types";

/**
 * Business-case funnel. Pure arithmetic: models propose inputs (each with a
 * provenance label); this function does every calculation so numbers are
 * reproducible and testable.
 *
 * reach → engagements (engagementRate)
 * reach → visits (clickThroughRate)
 * visits → sign-ups (signupRate)
 * sign-ups → first-time depositors (ftdRate)
 */
export const FUNNEL_KEYS = [
  "budget",
  "reach",
  "engagementRate",
  "clickThroughRate",
  "signupRate",
  "ftdRate",
] as const;
export type FunnelKey = (typeof FUNNEL_KEYS)[number];

export type Scenario = "pessimistic" | "expected" | "optimistic";

export interface FunnelResult {
  scenario: Scenario;
  budget: number;
  reach: number;
  engagements: number;
  visits: number;
  signups: number;
  ftds: number;
  costPerFtd: number | null; // null when no FTDs are forecast
}

export function pickScenario(input: Input, scenario: Scenario, costLike = false): number {
  if (scenario === "expected") return input.expected;
  // For costs, the pessimistic case is the high number; for volumes and rates it is the low one.
  const bad = costLike ? input.high : input.low;
  const good = costLike ? input.low : input.high;
  return scenario === "pessimistic" ? bad : good;
}

export function computeFunnel(inputs: Record<FunnelKey, Input>, scenario: Scenario): FunnelResult {
  for (const key of FUNNEL_KEYS) validateInput(inputs[key]);
  const budget = pickScenario(inputs.budget, scenario, true);
  const reach = pickScenario(inputs.reach, scenario);
  const engagements = reach * pickScenario(inputs.engagementRate, scenario);
  const visits = reach * pickScenario(inputs.clickThroughRate, scenario);
  const signups = visits * pickScenario(inputs.signupRate, scenario);
  const ftds = signups * pickScenario(inputs.ftdRate, scenario);
  return {
    scenario,
    budget,
    reach: Math.round(reach),
    engagements: Math.round(engagements),
    visits: Math.round(visits),
    signups: Math.round(signups),
    ftds: Math.round(ftds),
    costPerFtd: ftds >= 0.5 ? round2(budget / ftds) : null,
  };
}

export function computeAllScenarios(inputs: Record<FunnelKey, Input>): FunnelResult[] {
  return (["pessimistic", "expected", "optimistic"] as const).map((s) => computeFunnel(inputs, s));
}

export function validateInput(input: Input): void {
  if (!input) throw new Error("Missing funnel input");
  const { low, expected, high, unit, key } = input;
  if (![low, expected, high].every(Number.isFinite)) throw new Error(`${key}: values must be finite`);
  if (low < 0) throw new Error(`${key}: values cannot be negative`);
  if (!(low <= expected && expected <= high)) throw new Error(`${key}: needs low ≤ expected ≤ high`);
  if (unit === "ratio" && high > 1) throw new Error(`${key}: a ratio cannot exceed 1`);
}

/** Compare forecast cost per FTD with what we already pay. Negative = cheaper than today. */
export function compareToBaseline(costPerFtd: number | null, baselineCpftd: number): number | null {
  if (costPerFtd === null || baselineCpftd <= 0) return null;
  return round2((costPerFtd - baselineCpftd) / baselineCpftd);
}

/**
 * Scale every budget input proportionally (used by steering: "cut the budget in half").
 * Reach is scaled only for the share that is paid; earned reach does not shrink with spend.
 */
export function scaleBudget(
  inputs: Record<FunnelKey, Input>,
  factor: number,
  paidReachShare: number,
): Record<FunnelKey, Input> {
  if (factor < 0) throw new Error("Budget factor cannot be negative");
  if (paidReachShare < 0 || paidReachShare > 1) throw new Error("Paid reach share must be 0..1");
  const reachFactor = 1 - paidReachShare + paidReachShare * factor;
  const scale = (i: Input, f: number): Input => ({
    ...i,
    low: i.low * f,
    expected: i.expected * f,
    high: i.high * f,
    origin: f === 1 ? i.origin : `${i.origin} (scaled ×${round2(f)} by steering)`,
  });
  return { ...inputs, budget: scale(inputs.budget, factor), reach: scale(inputs.reach, reachFactor) };
}

/** Split a budget across channels by weight, rounding to whole dollars and keeping the total exact. */
export function allocateBudget(total: number, weights: Record<string, number>): Record<string, number> {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const sum = entries.reduce((a, [, w]) => a + w, 0);
  if (sum === 0) return Object.fromEntries(Object.keys(weights).map((k) => [k, 0]));
  const raw = entries.map(([k, w]) => [k, (total * w) / sum] as const);
  const floored = raw.map(([k, v]) => [k, Math.floor(v)] as [string, number]);
  let remainder = Math.round(total) - floored.reduce((a, [, v]) => a + v, 0);
  // Largest remainder method so the parts always sum to the total.
  const order = raw
    .map(([k, v], i) => ({ k, frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  for (const o of order) {
    if (remainder <= 0) break;
    floored[o.i][1] += 1;
    remainder -= 1;
  }
  const out: Record<string, number> = Object.fromEntries(Object.keys(weights).map((k) => [k, 0]));
  for (const [k, v] of floored) out[k] = v;
  return out;
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}
