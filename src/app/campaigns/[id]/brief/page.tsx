import { BriefFlow } from "@/components/campaign/brief-flow";
import { modelReady } from "@/lib/adapters/model";
import { todayDay } from "@/lib/calendar/dates";
import { specialDays } from "@/lib/calendar/days";
import { campaignContext } from "@/lib/campaign-page";

export const metadata = { title: "Brief" };

export default async function BriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { campaign } = await campaignContext(id);
  const today = todayDay();
  const momentDate = campaign.moment ? specialDays(today, `${Number(today.slice(0, 4)) + 1}-12-31`).find((d) => d.title === campaign.moment)?.date : undefined;
  return (
    <BriefFlow
      campaignId={campaign.id}
      name={campaign.name}
      moment={campaign.moment}
      momentDate={momentDate}
      ai={modelReady()}
      initial={{ goals: [], audience: [], channels: [], ...(campaign.briefing ?? {}), brief: campaign.brief, from: campaign.from, to: campaign.to }}
    />
  );
}
