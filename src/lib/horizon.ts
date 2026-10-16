import type { Horizon, Idea } from "@/lib/domain/types";

/** The Lab lens that produces quick reactions; every other lens produces big ideas. */
export const REACTIVE_LENSES = new Set(["hijack-now"]);

export function horizonFor(idea: Pick<Idea, "horizon" | "origin" | "lens" | "trendId" | "momentId">): Horizon {
  if (idea.horizon) return idea.horizon;
  if (idea.origin === "lab" || idea.lens) return REACTIVE_LENSES.has(idea.lens ?? "") ? "reactive" : "evergreen";
  return "reactive";
}

export const HORIZON_COPY: Record<Horizon, { name: string; badge: string; blurb: string }> = {
  reactive: {
    name: "Quick reactions",
    badge: "24–48h",
    blurb: "A post, meme, reply or quick video on a story while it's hot: live the same day, gone in two days.",
  },
  evergreen: {
    name: "Series and big moments",
    badge: "Series",
    blurb: "Still simple content, with legs: a recurring bit that runs for weeks, a tiny build people keep sharing, or posts prepared for a big moment people wait weeks for (GTA 6, the World Cup, holidays).",
  },
};
