import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageView } from "@/components/package/package-view";
import { SampleBanner } from "@/components/sample-banner";
import { FeedbackBar } from "@/components/feedback-bar";
import { EdgeBadge, PageHeader, Pill } from "@/components/ui";
import { linearReady } from "@/lib/adapters/tasks/linear";
import { AGENTS } from "@/lib/adapters/model";
import { factCheck, SECTION_META, SECTION_ORDER } from "@/lib/pipeline/develop";
import { load } from "@/lib/queries";

export default async function PackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load({ includeReviewOnly: true });
  const pkg = db.packages.find((p) => p.id === id);
  if (!pkg) notFound();
  const idea = db.ideas.find((i) => i.id === pkg.ideaId);
  if (!idea) notFound();
  const sections = SECTION_ORDER.map((k) => ({
    key: k,
    title: SECTION_META[k].title,
    agent: SECTION_META[k].agent ? AGENTS[SECTION_META[k].agent!].label : null,
  }));

  return (
    <>
      {!pkg.reviewOnly && (
        <Link href={`/ideas/${idea.id}`} className="mb-5 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
          <ArrowLeft className="h-3.5 w-3.5" /> Idea
        </Link>
      )}
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            {!pkg.reviewOnly && <EdgeBadge edge={idea.edge} />}
            <Pill className="capitalize">{pkg.status.replace("_", " ")}</Pill>
            <span>Launch target {new Date(pkg.launchDate).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}</span>
          </span>
        }
        title={idea.name}
        subtitle={idea.oneLiner}
      />
      {pkg.sample && <SampleBanner />}
      <div className="mb-6 max-w-[560px]">
        <FeedbackBar target={{ type: "package", id: pkg.id, label: idea.name }} />
      </div>
      <PackageView initial={pkg} idea={idea} sections={sections} linearReady={linearReady()} factCheck={factCheck(pkg)} />
    </>
  );
}
