import { xBudget } from "@/lib/adapters/sources/x";
import { USER_AGENT } from "@/lib/adapters/sources/types";
import { repo } from "@/lib/store";

/**
 * "What did this brand do on this day?" (Rob, 22 Oct): pick a brand, a moment
 * and a year, and see their posts from around it, best first, so the team can
 * teach Brian the ones that worked.
 *
 * X's own API can't search old posts on pay-per-use (7 days only), and a
 * brand's timeline only reaches its 3,200 most recent posts (Stake's doesn't
 * reach Halloween 2025). So Brian tries, in order:
 *
 * 1. TwitterAPI.io (TWITTERAPI_IO_KEY): searches X's whole history by account
 *    and time window. About $0.003 per 20 posts.
 * 2. X's own timeline, when the window is within the brand's last 3,200 posts.
 *    $0.005 a post, from the X budget, capped per look.
 * 3. The Wayback Machine (free): archived copies of the brand's tweet pages.
 *    Every tweet id encodes its posting time, so they filter to the window
 *    exactly; fxtwitter (free) fills in the words and numbers. Coverage varies.
 *
 * And always: the exact search on X itself, one click, free while logged in.
 * No scraping with logged-in accounts: it breaks X's terms and gets accounts locked.
 */

export interface LookPost {
  id: string;
  url: string;
  text: string;
  at: string;
  likes?: number;
  reposts?: number;
  replies?: number;
  views?: number;
  via: "twitterapi" | "x" | "wayback";
  /** Images, and the still for videos and GIFs */
  media: { kind: "photo" | "video" | "gif"; url: string }[];
  author?: { name: string; avatar?: string };
}

/** Post text as people read it: no t.co links (the card links to the post), HTML entities decoded. */
export function tidyText(text: string): string {
  return text
    .replace(/https:\/\/t\.co\/\w+/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

const kindOf = (t?: string): "photo" | "video" | "gif" => (t === "video" ? "video" : t === "animated_gif" || t === "gif" ? "gif" : "photo");

export interface LookResult {
  handle: string;
  from: string;
  to: string;
  posts: LookPost[];
  routes: { name: string; ok: boolean; note: string }[];
  xSearchUrl: string;
  costUsd: number;
}

/** When a tweet was posted, from its id (X's ids carry a millisecond timestamp). */
export function tweetTime(id: string): number {
  return Number((BigInt(id) >> BigInt(22)) + BigInt(1288834974657));
}

export function cleanHandle(h: string): string {
  return h.trim().replace(/^@/, "").replace(/^(https?:\/\/)?(www\.)?(x|twitter)\.com\//i, "").split(/[/?#]/)[0];
}

/** The exact search on X, for anyone logged in. Free, any date. */
export function xSearchUrl(handle: string, from: string, to: string): string {
  return `https://x.com/search?q=${encodeURIComponent(`from:${handle} since:${from} until:${to}`)}&src=typed_query&f=top`;
}

const score = (p: LookPost) => (p.likes ?? 0) + 2 * (p.reposts ?? 0) + (p.replies ?? 0) + (p.views ?? 0) / 200;

async function json<T>(url: string, init?: RequestInit, ms = 20_000): Promise<{ status: number; body: T | null }> {
  try {
    const r = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, ...(init?.headers ?? {}) }, signal: AbortSignal.timeout(ms) });
    return { status: r.status, body: r.ok ? ((await r.json()) as T) : null };
  } catch {
    return { status: 0, body: null };
  }
}

export function twitterApiReady(): boolean {
  return !!process.env.TWITTERAPI_IO_KEY;
}

async function viaTwitterApi(handle: string, start: number, end: number, max: number): Promise<{ posts: LookPost[]; cost: number; note: string }> {
  type Res = {
    tweets: {
      id: string;
      url: string;
      text: string;
      createdAt: string;
      likeCount: number;
      retweetCount: number;
      replyCount: number;
      viewCount: number;
      isReply?: boolean;
      author?: { name?: string; profilePicture?: string };
      extendedEntities?: { media?: { type?: string; media_url_https?: string }[] };
    }[];
    has_next_page: boolean;
    next_cursor: string;
  };
  const posts: LookPost[] = [];
  let cursor = "";
  let cost = 0;
  for (let page = 0; page < Math.ceil(max / 20); page++) {
    const q = `from:${handle} since_time:${Math.floor(start / 1000)} until_time:${Math.floor(end / 1000)} -filter:replies`;
    const { status, body } = await json<Res>(`https://api.twitterapi.io/twitter/tweet/advanced_search?${new URLSearchParams({ query: q, queryType: "Top", cursor })}`, { headers: { "X-API-Key": process.env.TWITTERAPI_IO_KEY! } });
    if (!body) return { posts, cost, note: `TwitterAPI.io answered ${status}` };
    cost += Math.max(1, body.tweets.length) * 0.00015;
    for (const t of body.tweets)
      posts.push({
        id: t.id,
        url: t.url || `https://x.com/${handle}/status/${t.id}`,
        text: tidyText(t.text),
        at: new Date(t.createdAt).toISOString(),
        likes: t.likeCount,
        reposts: t.retweetCount,
        replies: t.replyCount,
        views: t.viewCount,
        via: "twitterapi",
        media: (t.extendedEntities?.media ?? []).filter((m) => m.media_url_https).map((m) => ({ kind: kindOf(m.type), url: m.media_url_https! })),
        author: t.author?.name ? { name: t.author.name, avatar: t.author.profilePicture } : undefined,
      });
    if (!body.has_next_page || !body.next_cursor) break;
    cursor = body.next_cursor;
  }
  return { posts, cost, note: `${posts.length} posts` };
}

async function viaXTimeline(handle: string, start: number, end: number, max: number): Promise<{ posts: LookPost[]; cost: number; note: string }> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) return { posts: [], cost: 0, note: "No X key" };
  const headers = { Authorization: `Bearer ${token}` };
  const user = await json<{ data?: { id: string; name: string; profile_image_url?: string } }>(`https://api.x.com/2/users/by/username/${handle}?user.fields=profile_image_url`, { headers });
  let cost = 0.01;
  if (!user.body?.data) return { posts: [], cost, note: `X couldn't find @${handle}` };
  const posts: LookPost[] = [];
  let token2 = "";
  while (posts.length < max) {
    const params = new URLSearchParams({ max_results: String(Math.min(100, Math.max(5, max - posts.length))), start_time: new Date(start).toISOString(), end_time: new Date(end).toISOString(), exclude: "retweets,replies", "tweet.fields": "created_at,public_metrics,attachments", expansions: "attachments.media_keys", "media.fields": "type,url,preview_image_url" });
    if (token2) params.set("pagination_token", token2);
    const { body } = await json<{
      data?: { id: string; text: string; created_at: string; attachments?: { media_keys?: string[] }; public_metrics: { like_count: number; retweet_count: number; reply_count: number; impression_count?: number } }[];
      includes?: { media?: { media_key: string; type: string; url?: string; preview_image_url?: string }[] };
      meta?: { next_token?: string };
    }>(`https://api.x.com/2/users/${user.body.data.id}/tweets?${params}`, { headers });
    const media = new Map((body?.includes?.media ?? []).map((m) => [m.media_key, m]));
    const author = { name: user.body.data.name, avatar: user.body.data.profile_image_url };
    const got = body?.data ?? [];
    cost += got.length * xBudget().price;
    for (const t of got)
      posts.push({
        id: t.id,
        url: `https://x.com/${handle}/status/${t.id}`,
        text: tidyText(t.text),
        at: t.created_at,
        likes: t.public_metrics.like_count,
        reposts: t.public_metrics.retweet_count,
        replies: t.public_metrics.reply_count,
        views: t.public_metrics.impression_count,
        via: "x",
        media: (t.attachments?.media_keys ?? []).flatMap((k) => {
          const m = media.get(k);
          const url = m?.url ?? m?.preview_image_url;
          return m && url ? [{ kind: kindOf(m.type), url }] : [];
        }),
        author,
      });
    if (!body?.meta?.next_token || !got.length) break;
    token2 = body.meta.next_token;
  }
  return { posts, cost, note: posts.length ? `${posts.length} posts` : "Too far back: X only keeps a brand's last 3,200 posts reachable" };
}

async function viaWayback(handle: string, start: number, end: number, max: number): Promise<{ posts: LookPost[]; note: string }> {
  // Archived copies are made after posting, so look at captures from the window to three months on.
  const day = (t: number) => new Date(t).toISOString().slice(0, 10).replace(/-/g, "");
  const ids = new Set<string>();
  let blocked = false;
  for (const host of ["twitter.com", "x.com"]) {
    const url = `https://web.archive.org/cdx/search/cdx?${new URLSearchParams({ url: `${host}/${handle}/status/`, matchType: "prefix", from: day(start), to: day(end + 90 * 86_400_000), output: "json", fl: "original", collapse: "urlkey", limit: "5000" })}`;
    const { status, body } = await json<string[][]>(url, undefined, 60_000);
    if (!body) {
      blocked = blocked || status === 429;
      continue;
    }
    for (const [original] of body.slice(1)) {
      const id = original.match(/\/status(?:es)?\/(\d{6,})/)?.[1];
      if (id && tweetTime(id) >= start && tweetTime(id) <= end) ids.add(id);
    }
  }
  if (!ids.size) return { posts: [], note: blocked ? "The Wayback Machine is busy; try again in a minute" : "Nothing archived from that window" };
  const posts: LookPost[] = [];
  for (const id of [...ids].slice(0, max)) {
    const { body } = await json<{
      tweet?: {
        text: string;
        created_at: string;
        likes: number;
        retweets: number;
        replies: number;
        views?: number;
        author: { screen_name: string; name?: string; avatar_url?: string };
        media?: { all?: { type: string; url: string; thumbnail_url?: string }[] };
      };
    }>(`https://api.fxtwitter.com/${handle}/status/${id}`);
    const t = body?.tweet;
    posts.push(
      t
        ? {
            id,
            url: `https://x.com/${t.author.screen_name}/status/${id}`,
            text: tidyText(t.text),
            at: new Date(t.created_at).toISOString(),
            likes: t.likes,
            reposts: t.retweets,
            replies: t.replies,
            views: t.views,
            via: "wayback",
            media: (t.media?.all ?? []).map((m) => ({ kind: kindOf(m.type), url: m.type === "photo" ? m.url : (m.thumbnail_url ?? m.url) })),
            author: { name: t.author.name ?? t.author.screen_name, avatar: t.author.avatar_url },
          }
        : { id, url: `https://x.com/${handle}/status/${id}`, text: "(deleted or unavailable now)", at: new Date(tweetTime(id)).toISOString(), via: "wayback", media: [] },
    );
  }
  return { posts, note: `${posts.length} archived posts` };
}

/**
 * Look back at a brand's posts between two dates (YYYY-MM-DD, inclusive).
 * Paid routes are skipped unless allowPaid; X spend counts against the X budget.
 */
export async function lookBack(input: { handle: string; from: string; to: string; allowPaid: boolean; max?: number }): Promise<LookResult> {
  const handle = cleanHandle(input.handle);
  if (!/^\w{1,15}$/.test(handle)) throw new Error("Give an X handle, like @stake.");
  const start = Date.parse(`${input.from}T00:00:00Z`);
  const end = Date.parse(`${input.to}T23:59:59Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) throw new Error("Pick a start and an end date.");
  if (end - start > 45 * 86_400_000) throw new Error("Keep it to 45 days or less, around one moment.");
  const max = Math.min(60, input.max ?? 40);
  const routes: LookResult["routes"] = [];
  let posts: LookPost[] = [];
  let costUsd = 0;
  let xCost = 0;

  if (twitterApiReady() && input.allowPaid) {
    const r = await viaTwitterApi(handle, start, end, max);
    routes.push({ name: "Full X history (TwitterAPI.io)", ok: r.posts.length > 0, note: r.note });
    posts = r.posts;
    costUsd += r.cost;
  }
  // X's own timeline only reaches recent posts; worth trying for the last year.
  if (!posts.length && input.allowPaid && Date.now() - end < 400 * 86_400_000) {
    const db = await repo.read();
    const month = new Date().toISOString().slice(0, 7);
    const spent = db.xState?.month === month ? db.xState.monthUsd : 0;
    if (xBudget().monthUsd - spent < max * xBudget().price + 0.01) routes.push({ name: "X timeline", ok: false, note: "Not enough X budget left this month" });
    else {
      const r = await viaXTimeline(handle, start, end, max);
      routes.push({ name: "X timeline", ok: r.posts.length > 0, note: r.note });
      posts = r.posts;
      costUsd += r.cost;
      xCost = r.cost;
    }
  }
  if (posts.length < 5) {
    const r = await viaWayback(handle, start, end, max);
    routes.push({ name: "Wayback Machine (free)", ok: r.posts.length > 0, note: r.note });
    const have = new Set(posts.map((p) => p.id));
    posts = [...posts, ...r.posts.filter((p) => !have.has(p.id))];
  }
  if (xCost > 0) {
    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const day = now.toISOString().slice(0, 10);
    await repo.update((d) => {
      const s = d.xState;
      d.xState = { ...(s ?? { pulls: 0, posts: [] }), month, monthUsd: (s?.month === month ? s.monthUsd : 0) + xCost, day, dayUsd: (s?.day === day ? s.dayUsd : 0) + xCost } as NonNullable<typeof d.xState>;
    });
  }
  return { handle, from: input.from, to: input.to, posts: posts.sort((a, b) => score(b) - score(a)), routes, xSearchUrl: xSearchUrl(handle, input.from, input.to), costUsd: Math.round(costUsd * 1000) / 1000 };
}
