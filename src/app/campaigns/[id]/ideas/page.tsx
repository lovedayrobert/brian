import { IdeasStep } from "@/components/campaign/ideas-step";
import { IdeaCard } from "@/components/idea-card";
import { modelReady } from "@/lib/adapters/model";
import { campaignContext } from "@/lib/campaign-page";
import { keyVisualFor } from "@/lib/queries";

export const metadata = { title: "Ideas" };

export default async function IdeasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, campaign, learned, ideas } = await campaignContext(id);
  const shown = ideas.filter((i) => i.status !== "killed").sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  return (
    <IdeasStep
      campaign={{ id: campaign.id, name: campaign.name, moment: campaign.moment }}
      ai={modelReady()}
      learned={learned}
      ideas={shown.map((i) => (
        <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
      ))}
    />
  );
}
