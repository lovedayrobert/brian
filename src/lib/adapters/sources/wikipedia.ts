import type { Signal } from "@/lib/domain/types";
import { getJson, isoDay, type SourceAdapter } from "./types";

const SKIP = /^(Main_Page|Special:|Wikipedia:|Portal:|File:|Help:|Template:|Category:|Talk:|User:|Deaths_in_|List_of_|XXX|Pornhub|XHamster|XVideos|OnlyFans)/i;

interface TopResponse {
  items: { articles: { article: string; views: number; rank: number }[] }[];
}
interface SeriesResponse {
  items: { timestamp: string; views: number }[];
}
interface Summary {
  title: string;
  description?: string;
  extract?: string;
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
  type?: string;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export const wikipedia: SourceAdapter = {
  id: "wikipedia",
  ready: () => true,
  async fetchSignals({ now, log }) {
    // Pageview data lands with roughly a day's lag. Try yesterday, then the day before.
    let top: TopResponse | null = null;
    let day = new Date(now);
    for (let back = 1; back <= 3 && !top; back++) {
      day = new Date(now.getTime() - back * 86_400_000);
      const [y, m, d] = isoDay(day).split("-");
      try {
        top = await getJson<TopResponse>(
          `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${d}`,
        );
      } catch {
        log(`Wikipedia top list not ready for ${isoDay(day)}`);
      }
    }
    if (!top) throw new Error("No Wikipedia top list available for the last 3 days");

    const articles = top.items[0].articles.filter((a) => !SKIP.test(a.article)).slice(0, 45);
    const start = new Date(day.getTime() - 29 * 86_400_000);

    const signals = await mapLimit(articles, 2, async (a): Promise<Signal | null> => {
      try {
        const enc = encodeURIComponent(a.article);
        const [series, summary] = await Promise.all([
          getJson<SeriesResponse>(
            `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${enc}/daily/${ymd(start)}00/${ymd(day)}00`,
          ),
          getJson<Summary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc}`),
        ]);
        if (summary.type === "disambiguation") return null;
        return {
          id: `wikipedia:${a.article}`,
          sourceId: "wikipedia",
          url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${enc}`,
          title: summary.title,
          summary: summary.extract,
          imageUrl: summary.thumbnail?.source,
          metric: { label: "Wikipedia views yesterday", value: a.views },
          series: series.items.map((p) => ({
            date: `${p.timestamp.slice(0, 4)}-${p.timestamp.slice(4, 6)}-${p.timestamp.slice(6, 8)}`,
            value: p.views,
          })),
          topics: [summary.description ?? ""].filter(Boolean),
          capturedAt: now.toISOString(),
        };
      } catch (e) {
        log(`Wikipedia ${a.article}: ${(e as Error).message}`);
        return null;
      }
    });
    return signals.filter((s): s is Signal => !!s);
  },
};

export async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}
