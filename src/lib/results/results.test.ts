import { describe, expect, it } from "vitest";
import { engagements, parseCount, platformOf } from "./platforms";
import { atAge, type Publication } from "./publications";
import { campaignSlug, trackingLink } from "./utm";

describe("results", () => {
  it("knows platforms from links", () => {
    expect(platformOf("https://x.com/cashy/status/1")).toBe("X");
    expect(platformOf("https://t.me/cashy/12")).toBe("Telegram");
    expect(platformOf("https://www.instagram.com/p/abc/")).toBe("Instagram");
    expect(platformOf("https://cashy.com/articles/guides/x")).toBe("Blog");
  });
  it("reads Telegram-style counts", () => {
    expect(parseCount("1.58M")).toBe(1_580_000);
    expect(parseCount("12.3K")).toBe(12_300);
    expect(parseCount("987")).toBe(987);
  });
  it("counts engagements without views", () => {
    expect(engagements({ views: 1000, likes: 10, reposts: 2, replies: 3, saves: 1, clicks: 50 })).toBe(16);
  });
  it("builds stable campaign names and tracking links", () => {
    const slug = campaignSlug("Black Friday: Free Spins Weekend!", "lin_8f2c1a9e-77aa-4b0e-9c1d-123456abcdef");
    expect(slug).toBe("black-friday-free-spins-weekend-abcdef");
    const link = trackingLink("https://cashy.com/promo?x=1", slug, { source: "x", medium: "social" }, "lin_8f2c1a9e-77aa-4b0e-9c1d-123456abcdef");
    expect(link).toBe("https://cashy.com/promo?x=1&utm_source=x&utm_medium=social&utm_campaign=black-friday-free-spins-weekend-abcdef&utm_content=56abcdef");
  });
  it("compares posts at the same age", () => {
    const p = { addedAt: "2026-10-01T00:00:00Z", snapshots: [
      { at: "2026-10-01T00:00:00Z", source: "auto", views: 10 },
      { at: "2026-10-01T01:10:00Z", source: "auto", views: 100 },
      { at: "2026-10-02T00:30:00Z", source: "auto", views: 900 },
      { at: "2026-10-08T01:00:00Z", source: "auto", views: 2000 },
    ] } as unknown as Publication;
    expect(atAge(p, 1)?.views).toBe(100);
    expect(atAge(p, 24)?.views).toBe(900);
    expect(atAge(p, 168)?.views).toBe(2000);
  });
});
