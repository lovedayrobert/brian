import type { Signal } from "@/lib/domain/types";
import { xSearch, xSearchReady, type XSearchPost } from "@/lib/integrations/x";
import { repo } from "@/lib/store";
import type { SourceAdapter } from "./types";

/**
 * What people are actually saying on X, through the paid API, on a strict
 * budget. Topics, not accounts: what matters is the conversation about people
 * and things. Each pull reads the most engaged posts on (1) what's hot right
 * now (the Pulse's villain, main character and subjects, then the strongest X
 * trends), (2) one standing topic group from our audience's world, and (3) two
 * accounts that post about things (DramaAlert, Dexerto, WatcherGuru…).
 * Rivals: what people say about them, every X_RIVALS_EVERY_DAYS (default 3).
 * Posts go to the Pulse first, then Breaking and Trends.
 *
 * Money: X bills per post read. X_MONTHLY_BUDGET_USD (default $9) is split
 * evenly across the days of the month, so it can't be spent in one go; a pull
 * only runs every X_PULL_HOURS (default 12) and never past today's share.
 * X_PRICE_PER_POST (default $0.005) is what each read is counted at.
 */
const num = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && v ? Number(v) : d);
export const xBudget = () => ({
  monthUsd: num(process.env.X_MONTHLY_BUDGET_USD, 9),
  price: num(process.env.X_PRICE_PER_POST, 0.005),
  pullHours: num(process.env.X_PULL_HOURS, 12),
});

const parseLists = (raw: string) =>
  raw
    .split("|")
    .map((l) => l.split(":"))
    .filter(([n, h]) => n && h)
    .map(([n, h]) => ({ name: n.trim(), handles: h.split(",").map((x) => x.trim().replace(/^@/, "")).filter(Boolean) }));

/**
 * Accounts that post ABOUT things (drama, crypto scandals, betting culture,
 * viral clips), read two at a time in rotation. Not people's own accounts: what
 * matters is what's said about them. All checked against X.
 */
export function watchlists(): { name: string; handles: string[] }[] {
  return parseLists(process.env.X_WATCHLISTS || "drama:DramaAlert,Dexerto,FearedBuck,JakeSucky,StreamerBans|crypto:WatcherGuru,zachxbt,lookonchain|sports:BleacherReport,barstoolsports,ActionNetworkHQ|viral:NoContextHumans,knowyourmeme,DailyLoud");
}

/**
 * Standing topics from our audience's world, searched across everyone's posts
 * (most engaged first), one group per pull in rotation. X_WATCH_TOPICS:
 * groups separated by "|", terms by ",". Edit freely: these are examples of the
 * kind of conversation to watch, not a fixed brief.
 */
export function watchTopics(): { name: string; terms: string[] }[] {
  return (process.env.X_WATCH_TOPICS || "streamers:Adin Ross,xQc,Kai Cenat,IShowSpeed,Trainwreck|streaming drama:Kick streamer,Twitch ban,banned on stream|degen betting:parlay,bad beat,slot stream|crypto culture:memecoin,rug pull,rugged|gaming:GTA 6,GTA VI")
    .split("|")
    .map((g) => g.split(":"))
    .filter(([n, t]) => n && t)
    .map(([n, t]) => ({ name: n.trim(), terms: t.split(",").map((x) => x.trim()).filter(Boolean) }));
}

const term = (t: string) => (/\s/.test(t) ? `"${t}"` : t);

/** Rivals: what people say to and about them (complaints, hate, wins), every few days. Never the main use of the budget. */
export function rivals(): { name: string; handles: string[] } {
  return { name: "rivals", handles: (process.env.X_RIVALS || "Stake,shufflecom,Roobet,rollbit,bcgame,rainbetcom").split(",").map((x) => x.trim().replace(/^@/, "")).filter(Boolean) };
}

/** Anniversary and countdown filler isn't worth paying to read. */
const FILLER = `-"years ago today" -"year ago today" -"anniversary" -"days until"`;

/** The pull's two culture accounts, rotating through every account in every culture list. */
export function culturePair(pull: number): { name: string; handles: string[] } | null {
  const all = watchlists().flatMap((l) => l.handles.map((h) => ({ list: l.name, h })));
  if (!all.length) return null;
  const start = (pull * 2) % all.length;
  const two = [all[start], all[(start + 1) % all.length]].filter((x, i, a) => a.findIndex((y) => y.h === x.h) === i);
  return { name: [...new Set(two.map((x) => x.list))].join(" + "), handles: two.map((x) => x.h) };
}

/** Today's remaining X allowance in dollars. */
export function allowanceLeft(state: XState | undefined, now = new Date()): number {
  const b = xBudget();
  const month = now.toISOString().slice(0, 7);
  const day = now.toISOString().slice(0, 10);
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const spentMonth = state?.month === month ? state.monthUsd : 0;
  const spentDay = state?.day === day ? state.dayUsd : 0;
  return Math.max(0, Math.min(b.monthUsd / daysInMonth - spentDay, b.monthUsd - spentMonth));
}

export interface XState {
  /** When rivals were last read */
  rivalsAt?: string;
  month: string;
  monthUsd: number;
  day: string;
  dayUsd: number;
  lastPull?: string;
  pulls: number;
  posts: Signal[];
}

function toSignal(p: XSearchPost, topic: string, now: Date): Signal {
  return {
    id: `x:${p.id}`,
    sourceId: "x",
    url: `https://x.com/${p.author}/status/${p.id}`,
    title: p.text.replace(/\s+/g, " ").slice(0, 300),
    summary: `${p.likes.toLocaleString("en-US")} likes, ${p.reposts.toLocaleString("en-US")} reposts, ${p.replies.toLocaleString("en-US")} replies${p.views ? `, ${p.views.toLocaleString("en-US")} views` : ""}. On: ${topic}.`,
    author: `@${p.author}`,
    metric: p.views ? { label: "Views", value: p.views } : { label: "Likes", value: p.likes },
    topics: ["x", topic],
    capturedAt: now.toISOString(),
    publishedAt: p.createdAt,
  };
}

/** The topics worth paying to read: relevant X trends from the last sweep, and who the Pulse says everyone's talking about. */
async function pickTopics(max: number): Promise<string[]> {
  const db = await repo.read();
  const fromPulse = [db.pulses?.[0]?.villain, db.pulses?.[0]?.mainCharacter]
    .filter(Boolean)
    .map((s) => s!.split(/[.,:;(—–-]/)[0].trim().split(/\s+/).slice(0, 4).join(" "))
    .filter((s) => s.length > 2);
  // The strongest X trends right now, whatever the topic: what everyone is actually talking about.
  // Latin-script topics only (the audience is English-speaking); sensitive ones (tragedies) skipped.
  const strength = (t: (typeof db.trends)[number]) => (t.series.at(-1)?.value ?? 0) + (t.headline?.value ?? 0) * 2;
  const fromTrends = db.trends
    .filter((t) => t.sourceIds.includes("xtrends") && t.sensitivity === "clear" && /^[\p{Script=Latin}\d\s#'&.:-]+$/u.test(t.title))
    .sort((a, b) => strength(b) - strength(a))
    .map((t) => t.title);
  // The Pulse's strongest subjects (most intense feeling first), when it has read the room recently.
  const pulseFresh = db.pulses?.[0] && Date.now() - new Date(db.pulses[0].createdAt).getTime() < 48 * 3_600_000;
  const fromPulseItems = pulseFresh ? db.pulses[0].items.filter((i) => i.opening).slice(0, 4).map((i) => i.subject.split(/[.,:;(—–]/)[0].trim().split(/\s+/).slice(0, 4).join(" ")) : [];
  return [...new Set([...fromPulse, ...fromPulseItems, ...fromTrends])].slice(0, max);
}

export const x: SourceAdapter = {
  id: "x",
  ready: xSearchReady,
  async fetchSignals({ now, log }) {
    const db = await repo.read();
    const state = db.xState;
    const b = xBudget();
    const fresh = state?.lastPull && now.getTime() - new Date(state.lastPull).getTime() < b.pullHours * 3_600_000;
    const cached = (state?.posts ?? []).filter((s) => now.getTime() - new Date(s.publishedAt ?? s.capturedAt).getTime() < 3 * 86_400_000);
    if (fresh) return cached;

    // How many posts today's allowance pays for, spread over today's pulls.
    const pullsPerDay = Math.max(1, Math.round(24 / b.pullHours));
    let budgetPosts = Math.floor(allowanceLeft(state, now) / b.price / Math.max(1, pullsPerDay - (state?.day === now.toISOString().slice(0, 10) ? 1 : 0)));
    if (budgetPosts < 10) {
      log(`X: today's budget is used up; showing the last pull.`);
      return cached;
    }
    const queries: { q: string; label: string; sort: "relevancy" | "recency" }[] = [];
    const fromList = (l: { name: string; handles: string[] }) => `(${l.handles.map((h) => `from:${h}`).join(" OR ")}) -is:retweet -is:reply`;
    const tail = `lang:en -is:retweet -is:reply ${FILLER}`;
    const pull = state?.pulls ?? 0;
    // 1. What's hot right now: the Pulse's villain, main character and top subjects, then the strongest X trends.
    for (const t of await pickTopics(1)) queries.push({ q: `${term(t)} ${tail}`, label: t, sort: "relevancy" });
    // 2. One standing topic group from our audience's world, in rotation: the conversation about it, from anyone.
    const topics = watchTopics();
    if (topics.length) {
      const g = topics[pull % topics.length];
      queries.push({ q: `(${g.terms.map(term).join(" OR ")}) ${tail}`, label: `topic: ${g.name}`, sort: "relevancy" });
    }
    // 3. Two accounts that post about things (drama, crypto, betting, viral), in rotation.
    const pair = culturePair(pull);
    if (pair) queries.push({ q: `${fromList(pair)} ${FILLER}`, label: `watchlist: ${pair.name}`, sort: "relevancy" });
    // 4. Rivals, every few days: what people say to and about them, not their own promos.
    const rivalDays = Number(process.env.X_RIVALS_EVERY_DAYS) || 3;
    const rivalsDue = !state?.rivalsAt || now.getTime() - new Date(state.rivalsAt).getTime() > rivalDays * 86_400_000;
    const r = rivals().handles;
    if (rivalsDue && r.length) queries.push({ q: `(${r.map((h) => `@${h}`).join(" OR ")}) ${r.map((h) => `-from:${h}`).join(" ")} ${tail}`, label: "watchlist: rivals", sort: "relevancy" });

    const got: Signal[] = [];
    let spent = 0;
    let readRivals = false;
    for (const q of queries) {
      if (budgetPosts < 10) break;
      try {
        const posts = await xSearch(q.q, 10, q.sort);
        if (q.label === "watchlist: rivals") readRivals = true;
        budgetPosts -= Math.max(10, posts.length);
        spent += posts.length * b.price;
        // Drop copycat clips nobody engaged with; they add noise, not signal.
        const minLikes = Number(process.env.X_MIN_LIKES) || 20;
        const worth = posts.filter((p) => p.likes >= minLikes || (p.views ?? 0) >= 5_000);
        got.push(...worth.map((p) => toSignal(p, q.label, now)));
      } catch (e) {
        log(`X ${q.label}: ${(e as Error).message}`);
      }
    }
    const month = now.toISOString().slice(0, 7);
    const day = now.toISOString().slice(0, 10);
    const byId = new Map([...cached, ...got].map((s) => [s.id, s]));
    await repo.update((d) => {
      const s = d.xState;
      d.xState = {
        month,
        monthUsd: (s?.month === month ? s.monthUsd : 0) + spent,
        day,
        dayUsd: (s?.day === day ? s.dayUsd : 0) + spent,
        lastPull: now.toISOString(),
        rivalsAt: readRivals ? now.toISOString() : s?.rivalsAt,
        pulls: (s?.pulls ?? 0) + 1,
        posts: [...byId.values()].slice(-400),
      };
    });
    log(`X: read ${got.length} posts for $${spent.toFixed(3)}`);
    return [...byId.values()];
  },
};
