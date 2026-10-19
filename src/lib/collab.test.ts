import { describe, expect, it } from "vitest";
import { findMentions, reactionScore } from "./collab";
import { isAdmin, nameFromId } from "./people";

describe("collaboration", () => {
  it("scores reactions: fire counts double, thumbs down counts against", () => {
    expect(reactionScore({ "🔥": ["a", "b"], "👍": ["c"], "👎": ["d"], "😂": ["e"] })).toBe(4);
    expect(reactionScore(undefined)).toBe(0);
  });
  it("finds @mentions by first name, full name or email", () => {
    const people = [
      { id: "rob.loveday@bitstarz.com", name: "Rob Loveday", email: "rob.loveday@bitstarz.com", firstSeen: "", lastSeen: "" },
      { id: "sasha@bitstarz.com", name: "Sasha Petrova", email: "sasha@bitstarz.com", firstSeen: "", lastSeen: "" },
    ];
    expect(findMentions("@Sasha can you make this? cc @rob.loveday@bitstarz.com", { people })).toEqual(["sasha@bitstarz.com", "rob.loveday@bitstarz.com"]);
    expect(findMentions("no mentions here, email me at x@y.com", { people })).toEqual([]);
  });
  it("knows admins and makes names from emails", () => {
    expect(isAdmin("rob.loveday@bitstarz.com")).toBe(true);
    expect(isAdmin("marko")).toBe(true);
    expect(isAdmin("sasha@bitstarz.com")).toBe(false);
    expect(nameFromId("rob.loveday@bitstarz.com")).toBe("Rob Loveday");
  });
});
