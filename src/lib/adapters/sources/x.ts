import type { Signal } from "@/lib/domain/types";
import { xSearch, xSearchReady, type XSearchPost } from "@/lib/integrations/x";
import { repo } from "@/lib/store";
import type { SourceAdapter } from "./types";

/**
 * What people are actually saying on X, through the paid API, on a strict
 * budget. Culture first, the way the free Radar works: each pull reads the
 * top posts on the strongest X trends of the moment (no topic filter) and the
 * Pulse's villain and main character, plus one culture watchlist in rotation
 * (viral and meme aggregators, drama and clip pages, big streamers). Rivals
 * get one small read every X_RIVALS_EVERY_DAYS (default 3). Posts go to
 * Breaking, Trends and, above all, the Pulse.
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

/** Culture accounts that surface what's blowing up, read in rotation (all checked against X). */
export function watchlists(): { name: string; handles: string[] }[] {
  return parseLists(process.env.X_WATCHLISTS || "viral:DailyLoud,PopBase,PopCrave,interesting_aIl,knowyourmeme|drama:DramaAlert,FearedBuck,Dexerto,Complex,CultureCrave|streamers:adinross,xQc,KaiCenat");
}

/** Rivals: a small read every few days, never the main use of the budget. */
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
  return [...new Set([...fromPulse, ...fromTrends])].slice(0, max);
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
    // Culture first: the strongest trends and the Pulse's villain / main character, then one culture watchlist.
    for (const t of await pickTopics(2)) queries.push({ q: `${/\s/.test(t) ? `"${t}"` : t} lang:en -is:retweet -is:reply`, label: t, sort: "relevancy" });
    // Two culture accounts per pull, rotating through all of them, so a prolific account can't take every read.
    const pair = culturePair(state?.pulls ?? 0);
    if (pair) queries.push({ q: `${fromList(pair)} ${FILLER}`, label: `watchlist: ${pair.name}`, sort: "relevancy" });
    // Rivals: one small read every few days.
    const rivalDays = Number(process.env.X_RIVALS_EVERY_DAYS) || 3;
    const rivalsDue = !state?.rivalsAt || now.getTime() - new Date(state.rivalsAt).getTime() > rivalDays * 86_400_000;
    if (rivalsDue && rivals().handles.length) queries.push({ q: fromList(rivals()), label: "watchlist: rivals", sort: "relevancy" });

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
        got.push(...posts.map((p) => toSignal(p, q.label, now)));
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
