import { notFound } from "next/navigation";
import { CampaignApp } from "@/components/brain/campaign-app";
import { IdeaCard } from "@/components/idea-card";
import { modelReady } from "@/lib/adapters/model";
import { examplesView, lookbackView, nodesView, questionsView } from "@/lib/brain-view";
import { campaignById } from "@/lib/campaigns";
import { keyVisualFor, load } from "@/lib/queries";
import { personName } from "@/lib/people";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const db = await load();
  return { title: campaignById(db, (await params).id)?.name ?? "Campaign" };
}

/** One campaign: its own Brian, what it's learned, and the ideas made for it. */
export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load();
  const campaign = campaignById(db, id);
  if (!campaign) notFound();
  const ideas = db.ideas.filter((i) => i.campaignId === id && i.status !== "killed").sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return (
    <CampaignApp
      campaign={campaign}
      ai={modelReady()}
      lookback={lookbackView(db)}
      nodes={nodesView(db, { campaignId: id })}
      examples={examplesView(db, { campaignId: id })}
      questions={questionsView(db, { campaignId: id })}
      // This campaign's research, plus any look at the same moment run elsewhere (Halloween 2024 is Halloween 2024 wherever it was looked at).
      research={(db.looks ?? [])
        .filter((l) => l.campaignId === id || (campaign.moment && l.label.startsWith(campaign.moment)))
        .map((l) => ({ id: l.id, at: l.at, byName: personName(db, l.by), label: l.label, handle: l.handle, from: l.from, to: l.to, count: l.posts.length, others: l.others.length }))}
      ideas={ideas.map((i) => (
        <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
      ))}
    />
  );
}
