import { createHmac, randomBytes } from "node:crypto";

/**
 * The X API, reading only our own account (@PlayCashy), which is the cheapest
 * rate under X's pay-per-use pricing. Signed as the account itself (OAuth 1.0a
 * user context), which also unlocks impressions and link clicks on posts from
 * the last 30 days. Needs X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN,
 * X_ACCESS_SECRET from the app in X's developer portal.
 *
 * Money: every post read is billed, so Brian keeps its own count and stops at
 * X_MAX_READS_PER_MONTH (default 1,000). At X's standard $0.005 per post that's
 * at most $5 a month; at the own-account rate, far less. Set a spending limit
 * in the developer portal as well.
 */
export function xReady(): boolean {
  return !!(process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_SECRET);
}

export const xMaxReads = () => Number(process.env.X_MAX_READS_PER_MONTH) || 1000;

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** OAuth 1.0a HMAC-SHA1 signature (exported for the test against X's documented example). */
export function oauthSignature(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string): string {
  const paramString = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join("&");
  const base = `${method.toUpperCase()}&${enc(url)}&${enc(paramString)}`;
  return createHmac("sha1", `${enc(consumerSecret)}&${enc(tokenSecret)}`).update(base).digest("base64");
}

async function xGet<T>(path: string, query: Record<string, string>): Promise<T> {
  const url = `https://api.x.com${path}`;
  const oauth: Record<string, string> = {
    oauth_consumer_key: process.env.X_API_KEY!,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: process.env.X_ACCESS_TOKEN!,
    oauth_version: "1.0",
  };
  oauth.oauth_signature = oauthSignature("GET", url, { ...oauth, ...query }, process.env.X_API_SECRET!, process.env.X_ACCESS_SECRET!);
  const header = "OAuth " + Object.keys(oauth).sort().map((k) => `${enc(k)}="${enc(oauth[k])}"`).join(", ");
  const res = await fetch(`${url}?${new URLSearchParams(query)}`, { headers: { Authorization: header }, signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as T & { errors?: { message?: string; detail?: string }[]; detail?: string; title?: string };
  if (!res.ok) throw new Error(`X API ${res.status}: ${j.detail ?? j.title ?? j.errors?.[0]?.message ?? "error"}`);
  return j;
}

export interface XPost {
  id: string;
  text: string;
  createdAt: string;
  views?: number;
  likes: number;
  reposts: number;
  replies: number;
  saves?: number;
  clicks?: number;
}

/** The signed-in account (one user read, done once and remembered). */
export async function xMe(): Promise<{ id: string; username: string }> {
  const r = await xGet<{ data: { id: string; username: string } }>("/2/users/me", {});
  return r.data;
}

/** Our latest posts with their numbers. `max` is the number of post reads it costs. */
export async function xOwnPosts(userId: string, max: number): Promise<XPost[]> {
  type Tweet = {
    id: string;
    text: string;
    created_at: string;
    public_metrics: { retweet_count: number; reply_count: number; like_count: number; quote_count: number; bookmark_count?: number; impression_count?: number };
    non_public_metrics?: { impression_count?: number; url_link_clicks?: number };
  };
  const fields = { "tweet.fields": "created_at,public_metrics,non_public_metrics", exclude: "retweets,replies", max_results: String(Math.max(5, Math.min(100, max))) };
  let r: { data?: Tweet[] };
  try {
    r = await xGet("/2/users/" + userId + "/tweets", fields);
  } catch (e) {
    // Impressions need the account's own sign-in and posts under 30 days old; fall back to public numbers.
    if (!/non_public|field/i.test((e as Error).message)) throw e;
    r = await xGet("/2/users/" + userId + "/tweets", { ...fields, "tweet.fields": "created_at,public_metrics" });
  }
  return (r.data ?? []).map((t) => ({
    id: t.id,
    text: t.text,
    createdAt: t.created_at,
    views: t.non_public_metrics?.impression_count ?? t.public_metrics.impression_count,
    likes: t.public_metrics.like_count,
    reposts: t.public_metrics.retweet_count + t.public_metrics.quote_count,
    replies: t.public_metrics.reply_count,
    saves: t.public_metrics.bookmark_count,
    clicks: t.non_public_metrics?.url_link_clicks,
  }));
}

/** App-only reads (search) need just the app's Bearer Token. */
export function xSearchReady(): boolean {
  return !!process.env.X_BEARER_TOKEN;
}

export interface XSearchPost extends XPost {
  author: string;
  authorName: string;
  followers?: number;
}

/**
 * Recent search, top results first. `max` (10-100) is the number of post
 * reads it costs. Bills per post returned under X's pay-per-use pricing.
 */
export async function xSearch(query: string, max: number, sort: "relevancy" | "recency" = "relevancy"): Promise<XSearchPost[]> {
  type Tweet = { id: string; text: string; created_at: string; author_id: string; public_metrics: { retweet_count: number; reply_count: number; like_count: number; quote_count: number; bookmark_count?: number; impression_count?: number } };
  type User = { id: string; username: string; name: string; public_metrics?: { followers_count: number } };
  const params = new URLSearchParams({
    query,
    max_results: String(Math.max(10, Math.min(100, max))),
    sort_order: sort,
    "tweet.fields": "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields": "username,name,public_metrics",
  });
  const res = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, { headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }, signal: AbortSignal.timeout(20_000) });
  const j = (await res.json().catch(() => ({}))) as { data?: Tweet[]; includes?: { users?: User[] }; detail?: string; title?: string };
  if (!res.ok) throw new Error(`X API ${res.status}: ${j.detail ?? j.title ?? "error"}`);
  const users = new Map((j.includes?.users ?? []).map((u) => [u.id, u]));
  return (j.data ?? []).map((t) => {
    const u = users.get(t.author_id);
    return {
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
      views: t.public_metrics.impression_count,
      likes: t.public_metrics.like_count,
      reposts: t.public_metrics.retweet_count + t.public_metrics.quote_count,
      replies: t.public_metrics.reply_count,
      saves: t.public_metrics.bookmark_count,
      author: u?.username ?? t.author_id,
      authorName: u?.name ?? "",
      followers: u?.public_metrics?.followers_count,
    };
  });
}
