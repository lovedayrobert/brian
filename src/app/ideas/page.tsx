import clsx from "clsx";
import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { IdeaCard } from "@/components/idea-card";
import { IDEAS_TABS, SectionTabs } from "@/components/section-tabs";
import { EmptyState, Pill } from "@/components/ui";
import { lensById } from "@/lib/brand/lenses";
import { specialDayById } from "@/lib/calendar/days";
import type { Idea } from "@/lib/domain/types";
import { relativeTime } from "@/lib/format";
import { keyVisualFor, load } from "@/lib/queries";
import { totalScore } from "@/lib/scores";
import { Reactions } from "@/components/reactions";
import { reactionScore } from "@/lib/collab";
import { personName } from "@/lib/people";
import { nameMap, reactionIds, viewer } from "@/lib/viewer";
import type { DB } from "@/lib/store";

export const metadata = { title: "Brian's ideas" };

type View = "review" | "approved" | "killed";

const VIEWS: { id: View; label: string; empty: string }[] = [
  { id: "review", label: "To review", empty: "Nothing waiting on you." },
  { id: "approved", label: "Approved", empty: "Nothing approved yet. Open an idea and add it to the calendar, or develop it into a campaign." },
  { id: "killed", label: "Killed", empty: "Nothing killed yet." },
];

/** Brian's ideas, organised around the decision you make on each: review, approve, or leave killed. */
export default async function Ideas({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: v } = await searchParams;
  const view: View = VIEWS.some((x) => x.id === v) ? (v as View) : "review";
  const db = await load();
  const me = await viewer();
  const names = nameMap(db, [...reactionIds(db), ...db.ideas.flatMap((i) => (i.createdBy ? [i.createdBy] : []))]);
  const team = (i: Idea) => reactionScore(db.reactions?.[i.id]);

  // Approved = developed into a campaign, or added to the calendar.
  const scheduled = new Set([...(db.calendar ?? []).flatMap((c) => (c.ideaId ? [c.ideaId] : [])), ...Object.values(db.calendarMeta ?? {}).flatMap((m) => (m.ideaId ? [m.ideaId] : []))]);
  const approved = (i: Idea) => i.status === "developing" || i.status === "developed" || scheduled.has(i.id);
  const buckets: Record<View, Idea[]> = {
    review: db.ideas.filter((i) => i.status === "card" && !approved(i)),
    approved: db.ideas.filter((i) => i.status !== "killed" && i.status !== "candidate" && approved(i)),
    killed: db.ideas.filter((i) => i.status === "killed"),
  };
  const list = [...buckets[view]].sort((a, b) => (view === "killed" ? b.createdAt.localeCompare(a.createdAt) : team(b) - team(a) || totalScore(b) - totalScore(a) || b.createdAt.localeCompare(a.createdAt)));

  return (
    <>
      <SectionTabs space="Ideas" tabs={IDEAS_TABS} active="ideas" />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {VIEWS.map((x) => (
          <Link
            key={x.id}
            href={x.id === "review" ? "/ideas" : `/ideas?view=${x.id}`}
            className={clsx("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] transition", view === x.id ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card hover:text-ink")}
          >
            {x.label}
            <span className={clsx("rounded-full px-1.5 text-[12px] tabular", view === x.id ? "bg-white/20" : "bg-surface-3 text-ink-3")}>{buckets[x.id].length}</span>
          </Link>
        ))}
        <Link href="/ideas/new" className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13.5px] font-medium shadow-card hover:shadow-raised">
          Get more ideas <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mb-6 max-w-[720px] text-[13.5px] leading-relaxed text-ink-2">
        {view === "review" && "Ideas that survived Brian's audience panel, the team's favourites first. React to vote; open one to add it to the calendar, develop it, or reject it."}
        {view === "approved" && "Ideas you've put in the calendar or developed into a campaign."}
        {view === "killed" && "Ideas the audience panel or Red Lines rejected, with the reason. Open one to overrule the panel; Red Lines can't be overruled."}
      </p>

      {list.length === 0 ? (
        db.ideas.length === 0 ? (
          <EmptyState
            icon={<Lightbulb className="h-5 w-5" />}
            title="No ideas yet"
            body="Point Brian somewhere and it comes back with about ten ideas; the audience panel keeps the best three."
            action={
              <Link href="/ideas/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg hover:opacity-90">
                Get ideas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
        ) : (
          <p className="rounded-[16px] bg-surface px-5 py-6 text-[14px] text-ink-2 shadow-card">{VIEWS.find((x) => x.id === view)!.empty}</p>
        )
      ) : view === "killed" ? (
        <div className="divide-y divide-line overflow-hidden rounded-[16px] bg-surface shadow-card">
          {list.map((i) => {
            const from = source(i, db);
            return (
              <Link key={i.id} href={`/ideas/${i.id}`} className="block px-5 py-4 transition hover:bg-surface-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-medium">{i.name}</span>
                  {i.screening.redLines && !i.screening.redLines.pass && <Pill tone="bad">Red line</Pill>}
                </div>
                <div className="mt-1 text-[13px] text-bad">{i.screening.critic.reasons[0]}</div>
                <div className="mt-1 text-[12px] text-ink-3">
                  From {from.label} · {relativeTime(i.createdAt)}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const from = source(i, db);
            return (
              <div key={i.id} className="flex flex-col">
                <div className="mb-1.5 truncate px-1 text-[12px] text-ink-3">
                  From{" "}
                  {from.href ? (
                    <Link href={from.href} className="hover:text-accent-ink hover:underline">
                      {from.label}
                    </Link>
                  ) : (
                    from.label
                  )}{" "}
                  · {relativeTime(i.createdAt)}
                  {i.createdBy && <> · by {personName(db, i.createdBy)}</>}
                  {scheduled.has(i.id) && <span className="text-good"> · in the calendar</span>}
                </div>
                <IdeaCard idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <Reactions type="idea" id={i.id} initial={db.reactions?.[i.id] ?? {}} me={me.id} names={names} size="sm" />
                  {(db.comments ?? []).some((c) => c.target.type === "idea" && c.target.id === i.id) && (
                    <Link href={`/ideas/${i.id}#comments`} className="shrink-0 text-[12px] text-ink-3 hover:text-ink">
                      💬 {(db.comments ?? []).filter((c) => c.target.type === "idea" && c.target.id === i.id).length}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Where an idea came from, in plain words. */
function source(i: Idea, db: DB): { label: string; href?: string } {
  if (i.origin === "lab" || i.lens) {
    if (i.lens === "spark") {
      const sw = i.spark?.swipeId ? db.swipes?.find((s) => s.id === i.spark!.swipeId) : undefined;
      if (sw) return { label: `a riff on ${sw.author ?? "a post"}'s post`, href: "/learning" };
      return { label: i.spark?.text ? `the spark “${i.spark.text.slice(0, 50)}${i.spark.text.length > 50 ? "…" : ""}”` : "your own idea", href: "/ideas/new" };
    }
    const lens = lensById(i.lens ?? "");
    return { label: lens ? `"${lens.name}"` : "an earlier idea type", href: "/ideas/new" };
  }
  if (i.trendId) {
    const t = db.trends.find((x) => x.id === i.trendId);
    return { label: t ? `the trend "${t.title}"` : "a trend", href: t ? `/radar/trends/${t.id}` : undefined };
  }
  if (i.momentId?.startsWith("day_")) {
    const day = specialDayById(i.momentId);
    return { label: day ? `${day.title} (${day.date.slice(8)}/${day.date.slice(5, 7)})` : "a calendar day", href: day ? `/calendar?d=${day.date}&open=${day.date}` : "/calendar" };
  }
  const m = db.moments.find((x) => x.id === i.momentId);
  return { label: m ? `the story "${m.title}"` : "a news story", href: m ? `/radar/breaking#${m.id}` : undefined };
}
