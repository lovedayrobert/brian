import { describe, expect, it } from "vitest";
import { assessLifecycle, inLaunchWindow } from "./lifecycle";

const flat = (n: number, v: number) => Array.from({ length: n }, () => v);

describe("assessLifecycle", () => {
  it("returns low confidence when history is too short", () => {
    const r = assessLifecycle([10, 20, 30]);
    expect(r.confidence).toBe("low");
    expect(r.evidence[0]).toMatch(/Only 3 days/);
  });

  it("stages a fresh breakout from a low base as emerging", () => {
    const series = [...flat(20, 1000), 1000, 1100, 1200, 1500, 2000, 2600];
    const r = assessLifecycle(series);
    expect(r.stage).toBe("emerging");
    expect(inLaunchWindow(r.stage)).toBe(true);
  });

  it("stages sustained growth well above baseline as rising", () => {
    const series = [...flat(14, 1000), 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9500, 11000];
    const r = assessLifecycle(series);
    expect(r.stage).toBe("rising");
    expect(r.velocity).toBeGreaterThan(1.15);
  });

  it("stages a plateau at its peak as peaking", () => {
    const series = [...flat(10, 1000), 3000, 6000, 9000, 10000, 10000, 10100, 10000, 10050, 10000];
    const r = assessLifecycle(series);
    expect(r.stage).toBe("peaking");
  });

  it("stages a collapse from peak as declining", () => {
    const series = [...flat(10, 1000), 5000, 20000, 15000, 9000, 6000, 4000, 3000];
    const r = assessLifecycle(series);
    expect(r.stage).toBe("declining");
    expect(inLaunchWindow(r.stage)).toBe(false);
  });

  it("stages a long, elevated, slowly fading plateau as saturated", () => {
    const series = [...flat(10, 1000), 8000, 10000, 9500, 9000, 8800, 8600, 8500, 8400, 8300, 8250, 8200];
    const r = assessLifecycle(series);
    expect(r.stage).toBe("saturated");
  });

  it("lowers confidence for tiny, noisy series", () => {
    const quiet = assessLifecycle([0, 5, 0, 9, 1, 0, 12, 0, 3, 0, 7, 1, 0, 8]);
    const loud = assessLifecycle([...flat(20, 10000), 12000, 15000, 19000, 24000, 30000, 37000]);
    expect(quiet.confidenceScore).toBeLessThan(loud.confidenceScore);
    expect(quiet.confidence).toBe("low");
  });

  it("is deterministic", () => {
    const s = [...flat(12, 500), 700, 900, 1400, 2000];
    expect(assessLifecycle(s)).toEqual(assessLifecycle(s));
  });
});

import { assessFromRates } from "./lifecycle";
describe("assessFromRates", () => {
  it("flags a spike against a quiet month as emerging and never claims high confidence", () => {
    const r = assessFromRates(300_000, 100_000, 90_000);
    expect(r.stage).toBe("emerging");
    expect(r.confidence).not.toBe("high");
  });
  it("flags falling activity as declining", () => {
    expect(assessFromRates(20_000, 100_000, 80_000).stage).toBe("declining");
  });
});
