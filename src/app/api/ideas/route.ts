import { generateIdeas } from "@/lib/pipeline/ideas";
import { fail, requireUser } from "../_util";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  try {
    const { trendId, momentId, lens, steer, horizon, spark, swipeId, dayId } = (await req.json()) as {
      trendId?: string;
      momentId?: string;
      lens?: string;
      steer?: string;
      horizon?: "reactive" | "evergreen";
      spark?: string;
      swipeId?: string;
      dayId?: string;
    };
    if (spark !== undefined && !spark.trim() && !swipeId) throw new Error("Write a starting point, or pick a post from the swipe file.");
    const result = await generateIdeas({
      brandId: "cashy",
      trendId,
      momentId,
      dayId,
      lens,
      steer,
      horizon: horizon === "reactive" || horizon === "evergreen" ? horizon : undefined,
      spark: spark !== undefined || swipeId ? { text: (spark ?? "").slice(0, 2000), swipeId } : undefined,
    });
    return Response.json({ id: result.cards[0]?.id ?? null, cards: result.cards.length, killed: result.killed.length });
  } catch (e) {
    return fail(e);
  }
}
