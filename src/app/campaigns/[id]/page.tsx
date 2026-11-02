import { redirect } from "next/navigation";
import { campaignContext } from "@/lib/campaign-page";

/** Opening a campaign takes you to where it's up to. */
export default async function CampaignIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { step } = await campaignContext(id);
  redirect(`/campaigns/${id}/${step === "plan" || step === "report" ? "ideas" : step}`);
}
