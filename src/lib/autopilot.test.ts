import { describe, expect, it } from "vitest";
import { hotItems, plan } from "./autopilot";

const at = (iso: string) => new Date(iso);

describe("Brian on his own", () => {
  it("sweeps every three hours", () => {
    expect(plan({ lastSweep: "2026-10-21T10:00:00Z", pulseDay: "2026-10-21", ideasDay: "2026-10-21" }, at("2026-10-21T12:00:00Z"), false).sweep).toBe(false);
    expect(plan({ lastSweep: "2026-10-21T09:00:00Z", pulseDay: "2026-10-21", ideasDay: "2026-10-21" }, at("2026-10-21T12:00:00Z"), false).sweep).toBe(true);
  });
  it("reads the room once each morning, from a fresh sweep, then checks for ideas once", () => {
    // 07:05, last sweep at 05:00: sweep first.
    expect(plan({ lastSweep: "2026-10-21T05:00:00Z", pulseDay: "2026-10-20" }, at("2026-10-21T07:05:00Z"), false)).toEqual({ sweep: true, pulse: false, ideas: false });
    // Sweep still running: wait.
    expect(plan({ lastSweep: "2026-10-21T07:05:00Z", pulseDay: "2026-10-20" }, at("2026-10-21T07:15:00Z"), true)).toEqual({ sweep: false, pulse: false, ideas: false });
    // Sweep done: Pulse.
    expect(plan({ lastSweep: "2026-10-21T07:05:00Z", pulseDay: "2026-10-20" }, at("2026-10-21T07:25:00Z"), false)).toEqual({ sweep: false, pulse: true, ideas: false });
    // Pulse done: ideas check, once.
    expect(plan({ lastSweep: "2026-10-21T07:05:00Z", pulseDay: "2026-10-21" }, at("2026-10-21T07:35:00Z"), false).ideas).toBe(true);
    expect(plan({ lastSweep: "2026-10-21T07:05:00Z", pulseDay: "2026-10-21", ideasDay: "2026-10-21" }, at("2026-10-21T08:35:00Z"), false)).toEqual({ sweep: false, pulse: false, ideas: false });
  });
  it("does nothing paid before the morning", () => {
    expect(plan({ lastSweep: "2026-10-21T05:30:00Z", pulseDay: "2026-10-20" }, at("2026-10-21T06:00:00Z"), false)).toEqual({ sweep: false, pulse: false, ideas: false });
  });
  it("only counts strong feelings a brand can go near as hot", () => {
    const item = (intensity: number, opening: string | null) => ({ subject: "x", happening: "", emotion: "hate", intensity, why: "", where: "", lifespan: "", opening, urls: [] });
    expect(hotItems([item(9, "a reply"), item(9, null), item(7, "a post")])).toHaveLength(1);
  });
});
