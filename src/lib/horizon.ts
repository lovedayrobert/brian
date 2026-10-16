import type { Horizon, Idea } from "@/lib/domain/types";

/** The Lab lens that produces quick reactions; every other lens produces big ideas. */
export const REACTIVE_LENSES = new Set(["main-character", "schadenfreude", "hijack-now"]);

export function horizonFor(idea: Pick<Idea, "horizon" | "origin" | "lens" | "trendId" | "momentId">): Horizon {
  if (idea.horizon) return idea.horizon;
  if (idea.origin === "lab" || idea.lens) return REACTIVE_LENSES.has(idea.lens ?? "") ? "reactive" : "evergreen";
  return "reactive";
}

export const HORIZON_COPY: Record<Horizon, { name: string; badge: string; blurb: string }> = {
  reactive: {
    name: "Quick moves",
    badge: "24–48h",
    blurb: "One act on something people feel strongly about today, done within 48 hours while it's hot.",
  },
  evergreen: {
    name: "Bigger moves",
    badge: "Bigger move",
    blurb: "One act people are still talking about next week: aimed at a feeling that lasts, or ready for a big moment people wait weeks for (GTA 6, the World Cup, holidays).",
  },
};
