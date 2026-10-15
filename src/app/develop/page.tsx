import { Layers } from "lucide-react";
import Link from "next/link";
import { KeyVisual } from "@/components/mockups/key-visual";
import { EmptyState, PageHeader, Pill } from "@/components/ui";
import { relativeTime } from "@/lib/format";
import { SECTION_ORDER } from "@/lib/pipeline/develop";
import { keyVisualFor, load } from "@/lib/queries";

export const metadata = { title: "Packages" };

export default async function Packages() {
  const db = await load();
  return (
    <>
      <PageHeader title="Campaign packages" subtitle="Every idea you've developed, from executive summary to a briefed Linear project." />
      {db.packages.length === 0 ? (
        <EmptyState icon={<Layers className="h-5 w-5" />} title="No packages yet" body="Open an idea card and press Develop." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {db.packages.map((p) => {
            const idea = db.ideas.find((i) => i.id === p.ideaId);
            const done = SECTION_ORDER.filter((k) => p.sections[k].status === "done").length;
            return (
              <Link key={p.id} href={`/develop/${p.id}`} className="overflow-hidden rounded-[20px] bg-surface shadow-card transition hover:-translate-y-px hover:shadow-raised">
                <KeyVisual line={idea?.name ?? "Campaign"} imageUrl={keyVisualFor(p.ideaId, db.packages)} className="aspect-[16/9] w-full" compact />
                <div className="p-5">
                  <div className="text-[16px] font-semibold tracking-tight">{idea?.name}</div>
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-3">
                    <Pill className="capitalize">{p.status.replace("_", " ")}</Pill>
                    {p.sample && <Pill tone="warn">Sample</Pill>}
                    <span>
                      {done}/{SECTION_ORDER.length} sections
                    </span>
                    <span>·</span>
                    <span>{relativeTime(p.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
