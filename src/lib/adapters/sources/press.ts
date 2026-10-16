import { XMLParser } from "fast-xml-parser";
import type { Signal } from "@/lib/domain/types";
import { USER_AGENT, type SourceAdapter } from "./types";
import { mapLimit } from "./wikipedia";

/**
 * "trade" feeds (iGaming and institutional crypto news) power Competitors and
 * the Industry filter. Everything else is culture: what people actually talk about.
 */
export type FeedKind = "trade" | "crypto-culture" | "streaming" | "internet" | "gaming" | "tech";

export const PRESS_FEEDS: { id: string; name: string; url: string; kind: FeedKind }[] = [
  // Culture: streamers, creators, memes, internet weirdness
  { id: "dexerto-kick", name: "Dexerto", url: "https://www.dexerto.com/kick/feed/", kind: "streaming" },
  { id: "dexerto-twitch", name: "Dexerto", url: "https://www.dexerto.com/twitch/feed/", kind: "streaming" },
  { id: "dexerto-youtube", name: "Dexerto", url: "https://www.dexerto.com/youtube/feed/", kind: "streaming" },
  { id: "dexerto-tiktok", name: "Dexerto", url: "https://www.dexerto.com/tiktok/feed/", kind: "internet" },
  { id: "dexerto-ent", name: "Dexerto", url: "https://www.dexerto.com/entertainment/feed/", kind: "internet" },
  { id: "dailydot", name: "Daily Dot", url: "https://www.dailydot.com/feed/", kind: "internet" },
  { id: "404media", name: "404 Media", url: "https://www.404media.co/rss/", kind: "internet" },
  { id: "kotaku", name: "Kotaku", url: "https://kotaku.com/rss", kind: "gaming" },
  { id: "polygon", name: "Polygon", url: "https://www.polygon.com/rss/index.xml", kind: "gaming" },
  // Tech and Elon-world: launches and stunts the crypto crowd memes instantly
  { id: "electrek", name: "Electrek", url: "https://electrek.co/feed/", kind: "tech" },
  { id: "teslarati", name: "Teslarati", url: "https://www.teslarati.com/feed/", kind: "tech" },
  { id: "verge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", kind: "tech" },
  { id: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", kind: "tech" },
  { id: "engadget", name: "Engadget", url: "https://www.engadget.com/rss.xml", kind: "tech" },
  // Crypto culture: drama, exploits, scandals
  { id: "protos", name: "Protos", url: "https://protos.com/feed/", kind: "crypto-culture" },
  { id: "rekt", name: "Rekt News", url: "https://rekt.news/rss/feed.xml", kind: "crypto-culture" },
  { id: "decrypt", name: "Decrypt", url: "https://decrypt.co/feed", kind: "trade" },
  // Trade
  { id: "nextio", name: "Next.io", url: "https://next.io/feed/", kind: "trade" },
  { id: "sbc", name: "SBC News", url: "https://sbcnews.co.uk/feed/", kind: "trade" },
  { id: "igb", name: "iGaming Business", url: "https://igamingbusiness.com/feed/", kind: "trade" },
  { id: "igamingexpert", name: "iGaming Expert", url: "https://igamingexpert.com/feed/", kind: "trade" },
  { id: "coindesk", name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", kind: "trade" },
  { id: "cointelegraph", name: "Cointelegraph", url: "https://cointelegraph.com/rss", kind: "trade" },
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const MAX_AGE_MS = 4 * 86_400_000;

type AtomEntry = {
  title?: string | { "#text": string };
  link?: { "@href"?: string; "@rel"?: string } | { "@href"?: string; "@rel"?: string }[];
  published?: string;
  updated?: string;
  summary?: string | { "#text": string };
};

type RssItem = {
  title?: string | { "#text": string };
  link?: string;
  pubDate?: string;
  description?: string;
  "media:content"?: { "@url"?: string } | { "@url"?: string }[];
  "media:thumbnail"?: { "@url"?: string };
  enclosure?: { "@url"?: string };
};

export const press: SourceAdapter = {
  id: "press",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const lists = await mapLimit(PRESS_FEEDS, 5, async (feed) => {
      try {
        const res = await fetch(feed.url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`${res.status}`);
        const xml = parser.parse(await res.text());
        // RSS (<item>) or Atom (<entry>, used by The Verge)
        const atom: AtomEntry[] = [xml?.feed?.entry ?? []].flat();
        const items: RssItem[] = [
          ...[xml?.rss?.channel?.item ?? []].flat(),
          ...atom.map((e) => ({
            title: typeof e.title === "object" ? e.title["#text"] : e.title,
            link: [e.link].flat().find((l) => l?.["@rel"] !== "edit")?.["@href"],
            pubDate: e.published ?? e.updated,
            description: typeof e.summary === "object" ? e.summary["#text"] : e.summary,
          })),
        ];
        return items.slice(0, 30).flatMap((it): Signal[] => {
          const title = clean(typeof it.title === "object" ? it.title["#text"] : it.title);
          const link = it.link;
          if (!title || !link) return [];
          const published = it.pubDate ? new Date(it.pubDate) : null;
          if (published && now.getTime() - published.getTime() > MAX_AGE_MS) return [];
          const media = [it["media:content"]].flat()[0]?.["@url"] ?? it["media:thumbnail"]?.["@url"] ?? it.enclosure?.["@url"];
          return [
            {
              id: `press:${link}`,
              sourceId: "press",
              url: link,
              title,
              summary: clean(it.description)?.slice(0, 300),
              author: feed.name,
              imageUrl: media,
              topics: [feed.kind],
              capturedAt: now.toISOString(),
              publishedAt: published?.toISOString(),
            },
          ];
        });
      } catch (e) {
        log(`${feed.name}: ${(e as Error).message}`);
        return [];
      }
    });
    // Category feeds overlap (Dexerto); keep each article once.
    const seen = new Set<string>();
    return lists.flat().filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  },
};

function clean(s?: string): string | undefined {
  if (!s) return undefined;
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
