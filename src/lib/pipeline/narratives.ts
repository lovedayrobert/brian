import * as z from "zod/v4";
import { callStructured, modelReady } from "@/lib/adapters/model";
import type { Moment, Signal } from "@/lib/domain/types";
import { assessSensitivity } from "@/lib/engine/safety";
import { tokens } from "@/lib/engine/relevance";

/**
 * Coin narratives. Most volume in the trenches is AI and utility launches,
 * which say nothing about culture. The valuable coins are named after a meme,
 * a person or a news moment. Brian sorts them, links culture coins to the
 * moments they reference, and turns culture coins with no news match into
 * "spotted in the trenches first" moments, often the earliest sign of a meme.
 */
export type CoinKind = "culture" | "utility" | "generic";

export interface CoinNarrative {
  kind: CoinKind;
  reference: string;
  method: "model" | "heuristic";
}

const UTILITY = /\b(ai|agent|agents|protocol|finance|fi|trade|trading|swap|labs?|network|chain|dao|grid|terminal|capital|fund|yield|bot|gpt|llm|compute|infra|launchpad|exchange|pay|wallet|reserve)\b/i;
const GENERIC = /\b(doge|pepe|inu|shib|cat|dog|frog|moon|baby|king|elon|trump|wif|bonk|chad|based)\b/i;

/** Rough split for when no model key is set. Always labelled heuristic in the UI. */
export function classifyCoinHeuristic(name: string, description?: string): CoinNarrative {
  const text = `${name} ${description ?? ""}`;
  if (UTILITY.test(text)) return { kind: "utility", reference: "Utility or AI launch", method: "heuristic" };
  const words = [...tokens(name)];
  if (words.length && words.every((w) => GENERIC.test(w))) return { kind: "generic", reference: "Generic memecoin name", method: "heuristic" };
  return { kind: "culture", reference: description?.split(/[.!?]/)[0]?.slice(0, 120) || "Possible meme or moment reference", method: "heuristic" };
}

const Out = z.object({
  coins: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["culture", "utility", "generic"]),
      reference: z.string().describe("What the coin references, in one line: the meme, person, clip or news moment. If unsure, say so."),
    }),
  ),
});

export async function classifyCoins(coins: Signal[]): Promise<Map<string, CoinNarrative>> {
  const out = new Map<string, CoinNarrative>();
  for (const c of coins) out.set(c.id, classifyCoinHeuristic(c.coin!.name, c.summary));
  if (!modelReady() || !coins.length) return out;
  try {
    const res = await callStructured({
      agent: "cartographer",
      subject: `${coins.length} coins`,
      schema: Out,
      system:
        "You read pump.fun memecoins for a marketing team that tracks internet culture. For each coin decide: culture (named after a specific meme, viral clip, person, phrase or news moment), utility (AI agents, protocols, trading tools, generic tech), or generic (dog/frog/cat names with no specific reference). Say what it references in one line. Do not guess at facts you don't know: say 'unclear reference' instead.",
      prompt: coins
        .map((c) => `[${c.id}] ${c.coin!.name} ($${c.coin!.symbol})${c.summary ? ` — ${c.summary.slice(0, 240)}` : ""}${c.coin!.x ? ` — X: ${c.coin!.x}` : ""}`)
        .join("\n"),
    });
    for (const r of res.coins) out.set(r.id, { kind: r.kind, reference: r.reference, method: "model" });
  } catch {
    // keep heuristic labels
  }
  return out;
}

/** Culture coins the news hasn't caught up with become their own Live moments. */
export function trenchMoments(coins: Signal[], linked: Set<string>, now: Date): Moment[] {
  return coins
    // Only coins the model has actually read; the keyword heuristic is too noisy to promote into Live.
    .filter((c) => c.narrative?.kind === "culture" && c.narrative.method === "model" && !linked.has(c.id))
    .sort((a, b) => b.coin!.buyers1h - a.coin!.buyers1h)
    .slice(0, 3)
    .map((c): Moment => {
      const sens = assessSensitivity(`${c.coin!.name} ${c.summary ?? ""}`);
      return {
        id: `tm_${c.coin!.address.slice(0, 12)}`,
        kind: "breaking",
        title: c.coin!.name,
        date: c.publishedAt ?? now.toISOString(),
        category: "memes",
        description: `Spotted in the trenches first: $${c.coin!.symbol}, ${c.coin!.buyers1h} buyers in the last hour. ${c.narrative!.reference}`,
        sourceUrl: c.url,
        sources: [{ title: `${c.coin!.name} on DexScreener`, url: c.url, outlet: "DexScreener" }, ...(c.coin!.x ? [{ title: "Coin's X account", url: c.coin!.x, outlet: "X" }] : [])],
        sensitivity: sens.level,
        sensitivityReason: sens.reason,
        relevance: 0.7,
        imageUrl: c.imageUrl,
        trenchFirst: true,
        coins: [{ name: c.coin!.name, symbol: c.coin!.symbol, url: c.url, volume6h: c.coin!.volume6h }],
      };
    });
}
