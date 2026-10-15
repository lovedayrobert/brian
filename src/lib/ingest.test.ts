import { describe, expect, it } from "vitest";
import { mergeImported, parseIngest, toSignal } from "./ingest";

const x = { source: "x", id: "1", url: "https://x.com/a/status/1", title: "Streamer gets capped live on stream", author: "@clipper", published_at: "2026-10-15T10:00:00Z", metrics: { views: 120000, reposts: 900 }, primary_metric: "views" };
const trends = { source: "google-trends", id: "gta6-us", url: "https://trends.google.com/explore?q=gta%206", title: "gta 6", series: [{ date: "2026-10-14", value: 80 }, { date: "2026-10-13", value: 60 }] };

describe("parseIngest", () => {
  it("reads JSON Lines and JSON arrays", () => {
    expect(parseIngest(`${JSON.stringify(x)}\n\n${JSON.stringify(trends)}\n`).records).toHaveLength(2);
    expect(parseIngest(JSON.stringify([x, trends])).records).toHaveLength(2);
  });

  it("reports bad lines with their line number and keeps the good ones", () => {
    const r = parseIngest(`${JSON.stringify(x)}\nnot json\n${JSON.stringify({ ...x, id: "2", url: "nope" })}`);
    expect(r.records).toHaveLength(1);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3]);
    expect(r.errors[1].message).toMatch(/url/);
  });

  it("rejects invalid source names and dates", () => {
    expect(parseIngest(JSON.stringify({ ...x, source: "Bad Source" })).errors).toHaveLength(1);
    expect(parseIngest(JSON.stringify({ ...trends, series: [{ date: "14/10/2026", value: 1 }] })).errors).toHaveLength(1);
  });
});

describe("toSignal", () => {
  it("maps records to signals, choosing the primary metric and sorting series", () => {
    const sx = toSignal(parseIngest(JSON.stringify(x)).records[0]);
    expect(sx.sourceId).toBe("ext:x");
    expect(sx.metric).toEqual({ label: "views", value: 120000 });
    const st = toSignal(parseIngest(JSON.stringify(trends)).records[0]);
    expect(st.series?.map((p) => p.date)).toEqual(["2026-10-13", "2026-10-14"]);
  });
});

describe("mergeImported", () => {
  it("keeps the latest version of each record and drops records older than 14 days", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    const old = { ...toSignal(parseIngest(JSON.stringify({ ...x, id: "old", published_at: "2026-09-01T00:00:00Z" })).records[0]) };
    const v1 = toSignal(parseIngest(JSON.stringify(x)).records[0]);
    const v2 = { ...v1, title: "updated" };
    const merged = mergeImported([old, v1], [v2], now);
    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe("updated");
  });
});

import { seededShuffle, tally, type ReviewSet } from "./review";
describe("blind review", () => {
  it("shuffles reproducibly without losing items", () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6], 42);
    expect(seededShuffle([1, 2, 3, 4, 5, 6], 42)).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("tallies against the pass mark only once complete", () => {
    const set: ReviewSet = { id: "r", createdAt: "", title: "", protocol: "", ideaIds: ["a", "b", "c", "d"], packageIds: ["p"], passMark: 2, ratings: {} };
    expect(tally(set).complete).toBe(false);
    const at = "", by = "m";
    set.ratings = { a: { verdict: "run", at, by }, b: { verdict: "skip", at, by }, c: { verdict: "run", at, by }, d: { verdict: "skip", at, by }, p: { verdict: "run", at, by } };
    expect(tally(set)).toMatchObject({ complete: true, wouldRun: 2, passed: true });
  });
});
