import type { Signal } from "@/lib/domain/types";
import { getJson, type SourceAdapter } from "./types";

interface PolyEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  endDate?: string;
  volume24hr?: number | string;
  volume1wk?: number | string;
  volume1mo?: number | string;
  tags?: { label: string }[];
  seriesSlug?: string;
}

export const polymarket: SourceAdapter = {
  id: "polymarket",
  ready: () => true,
  async fetchSignals({ now }) {
    const events = await getJson<PolyEvent[]>(
      "https://gamma-api.polymarket.com/events?limit=40&active=true&closed=false&order=volume24hr&ascending=false",
    );
    // Individual matches and repeating daily price ladders are noise at trend level:
    // drop head-to-head fixtures and keep only the busiest event per series.
    const seen = new Set<string>();
    const filtered = events.filter((e) => {
      if (/\bvs\.?\b/i.test(e.title)) return false;
      if (/(above|below|___|price|\bhit\b|# ?tweets|up or down|how many)/i.test(e.title)) return false;
      const key = e.seriesSlug ?? e.title.replace(/\b(on|in)\s+[A-Z][a-z]+(\s+\d+(-\d+)?)?\??$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return filtered.map((e): Signal => {
      const day = Number(e.volume24hr ?? 0);
      const week = Number(e.volume1wk ?? 0);
      const month = Number(e.volume1mo ?? 0);
      return {
        id: `polymarket:${e.id}`,
        sourceId: "polymarket",
        url: `https://polymarket.com/event/${e.slug}`,
        title: e.title,
        summary: e.description?.split("\n")[0]?.slice(0, 280),
        imageUrl: e.image,
        metric: { label: "24h volume (USD)", value: Math.round(day) },
        // Polymarket exposes rolling totals, not a daily series. Kept as rates; the
        // lifecycle for these uses assessFromRates rather than inventing a series.
        rates: { day, weekAvg: week / 7, monthAvg: month / 30 },
        topics: (e.tags ?? []).map((t) => t.label),
        capturedAt: now.toISOString(),
        publishedAt: e.endDate,
      } satisfies Signal;
    });
  },
};
