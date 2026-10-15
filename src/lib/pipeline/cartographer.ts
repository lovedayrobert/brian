import * as z from "zod/v4";
import { callStructured, modelReady } from "@/lib/adapters/model";
import type { Moment, Trend } from "@/lib/domain/types";

const Out = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      category: z.enum(["crypto", "gambling", "streaming", "gaming", "sport", "memes", "markets", "entertainment", "tech", "politics", "culture"]),
      relevance: z.number().describe("0 to 1: talkability. Would a crypto-native, 18-35, gaming and streaming audience joke, argue or post about this today? Trade news, regulation and corporate deals score low."),
      why: z.string().describe("One short line: the angle people are reacting to, or why nobody will care"),
    }),
  ),
});

/**
 * Cartographer: replaces the keyword heuristic with a model judgement of
 * category and audience relevance. Cheap (Haiku) and runs once per sweep.
 * Without a key the heuristic stays, labelled as such.
 */
export async function scoreRelevance(trends: Trend[], moments: Moment[]): Promise<void> {
  if (!modelReady()) return;
  const items = [
    ...trends.slice(0, 80).map((t) => ({ id: t.id, text: `${t.title}. ${t.summary.slice(0, 200)}` })),
    ...moments.filter((m) => m.kind === "breaking").slice(0, 40).map((m) => ({ id: m.id, text: `${m.title}. ${m.description.slice(0, 200)}` })),
  ];
  const out = await callStructured({
    agent: "cartographer",
    subject: `${items.length} items`,
    schema: Out,
    system: "You sort internet moments for a crypto casino's marketing team, who hijack culture the way Stake and Shuffle do. Score each item on talkability: is there drama, a meme, a ridiculous moment, a streamer, a scandal, something people will screenshot and argue about? Regulation, licensing, earnings, institutional crypto and corporate deals are boring however relevant the topic. Be harsh: most news scores under 0.3.",
    prompt: items.map((i) => `[${i.id}] ${i.text}`).join("\n"),
  });
  const byId = new Map(out.items.map((i) => [i.id, i]));
  for (const t of trends) {
    const r = byId.get(t.id);
    if (!r) continue;
    t.category = r.category;
    t.relevance = Math.max(0, Math.min(1, r.relevance));
    t.relevanceMethod = "model";
    t.whyItMatters = r.why;
  }
  for (const m of moments) {
    const r = byId.get(m.id);
    if (!r) continue;
    m.category = r.category;
    m.relevance = Math.max(0, Math.min(1, r.relevance));
  }
}
