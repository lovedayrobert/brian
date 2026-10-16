import { lensById } from "@/lib/brand/lenses";
import type { Idea, Moment, Signal, SourceContext, Trend } from "@/lib/domain/types";

/** Where an idea came from, in words a reviewer can follow: the trend, story or Lab lens, with links. */
export function sourceContextFor(idea: Idea, data: { trends: Trend[]; moments: Moment[]; signals: Signal[] }): SourceContext | undefined {
  if (idea.sourceContext) return idea.sourceContext;
  if (idea.origin === "lab" || idea.lens) {
    const lens = lensById(idea.lens ?? "");
    return { kind: "lab", title: lens?.name ?? idea.lens ?? "Opportunity Lab", summary: lens?.tagline };
  }
  const t = data.trends.find((x) => x.id === idea.trendId);
  if (t) {
    const primary = data.signals.find((s) => s.id === t.signalIds[0]);
    const links = data.signals
      .filter((s) => t.signalIds.includes(s.id) && s.id !== t.signalIds[0])
      .slice(0, 4)
      .map((s) => ({ title: s.title, url: s.url, outlet: s.author ?? s.sourceId }));
    return { kind: "trend", title: t.title, url: primary?.url, summary: (t.whyItMatters ?? t.summary)?.slice(0, 280), links };
  }
  const m = data.moments.find((x) => x.id === idea.momentId);
  if (m) {
    return {
      kind: "moment",
      title: m.title,
      url: m.sourceUrl,
      summary: m.description?.slice(0, 280),
      links: (m.sources ?? []).slice(0, 4).map((s) => ({ title: s.title, url: s.url, outlet: s.outlet })),
    };
  }
  return undefined;
}
