import { describe, expect, it } from "vitest";
import type { DB } from "@/lib/store";
import { campaignForMoment, moveMomentsIntoCampaigns } from "./campaigns";

const node = (id: string, extra: object) => ({ id, kind: "truth", text: id, detail: "", evidence: [{ swipeId: "s1", note: "", supports: true, at: "" }], team: [], uses: [], createdAt: "", updatedAt: "", ...extra });

describe("campaigns", () => {
  it("turns old playbooks into campaigns, once", () => {
    const d = { brain: [node("a", { moment: "Halloween" }), node("b", {})], swipes: [{ id: "s1", event: "Halloween 2024" }], campaigns: [] } as unknown as DB;
    expect(moveMomentsIntoCampaigns(d, "t", () => "c1")).toBe(2);
    expect(d.campaigns).toHaveLength(1);
    expect(d.brain!.find((n) => n.id === "a")!.campaignId).toBe("c1");
    expect(d.brain!.find((n) => n.id === "b")!.campaignId).toBeUndefined();
    expect(d.swipes!.find((s) => s.id === "s1")!.campaignId).toBe("c1");
    expect(moveMomentsIntoCampaigns(d, "t", () => "c2")).toBe(0);
  });
  it("finds the campaign for a moment, whatever the year", () => {
    const d = { campaigns: [{ id: "c1", name: "Halloween", moment: "Halloween", createdBy: "", createdAt: "" }] } as unknown as DB;
    expect(campaignForMoment(d, "Halloween 2024")?.id).toBe("c1");
    expect(campaignForMoment(d, "Christmas")).toBeUndefined();
  });
});
