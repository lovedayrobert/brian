import { generateIdeas } from "@/lib/pipeline/ideas";
import { fail } from "../_util";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { trendId, momentId, lens, steer } = (await req.json()) as { trendId?: string; momentId?: string; lens?: string; steer?: string };
    const result = await generateIdeas({ brandId: "cashy", trendId, momentId, lens, steer });
    return Response.json({ id: result.cards[0]?.id ?? null, cards: result.cards.length, killed: result.killed.length });
  } catch (e) {
    return fail(e);
  }
}
