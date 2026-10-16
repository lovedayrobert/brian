import type { Idea, Moment, Package, Trend } from "@/lib/domain/types";
import { inLaunchWindow } from "@/lib/engine/lifecycle";
import { totalScore } from "@/lib/pipeline/ideas";
import { repo, type DB } from "@/lib/store";
import { applySeed } from "@/lib/seed";

/** Ideas from engines 1 and 2 (USP-led, then stunts) are retired: kept in the data file, never shown. */
export const isRetired = (i: Pick<Idea, "engine">) => i.engine !== 3;

/**
 * Everything most screens read. Retired ideas, and packages built from them,
 * are always left out. Items imported for a blind review are left out unless a
 * screen asks for them (the review page and the package pages).
 */
export async function load(opts: { includeReviewOnly?: boolean; includeRetired?: boolean } = {}): Promise<DB> {
  await applySeed();
  const db = await repo.read();
  const ideas = opts.includeRetired ? db.ideas : db.ideas.filter((i) => !isRetired(i));
  const ids = new Set(ideas.map((i) => i.id));
  const packages = db.packages.filter((p) => ids.has(p.ideaId));
  if (opts.includeReviewOnly) return { ...db, ideas, packages };
  return { ...db, ideas: ideas.filter((i) => !i.reviewOnly), packages: packages.filter((p) => !p.reviewOnly) };
}

/** Trends worth acting on now: rising or emerging, relevant, and not blocked. */
export function launchWindow(trends: Trend[], limit = 6): Trend[] {
  return trends
    // Prediction markets are supporting context, never a launch signal on their own.
    .filter((t) => !t.sourceIds.includes("polymarket"))
    .filter((t) => inLaunchWindow(t.lifecycle.stage) && t.sensitivity !== "blocked" && t.relevance >= 0.5)
    .slice(0, limit);
}

export function breaking(moments: Moment[], limit = 40): Moment[] {
  return moments.filter((m) => m.kind === "breaking").slice(0, limit);
}

export function upcoming(moments: Moment[], limit = 8): Moment[] {
  const now = Date.now();
  return moments
    .filter((m) => m.kind === "calendar" && new Date(m.date).getTime() > now)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function cards(ideas: Idea[]): Idea[] {
  return ideas.filter((i) => ["card", "developing", "developed"].includes(i.status)).sort((a, b) => totalScore(b) - totalScore(a));
}

export function killed(ideas: Idea[]): Idea[] {
  return ideas.filter((i) => i.status === "killed");
}

export function keyVisualFor(ideaId: string, packages: Package[]): string | null {
  const p = packages.find((x) => x.ideaId === ideaId);
  const c = p?.sections.mockups.content as { keyVisualUrl?: string | null } | undefined;
  return c?.keyVisualUrl ?? null;
}

export function spend(db: DB, sinceDays = 30) {
  const since = Date.now() - sinceDays * 86_400_000;
  const runs = db.agentRuns.filter((r) => new Date(r.startedAt).getTime() >= since);
  const byAgent = new Map<string, { calls: number; cost: number; ms: number; errors: number }>();
  for (const r of runs) {
    const a = byAgent.get(r.agent) ?? { calls: 0, cost: 0, ms: 0, errors: 0 };
    a.calls++;
    a.cost += r.costUsd;
    a.ms += r.durationMs;
    if (!r.ok) a.errors++;
    byAgent.set(r.agent, a);
  }
  return { total: runs.reduce((s, r) => s + r.costUsd, 0), calls: runs.length, byAgent };
}

export function memoryWeek(events: DB["memoryEvents"], now = Date.now()) {
  const weekAgo = now - 7 * 86_400_000;
  const recent = events.filter((e) => new Date(e.at).getTime() > weekAgo);
  return {
    usedThisWeek: recent.filter((e) => e.type === "used").length,
    learnedThisWeek: recent.filter((e) => e.type === "learned").length,
  };
}
