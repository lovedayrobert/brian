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
    blurb: "Ride a story while it's hot: live the same day, almost no cost, gone in two days.",
  },
  evergreen: {
    name: "Big ideas",
    badge: "Big idea",
    blurb: "Simple, smart, original plays that keep Cashy visible for months, or are built around a big moment people wait weeks for (GTA 6, the World Cup, holidays). Nobody in our space has done them.",
  },
};
