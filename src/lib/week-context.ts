import { AUDIENCE_SUBS } from "@/lib/adapters/sources/audience";
import { USER_AGENT } from "@/lib/adapters/sources/types";
import { twitterApiReady, tidyText } from "@/lib/lookback";
import { repo } from "@/lib/store";

/**
 * "What else was happening that week?" (Marko, 27 Oct): for any past window,
 * what the world was paying attention to, so a brand's post is read in its
 * moment, not in a vacuum. Each source is one that can answer for a past date:
 *
 * - Wikipedia's most-read pages (free): the best single measure of attention.
 * - The news (Wikipedia's daily "Current events", free): the day's main stories.
 * - The biggest posts on X (TwitterAPI.io): anyone's posts with 100K+ likes, about $0.002.
 * - Reddit (Arctic Shift, free): top posts in our audience's communities.
 *
 * TikTok, Instagram and Google Trends don't publish what was trending on a past
 * day, so they're not here. Results are cached per window: looking again is free.
 */

export interface WeekItem {
  title: string;
  url: string;
  /** "352K views", "4.1K upvotes", "@elonmusk · 458K likes" */
  meta: string;
}

export interface WeekContext {
  from: string;
  to: string;
  at: string;
  summary?: string;
  reading: WeekItem[];
  news: WeekItem[];
  x: WeekItem[];
  reddit: WeekItem[];
  costUsd: number;
  missing: string[];
}

const k = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : String(v));
const days = (from: string, to: string) => {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`) && out.length < 10; t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};

/** Wikimedia asks tools to say who they are, with a way to reach them. */
const WIKI_UA = "BrianMarketingTool/1.0 (https://cashy.com; low-volume research)";
const wiki = (url: string) => url.includes("wikipedia.org") || url.includes("wikimedia.org");

async function getText(url: string): Promise<string> {
  try {
    await new Promise((r) => setTimeout(r, 250));
    const r = await fetch(url, { headers: { "User-Agent": wiki(url) ? WIKI_UA : USER_AGENT }, signal: AbortSignal.timeout(25_000) });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  }
}

async function get<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    if (wiki(url)) await new Promise((r) => setTimeout(r, 250));
    const r = await fetch(url, { headers: { "User-Agent": wiki(url) ? WIKI_UA : USER_AGENT, ...headers }, signal: AbortSignal.timeout(25_000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Pages that are always busy and say nothing about the week. */
const DULL = /^(Main_Page|Special:|Wikipedia:|Portal:|Help:|File:|Template:|Category:|Search|Cleopatra|XXX|Deaths_in_|List_of_.*deaths|Pornhub|Google|YouTube|Facebook|Instagram|ChatGPT|Bible|Undefined|-)/i;

export async function wikipediaMostRead(from: string, to: string): Promise<WeekItem[]> {
  const total = new Map<string, number>();
  for (const d of days(from, to)) {
    const [y, m, dd] = d.split("-");
    const j = await get<{ items?: { articles: { article: string; views: number }[] }[] }>(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${y}/${m}/${dd}`);
    for (const a of j?.items?.[0]?.articles.slice(0, 60) ?? []) if (!DULL.test(a.article)) total.set(a.article, (total.get(a.article) ?? 0) + a.views);
  }
  return [...total.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([a, v]) => ({ title: a.replace(/_/g, " "), url: `https://en.wikipedia.org/wiki/${encodeURIComponent(a)}`, meta: `${k(v)} views` }));
}

/**
 * The news, from Wikipedia's "Current events" portal: a hand-written digest of
 * each day's main stories, kept for years (GDELT has no idea of "biggest", so
 * its picks were random). Stories that mention what people were reading most
 * that week come first: those are the ones people actually cared about.
 */
export async function newsThatWeek(from: string, to: string, reading: WeekItem[] = []): Promise<WeekItem[]> {
  const stories: { text: string; url: string; day: string }[] = [];
  for (const d of days(from, to)) {
    const date = new Date(`${d}T00:00:00Z`);
    const page = `Portal:Current_events/${date.getUTCFullYear()}_${date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })}_${date.getUTCDate()}`;
    const html = await getText(`https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(page)}`);
    for (const chunk of html.split(/<li(?:\s[^>]*)?>/).slice(1)) {
      const text = chunk
        .split(/<\/li>|<ul/)[0]
        .replace(/<[^>]+>/g, "")
        .replace(/&#160;|&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .replace(/(\s*\([^()]{2,40}\))+\s*$/, "")
        .trim();
      if (text.length > 60 && /[.!?]$/.test(text)) stories.push({ text, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page)}`, day: d });
    }
  }
  // What people were reading, by its key names ("Diwali", "Ballon d'Or", "Garr"), to find the stories they cared about.
  const COMMON = new Set(["united", "states", "election", "presidential", "list", "season", "film", "series", "world", "national", "league", "death", "deaths", "people", "american", "british"]);
  const names = [...new Set(reading.flatMap((r) => r.title.replace(/\(.*\)/, "").split(/\s+/)).filter((w) => w.length > 3 && !/^\d+$/.test(w) && !COMMON.has(w.toLowerCase())))];
  const heat = (t: string) => names.filter((n) => t.includes(n)).length;
  // Our audience talks sport, culture, money and tech; wars and disasters are real but rarely what a brand rides.
  const grim = (t: string) => /\b(killed|kills|killing|attack|attacks|strike|strikes|missile|airstrike|bomb|bombing|shooting|wounded|injured|massacre|hostages?|militants?|troops|death toll)\b/i.test(t);
  const lively = (t: string) => /\b(football|soccer|nfl|nba|world series|final|champion|wins|award|album|film|box office|game|gaming|bitcoin|crypto|stock|market|ai|apple|tesla|music|singer|actor|festival|record)\b/i.test(t);
  const perDay = new Map<string, number>();
  const seen = new Set<string>();
  return stories
    .map((st) => {
      const n = perDay.get(st.day) ?? 0;
      perDay.set(st.day, n + 1);
      return { ...st, n, score: heat(st.text) * 3 + (lively(st.text) ? 2 : 0) - (grim(st.text) ? 2 : 0) };
    })
    // Best first, then spread across the week (each day's first story, then each day's second…).
    .sort((a, b) => b.score - a.score || a.n - b.n || a.day.localeCompare(b.day))
    .filter((st) => {
      const key = st.text.slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10)
    .map((st) => ({ title: st.text, url: st.url, meta: new Date(`${st.day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) }));
}

export async function biggestOnX(from: string, to: string): Promise<{ items: WeekItem[]; cost: number }> {
  if (!twitterApiReady()) return { items: [], cost: 0 };
  const since = Math.floor(Date.parse(`${from}T00:00:00Z`) / 1000);
  const until = Math.floor(Date.parse(`${to}T23:59:59Z`) / 1000);
  type Res = { tweets?: { id: string; url: string; text: string; likeCount: number; author?: { userName?: string } }[]; has_next_page?: boolean; next_cursor?: string };
  // The top page can be one loud account; read up to three pages until there are eight different accounts.
  const tweets: NonNullable<Res["tweets"]> = [];
  let cursor = "";
  let calls = 0;
  for (let page = 0; page < 3; page++) {
    const j = await get<Res>(
      `https://api.twitterapi.io/twitter/tweet/advanced_search?${new URLSearchParams({ query: `min_faves:100000 lang:en -filter:replies since_time:${since} until_time:${until}`, queryType: "Top", cursor })}`,
      { "X-API-Key": process.env.TWITTERAPI_IO_KEY! },
    );
    calls++;
    tweets.push(...(j?.tweets ?? []));
    if (new Set(tweets.map((t) => t.author?.userName)).size >= 8 || !j?.has_next_page || !j.next_cursor) break;
    cursor = j.next_cursor;
  }
  return {
    cost: Math.max(calls, tweets.length) * 0.00015,
    // At most two per account, so one loud account can't fill the list.
    items: tweets
      .sort((a, b) => b.likeCount - a.likeCount)
      .filter((t, i, all) => all.slice(0, i).filter((u) => u.author?.userName === t.author?.userName).length < 2)
      .slice(0, 12)
      .map((t) => ({ title: tidyText(t.text).slice(0, 220) || "(image or video)", url: t.url, meta: `@${t.author?.userName ?? "?"} · ${k(t.likeCount)} likes` })),
  };
}

export async function redditThatWeek(from: string, to: string): Promise<WeekItem[]> {
  const after = from;
  const before = new Date(Date.parse(`${to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const all: (WeekItem & { score: number })[] = [];
  for (const sub of AUDIENCE_SUBS) {
    const j = await get<{ data?: { id: string; title: string; score: number }[] }>(
      `https://arctic-shift.photon-reddit.com/api/posts/search?${new URLSearchParams({ subreddit: sub.name, after, before, limit: "100", fields: "id,title,score" })}`,
    );
    for (const p of (j?.data ?? []).sort((a, b) => b.score - a.score).slice(0, 2)) all.push({ title: p.title, url: `https://reddit.com/r/${sub.name}/comments/${p.id}`, meta: `r/${sub.name} · ${k(p.score)} upvotes`, score: p.score });
    await new Promise((r) => setTimeout(r, 250));
  }
  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(({ title, url, meta }) => ({ title, url, meta }));
}

/** Brian's read of the week in two or three sentences (Haiku, about $0.002). */
async function readTheWeek(c: Omit<WeekContext, "summary" | "at">): Promise<{ text?: string; cost: number }> {
  try {
    const { callStructured, modelReady } = await import("@/lib/adapters/model");
    if (!modelReady()) return { cost: 0 };
    const z = await import("zod/v4");
    const list = (name: string, xs: WeekItem[]) => (xs.length ? `${name}:\n${xs.map((x) => `- ${x.title} (${x.meta})`).join("\n")}` : "");
    const out = await callStructured({
      agent: "cartographer",
      subject: `week of ${c.from}`,
      maxTokens: 500,
      schema: z.object({ summary: z.string().describe("Two or three plain sentences") }),
      system:
        "You tell a marketing team what the world was paying attention to in a past week, so they can read a brand's posts from that week in context. Name the main stories and moments, and the mood. Plain words, no hype, nothing you can't see in the lists.",
      prompt: [`${c.from} to ${c.to}`, list("Most-read on Wikipedia", c.reading), list("News headlines", c.news), list("Biggest posts on X", c.x), list("Top Reddit posts in our audience's communities", c.reddit)].filter(Boolean).join("\n\n"),
    });
    return { text: out.summary, cost: 0.002 };
  } catch {
    return { cost: 0 };
  }
}

/** Everything that was happening between two dates. Cached, so looking again is free. */
export async function weekContext(from: string, to: string): Promise<WeekContext> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw new Error("Pick the dates first.");
  const key = `${from}|${to}`;
  const cached = (await repo.read()).weekContexts?.[key];
  if (cached) return cached;
  // Wikipedia and Reddit run alongside the paid X read; GDELT asks for one request at a time.
  const [reading, x, reddit] = await Promise.all([wikipediaMostRead(from, to), biggestOnX(from, to), redditThatWeek(from, to)]);
  const news = await newsThatWeek(from, to, reading);
  const base = { from, to, reading, news, x: x.items, reddit, costUsd: x.cost, missing: [] as string[] };
  if (!reading.length) base.missing.push("Wikipedia");
  if (!news.length) base.missing.push("the news");
  if (!x.items.length) base.missing.push("X");
  if (!reddit.length) base.missing.push("Reddit");
  const summary = await readTheWeek(base);
  const ctx: WeekContext = { ...base, at: new Date().toISOString(), summary: summary.text, costUsd: Math.round((base.costUsd + summary.cost) * 1000) / 1000 };
  // Only keep complete answers, so a source that was briefly down gets another go.
  if (!ctx.missing.length)
    await repo.update((d) => {
      d.weekContexts = { ...(d.weekContexts ?? {}), [key]: ctx };
    });
  return ctx;
}
