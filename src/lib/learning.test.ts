import { describe, expect, it } from "vitest";
import type { Swipe } from "@/lib/domain/types";
import { confirmed, learningContext } from "./learning";

const bd = { at: "2026-10-21", whatHappened: "", feeling: "fear", whySpread: "", whyBrand: "", timing: "", lesson: "Scare people with something real", dontCopy: "the haunted slot" };
const ex = (id: string, extra: Partial<Swipe>): Swipe => ({ id, url: `https://x.com/a/status/${id}`, title: `example ${id}`, platform: "X", why: "", addedBy: "rob", addedAt: "2026-10-21", ...extra });

describe("learning", () => {
  it("only counts an explanation the team last said was right as confirmed", () => {
    expect(confirmed(ex("1", { breakdown: bd, feedback: [{ by: "rob", at: "x", verdict: "right" }] }))).toBe(true);
    expect(confirmed(ex("2", { breakdown: bd, feedback: [{ by: "rob", at: "x", verdict: "right" }, { by: "rob", at: "y", verdict: "partly", note: "no" }] }))).toBe(false);
    expect(confirmed(ex("3", { breakdown: bd }))).toBe(false);
  });
  it("puts examples made for the same event first", () => {
    const ctx = learningContext([ex("1", { breakdown: bd }), ex("2", { breakdown: bd, event: "Halloween" })], undefined, "Halloween");
    expect(ctx.indexOf("what_worked_before")).toBeLessThan(ctx.indexOf("lessons_from_examples"));
    expect(ctx).toContain("example 2 (Halloween)");
    expect(ctx.split("example 2").length).toBe(2); // not repeated in the general list
  });
  it("is empty with nothing taught", () => {
    expect(learningContext([], undefined)).toBe("");
  });
});
