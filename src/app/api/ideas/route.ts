import { specialDays } from "@/lib/calendar/days";
import { campaignById } from "@/lib/campaigns";
import { generateIdeas } from "@/lib/pipeline/ideas";
import { repo } from "@/lib/store";
import { fail, requireUser , setActor } from "../_util";

export const maxDuration = 300;

export async function POST(req: Request) {
  const denied = await requireUser(req);
  if (denied) return denied;
  setActor(req);
  try {
    const { trendId, momentId, lens, steer, horizon, spark, swipeId, dayId, campaignId } = (await req.json()) as {
      trendId?: string;
      momentId?: string;
      lens?: string;
      steer?: string;
      horizon?: "reactive" | "evergreen";
      spark?: string;
      swipeId?: string;
      dayId?: string;
      campaignId?: string;
    };
    if (spark !== undefined && !spark.trim() && !swipeId) throw new Error("Write a starting point, or pick a post from the swipe file.");
    // A campaign's ideas aim at its next moment (the next Halloween) and take the team's brief as direction.
    const campaign = campaignById(await repo.read(), campaignId);
    if (campaignId && !campaign) throw new Error("That campaign is gone.");
    const today = new Date().toISOString().slice(0, 10);
    const campaignDay = campaign?.moment ? specialDays(today, `${Number(today.slice(0, 4)) + 1}-12-31`).find((d) => d.title === campaign.moment)?.id : undefined;
    const result = await generateIdeas({
      brandId: "cashy",
      trendId,
      momentId,
      dayId: dayId ?? campaignDay,
      campaignId,
      lens: lens ?? (campaign && !campaignDay ? "blank-page" : undefined),
      // The agreed brief is the north star: its audience and channels shape the ideas, and its no-gos are hard lines.
      steer:
        steer ??
        (campaign
          ? [
              `Ideas for the campaign "${campaign.name}".`,
              campaign.brief,
              campaign.briefing?.audience.length ? `For: ${campaign.briefing.audience.join(", ")}.` : "",
              campaign.briefing?.channels.length ? `It runs on: ${campaign.briefing.channels.join(", ")}; every idea must work there.` : "",
              campaign.briefing?.musts ? `It must: ${campaign.briefing.musts}.` : "",
              campaign.briefing?.nogos ? `Hard line, never: ${campaign.briefing.nogos}.` : "",
              campaign.from ? `It runs ${campaign.from}${campaign.to ? ` to ${campaign.to}` : ""}.` : "",
            ]
              .filter(Boolean)
              .join(" ")
          : undefined),
      horizon: horizon === "reactive" || horizon === "evergreen" ? horizon : undefined,
      spark: spark !== undefined || swipeId ? { text: (spark ?? "").slice(0, 2000), swipeId } : undefined,
    });
    return Response.json({ id: result.cards[0]?.id ?? null, cards: result.cards.length, killed: result.killed.length });
  } catch (e) {
    return fail(e);
  }
}
