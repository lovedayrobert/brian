import type { Signal } from "@/lib/domain/types";
import { type SourceAdapter, USER_AGENT } from "./types";

/**
 * What's trending on X, free, from trends24.in: the top 50 topics in each of
 * the last 24 hourly snapshots, per country. How long a topic has trended and
 * whether it's climbing becomes an hourly curve, so the lifecycle model can
 * stage it like any other trend. X_TREND_REGIONS picks the countries
 * (default united-states, united-kingdom, worldwide).
 */
const REGIONS = () => (process.env.X_TREND_REGIONS || "united-states,united-kingdom,worldwide").split(",").map((s) => s.trim()).filter(Boolean);

interface Hour {
  at: Date;
  topics: string[];
}

export function parseTrends24(html: string): Hour[] {
  return html
    .split("class=list-container")
    .slice(1)
    .flatMap((block) => {
      const ts = block.match(/data-timestamp=([\d.]+)/)?.[1];
      if (!ts) return [];
      const topics = [...block.matchAll(/class=trend-link>([^<]+)<\/a>/g)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim());
      return [{ at: new Date(Number(ts) * 1000), topics }];
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** Strength of a topic each hour: 51 − rank (top = 50), 0 when it isn't in the top 50. */
export function topicCurves(hours: Hour[]): Map<string, { name: string; series: number[]; hoursIn: number; bestRank: number; nowRank: number | null }> {
  const out = new Map<string, { name: string; series: number[]; hoursIn: number; bestRank: number; nowRank: number | null }>();
  hours.forEach((h, i) => {
    h.topics.forEach((name, rank) => {
      const key = name.toLowerCase();
      const t = out.get(key) ?? { name, series: Array(hours.length).fill(0), hoursIn: 0, bestRank: 99, nowRank: null };
      t.series[i] = Math.max(t.series[i], 51 - (rank + 1));
      t.hoursIn++;
      t.bestRank = Math.min(t.bestRank, rank + 1);
      if (i === hours.length - 1) t.nowRank = rank + 1;
      out.set(key, t);
    });
  });
  return out;
}

export const xtrends: SourceAdapter = {
  id: "xtrends",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const out: Signal[] = [];
    for (const region of REGIONS()) {
      try {
        const path = region === "worldwide" ? "" : `${region}/`;
        const res = await fetch(`https://trends24.in/${path}`, { headers: { "User-Agent": `Mozilla/5.0 ${USER_AGENT}` }, signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`${res.status}`);
        const hours = parseTrends24(await res.text());
        if (!hours.length) throw new Error("no trend lists on the page");
        const label = region.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        // The strongest 40 per country: long-running and currently high topics first.
        const strongest = [...topicCurves(hours).values()]
          .filter((t) => t.nowRank !== null || t.hoursIn >= 4)
          .sort((a, b) => b.hoursIn * 2 + (b.nowRank ? 51 - b.nowRank : 0) - (a.hoursIn * 2 + (a.nowRank ? 51 - a.nowRank : 0)))
          .slice(0, Number(process.env.X_TRENDS_PER_REGION) || 40);
        for (const t of strongest) {
          out.push({
            id: `xtrends:${region}:${t.name.toLowerCase()}`,
            sourceId: "xtrends",
            url: `https://x.com/search?q=${encodeURIComponent(t.name)}`,
            title: t.name,
            summary: `Trending on X in ${label}: ${t.nowRank ? `#${t.nowRank} now` : "dropped out"}, in the top 50 for ${t.hoursIn} of the last ${hours.length} hours, best #${t.bestRank}.`,
            author: `X trends (${label})`,
            metric: { label: "Hours trending (of 24)", value: t.hoursIn },
            series: t.series.map((v, i) => ({ date: hours[i].at.toISOString().slice(0, 13) + ":00", value: v })),
            topics: ["x", region, t.name.startsWith("#") ? "hashtag" : "topic"],
            capturedAt: now.toISOString(),
            publishedAt: hours[hours.length - 1].at.toISOString(),
          });
        }
      } catch (e) {
        log(`trends24 ${region}: ${(e as Error).message}`);
      }
    }
    return out;
  },
};
