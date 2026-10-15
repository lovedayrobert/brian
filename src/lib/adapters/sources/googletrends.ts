import { XMLParser } from "fast-xml-parser";
import type { Signal } from "@/lib/domain/types";
import { USER_AGENT, type SourceAdapter } from "./types";

/**
 * Google's public "trending now" RSS: what people are searching right now,
 * with approximate volume and the news stories behind each spike. Free.
 * Historical curves and breakout queries need the official Trends API
 * (limited alpha) or SerpApi, which sit behind the same source slot.
 */
const GEOS = ["US", "GB", "CA", "AU"];
const parser = new XMLParser({ ignoreAttributes: false });

type Item = {
  title: string;
  "ht:approx_traffic"?: string;
  pubDate?: string;
  "ht:picture"?: string;
  "ht:news_item"?: NewsItem | NewsItem[];
};
type NewsItem = { "ht:news_item_title"?: string; "ht:news_item_url"?: string; "ht:news_item_source"?: string };

export function parseTraffic(s?: string): number {
  if (!s) return 0;
  const m = s.replace(/[,+\s]/g, "").match(/^(\d+(?:\.\d+)?)([KM]?)$/i);
  if (!m) return 0;
  return Math.round(Number(m[1]) * (m[2].toUpperCase() === "M" ? 1e6 : m[2].toUpperCase() === "K" ? 1e3 : 1));
}

export const googleTrends: SourceAdapter = {
  id: "googletrends",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const byTerm = new Map<string, Signal>();
    for (const geo of GEOS) {
      try {
        const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const xml = parser.parse(await res.text());
        const items: Item[] = [xml?.rss?.channel?.item ?? []].flat();
        for (const it of items) {
          const term = String(it.title).trim();
          const key = term.toLowerCase();
          const news = [it["ht:news_item"] ?? []].flat().map((n) => ({
            title: decode(n["ht:news_item_title"] ?? ""),
            url: n["ht:news_item_url"] ?? "",
            outlet: n["ht:news_item_source"] ?? "",
          })).filter((n) => n.url);
          const traffic = parseTraffic(it["ht:approx_traffic"]);
          const existing = byTerm.get(key);
          if (existing) {
            existing.metric!.value += traffic;
            existing.topics.push(geo);
            continue;
          }
          byTerm.set(key, {
            id: `googletrends:${key}`,
            sourceId: "googletrends",
            url: news[0]?.url ?? `https://trends.google.com/trending?geo=${geo}`,
            title: term,
            summary: news.map((n) => n.title).join(" · "),
            imageUrl: it["ht:picture"],
            metric: { label: "Searches (approx.)", value: traffic },
            topics: [geo],
            related: news,
            capturedAt: now.toISOString(),
            publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
          });
        }
      } catch (e) {
        log(`Google Trends ${geo}: ${(e as Error).message}`);
      }
    }
    return [...byTerm.values()];
  },
};

function decode(s: string) {
  return s.replace(/&apos;/g, "’").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&#39;/g, "’");
}
