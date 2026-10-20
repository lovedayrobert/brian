import { describe, expect, it } from "vitest";
import { aiTells } from "./style";

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
