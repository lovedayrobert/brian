import { describe, expect, it } from "vitest";
import { capByWorld } from "./worlds";

describe("spreading across worlds", () => {
  it("caps streamers harder than the rest", () => {
    const items = ["streaming", "streaming", "streaming", "sport", "streaming", "crypto"].map((world, i) => ({ i, world }));
    const kept = capByWorld(items, (x) => x.world, (w) => (w === "streaming" ? 2 : 4));
    expect(kept.map((x) => x.i)).toEqual([0, 1, 3, 5]);
  });
});
