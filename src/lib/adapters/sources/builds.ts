import { XMLParser } from "fast-xml-parser";
import type { Signal } from "@/lib/domain/types";
import { getJson, sleep, USER_AGENT, type SourceAdapter } from "./types";

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
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

interface HnHits {
  hits: { objectID: string; title: string; url?: string; points: number; num_comments: number; author: string; created_at: string; story_text?: string }[];
}

type RedditEntry = {
  title?: string;
  link?: { "@href"?: string };
  published?: string;
  author?: { name?: string };
  content?: string | { "#text": string };
  "media:thumbnail"?: { "@url"?: string };
};

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

    for (const [i, sub] of SUBREDDITS.entries()) {
      if (i) await sleep(3_000); // Reddit rate-limits back-to-back requests
      try {
        const get = () =>
          fetch(`https://www.reddit.com/r/${sub.name}/top/.rss?t=week&limit=25`, {
            headers: { "User-Agent": `Mozilla/5.0 ${USER_AGENT}` },
            signal: AbortSignal.timeout(20_000),
          });
        let res = await get();
        if (res.status === 429) {
          await sleep(10_000);
          res = await get();
        }
        if (!res.ok) throw new Error(`${res.status}`);
        const entries: RedditEntry[] = [parser.parse(await res.text())?.feed?.entry ?? []].flat();
        entries.forEach((e, rank) => {
          const title = e.title?.trim();
          const url = e.link?.["@href"];
          if (!title || !url) return;
          const text = stripHtml(typeof e.content === "object" ? e.content["#text"] : e.content) ?? "";
          if (sub.onlyBuilds && !BUILT.test(`${title} ${text}`)) return;
          out.push({
            id: `builds:reddit:${url}`,
            sourceId: "builds",
            url,
            title,
            summary: text.replace(/submitted by .*$/i, "").trim().slice(0, 300) || undefined,
            author: `r/${sub.name}`,
            imageUrl: e["media:thumbnail"]?.["@url"],
            metric: { label: `Rank in r/${sub.name} this week`, value: rank + 1 },
            topics: ["builds", "reddit"],
            capturedAt: now.toISOString(),
            publishedAt: e.published,
          });
        });
      } catch (e) {
        log(`r/${sub.name}: ${(e as Error).message}`);
      }
    }
    return out;
  },
};

function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#32;/g, " ")
    .replace(/\[link\]|\[comments\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
