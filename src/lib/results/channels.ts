import { USER_AGENT } from "@/lib/adapters/sources/types";
import { newId, repo } from "@/lib/store";
import { parseCount } from "./platforms";
import { xMaxReads, xMe, xOwnPosts, xReady } from "@/lib/integrations/x";
import type { Publication } from "./publications";

/**
 * Our own channels, read from public pages with no access needed:
 *  - Telegram: subscribers, and every recent post with its views, so all
 *    channel posts are tracked without anyone pasting links.
 *  - X: followers and post count (individual posts still need their link, or
 *    an X feed).
 * BRIAN_CHANNELS lists them, e.g. "telegram:playcashy,x:playcashy".
 */
export interface ChannelSnapshot {
  at: string;
  channel: string; // "telegram:playcashy"
  followers: number;
  posts?: number;
}

export function channels(): { platform: "telegram" | "x"; handle: string; key: string }[] {
  return (process.env.BRIAN_CHANNELS || "telegram:playcashy,x:playcashy")
    .split(",")
    .map((s) => s.trim().split(":"))
    .filter(([p, h]) => (p === "telegram" || p === "x") && h)
    .map(([p, h]) => ({ platform: p as "telegram" | "x", handle: h, key: `${p}:${h.toLowerCase()}` }));
}

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#33;/g, "!")
    .replace(/&#036;/g, "$")
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function readTelegram(handle: string) {
  const html = await (await fetch(`https://t.me/s/${handle}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) })).text();
  const subscribers = parseCount(html.match(/counter_value">([^<]+)<\/span> <span class="counter_type">subscribers/)?.[1] ?? "") ?? 0;
  const posts = html
    .split('class="tgme_widget_message_wrap')
    .slice(1)
    .flatMap((block) => {
      const id = block.match(/data-post="[^/]+\/(\d+)"/)?.[1];
      const views = block.match(/tgme_widget_message_views">([^<]+)</)?.[1];
      const date = block.match(/<time datetime="([^"]+)"/)?.[1];
      if (!id || !date) return [];
      const text = decode(block.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
      return [{ id, url: `https://t.me/${handle}/${id}`, text, date: new Date(date).toISOString(), views: views ? parseCount(views) : undefined }];
    });
  return { subscribers, posts };
}

export async function readX(handle: string) {
  const r = await fetch(`https://api.fxtwitter.com/${handle}`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  const u = ((await r.json()) as { user?: { followers: number; tweets: number } }).user;
  if (!u) throw new Error(`Couldn't read @${handle}`);
  return { followers: u.followers, posts: u.tweets };
}

/** Record follower counts (at most every 12 hours) and pick up new Telegram posts. */
export async function snapshotChannels(): Promise<void> {
  const db = await repo.read();
  const now = new Date().toISOString();
  for (const c of channels()) {
    try {
      const last = (db.channelStats ?? []).filter((s) => s.channel === c.key).pop();
      if (c.platform === "telegram") {
        const t = await readTelegram(c.handle);
        const known = new Set((db.publications ?? []).map((p) => p.url));
        const fresh: Publication[] = t.posts
          .filter((p) => !known.has(p.url) && Date.now() - new Date(p.date).getTime() < 30 * 86_400_000)
          .map((p) => ({
            id: newId("pub"),
            taskId: `channel:${c.key}`,
            taskTitle: p.text ? p.text.slice(0, 90) + (p.text.length > 90 ? "…" : "") : `Telegram post ${p.id}`,
            taskDate: p.date.slice(0, 10),
            campaign: "",
            url: p.url,
            platform: "Telegram",
            addedBy: "brian",
            addedAt: p.date, // checkpoints count from when it was posted
            snapshots: p.views !== undefined ? [{ at: now, source: "auto", views: p.views }] : [],
          }));
        await repo.update((d) => {
          d.publications = [...(d.publications ?? []), ...fresh];
          if (!last || Date.now() - new Date(last.at).getTime() > 12 * 3_600_000) d.channelStats = [...(d.channelStats ?? []), { at: now, channel: c.key, followers: t.subscribers, posts: t.posts.length }];
        });
      } else {
        if (!last || Date.now() - new Date(last.at).getTime() > 12 * 3_600_000) {
          const x = await readX(c.handle);
          await repo.update((d) => {
            d.channelStats = [...(d.channelStats ?? []), { at: now, channel: c.key, followers: x.followers, posts: x.posts }];
          });
        }
        if (xReady()) await readOwnXPosts(c.key);
      }
    } catch (e) {
      console.error(`Channel ${c.key}:`, (e as Error).message);
    }
  }
}

/**
 * With the X API connected: once a day, our latest 20 posts with impressions,
 * likes, reposts, replies, saves and link clicks. Every post read is counted
 * and Brian stops at X_MAX_READS_PER_MONTH, so the X bill can't run away.
 */
async function readOwnXPosts(key: string) {
  const db = await repo.read();
  const month = new Date().toISOString().slice(0, 7);
  const usage = db.xUsage?.month === month ? db.xUsage : { month, reads: 0, lastPull: undefined as string | undefined, userId: db.xUsage?.userId };
  if (usage.lastPull && Date.now() - new Date(usage.lastPull).getTime() < 23 * 3_600_000) return;
  const want = 20;
  if (usage.reads + want + (usage.userId ? 0 : 1) > xMaxReads()) {
    console.error(`X: monthly read limit reached (${usage.reads}/${xMaxReads()}).`);
    return;
  }
  let userId = usage.userId;
  if (!userId) {
    userId = (await xMe()).id;
    usage.reads += 1;
  }
  const posts = await xOwnPosts(userId, want);
  usage.reads += posts.length;
  const at = new Date().toISOString();
  await repo.update((d) => {
    d.publications ??= [];
    for (const p of posts) {
      const url = `https://x.com/${key.split(":")[1]}/status/${p.id}`;
      const snap = { at, source: "auto" as const, views: p.views, likes: p.likes, reposts: p.reposts, replies: p.replies, saves: p.saves, clicks: p.clicks };
      const existing = d.publications.find((x) => x.url === url || x.url.endsWith(`/status/${p.id}`));
      if (existing) existing.snapshots.push(snap);
      else
        d.publications.push({
          id: newId("pub"),
          taskId: `channel:${key}`,
          taskTitle: p.text.slice(0, 90) + (p.text.length > 90 ? "…" : ""),
          taskDate: p.createdAt.slice(0, 10),
          campaign: "",
          url,
          platform: "X",
          addedBy: "brian",
          addedAt: p.createdAt,
          snapshots: [snap],
        });
    }
    d.xUsage = { ...usage, userId, lastPull: at };
  });
}
