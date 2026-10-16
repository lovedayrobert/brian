import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MockupGallery } from "@/components/mockups/gallery";
import { ActionButton } from "@/components/action-button";
import { falReady } from "@/lib/adapters/image/fal";
import { modelReady } from "@/lib/adapters/model";
import type { MockupsContent } from "@/components/package/sections";
import { SampleBanner } from "@/components/sample-banner";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Creative } from "@/lib/pipeline/package-schemas";
import { load } from "@/lib/queries";

export default async function MockupsFor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load({ includeReviewOnly: true });
  const pkg = db.packages.find((p) => p.id === id);
  if (!pkg) notFound();
  const idea = db.ideas.find((i) => i.id === pkg.ideaId);
  const creative = pkg.sections.creative.content as Creative | undefined;
  const mock = pkg.sections.mockups.content as MockupsContent | undefined;
  const kv = mock?.keyVisualUrl ?? null;
  return (
    <>
      <Link href={`/develop/${pkg.id}`} className="mb-5 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Package
      </Link>
      <PageHeader title={`${idea?.name ?? "Campaign"} mockups`} subtitle="Every asset at its real proportions, inside its real platform frame, each in its own native format."
        actions={
          <>
            <ActionButton endpoint={`/api/develop/${pkg.id}/visuals`} variant="secondary" pending="Art Director at work… (1–3 min)" disabled={!modelReady()} disabledReason={!modelReady() ? "Needs the AI key" : undefined}>
              Redo visuals
            </ActionButton>
            <ActionButton endpoint={`/api/develop/${pkg.id}/visuals`} body={{ teaser: true }} pending="Rendering video… (2–8 min)" disabled={!falReady()} disabledReason={!falReady() ? "Needs FAL_KEY" : undefined}>
              Make teaser video
            </ActionButton>
          </>
        }
      />
      {pkg.sample && <SampleBanner />}
      {creative ? (
        <MockupGallery creative={creative} keyVisualUrl={kv} visuals={mock?.visuals} storyboardFrames={mock?.storyboardFrames} teaserUrl={mock?.teaser?.url ?? null} ideaName={idea?.name ?? ""} />
      ) : (
        <EmptyState title="Mockups appear once the creative section is ready" />
      )}
    </>
  );
}
