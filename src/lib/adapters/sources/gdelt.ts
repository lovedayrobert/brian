import type { Signal } from "@/lib/domain/types";
import { getJson, sleep, type SourceAdapter } from "./types";

/**
 * Topic watchlist. Each topic becomes one trend with a 30-day article-volume
 * series plus the latest articles as evidence. GDELT asks for at most one
 * request every 5 seconds, so a full sweep takes about a minute.
 */
export const GDELT_TOPICS: { id: string; label: string; query: string }[] = [
  { id: "crypto-casino", label: "Crypto casinos", query: '("crypto casino" OR "bitcoin casino" OR Stake.com OR Rollbit OR "Shuffle.com")' },
  { id: "streamer-gambling", label: "Streamers and gambling", query: "streamer (gambling OR casino OR Kick)" },
  { id: "memecoins", label: "Memecoins", query: "(memecoin OR \"meme coin\" OR pump.fun)" },
  { id: "crypto-exploits", label: "Crypto hacks and exploits", query: "crypto (exploit OR hack OR drained)" },
  { id: "gta6", label: "GTA 6", query: '("GTA 6" OR "GTA VI" OR "Grand Theft Auto VI")' },
  { id: "prediction-markets", label: "Prediction markets", query: "(Polymarket OR Kalshi)" },
];

interface Timeline {
  timeline?: { data: { date: string; value: number }[] }[];
}
interface ArtList {
  articles?: { url: string; title: string; seendate: string; socialimage?: string; domain: string }[];
}

const BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

export const gdelt: SourceAdapter = {
  id: "gdelt",
  ready: () => true,
  async fetchSignals({ now, log }) {
    const out: Signal[] = [];
    for (const [i, topic] of GDELT_TOPICS.entries()) {
      try {
        if (i > 0) await sleep(7_000);
        const q = encodeURIComponent(`${topic.query} sourcelang:english`);
        const tl = await getJson<Timeline>(`${BASE}?query=${q}&mode=timelinevolraw&format=json&timespan=30d&timelinesmooth=0`, { timeoutMs: 25_000 });
        await sleep(7_000);
        const arts = await getJson<ArtList>(`${BASE}?query=${q}&mode=artlist&format=json&maxrecords=12&sort=datedesc&timespan=3d`, { timeoutMs: 25_000 });
        const series = (tl.timeline?.[0]?.data ?? []).map((p) => ({
          date: `${p.date.slice(0, 4)}-${p.date.slice(4, 6)}-${p.date.slice(6, 8)}`,
          value: p.value,
        }));
        const articles = arts.articles ?? [];
        out.push({
          id: `gdelt:${topic.id}`,
          sourceId: "gdelt",
          url: `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&timespan=3d`,
          title: topic.label,
          summary: articles.slice(0, 3).map((a) => a.title.trim()).join(" · "),
          imageUrl: articles.find((a) => a.socialimage)?.socialimage,
          metric: { label: "Articles in the last day", value: series.at(-1)?.value ?? 0 },
          series,
          topics: [topic.id],
          capturedAt: now.toISOString(),
        });
        for (const a of articles) {
          out.push({
            id: `gdelt-article:${a.url}`,
            sourceId: "gdelt",
            url: a.url,
            title: a.title.replace(/\s+/g, " ").trim(),
            author: a.domain,
            imageUrl: a.socialimage,
            topics: [topic.id],
            capturedAt: now.toISOString(),
            publishedAt: parseGdeltDate(a.seendate),
          });
        }
      } catch (e) {
        // GDELT throttles by IP. One failure means the rest will fail too: stop and
        // let the sweep carry over the last good GDELT signals.
        log(`GDELT ${topic.label}: ${(e as Error).message}. Stopping GDELT for this sweep.`);
        break;
      }
    }
    return out;
  },
};

function parseGdeltDate(s: string): string {
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:00Z`;
}
