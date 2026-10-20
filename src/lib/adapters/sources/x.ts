import type { Signal } from "@/lib/domain/types";
import { xSearch, xSearchReady, type XSearchPost } from "@/lib/integrations/x";
import { repo } from "@/lib/store";
import type { SourceAdapter } from "./types";

/**
 * What people are actually saying on X, through the paid API, on a strict
 * budget. Each pull reads the top posts on the biggest relevant X trends and
 * the villain / main character from the Pulse, plus one watchlist (rivals,
 * drama and clip accounts, streamers) in rotation. Posts go to Breaking,
 * Trends and the Pulse like any other source.
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

export function watchlists(): { name: string; handles: string[] }[] {
  const raw = process.env.X_WATCHLISTS || "rivals:Stake,Roobet,rollbitcom,BCGameOfficial,shufflecom|drama:DramaAlert,Dexerto,FearedBuck|streamers:adinross,xQc,KaiCenat";
  return raw
    .split("|")
    .map((l) => l.split(":"))
    .filter(([n, h]) => n && h)
    .map(([n, h]) => ({ name: n.trim(), handles: h.split(",").map((x) => x.trim().replace(/^@/, "")).filter(Boolean) }));
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
  const fromTrends = db.trends
    .filter((t) => t.sourceIds.includes("xtrends") && t.sensitivity !== "blocked" && t.relevance >= 0.4)
    .sort((a, b) => b.relevance - a.relevance || (b.headline?.value ?? 0) - (a.headline?.value ?? 0))
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
    const lists = watchlists();
    if (lists.length) {
      const l = lists[(state?.pulls ?? 0) % lists.length];
      queries.push({ q: `(${l.handles.map((h) => `from:${h}`).join(" OR ")}) -is:retweet -is:reply`, label: `watchlist: ${l.name}`, sort: "recency" });
    }
    for (const t of await pickTopics(3)) queries.push({ q: `${/\s/.test(t) ? `"${t}"` : t} lang:en -is:retweet -is:reply`, label: t, sort: "relevancy" });

    const got: Signal[] = [];
    let spent = 0;
    for (const q of queries) {
      if (budgetPosts < 10) break;
      try {
        const posts = await xSearch(q.q, 10, q.sort);
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
        pulls: (s?.pulls ?? 0) + 1,
        posts: [...byId.values()].slice(-400),
      };
    });
    log(`X: read ${got.length} posts for $${spent.toFixed(3)}`);
    return [...byId.values()];
  },
};
