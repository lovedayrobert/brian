import { Bookmark } from "lucide-react";
import { IDEAS_TABS, SectionTabs } from "@/components/section-tabs";
import { ActionButton } from "@/components/action-button";
import { SparkBox, SwipeForm } from "@/components/swipe-form";
import { Comments } from "@/components/comments";
import { Reactions } from "@/components/reactions";
import { personName } from "@/lib/people";
import { nameMap, reactionIds, viewer } from "@/lib/viewer";
import { Card, EmptyState, PageHeader, Pill, SourceLink } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { STUNTS } from "@/lib/brand/quality-bar";
import { compact, relativeTime } from "@/lib/format";
import { load } from "@/lib/queries";

export const metadata = { title: "Inspiration" };

export default async function SwipePage() {
  const db = await load();
  const me = await viewer();
  const names = nameMap(db, [...reactionIds(db), ...(db.people ?? []).map((p) => p.id)]);
  const people = (db.people ?? []).map((p) => ({ id: p.id, name: p.name }));
  const swipes = db.swipes ?? [];
  const ai = modelReady();

  return (
    <>
      <SectionTabs space="Ideas" tabs={IDEAS_TABS} active="inspiration" />
      <PageHeader
        title="Inspiration"
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
                  <span>· added by {personName(db, s.addedBy)} {relativeTime(s.addedAt)}</span>
                </div>
                <h3 className="mt-2 text-[15.5px] font-semibold leading-snug">{s.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                  <span className="font-medium text-ink">Why: </span>
                  {s.why}
                </p>
                <div className="mt-2">
                  <SourceLink url={s.url} />
                </div>
                <div className="mt-3">
                  <Reactions type="swipe" id={s.id} initial={db.reactions?.[s.id] ?? {}} me={me.id} names={names} size="sm" />
                </div>
                <details className="mt-3 rounded-[12px] bg-surface-2 px-3.5 py-2">
                  <summary className="cursor-pointer text-[12.5px] text-ink-2">
                    Comments ({(db.comments ?? []).filter((c) => c.target.type === "swipe" && c.target.id === s.id).length})
                  </summary>
                  <div className="pb-2 pt-3">
                    <Comments type="swipe" id={s.id} me={me.id} admin={me.admin} people={people} />
                  </div>
                </details>
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
