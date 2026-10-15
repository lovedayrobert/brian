import type { Idea } from "@/lib/domain/types";

/** Score sets by engine, in display order. */
export const SCORE_SETS = {
  2: [
    { key: "shareability", label: "Shareability", short: "Shares", weight: 2 },
    { key: "reach", label: "Reach", short: "Reach", weight: 1.5 },
    { key: "novelty", label: "Novelty", short: "New", weight: 1.5 },
    { key: "attribution", label: "Attribution (people know it's Cashy)", short: "Cashy", weight: 1 },
    { key: "cost", label: "Cost (10 = nearly free)", short: "Cheap", weight: 0.5 },
  ],
  1: [
    { key: "talkability", label: "Talkability", short: "Talk", weight: 2 },
    { key: "simplicity", label: "Simplicity", short: "Simple", weight: 1 },
    { key: "ownability", label: "Ownability", short: "Ours", weight: 1.5 },
    { key: "cost", label: "Cost (10 = nearly free)", short: "Cheap", weight: 0.5 },
  ],
} as const;

export function scoreSet(idea: Pick<Idea, "engine" | "scores">) {
  return idea.engine === 2 || "shareability" in idea.scores ? SCORE_SETS[2] : SCORE_SETS[1];
}

export function totalScore(idea: Pick<Idea, "engine" | "scores">): number {
  return scoreSet(idea).reduce((sum, s) => sum + (idea.scores[s.key]?.value ?? 0) * s.weight, 0);
}
