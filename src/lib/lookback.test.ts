import { describe, expect, it } from "vitest";
import { cleanHandle, tweetTime, xSearchUrl } from "./lookback";

describe("looking back at a brand's posts", () => {
  it("reads the posting time out of a tweet id", () => {
    const at = Date.parse("2024-10-31T18:00:00Z");
    const id = ((BigInt(at) - BigInt(1288834974657)) << BigInt(22)).toString();
    expect(tweetTime(id)).toBe(at);
  });
  it("accepts handles however they're pasted", () => {
    expect(cleanHandle("@Stake")).toBe("Stake");
    expect(cleanHandle("https://x.com/stake/status/123")).toBe("stake");
    expect(cleanHandle(" twitter.com/roobet ")).toBe("roobet");
  });
  it("builds the free search on X", () => {
    expect(decodeURIComponent(xSearchUrl("stake", "2024-10-28", "2024-11-03"))).toContain("from:stake since:2024-10-28 until:2024-11-03");
  });
});
