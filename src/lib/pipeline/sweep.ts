import { adapters } from "@/lib/adapters/sources/registry";
import type { Moment, Signal, SweepRun, Trend } from "@/lib/domain/types";
import { assessFromRates, assessLifecycle } from "@/lib/engine/lifecycle";
import { classify, overlap, tokens } from "@/lib/engine/relevance";
import { assessSensitivity } from "@/lib/engine/safety";
import { newId, repo } from "@/lib/store";
import { CALENDAR } from "@/lib/brand/calendar";
import { attachCurves, titleCase } from "./enrich";
import { scoreRelevance } from "./cartographer";
import { classifyCoins, trenchMoments } from "./narratives";

/**
 * Discovery sweep: collect signals from every ready source, turn the ones with
 * measurable curves into Trends, turn news into Moments, and link evidence
 * across sources. Runs without any model key. The model layer (relevance
 * scoring, "why it's spreading") is added on top when a key is configured.
 */
export async function runSweep(log: (m: string) => void = console.log): Promise<SweepRun> {
  const now = new Date();
  const run: SweepRun = { id: newId("sweep"), startedAt: now.toISOString(), finishedAt: "", sources: [] };
  const signals: Signal[] = [];

  await Promise.all(
    adapters()
      .filter((a) => a.ready())
      .map(async (a) => {
        try {
          const got = await a.fetchSignals({ now, log: (m) => log(`[${a.id}] ${m}`) });
          signals.push(...got);
          run.sources.push({ sourceId: a.id, ok: true, signals: got.length });
          log(`[${a.id}] ${got.length} signals`);
        } catch (e) {
          run.sources.push({ sourceId: a.id, ok: false, signals: 0, error: (e as Error).message });
          log(`[${a.id}] failed: ${(e as Error).message}`);
        }
      }),
  );

  // A source that failed (rate limit, outage) keeps its last good signals rather than vanishing.
  const previous = await repo.read();
  for (const s of run.sources.filter((x) => !x.ok || x.signals === 0)) {
    const carried = previous.signals.filter((p) => p.sourceId === s.sourceId);
    if (carried.length) {
      signals.push(...carried);
      s.error = `${s.error ?? "No results"}. Showing ${carried.length} signals from the previous sweep.`;
    }
  }

  // Search spikes paired with their attention curve become first-class trends.
  signals.push(...(await attachCurves(signals, now, log)));

  const trends = buildTrends(signals, now);
  const moments = [...buildBreaking(signals, now), ...buildCalendar(signals, now)];
  await narrateCoins(signals, trends, moments, now);
  try {
    await scoreRelevance(trends, moments);
    trends.sort((a, b) => score(b) - score(a));
    moments.sort((a, b) => (a.kind === b.kind ? (b.relevance ?? 0) - (a.relevance ?? 0) : a.kind === "breaking" ? -1 : 1));
  } catch (e) {
    log(`[cartographer] kept heuristic relevance: ${(e as Error).message}`);
  }
  run.finishedAt = new Date().toISOString();

  await repo.update((db) => {
    db.signals = signals;
    db.trends = trends;
    db.moments = moments;
    db.sweeps = [run, ...db.sweeps].slice(0, 30);
  });
  return run;
}

const EVIDENCE_SOURCES = new Set(["press", "youtube", "googletrends", "x"]);
// External feeds without a daily curve (X posts, Telegram messages, Exa results) behave like articles;
// ones with a curve (e.g. Google Trends history) become trends.
const isArticle = (s: Signal) =>
  EVIDENCE_SOURCES.has(s.sourceId) || s.id.startsWith("gdelt-article:") || (s.sourceId.startsWith("ext:") && !s.series?.length);

export function buildTrends(signals: Signal[], now: Date): Trend[] {
  const articles = signals.filter(isArticle);
  const trends: Trend[] = [];

  for (const s of signals) {
    if (isArticle(s) || s.sourceId === "related") continue;
    const firstSentence = s.summary?.split(/(?<=\.)\s/)[0] ?? "";
    const text = `${s.title} ${s.topics.join(" ")} ${firstSentence}`;
    const { category, relevance } = classify(text);
    const sens = assessSensitivity(`${s.title} ${firstSentence}`, s.topics[0]);

    let lifecycle;
    if (s.series && s.series.length) lifecycle = assessLifecycle(s.series.map((p) => p.value));
    else if (s.rates) lifecycle = assessFromRates(s.rates.day, s.rates.weekAvg, s.rates.monthAvg);
    else continue;

    // Cross-platform evidence: articles and videos that mention this trend.
    const tt = tokens(s.title);
    const linked =
      s.sourceId === "search"
        ? signals.filter((x) => x.sourceId === "related" && x.topics.includes(s.id))
        : s.sourceId === "gdelt"
        ? articles.filter((a) => a.id.startsWith("gdelt-article:") && a.topics.includes(s.topics[0]))
        : articles.filter((a) => {
            const need = tt.size <= 3 ? 0.99 : 0.6;
            return overlap(tt, tokens(a.title)) >= need;
          });

    trends.push({
      id: `t_${s.id.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`.slice(0, 80),
      title: s.title,
      summary: s.summary ?? "",
      category,
      relevance,
      relevanceMethod: "heuristic",
      signalIds: [s.id, ...linked.map((l) => l.id)],
      sourceIds: [...new Set([...(s.sourceId === "search" ? ["Google Trends", "wikipedia"] : [s.sourceId]), ...linked.map((l) => l.author ?? l.sourceId)])],
      series: s.series ?? [],
      seriesLabel:
        s.sourceId === "xtrends"
          ? "X trend strength by hour (top of the list = 50)"
          : s.sourceId === "wikipedia" || s.sourceId === "search"
          ? "Daily Wikipedia views"
          : s.sourceId === "gdelt"
            ? "Daily news articles"
            : "Trading volume",
      headline: s.metric,
      lifecycle,
      sensitivity: sens.level,
      sensitivityReason: sens.reason,
      imageUrl: s.imageUrl,
      updatedAt: now.toISOString(),
    });
  }
  return trends.sort((a, b) => score(b) - score(a));
}

/** How much a source's own trends count. Supporting sources sit at the bottom of the feed. */
const SOURCE_WEIGHT: Record<string, number> = { gdelt: 1, wikipedia: 0.45, polymarket: 0.3 };

function score(t: Trend): number {
  const sourceWeight = SOURCE_WEIGHT[t.sourceIds[0]] ?? 1;
  const stageWeight = { emerging: 1, rising: 0.9, peaking: 0.5, saturated: 0.25, declining: 0.1 }[t.lifecycle.stage];
  const blocked = t.sensitivity === "blocked" ? 0.2 : 1;
  return sourceWeight * t.relevance * stageWeight * (0.5 + t.lifecycle.confidenceScore / 2) * blocked;
}

/** Group news from the last 48h into moments; more independent outlets = bigger moment. */
export function buildBreaking(signals: Signal[], now: Date): Moment[] {
  const recent = signals
    .filter(isArticle)
    .filter((s) => !s.publishedAt || now.getTime() - new Date(s.publishedAt).getTime() < 48 * 3_600_000);

  const clusters: { lead: Signal; members: Signal[]; tok: Set<string> }[] = [];
  for (const s of recent) {
    const tok = tokens(s.title);
    const hit = clusters.find((c) => overlap(c.tok, tok) >= 0.5);
    if (hit) hit.members.push(s);
    else clusters.push({ lead: s, members: [s], tok });
  }

  return clusters
    .map((c) => {
      const outlets = new Set(c.members.map((m) => m.author ?? m.sourceId)).size;
      const { category, relevance } = classify(c.members.map((m) => (m.sourceId === "googletrends" ? `${m.title} ${m.summary ?? ""}` : m.title)).join(" "));
      const sens = assessSensitivity(c.members.map((m) => `${m.title} ${m.summary ?? ""}`).join(" "));
      const latest = c.members.map((m) => m.publishedAt ?? m.capturedAt).sort().at(-1)!;
      const industry = c.members.every((m) => m.topics.includes("trade"));
      const talk = talkability(c.members, relevance, industry);
      const searches = c.members.reduce((s, m) => s + (m.sourceId === "googletrends" ? (m.metric?.value ?? 0) : 0), 0);
      const related = c.members.flatMap((m) => m.related ?? []);
      return {
        moment: {
          id: `m_${hashish(c.lead.url)}`,
          kind: "breaking" as const,
          title: c.lead.sourceId === "googletrends" ? titleCase(c.lead.title) : c.lead.title,
          date: latest,
          category,
          description:
            (c.lead.sourceId === "googletrends" ? c.lead.related?.[0]?.title : c.lead.summary) ??
            `${outlets} outlet${outlets === 1 ? "" : "s"} covering this.`,
          sourceUrl: c.lead.url,
          sensitivity: sens.level,
          outlets,
          sources: [
            ...c.members.filter((m) => m.sourceId !== "googletrends").map((m) => ({ title: m.title, url: m.url, outlet: m.author ?? m.sourceId })),
            ...related,
          ].slice(0, 6),
          searches: searches || undefined,
          industry,
          relevance,
          imageUrl: c.members.find((m) => m.imageUrl)?.imageUrl,
          sensitivityReason: sens.reason,
        },
        // Blocked moments sink: Brian won't react to them, so they shouldn't lead the feed.
        rank: talk * (1 + Math.log2(1 + outlets) / 2 + (searches ? Math.log10(searches) / 6 : 0)) * (sens.level === "blocked" ? 0.1 : 1),
      };
    })
    .sort((a, b) => b.rank - a.rank)
    .filter((x, _, all) => {
      // Keep the top 60 culture moments and the top 30 industry stories.
      const pool = all.filter((y) => !!y.moment.industry === !!x.moment.industry);
      return pool.indexOf(x) < (x.moment.industry ? 30 : 60);
    })
    .map((x) => x.moment);
}

/**
 * Heuristic talkability for when no model key is set: culture sources and
 * drama words up, regulatory and corporate words down. The Cartographer
 * replaces this with a model judgement when Claude is connected.
 */
const DRAMA = /\b(banned|ban|drama|feud|beef|exposed|leak(ed)?|scam|rug|hack(ed)?|exploit|drained|viral|meme|clip|stream(er)?|kick|twitch|backlash|outrage|lawsuit|sued|arrest(ed)?|caught|record|world first|insane|wild|fans|trend(ing)?|roast|apolog(y|ises|izes)|cancel(led)?)\b/i;
const DULL = /\b(regulat\w*|licen[cs]e\w*|compliance|consultation|tax(es)?|levy|fines?|budget|framework|appoint(s|ed|ment)|partnership|quarterly|q[1-4]|earnings|revenue|acquisition|bank|mica|stablecoin|custody|institutional|etf|filing|ministry|parliament|bill)\b/i;

function talkability(members: Signal[], relevance: number, industry: boolean): number {
  const text = members.map((m) => `${m.title} ${m.summary ?? ""}`).join(" ");
  // Topic match counts for less than whether people will react to it.
  let t = 0.4 * relevance;
  if (members.some((m) => m.sourceId === "googletrends")) t += 0.15;
  if (members.some((m) => m.topics.some((k) => ["streaming", "internet", "crypto-culture", "gaming", "tech"].includes(k)))) t += 0.3;
  if (DRAMA.test(text)) t += 0.3;
  if (/\b(casino|gambl\w*|betting|stake|kick)\b/i.test(text) && !industry) t += 0.2;
  if (DULL.test(text)) t -= 0.35;
  if (industry) t -= 0.4;
  return Math.max(0.05, t);
}

function buildCalendar(signals: Signal[], now: Date): Moment[] {
  const fromMarkets = signals
    .filter((s) => s.sourceId === "polymarket" && s.publishedAt)
    // Price ladders and tweet-count markets are not cultural moments.
    .filter((s) => !/(above|below|___|price|\bhit\b|# ?tweets|up or down|how many)/i.test(s.title))
    .filter((s) => {
      const t = new Date(s.publishedAt!).getTime() - now.getTime();
      return t > 0 && t < 90 * 86_400_000;
    })
    .map((s) => {
      const { category, relevance } = classify(`${s.title} ${s.topics.join(" ")}`);
      return { s, category, relevance };
    })
    // Only moments our audience plans around; politics and macro stay out of the calendar.
    .filter((x) => x.relevance >= 0.4 && ["gaming", "sport", "crypto", "streaming", "entertainment", "gambling", "memes"].includes(x.category))
    .slice(0, 12)
    .map(
      ({ s, category }): Moment => ({
        id: `cal_${hashish(s.url)}`,
        kind: "calendar",
        title: s.title,
        date: s.publishedAt!,
        category,
        description: `Prediction market resolves on this date. $${Math.round(s.metric?.value ?? 0).toLocaleString("en-US")} traded in the last 24h.`,
        sourceUrl: s.url,
        sensitivity: assessSensitivity(s.title).level,
      }),
    );
  const curated = CALENDAR.filter((m) => new Date(m.date).getTime() > now.getTime());
  return [...curated, ...fromMarkets].sort((a, b) => a.date.localeCompare(b.date));
}

function hashish(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Rebuild trends and moments from stored signals without refetching (for tuning the ranking). */
export async function rebuildFromStored(): Promise<void> {
  const now = new Date();
  const db = await repo.read();
  // Re-derive each press signal's feed kind from the current catalogue.
  const { PRESS_FEEDS } = await import("@/lib/adapters/sources/press");
  for (const s of db.signals) {
    if (s.sourceId !== "press") continue;
    const feed = PRESS_FEEDS.find((f) => f.name === s.author && (s.topics[0] === "trade" || f.kind === s.topics[0]));
    const byName = PRESS_FEEDS.filter((f) => f.name === s.author);
    if (byName.length && byName.every((f) => f.kind === byName[0].kind)) s.topics = [byName[0].kind];
    else if (feed) s.topics = [feed.kind];
  }
  const trends = buildTrends(db.signals, now);
  const moments = [...buildBreaking(db.signals, now), ...buildCalendar(db.signals, now)];
  await narrateCoins(db.signals, trends, moments, now);
  await repo.update((d) => {
    d.signals = db.signals;
    d.trends = trends;
    d.moments = moments;
  });
}

/**
 * "The trenches are on it": attach memecoins whose name shares a distinctive
 * word with a moment or trend. A coin named after a story is evidence the
 * crypto crowd has already picked it up.
 */
const COIN_STOP = new Set(["coin", "token", "solana", "pump", "the", "official", "community", "inu", "dog", "cat", "pepe", "trump", "elon", "base", "ai", "agent", "meme", "moon", "baby", "king"]);

export function coinWords(name: string): Set<string> {
  return new Set(
    [...tokens(name)].filter((w) => w.length >= 4 && !COIN_STOP.has(w)),
  );
}

export function linkCoins(signals: Signal[], trends: Trend[], moments: Moment[]): Set<string> {
  const linked = new Set<string>();
  // Only culture coins say anything about a moment; utility and generic coins are ignored.
  // Only culture coins the model has read: keyword matching on coin names produces false links.
  const coins = signals.filter((s) => s.sourceId === "trenches" && s.coin && s.narrative?.kind === "culture" && s.narrative.method === "model");
  if (!coins.length) return linked;
  const words = coins.map((c) => ({ c, w: coinWords(c.coin!.name) }));
  const match = (text: string) => {
    const t = tokens(text);
    return words
      .filter(({ w }) => w.size > 0 && [...w].some((x) => t.has(x)))
      .map(({ c }) => {
        linked.add(c.id);
        return { name: c.coin!.name, symbol: c.coin!.symbol, url: c.url, volume6h: c.coin!.volume6h };
      });
  };
  for (const m of moments) {
    const hit = match(`${m.title} ${(m.sources ?? []).map((s) => s.title).join(" ")}`);
    if (hit.length) m.coins = hit.slice(0, 5);
  }
  for (const t of trends) {
    const hit = match(t.title);
    if (hit.length) t.coins = hit.slice(0, 5);
  }
  return linked;
}

async function narrateCoins(signals: Signal[], trends: Trend[], moments: Moment[], now: Date): Promise<void> {
  const coins = signals.filter((s) => s.sourceId === "trenches" && s.coin);
  const labels = await classifyCoins(coins);
  for (const c of coins) c.narrative = labels.get(c.id);
  const linked = linkCoins(signals, trends, moments);
  // A side signal: insert after the lead stories rather than pinning to the top.
  const firstCalendar = moments.findIndex((m) => m.kind === "calendar");
  const at = Math.min(8, firstCalendar === -1 ? moments.length : firstCalendar);
  moments.splice(at, 0, ...trenchMoments(coins, linked, now));
}
