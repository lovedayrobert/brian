import type { Idea } from "@/lib/domain/types";

/** Score sets by engine, in display order. */
export const SCORE_SETS = {
  4: [
    { key: "charge", label: "Charge (how strong the feeling is)", short: "Feel", weight: 2 },
    { key: "spread", label: "Spread (who reposts it)", short: "Spread", weight: 1.5 },
    { key: "simplicity", label: "Simplicity (one sentence)", short: "Simple", weight: 1.5 },
    { key: "realness", label: "Realness (doable this week, raw)", short: "Real", weight: 1 },
    { key: "attribution", label: "Attribution (can't retell it without Cashy)", short: "Cashy", weight: 1 },
  ],
  3: [
    { key: "views", label: "Views (with zero ad spend)", short: "Views", weight: 2 },
    { key: "shareability", label: "Group-chat sends", short: "Sends", weight: 1.5 },
    { key: "native", label: "Native (looks like a person made it)", short: "Native", weight: 1.5 },
    { key: "makeable", label: "Makeable this week", short: "Easy", weight: 1 },
    { key: "attribution", label: "Attribution (people know it's Cashy)", short: "Cashy", weight: 1 },
  ],
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
  if (idea.engine === 4 || "charge" in idea.scores) return SCORE_SETS[4];
  if (idea.engine === 3 || "views" in idea.scores) return SCORE_SETS[3];
  return idea.engine === 2 || "shareability" in idea.scores ? SCORE_SETS[2] : SCORE_SETS[1];
}

export function totalScore(idea: Pick<Idea, "engine" | "scores">): number {
  return scoreSet(idea).reduce((sum, s) => sum + (idea.scores[s.key]?.value ?? 0) * s.weight, 0);
}
