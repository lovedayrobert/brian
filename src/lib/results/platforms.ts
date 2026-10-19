import { USER_AGENT } from "@/lib/adapters/sources/types";

/**
 * Stats for a published post, from free public sources where they exist:
 * X (through fxtwitter), Telegram (public channel embeds) and YouTube (with a
 * key). Instagram, TikTok and Discord need their own access; until then the
 * team enters numbers by hand.
 */
export type Platform = "X" | "Telegram" | "YouTube" | "Instagram" | "TikTok" | "Discord" | "Kick" | "Blog" | "Website" | "Other";

export interface Stats {
  views?: number;
  likes?: number;
  reposts?: number;
  replies?: number;
  saves?: number;
  clicks?: number;
}

export function platformOf(url: string): Platform {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") return "X";
  if (host === "t.me" || host === "telegram.me") return "Telegram";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "YouTube";
  if (host.endsWith("instagram.com")) return "Instagram";
  if (host.endsWith("tiktok.com")) return "TikTok";
  if (host.endsWith("discord.com") || host.endsWith("discord.gg")) return "Discord";
  if (host.endsWith("kick.com")) return "Kick";
  if (/\/(articles|blog)\//.test(new URL(url).pathname)) return "Blog";
  return "Website";
}

/** Platforms Brian can read on its own today. */
export const AUTO: Platform[] = ["X", "Telegram", "YouTube"];

/** "1.58M" → 1580000 */
export function parseCount(s: string): number | undefined {
  const m = s.trim().replace(/,/g, "").match(/^([\d.]+)\s*([KMB])?$/i);
  if (!m) return undefined;
  const n = Number(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? "").toUpperCase() as "K" | "M" | "B"] ?? 1);
  return Math.round(n);
}

export async function fetchStats(url: string): Promise<Stats | null> {
  const u = new URL(url);
  const platform = platformOf(url);
  const get = (href: string) => fetch(href, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(15_000) });
  if (platform === "X") {
    const m = u.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
    if (!m) return null;
    const r = await get(`https://api.fxtwitter.com/${m[1]}/status/${m[2]}`);
    if (!r.ok) return null;
    const t = ((await r.json()) as { tweet?: { views?: number; likes: number; retweets: number; replies: number; bookmarks?: number } }).tweet;
    return t ? { views: t.views, likes: t.likes, reposts: t.retweets, replies: t.replies, saves: t.bookmarks } : null;
  }
  if (platform === "Telegram") {
    const m = u.pathname.match(/^\/(?:s\/)?([\w]+)\/(\d+)/);
    if (!m) return null;
    const r = await get(`https://t.me/${m[1]}/${m[2]}?embed=1`);
    if (!r.ok) return null;
    const html = await r.text();
    const views = html.match(/tgme_widget_message_views">([^<]+)</)?.[1];
    return views ? { views: parseCount(views) } : null;
  }
  if (platform === "YouTube" && process.env.YOUTUBE_API_KEY) {
    const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : (u.searchParams.get("v") ?? u.pathname.match(/\/shorts\/([\w-]+)/)?.[1]);
    if (!id) return null;
    const r = await get(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${id}&key=${process.env.YOUTUBE_API_KEY}`);
    const s = ((await r.json()) as { items?: { statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }[] }).items?.[0]?.statistics;
    return s ? { views: Number(s.viewCount ?? 0), likes: Number(s.likeCount ?? 0), replies: Number(s.commentCount ?? 0) } : null;
  }
  return null;
}

/** Engagements = everything but views and clicks. */
export function engagements(s: Stats | undefined): number {
  if (!s) return 0;
  return (s.likes ?? 0) + (s.reposts ?? 0) + (s.replies ?? 0) + (s.saves ?? 0);
}
