import type { LifecycleStage } from "@/lib/domain/types";
import { assessLifecycle } from "./lifecycle";

/**
 * Walk-forward backtest for the lifecycle forecaster. On each day the stage is
 * computed from the trailing window only (no look-ahead), then scored against
 * the next `horizon` days:
 *  - emerging / rising: correct if attention grows ≥10% above today at some point
 *  - declining: correct if the coming average is below today
 *  - peaking / saturated: correct if attention does not grow more than 30%
 * A naive momentum baseline is scored on the same days for comparison.
 */
export interface BacktestResult {
  ranAt: string;
  series: number;
  days: number;
  overall: { calls: number; accuracy: number };
  byStage: { stage: LifecycleStage; calls: number; accuracy: number }[];
  baseline: number;
  /** The calls that matter for first-mover timing: emerging or rising. */
  launchWindow: { calls: number; precision: number; baselineCalls: number; baselinePrecision: number };
}

export function isCorrect(stage: LifecycleStage, current: number, future: number[]): boolean {
  const max = Math.max(...future);
  const avg = future.reduce((a, b) => a + b, 0) / future.length;
  switch (stage) {
    case "emerging":
    case "rising":
      return max >= current * 1.1;
    case "declining":
      return avg < current;
    case "peaking":
    case "saturated":
      return max <= current * 1.3;
  }
}

export function backtest(seriesList: number[][], opts: { window?: number; horizon?: number; minHistory?: number; step?: number } = {}): Omit<BacktestResult, "ranAt"> {
  const window = opts.window ?? 30;
  const horizon = opts.horizon ?? 14;
  const minHistory = opts.minHistory ?? 21;
  const step = opts.step ?? 1;
  const tally = new Map<LifecycleStage, { calls: number; right: number }>();
  let baseRight = 0;
  let lw = 0, lwRight = 0, blw = 0, blwRight = 0;
  let calls = 0;
  let days = 0;

  for (const values of seriesList) {
    days = Math.max(days, values.length);
    for (let t = minHistory; t + horizon < values.length; t += step) {
      const past = values.slice(Math.max(0, t - window + 1), t + 1);
      const future = values.slice(t + 1, t + 1 + horizon);
      const current = mean(past.slice(-3));
      if (current <= 0) continue;
      const { stage } = assessLifecycle(past);
      const ok = isCorrect(stage, current, future);
      const s = tally.get(stage) ?? { calls: 0, right: 0 };
      s.calls++;
      if (ok) s.right++;
      tally.set(stage, s);
      calls++;
      if (stage === "emerging" || stage === "rising") {
        lw++;
        if (ok) lwRight++;
      }
      const naive: LifecycleStage = mean(past.slice(-3)) >= mean(past.slice(-6, -3)) ? "rising" : "declining";
      const naiveOk = isCorrect(naive, current, future);
      if (naiveOk) baseRight++;
      if (naive === "rising") {
        blw++;
        if (naiveOk) blwRight++;
      }
    }
  }

  const stages: LifecycleStage[] = ["emerging", "rising", "peaking", "saturated", "declining"];
  const right = [...tally.values()].reduce((a, s) => a + s.right, 0);
  return {
    series: seriesList.length,
    days,
    overall: { calls, accuracy: calls ? right / calls : 0 },
    byStage: stages.map((stage) => {
      const s = tally.get(stage) ?? { calls: 0, right: 0 };
      return { stage, calls: s.calls, accuracy: s.calls ? s.right / s.calls : 0 };
    }),
    baseline: calls ? baseRight / calls : 0,
    launchWindow: {
      calls: lw,
      precision: lw ? lwRight / lw : 0,
      baselineCalls: blw,
      baselinePrecision: blw ? blwRight / blw : 0,
    },
  };
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
