import { Bookmark } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { SparkBox, SwipeForm } from "@/components/swipe-form";
import { Card, EmptyState, PageHeader, Pill, SourceLink } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { STUNTS } from "@/lib/brand/quality-bar";
import { compact, relativeTime } from "@/lib/format";
import { load } from "@/lib/queries";

export const metadata = { title: "Swipe file" };

export default async function SwipePage() {
  const db = await load();
  const swipes = db.swipes ?? [];
  const ai = modelReady();

  return (
    <>
      <PageHeader
        title="Swipe file"
        subtitle="Posts the team thinks are clever. Brian reads the most recent 15 every time it invents, to learn your taste and how far outside the box to go. It never copies them. Hit Riff on this to start ideas from one."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Card className="p-5">
            <SwipeForm />
          </Card>
          {swipes.length === 0 ? (
            <EmptyState icon={<Bookmark className="h-5 w-5" />} title="Nothing swiped yet" body="Paste a post you wish Cashy had done, and say why." />
          ) : (
            swipes.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                  <Pill>{s.platform}</Pill>
                  {s.author && <span>{s.author}</span>}
                  {s.metrics &&
                    Object.entries(s.metrics).map(([k, v]) => (
                      <span key={k}>
                        {compact(v)} {k}
                      </span>
                    ))}
                  <span>· added by {s.addedBy} {relativeTime(s.addedAt)}</span>
                </div>
                <h3 className="mt-2 text-[15.5px] font-semibold leading-snug">{s.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                  <span className="font-medium text-ink">Why: </span>
                  {s.why}
                </p>
                <div className="mt-2">
                  <SourceLink url={s.url} />
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <SparkBox swipeId={s.id} disabled={!ai} compact />
                </div>
                <div className="mt-2">
                  <ActionButton endpoint={`/api/swipes/${s.id}`} method="DELETE" variant="ghost" size="sm" pending="Removing…">
                    Remove
                  </ActionButton>
                </div>
              </Card>
            ))
          )}
        </div>
        <div>
          <Card className="p-5">
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Built in: what worked, and why</div>
            <ul className="mt-3 space-y-3 text-[13px] leading-snug">
              {STUNTS.map((s) => (
                <li key={s.id}>
                  <div className="font-medium">{s.brand}</div>
                  <div className="text-ink-2">{s.what}</div>
                  <div className="mt-0.5 text-ink-3">&ldquo;{s.shareLine}&rdquo;</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
