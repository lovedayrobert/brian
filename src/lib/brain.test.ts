import { describe, expect, it } from "vitest";
import type { BrainNode } from "@/lib/domain/types";
import { applyDigest, brainContext, health, momentOf, strength } from "./brain";

const node = (over: Partial<BrainNode>): BrainNode => ({ id: "n1", kind: "truth", text: "Degens love watching the house lose", detail: "", evidence: [], team: [], uses: [], createdAt: "2026-10-21T00:00:00Z", updatedAt: "2026-10-21T00:00:00Z", ...over });
const ev = (swipeId: string, supports = true) => ({ swipeId, note: "", supports, at: "2026-10-21T00:00:00Z" });
const now = Date.parse("2026-10-22T00:00:00Z");
const empty = { cliches: [] as string[], notes: [], whatHappened: "", feeling: "", whySpread: "", whyBrand: "", timing: "", lesson: "", dontCopy: "", unsure: null, question: null, questionNodeIds: [] };

describe("Brian's brain", () => {
  it("trusts the team double and liked ideas most", () => {
    expect(strength(node({ evidence: [ev("a"), ev("b")] }))).toBe(2);
    expect(strength(node({ evidence: [ev("a")], team: [{ by: "rob", at: "", agree: true }] }))).toBe(3);
    expect(strength(node({ evidence: [ev("a"), ev("b", false)] }))).toBe(0);
    expect(strength(node({ evidence: [ev("a")], uses: [{ ideaId: "i", at: "", verdict: "liked" }] }))).toBe(2.5);
  });
  it("fades knowledge that isn't earning its place", () => {
    expect(health(node({ evidence: [ev("a"), ev("b"), ev("c"), ev("d")] }), now)).toBe("strong");
    expect(health(node({ evidence: [ev("a")], uses: [{ ideaId: "1", at: "2026-10-21T00:00:00Z", verdict: "rejected" }, { ideaId: "2", at: "2026-10-21T00:00:00Z", verdict: "rejected" }] }), now)).toBe("fading");
    expect(health(node({ evidence: [ev("a")], updatedAt: "2026-08-01T00:00:00Z" }), now)).toBe("fading");
    expect(health(node({ kind: "industry", evidence: [ev("a")], updatedAt: "2026-08-01T00:00:00Z" }), now)).not.toBe("fading");
  });
  it("files an example: strengthens what it knows, adds what's new, remembers the campaign", () => {
    let i = 0;
    const { brain, touched } = applyDigest(
      [node({ evidence: [ev("old")] })],
      "gta",
      { ...empty, links: [{ nodeId: "n1", supports: true, note: "yes" }, { nodeId: "missing", supports: true, note: "" }], newKnowledge: [{ kind: "mechanic", text: "Two worlds collide", detail: "" }], industry: { brand: "Hunter", what: "GTA map in LA", landed: "337k views", couldBeBetter: "no brand" } },
      "2026-10-21T00:00:00Z",
      () => `new${++i}`,
    );
    expect(brain.find((n) => n.id === "n1")!.evidence).toHaveLength(2);
    expect(brain.map((n) => n.kind)).toEqual(["truth", "mechanic", "industry"]);
    expect(touched.map((t) => t.change)).toEqual(["stronger", "new", "new"]);
  });
  it("re-digesting takes back what the example said last time", () => {
    const first = applyDigest([], "gta", { ...empty, links: [], newKnowledge: [{ kind: "truth", text: "x", detail: "" }], industry: null }, "t", () => "a");
    const again = applyDigest(first.brain, "gta", { ...empty, links: [], newKnowledge: [{ kind: "truth", text: "y", detail: "" }], industry: null }, "t", () => "b");
    expect(again.brain.map((n) => n.text)).toEqual(["y"]);
  });
  it("never shows the inventor campaigns, only truths and mechanics", () => {
    const ctx = brainContext([node({ evidence: [ev("a")] }), node({ id: "c", kind: "industry", text: "Stake logo on memes", evidence: [ev("a")] })]);
    expect(ctx).toContain("Degens love watching the house lose");
    expect(ctx).not.toContain("Stake");
  });
  it("keeps a campaign's lessons inside the campaign", () => {
    let i = 0;
    const halloween = { id: "c-h", name: "Halloween" };
    const main = applyDigest([], "gta", { ...empty, links: [], newKnowledge: [{ kind: "mechanic", text: "Reach bought with prizes isn't creativity", detail: "" }], industry: null }, "t", () => `m${++i}`).brain;
    const { brain } = applyDigest(
      main,
      "stake-halloween",
      {
        ...empty,
        // A campaign can't strengthen the main Brian, even if it tries to link to it.
        links: [{ nodeId: "m1", supports: true, note: "tries to reach the main Brian" }],
        newKnowledge: [{ kind: "truth", text: "People want to be scared for fun", detail: "" }],
        cliches: ["Spooky giveaway with a pumpkin emoji"],
        industry: { brand: "Stake", what: "Guess-the-drop giveaways", landed: "100K views", couldBeBetter: "No idea behind it" },
      },
      "t",
      () => `n${++i}`,
      halloween,
    );
    expect(brain.find((n) => n.id === "m1")!.evidence).toHaveLength(1);
    expect(brain.filter((n) => n.campaignId === "c-h").map((n) => n.kind).sort()).toEqual(["cliche", "industry", "truth"]);

    // Everyday ideas see only the main Brian; Halloween ideas also get Halloween's Brian; Christmas sees nothing of Halloween.
    const day = brainContext(brain);
    expect(day).toContain("Reach bought");
    expect(day).not.toContain("scared for fun");
    const forHalloween = brainContext(brain, halloween);
    expect(forHalloween).toContain("scared for fun");
    expect(forHalloween).toContain("Spooky giveaway");
    expect(forHalloween).toContain("No idea behind it");
    expect(brainContext(brain, { id: "c-x", name: "Christmas" })).not.toContain("scared for fun");
  });
  it("doesn't let campaign knowledge fade in the year between campaigns", () => {
    const old = { evidence: [ev("a")], updatedAt: "2026-01-01T00:00:00Z" };
    expect(health(node({ ...old, campaignId: "c-h" }), now)).not.toBe("fading");
    expect(health(node(old), now)).toBe("fading");
  });
  it("drops the year from a moment", () => {
    expect(momentOf("Halloween 2024")).toBe("Halloween");
    expect(momentOf("GTA 6 launch")).toBe("GTA 6 launch");
  });
});
