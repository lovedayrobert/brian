import type { Signal } from "@/lib/domain/types";
import { redditTop, stripHtml } from "./reddit";
import { getJson, type SourceAdapter } from "./types";

/**
 * What people are vibe coding and getting attention for: one-joke websites,
 * toys, generators and browser games. Feeds the Tiny builds lens. Show HN
 * comes with points; Reddit's top-of-week RSS is already ranked by score, so
 * its position stands in for attention. Both are free and keyless. X is
 * where most of these actually blow up, and arrives through the import format.
 */
const SUBREDDITS: { name: string; onlyBuilds: boolean }[] = [
  { name: "vibecoding", onlyBuilds: true },
  { name: "SideProject", onlyBuilds: true },
  { name: "InternetIsBeautiful", onlyBuilds: false },
  { name: "WebGames", onlyBuilds: false },
];

const BUILT = /\b(built|made|launched|created|shipped|vibe ?coded|my (first )?(app|site|website|game|tool))\b/i;

interface HnHits {
  hits: { objectID: string; title: string; url?: string; points: number; num_comments: number; author: string; created_at: string; story_text?: string }[];
}

export const builds: SourceAdapter = {
  id: "builds",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const out: Signal[] = [];
    const since = Math.floor(now.getTime() / 1000) - 4 * 86_400;

    try {
      const res = await getJson<HnHits>(
        `https://hn.algolia.com/api/v1/search?tags=show_hn&hitsPerPage=60&numericFilters=${encodeURIComponent(`created_at_i>${since},points>30`)}`,
      );
      for (const h of res.hits.sort((a, b) => b.points - a.points).slice(0, 25)) {
        out.push({
          id: `builds:hn:${h.objectID}`,
          sourceId: "builds",
          url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
          title: h.title.replace(/^Show HN:\s*/i, ""),
          summary: stripHtml(h.story_text)?.slice(0, 300),
          author: "Show HN",
          metric: { label: "HN points", value: h.points },
          topics: ["builds", "hn"],
          capturedAt: now.toISOString(),
          publishedAt: h.created_at,
        });
      }
    } catch (e) {
      log(`Show HN: ${(e as Error).message}`);
    }

    for (const sub of SUBREDDITS) {
      try {
        for (const p of await redditTop(sub.name, "week")) {
          if (sub.onlyBuilds && !BUILT.test(`${p.title} ${p.text}`)) continue;
          out.push({
            id: `builds:reddit:${p.url}`,
            sourceId: "builds",
            url: p.url,
            title: p.title,
            summary: p.text.slice(0, 300) || undefined,
            author: `r/${sub.name}`,
            imageUrl: p.thumbnail,
            metric: { label: `Rank in r/${sub.name} this week`, value: p.rank },
            topics: ["builds", "reddit"],
            capturedAt: now.toISOString(),
            publishedAt: p.published,
          });
        }
      } catch (e) {
        log(`r/${sub.name}: ${(e as Error).message}`);
      }
    }
    return out;
  },
};
