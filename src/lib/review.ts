import type { Idea } from "@/lib/domain/types";
import { recordFeedback } from "@/lib/memory";
import { newId, repo } from "@/lib/store";

/**
 * Blind review. A frozen set of idea cards (every card Brian produced, in the
 * order produced, nothing removed) plus packages, shown in a shuffled order
 * with no scores, labels or Critic notes. The reviewer marks each card
 * "would run" or not. Results are revealed only when every card is rated.
 */
export interface ReviewSet {
  id: string;
  createdAt: string;
  title: string;
  protocol: string;
  /** Display order, shuffled once when the set is created */
  ideaIds: string[];
  packageIds: string[];
  /** Pass mark agreed in advance, e.g. 3 of 20 */
  passMark: number;
  ratings: Record<string, { verdict: "run" | "skip"; note?: string; by: string; at: string }>;
}

/** Deterministic shuffle so the order can be reproduced from the seed. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed >>> 0 || 1;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function tally(set: ReviewSet) {
  const ids = [...set.ideaIds, ...set.packageIds];
  const rated = ids.filter((id) => set.ratings[id]);
  const run = set.ideaIds.filter((id) => set.ratings[id]?.verdict === "run").length;
  return {
    rated: rated.length,
    total: ids.length,
    complete: rated.length === ids.length,
    wouldRun: run,
    passed: run >= set.passMark,
  };
}

export async function createReviewSet(opts: { title: string; protocol: string; ideas: Idea[]; packageIds: string[]; passMark: number; seed?: number }) {
  if (opts.ideas.some((i) => i.sample)) throw new Error("Sample ideas can't be part of a blind review.");
  const set: ReviewSet = {
    id: newId("rev"),
    createdAt: new Date().toISOString(),
    title: opts.title,
    protocol: opts.protocol,
    ideaIds: seededShuffle(opts.ideas.map((i) => i.id), opts.seed ?? Date.now()),
    packageIds: opts.packageIds,
    passMark: opts.passMark,
    ratings: {},
  };
  await repo.update((d) => {
    d.reviews = [set, ...(d.reviews ?? [])];
  });
  return set;
}

export async function rate(reviewId: string, itemId: string, verdict: "run" | "skip", by: string, note?: string) {
  let label = "";
  let type: "idea" | "package" = "idea";
  await repo.update((d) => {
    const set = d.reviews.find((r) => r.id === reviewId);
    if (!set) throw new Error("Review not found");
    if (!set.ideaIds.includes(itemId) && !set.packageIds.includes(itemId)) throw new Error("Not part of this review");
    set.ratings[itemId] = { verdict, note: note?.trim() || undefined, by, at: new Date().toISOString() };
    if (set.packageIds.includes(itemId)) {
      type = "package";
      const p = d.packages.find((x) => x.id === itemId);
      label = d.ideas.find((i) => i.id === p?.ideaId)?.name ?? "package";
    } else {
      label = d.ideas.find((i) => i.id === itemId)?.name ?? "idea";
    }
  });
  // Every blind verdict is also feedback Brian learns from.
  await recordFeedback({ target: { type, id: itemId, label }, sentiment: verdict === "run" ? "up" : "down", reason: note ? `(blind review) ${note}` : undefined });
}
