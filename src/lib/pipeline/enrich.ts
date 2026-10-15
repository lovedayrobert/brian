import { getJson } from "@/lib/adapters/sources/types";
import { mapLimit } from "@/lib/adapters/sources/wikipedia";
import type { Signal } from "@/lib/domain/types";
import { classify } from "@/lib/engine/relevance";

/**
 * Pair search spikes with an attention curve. Google tells us what people are
 * searching right now; Wikipedia gives 30 days of daily views for the same
 * topic, so Brian can say whether it's emerging, rising or already peaking.
 */
export async function attachCurves(signals: Signal[], now: Date, log: (m: string) => void): Promise<Signal[]> {
  const spikes = signals
    .filter((s) => s.sourceId === "googletrends")
    .map((s) => ({ s, rel: classify(`${s.title} ${s.summary ?? ""}`).relevance }))
    .sort((a, b) => b.rel * Math.log10(10 + (b.s.metric?.value ?? 0)) - a.rel * Math.log10(10 + (a.s.metric?.value ?? 0)))
    .slice(0, 24);

  const end = new Date(now.getTime() - 86_400_000);
  const start = new Date(end.getTime() - 29 * 86_400_000);
  const ymd = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

  const out = await mapLimit(spikes, 2, async ({ s }): Promise<Signal | null> => {
    try {
      const search = await getJson<[string, string[], string[], string[]]>(
        `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&limit=1&namespace=0&search=${encodeURIComponent(s.title)}`,
      );
      const page = search[3]?.[0];
      if (!page) return null;
      const article = decodeURIComponent(page.split("/wiki/")[1]);
      const series = await getJson<{ items: { timestamp: string; views: number }[] }>(
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article)}/daily/${ymd(start)}00/${ymd(end)}00`,
      );
      return {
        ...s,
        id: `search:${s.id}`,
        sourceId: "search",
        title: titleCase(s.title),
        series: series.items.map((p) => ({
          date: `${p.timestamp.slice(0, 4)}-${p.timestamp.slice(4, 6)}-${p.timestamp.slice(6, 8)}`,
          value: p.views,
        })),
        topics: [article.replace(/_/g, " "), ...s.topics],
      };
    } catch (e) {
      log(`[enrich] ${s.title}: ${(e as Error).message}`);
      return null;
    }
  });
  const curves = out.filter((x): x is Signal => !!x);
  // The news behind each spike, kept as citable evidence for that trend.
  const related: Signal[] = curves.flatMap((c) =>
    (c.related ?? []).map((r) => ({
      id: `related:${c.id}:${r.url}`,
      sourceId: "related",
      url: r.url,
      title: r.title,
      author: r.outlet,
      topics: [c.id],
      capturedAt: c.capturedAt,
    })),
  );
  return [...curves, ...related];
}

export function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}
