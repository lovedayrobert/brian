import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MockupGallery } from "@/components/mockups/gallery";
import { SampleBanner } from "@/components/sample-banner";
import { EmptyState, PageHeader } from "@/components/ui";
import type { Creative } from "@/lib/pipeline/package-schemas";
import { load } from "@/lib/queries";

export default async function MockupsFor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load();
  const pkg = db.packages.find((p) => p.id === id);
  if (!pkg) notFound();
  const idea = db.ideas.find((i) => i.id === pkg.ideaId);
  const creative = pkg.sections.creative.content as Creative | undefined;
  const kv = (pkg.sections.mockups.content as { keyVisualUrl: string | null } | undefined)?.keyVisualUrl ?? null;
  return (
    <>
      <Link href={`/develop/${pkg.id}`} className="mb-5 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Package
      </Link>
      <PageHeader title={`${idea?.name ?? "Campaign"} mockups`} subtitle="Every asset at its real proportions, inside its real platform frame, sharing one key visual system." />
      {pkg.sample && <SampleBanner />}
      {creative ? (
        <MockupGallery creative={creative} keyVisualUrl={kv} ideaName={idea?.name ?? ""} />
      ) : (
        <EmptyState title="Mockups appear once the creative section is ready" />
      )}
    </>
  );
}
