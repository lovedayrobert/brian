import { describe, expect, it } from "vitest";
import { aiTells, offerToFamous } from "./style";

describe("AI writing tells", () => {
  it("catches the habits Rob called out", () => {
    expect(aiTells("Cashy ships it to his house")).toContain('"ship"');
    expect(aiTells("It's not a prank, it's a love letter")).toContain(`"it's not X, it's Y"`);
    expect(aiTells("this is diabolical")).toContain('"diabolical"');
    expect(aiTells("A trophy — engraved")).toContain("em dash");
  });
  it("leaves plain writing alone", () => {
    expect(aiTells("Cashy replies to the post with a photo of a cheap trophy.", "relationship goals", "shipping costs $20")).toEqual([]);
  });
});

describe("offers to famous people", () => {
  const names = ["Asmongold", "Kai Cenat", "Adin Ross"];
  it("catches offers, deals and gifts aimed at them", () => {
    expect(offerToFamous("Cashy publicly offers Asmongold a sponsorship to brush his teeth", names)).toBe("Asmongold");
    expect(offerToFamous("Cashy mails Kai Cenat a friendship bracelet", names)).toBe("Kai Cenat");
  });
  it("lets posts about them through", () => {
    expect(offerToFamous("Reply under the Kai Cenat clip: Adin gave him a lease, not a car", names)).toBeNull();
  });
});
