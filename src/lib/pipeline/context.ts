import { BRANDS, CAMPAIGN_HISTORY } from "@/lib/brand/brands";
import { QUALITY_BAR, STUNTS } from "@/lib/brand/quality-bar";
import type { BrandId, Citation, Signal, Trend } from "@/lib/domain/types";

/** Shared context every agent sees: brand book, advantages, history, quality bar. */
export function brandContext(brandId: BrandId): string {
  const b = BRANDS[brandId];
  return `
<brand name="${b.name}">
Positioning: ${b.positioning}
Voice:
${b.voice.map((v) => `- ${v}`).join("\n")}
Tone examples:
${b.toneExamples.map((t) => `- Good: "${t.good}"  Bad: "${t.bad}"`).join("\n")}
Banned phrases: ${b.bannedPhrases.join(", ")}
Compliance rules:
${b.compliance.map((c) => `- ${c}`).join("\n")}
Advantages (real, usable as proof):
${b.advantages.map((a) => `- ${a.claim}`).join("\n")}
Campaign history:
${CAMPAIGN_HISTORY.filter((h) => h.brandId === brandId)
  .map((h) => `- ${h.name}: ${h.learnings.join(" ")}`)
  .join("\n")}
</brand>`.trim();
}

export function qualityBarContext(): string {
  return `
<quality_bar>
What a great idea has:
${QUALITY_BAR.traits.map((t) => `- ${t}`).join("\n")}

Banned. Never produce these:
${QUALITY_BAR.banned.map((t) => `- ${t}`).join("\n")}

The five tests:
${QUALITY_BAR.tests.map((t) => `- ${t.name}: ${t.question}`).join("\n")}

Edge levels: safe, spicy, wild. Lean spicy and wild. Controversy, PR heat and offended competitors are features. Only the red lines are hard stops.

Red lines (the only hard stops):
${QUALITY_BAR.redLines.map((t) => `- ${t}`).join("\n")}
</quality_bar>

<stunt_library>
The gold standard. Find a new twist of the same kind; never copy these.
${STUNTS.map((s) => `- ${s.brand}: ${s.what} Twist: ${s.twist} Why: ${s.whyItWorked}`).join("\n")}
</stunt_library>`.trim();
}

export const ACCURACY_RULES = `
<accuracy>
Accuracy beats excitement. A confident wrong answer is the worst thing you can produce.
- Only state facts that appear in the evidence provided, and cite the evidence URL exactly as given.
- If a claim has no source, set its url to null. It will be shown as unresolved. Never invent URLs, numbers, quotes, dates or names.
- Label every number: measured (our own data, none supplied yet), benchmark (a sourced industry figure, with URL), or assumption (your estimate, with reasoning).
- Never depict or put words in the mouth of a real person. Reacting to public moments about public figures is fine.
</accuracy>`.trim();

export function trendEvidence(trend: Trend, signals: Signal[]): { text: string; allowed: Citation[] } {
  const linked = signals.filter((s) => trend.signalIds.includes(s.id));
  const allowed: Citation[] = linked.map((s) => ({
    url: s.url,
    title: s.title,
    publisher: s.author ?? s.sourceId,
    retrievedAt: s.capturedAt,
  }));
  const lc = trend.lifecycle;
  const text = `
<trend id="${trend.id}">
Title: ${trend.title}
Category: ${trend.category}
Summary: ${trend.summary.slice(0, 800)}
Lifecycle: ${lc.stage} (confidence ${lc.confidence}). ${lc.evidence.join(" ")}
${trend.headline ? `${trend.headline.label}: ${trend.headline.value.toLocaleString("en-US")}` : ""}
Sensitivity: ${trend.sensitivity}${trend.sensitivityReason ? ` (${trend.sensitivityReason})` : ""}
Evidence (cite these URLs only):
${linked
  .slice(0, 20)
  .map((s) => `- [${s.author ?? s.sourceId}] ${s.title} ${s.url}${s.summary ? `\n  ${s.summary.slice(0, 240)}` : ""}`)
  .join("\n")}
</trend>`.trim();
  return { text, allowed };
}

/** Keep only citations that point at evidence we actually hold. Everything else becomes unresolved. */
export function resolveUrl(url: string | null, allowed: Citation[]): Citation | null {
  if (!url) return null;
  const norm = (u: string) => u.replace(/[#?].*$/, "").replace(/\/$/, "");
  return allowed.find((a) => norm(a.url) === norm(url)) ?? null;
}
