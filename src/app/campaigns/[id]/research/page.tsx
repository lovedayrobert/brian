import { ResearchStep } from "@/components/campaign/research-step";
import { modelReady } from "@/lib/adapters/model";
import { examplesView, lookbackView, nodesView, questionsView } from "@/lib/brain-view";
import { campaignContext } from "@/lib/campaign-page";
import { personName } from "@/lib/people";

export const metadata = { title: "Research" };

export default async function ResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, campaign } = await campaignContext(id);
  return (
    <ResearchStep
      campaign={{ id: campaign.id, name: campaign.name, moment: campaign.moment }}
      ai={modelReady()}
      lookback={lookbackView(db)}
      nodes={nodesView(db, { campaignId: id })}
      examples={examplesView(db, { campaignId: id })}
      questions={questionsView(db, { campaignId: id })}
      // This campaign's research, plus any look at the same moment run elsewhere (Halloween 2024 is Halloween 2024 wherever it was looked at).
      research={(db.looks ?? [])
        .filter((l) => l.campaignId === id || (campaign.moment && l.label.startsWith(campaign.moment)))
        .map((l) => ({ id: l.id, at: l.at, byName: personName(db, l.by), label: l.label, handle: l.handle, from: l.from, to: l.to, count: l.posts.length, others: l.others.length }))}
    />
  );
}
