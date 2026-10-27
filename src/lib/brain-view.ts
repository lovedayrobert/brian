import { health, strength } from "@/lib/brain";
import { specialDays } from "@/lib/calendar/days";
import { rivals } from "@/lib/adapters/sources/x";
import { twitterApiReady } from "@/lib/lookback";
import { personName } from "@/lib/people";
import type { DB } from "@/lib/store";

/**
 * What Brian's screens show, built on the server: the main Brian (no campaign)
 * or one campaign's Brian. The two never mix.
 */
export type Scope = { campaignId?: string };

const inScope = (scope: Scope) => (x: { campaignId?: string; moment?: string }) => (scope.campaignId ? x.campaignId === scope.campaignId : !x.campaignId && !x.moment);

export function nodesView(db: DB, scope: Scope) {
  const swipes = db.swipes ?? [];
  const title = (id: string) => swipes.find((s) => s.id === id)?.title ?? "An example that was removed";
  const campaignName = (id?: string) => (id ? db.campaigns?.find((c) => c.id === id)?.name : undefined);
  return (db.brain ?? []).filter(inScope(scope)).map((n) => ({
    id: n.id,
    kind: n.kind,
    text: n.text,
    detail: n.detail,
    brand: n.brand,
    gap: n.gap,
    campaignId: n.campaignId,
    campaignName: campaignName(n.campaignId),
    strength: strength(n),
    health: health(n),
    evidence: n.evidence.map((e) => ({ swipeId: e.swipeId, title: title(e.swipeId), note: e.note, supports: e.supports })),
    team: n.team.map((t) => ({ by: personName(db, t.by), agree: t.agree, note: t.note, at: t.at })),
    liked: n.uses.filter((u) => u.verdict === "liked").length,
    rejected: n.uses.filter((u) => u.verdict === "rejected").length,
    used: n.uses.length,
  }));
}

export function examplesView(db: DB, scope: Scope) {
  return (db.swipes ?? [])
    .filter((s) => (scope.campaignId ? s.campaignId === scope.campaignId : !s.campaignId))
    .map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      platform: s.platform,
      author: s.author,
      why: s.why,
      lesson: s.breakdown?.lesson,
      notes: db.digests?.find((d) => d.swipeId === s.id)?.thinking ?? [],
      by: personName(db, s.addedBy),
      at: s.addedAt,
    }));
}

export function questionsView(db: DB, scope: Scope) {
  const examples = new Set(examplesView(db, scope).map((x) => x.id));
  return (db.brainQuestions ?? []).filter((q) => !q.answer && (!q.swipeId || examples.has(q.swipeId))).map((q) => ({ id: q.id, text: q.text, nodeIds: q.nodeIds }));
}

export function lookbackView(db: DB) {
  const y = new Date().getUTCFullYear();
  const seen = new Set<string>();
  return {
    brands: rivals().handles,
    learned: db.momentKeywords ?? {},
    paid: (twitterApiReady() ? "history" : process.env.X_BEARER_TOKEN ? "recent" : "none") as "history" | "recent" | "none",
    // Moments to look back at, this year and the three before it.
    moments: specialDays(`${y - 3}-01-01`, `${y}-12-31`)
      .filter((d) => d.kind !== "cashy")
      .map((d) => ({ title: d.title, date: d.date }))
      .filter((d) => (seen.has(`${d.title}${d.date.slice(0, 4)}`) ? false : (seen.add(`${d.title}${d.date.slice(0, 4)}`), true))),
  };
}

export type NodeView = ReturnType<typeof nodesView>[number];
export type ExampleView = ReturnType<typeof examplesView>[number];
export type QuestionView = ReturnType<typeof questionsView>[number];
export type LookbackView = ReturnType<typeof lookbackView>;
