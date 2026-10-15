import type { Signal } from "@/lib/domain/types";
import { getJson, type SourceAdapter } from "./types";

// Gaming (20) and Entertainment (24) in the markets that matter most to us.
const QUERIES = [
  { region: "US", category: "20" },
  { region: "GB", category: "20" },
  { region: "US", category: "24" },
  { region: "CA", category: "24" },
];

interface VideoList {
  items: {
    id: string;
    snippet: { title: string; channelTitle: string; publishedAt: string; description: string; thumbnails: { high?: { url: string } } };
    statistics: { viewCount?: string };
  }[];
}

export const youtube: SourceAdapter = {
  id: "youtube",
  ready: () => !!process.env.YOUTUBE_API_KEY,
  async fetchSignals({ now, log }) {
    const key = process.env.YOUTUBE_API_KEY!;
    const seen = new Set<string>();
    const out: Signal[] = [];
    for (const q of QUERIES) {
      try {
        const res = await getJson<VideoList>(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&maxResults=25&regionCode=${q.region}&videoCategoryId=${q.category}&key=${key}`,
        );
        for (const v of res.items) {
          if (seen.has(v.id)) continue;
          seen.add(v.id);
          const views = Number(v.statistics.viewCount ?? 0);
          const hours = Math.max(1, (now.getTime() - new Date(v.snippet.publishedAt).getTime()) / 3_600_000);
          out.push({
            id: `youtube:${v.id}`,
            sourceId: "youtube",
            url: `https://www.youtube.com/watch?v=${v.id}`,
            title: v.snippet.title,
            summary: v.snippet.description.slice(0, 280),
            author: v.snippet.channelTitle,
            imageUrl: v.snippet.thumbnails.high?.url,
            metric: { label: "Views per hour since upload", value: Math.round(views / hours) },
            topics: [q.category === "20" ? "gaming" : "entertainment", q.region],
            capturedAt: now.toISOString(),
            publishedAt: v.snippet.publishedAt,
          });
        }
      } catch (e) {
        log(`YouTube ${q.region}/${q.category}: ${(e as Error).message}`);
      }
    }
    return out;
  },
};
