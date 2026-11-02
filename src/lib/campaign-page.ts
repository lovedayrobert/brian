import { notFound } from "next/navigation";
import { campaignById, currentStep } from "@/lib/campaigns";
import { load } from "@/lib/queries";

/** Everything a campaign's pages need to know about where it is. */
export async function campaignContext(id: string) {
  const db = await load();
  const campaign = campaignById(db, id);
  if (!campaign) notFound();
  const learned = (db.brain ?? []).filter((n) => n.campaignId === id).length;
  const ideas = db.ideas.filter((i) => i.campaignId === id);
  const liked = ideas.filter((i) => i.review?.verdict === "love").length;
  return { db, campaign, learned, ideas, step: currentStep(campaign, { learned, liked }) };
}
