import type { Swipe } from "@/lib/domain/types";
import { newId, repo } from "@/lib/store";
import { USER_AGENT } from "@/lib/adapters/sources/types";
import { logActivity } from "@/lib/activity";

/**
 * The team swipe file (Marko's advice): Brian needs to see what the team
 * finds clever, not to copy it but to learn how far outside the box to go.
 * Links are read through free public endpoints: fxtwitter for X, oEmbed for
 * TikTok and YouTube, page metadata for anything else. No AI cost.
 */
interface Meta {
  title: string;
  author?: string;
  platform: string;
  metrics?: Record<string, number>;
  /** Full words of the post, or the start of the page */
  text?: string;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(12_000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function readLink(url: string): Promise<Meta> {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com") {
    const m = u.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
    const j = m
      ? await getJson<{ tweet?: { text: string; author: { screen_name: string }; likes: number; retweets: number; replies: number; views?: number; bookmarks?: number; created_at?: string; media?: { all?: { type: string }[] }; quote?: { text: string; author: { screen_name: string } } } }>(
          `https://api.fxtwitter.com/${m[1]}/status/${m[2]}`,
        )
      : null;
    if (j?.tweet) {
      const t = j.tweet;
      return {
        title: t.text || "(video or image post)",
        text: [t.text, t.media?.all?.length ? `[${t.media.all.map((x) => x.type).join(", ")} attached]` : "", t.quote ? `Quoting @${t.quote.author.screen_name}: ${t.quote.text}` : ""].filter(Boolean).join("\n"),
        author: `@${t.author.screen_name}`,
        platform: "X",
        metrics: Object.fromEntries(Object.entries({ views: t.views, likes: t.likes, reposts: t.retweets, replies: t.replies, bookmarks: t.bookmarks }).filter(([, v]) => typeof v === "number")) as Record<string, number>,
      };
    }
    return { title: url, platform: "X" };
  }
  if (host.endsWith("tiktok.com")) {
    const j = await getJson<{ title: string; author_name: string }>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
    return { title: j?.title || url, author: j?.author_name, platform: "TikTok" };
  }
  if (host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com") {
    const j = await getJson<{ title: string; author_name: string }>(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    return { title: j?.title || url, author: j?.author_name, platform: "YouTube" };
  }
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(12_000) });
    const html = (await r.text()).slice(0, 200_000);
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<title[^>]*>([^<]+)/i)?.[1];
    const desc = html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']+)/i)?.[1];
    const body = html
      .replace(/<(script|style|nav|header|footer)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    return { title: og?.trim() || url, platform: host, text: [desc, body.slice(0, 6000)].filter(Boolean).join("\n") };
  } catch {
    return { title: url, platform: host };
  }
}

export async function addSwipe(input: { url: string; why: string; by: string; title?: string; event?: string; owner?: Swipe["owner"] }): Promise<Swipe> {
  let url: URL;
  try {
    url = new URL(input.url.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    throw new Error("Paste a full link, starting with https://");
  }
  const meta = await readLink(url.toString());
  const swipe: Swipe = {
    id: newId("swipe"),
    url: url.toString(),
    title: input.title?.trim() || meta.title.slice(0, 500),
    author: meta.author,
    platform: meta.platform,
    metrics: meta.metrics,
    text: meta.text?.slice(0, 8000),
    event: input.event?.trim().slice(0, 80) || undefined,
    owner: input.owner,
    why: input.why.trim().slice(0, 1000),
    addedBy: input.by,
    addedAt: new Date().toISOString(),
  };
  await repo.update((d) => {
    d.swipes = [swipe, ...(d.swipes ?? []).filter((s) => s.url !== swipe.url)];
    logActivity(d, { by: input.by, type: "swipe.added", text: `added to Learning: “${swipe.title.slice(0, 100)}”`, ref: { kind: "swipe", id: swipe.id, label: swipe.title.slice(0, 60) } });
  });
  return swipe;
}

export async function removeSwipe(id: string) {
  await repo.update((d) => {
    d.swipes = (d.swipes ?? []).filter((s) => s.id !== id);
  });
}

const fmt = (m?: Record<string, number>) =>
  m && Object.keys(m).length ? ` (${Object.entries(m).map(([k, v]) => `${v.toLocaleString("en-US")} ${k}`).join(", ")})` : "";

export function swipeLine(s: Swipe): string {
  return `- [${s.platform}${s.author ? ` ${s.author}` : ""}] ${s.title.slice(0, 200)}${fmt(s.metrics)}\n  Why the team likes it: ${s.why}`;
}

/** The team's taste, for the Inventor and the panel. */
export function swipeContext(swipes: Swipe[] | undefined, n = 15): string {
  if (!swipes?.length) return "";
  return `<team_taste note="Things the Cashy team finds clever. Work out WHY each one worked (the feeling it used, the collision, the timing, who shared it and why) and use that. Never reuse their concept, object, format or target: that is copying, and copies are killed.">\n${swipes.slice(0, n).map(swipeLine).join("\n")}\n</team_taste>`;
}
