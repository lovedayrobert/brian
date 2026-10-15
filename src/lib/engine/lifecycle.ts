import type { Confidence, LifecycleAssessment, LifecycleStage } from "@/lib/domain/types";

/**
 * Stage a trend from a daily series (oldest first).
 *
 * Deterministic and explainable on purpose: the forecaster's job is to be
 * auditable and backtestable. A model may add narrative on top, but the stage
 * itself comes from these rules, so the same data always gives the same answer.
 */
export function assessLifecycle(values: number[]): LifecycleAssessment {
  const evidence: string[] = [];
  const n = values.length;

  if (n < 7) {
    return {
      stage: "emerging",
      confidence: "low",
      confidenceScore: 0.15,
      velocity: 1,
      acceleration: 0,
      peakRatio: 1,
      baselineRatio: 1,
      evidence: [`Only ${n} days of data. Too little history to stage reliably.`],
    };
  }

  const last3 = mean(values.slice(-3));
  const prev3 = mean(values.slice(-6, -3));
  const prior3 = mean(values.slice(-9, -6));
  const peak = Math.max(...values);
  const peakIndex = values.lastIndexOf(peak);
  const daysSincePeak = n - 1 - peakIndex;
  const baseline = Math.max(median(values.slice(0, Math.max(3, Math.floor(n / 3)))), 1);

  const velocity = safeRatio(last3, prev3);
  const prevVelocity = safeRatio(prev3, prior3);
  const acceleration = round(velocity - prevVelocity);
  const peakRatio = safeRatio(last3, peak);
  const baselineRatio = safeRatio(last3, baseline);

  let stage: LifecycleStage;
  if (velocity < 0.8 && daysSincePeak >= 3) {
    stage = "declining";
  } else if (peakRatio < 0.5 && velocity < 1.15) {
    // Long after the spike and no longer falling: the moment has passed.
    stage = velocity < 0.9 ? "declining" : "saturated";
  } else if (velocity >= 1.3 && baselineRatio < 3) {
    stage = "emerging";
  } else if (velocity >= 1.15) {
    stage = "rising";
  } else if (peakRatio >= 0.8 && daysSincePeak <= 3) {
    stage = "peaking";
  } else if (velocity < 0.9) {
    stage = "declining";
  } else {
    stage = baselineRatio >= 2 ? "saturated" : "peaking";
  }

  evidence.push(
    `Last 3 days average ${fmt(last3)}, ${pct(velocity)} versus the 3 days before.`,
    `Running at ${Math.round(peakRatio * 100)}% of its ${n}-day peak${daysSincePeak === 0 ? " (peak is today)" : `, which was ${daysSincePeak} day${daysSincePeak === 1 ? "" : "s"} ago`}.`,
    `${round(baselineRatio)}x its early baseline of ${fmt(baseline)}.`,
  );
  if (acceleration > 0.2) evidence.push("Growth is accelerating.");
  if (acceleration < -0.2) evidence.push("Growth is slowing.");

  const { confidence, score } = scoreConfidence(values, stage, velocity, peakRatio);
  return {
    stage,
    confidence,
    confidenceScore: score,
    velocity: round(velocity),
    acceleration,
    peakRatio: round(peakRatio),
    baselineRatio: round(baselineRatio),
    evidence,
  };
}

/** Confidence falls with low volume, noisy series and readings near a stage boundary. */
function scoreConfidence(
  values: number[],
  stage: LifecycleStage,
  velocity: number,
  peakRatio: number,
): { confidence: Confidence; score: number } {
  let score = 1;
  const total = values.reduce((a, b) => a + b, 0);
  if (total < 1_000) score -= 0.35;
  else if (total < 20_000) score -= 0.15;

  const diffs = values.slice(1).map((v, i) => v - values[i]);
  const noise = std(diffs) / Math.max(mean(values), 1);
  if (noise > 1) score -= 0.3;
  else if (noise > 0.5) score -= 0.15;

  const boundaries: Record<LifecycleStage, number[]> = {
    emerging: [Math.abs(velocity - 1.3)],
    rising: [Math.abs(velocity - 1.15)],
    peaking: [Math.abs(peakRatio - 0.8)],
    saturated: [Math.abs(velocity - 0.9)],
    declining: [Math.abs(peakRatio - 0.5), Math.abs(velocity - 0.8)],
  };
  if (Math.min(...boundaries[stage]) < 0.05) score -= 0.2;

  if (values.length < 14) score -= 0.15;

  score = Math.max(0.05, Math.min(1, score));
  const confidence: Confidence = score >= 0.7 ? "high" : score >= 0.45 ? "medium" : "low";
  return { confidence, score: round(score) };
}

export const STAGE_LABEL: Record<LifecycleStage, string> = {
  emerging: "Emerging",
  rising: "Rising",
  peaking: "Peaking",
  saturated: "Saturated",
  declining: "Declining",
};

/** First-mover window: only emerging and rising trends are worth a launch. */
export function inLaunchWindow(stage: LifecycleStage): boolean {
  return stage === "emerging" || stage === "rising";
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function std(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
function safeRatio(a: number, b: number) {
  if (b <= 0) return a > 0 ? 10 : 1;
  return a / b;
}
function round(x: number) {
  return Math.round(x * 100) / 100;
}
function pct(r: number) {
  const d = Math.round((r - 1) * 100);
  return d === 0 ? "flat" : d > 0 ? `up ${d}%` : `down ${Math.abs(d)}%`;
}
function fmt(x: number) {
  return Math.round(x).toLocaleString("en-GB");
}

/**
 * Stage from rolling averages when no daily series exists (Polymarket exposes
 * 24h / 7d / 30d totals). Confidence is capped at medium: three points are
 * not a curve, and the UI says so.
 */
export function assessFromRates(day: number, weekAvg: number, monthAvg: number): LifecycleAssessment {
  const dayVsWeek = weekAvg > 0 ? day / weekAvg : day > 0 ? 10 : 1;
  const weekVsMonth = monthAvg > 0 ? weekAvg / monthAvg : weekAvg > 0 ? 10 : 1;
  let stage: LifecycleStage;
  if (dayVsWeek >= 1.5 && weekVsMonth < 1.5) stage = "emerging";
  else if (dayVsWeek >= 1.15) stage = "rising";
  else if (dayVsWeek >= 0.85) stage = weekVsMonth >= 1.3 ? "peaking" : "saturated";
  else stage = "declining";
  const total = day + weekAvg * 7;
  const score = total < 50_000 ? 0.3 : 0.5;
  const r = (x: number) => Math.round(x * 100) / 100;
  return {
    stage,
    confidence: score >= 0.45 ? "medium" : "low",
    confidenceScore: score,
    velocity: r(dayVsWeek),
    acceleration: r(dayVsWeek - weekVsMonth),
    peakRatio: 1,
    baselineRatio: r(monthAvg > 0 ? day / monthAvg : 1),
    evidence: [
      `Last 24h is ${r(dayVsWeek)}x the 7-day daily average.`,
      `The 7-day average is ${r(weekVsMonth)}x the 30-day average.`,
      "Staged from rolling averages, not a daily series. Treat as directional.",
    ],
  };
}
