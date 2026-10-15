import { generateIdeas } from "@/lib/pipeline/ideas";
import { fail, requireUser } from "../_util";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { trendId, momentId, lens, steer } = (await req.json()) as { trendId?: string; momentId?: string; lens?: string; steer?: string };
    const result = await generateIdeas({ brandId: "cashy", trendId, momentId, lens, steer });
    return Response.json({ id: result.cards[0]?.id ?? null, cards: result.cards.length, killed: result.killed.length });
  } catch (e) {
    return fail(e);
  }
}
