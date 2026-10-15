import { Images } from "lucide-react";
import Link from "next/link";
import { KeyVisual } from "@/components/mockups/key-visual";
import { EmptyState, PageHeader } from "@/components/ui";
import { keyVisualFor, load } from "@/lib/queries";

export const metadata = { title: "Mockups" };

export default async function Mockups() {
  const db = await load();
  const ready = db.packages.filter((p) => p.sections.creative.status === "done");
  return (
    <>
      <PageHeader title="Mockups" subtitle="Every campaign's assets in context: X, Instagram, TikTok, the landing page, Telegram and Discord." />
      {ready.length === 0 ? (
        <EmptyState icon={<Images className="h-5 w-5" />} title="No mockups yet" body="Mockups render automatically when a package's creative section is ready." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ready.map((p) => {
            const idea = db.ideas.find((i) => i.id === p.ideaId);
            return (
              <Link key={p.id} href={`/mockups/${p.id}`} className="overflow-hidden rounded-[20px] bg-surface shadow-card transition hover:-translate-y-px hover:shadow-raised">
                <KeyVisual line={idea?.name ?? ""} imageUrl={keyVisualFor(p.ideaId, db.packages)} className="aspect-square w-full" aspect="square" />
                <div className="flex items-center gap-2 p-4 text-[15px] font-semibold">
                  {idea?.name}
                  {p.sample && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-medium text-warn">Sample</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
