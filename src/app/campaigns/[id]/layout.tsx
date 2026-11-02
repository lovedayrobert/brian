import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { NorthStar } from "@/components/campaign/north-star";
import { Stepper } from "@/components/campaign/journey";
import { campaignContext } from "@/lib/campaign-page";

/** A campaign's frame: its name, the journey across the top, and the brief as a north star on every step. */
export default async function CampaignLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { campaign, step } = await campaignContext(id);
  const when = campaign.moment ? `Every ${campaign.moment}` : campaign.from ? `${campaign.from}${campaign.to ? ` to ${campaign.to}` : ""}` : "One-off";
  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pt-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="display text-[32px] leading-[1.05] sm:text-[40px]">{campaign.name}</h1>
        <span className="text-[14px] text-ink-3">{when}</span>
      </div>
      <Stepper campaignId={campaign.id} current={step} />
      <NorthStar campaignId={campaign.id} brief={campaign.brief} agreed={!!campaign.briefing?.agreedAt} />
      <div className="mt-8">{children}</div>
    </main>
  );
}
