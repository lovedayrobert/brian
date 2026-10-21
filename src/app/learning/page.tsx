import { GraduationCap } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Comments } from "@/components/comments";
import { FeedbackBox, LearnForm } from "@/components/learning-forms";
import { Reactions } from "@/components/reactions";
import { LEARNING_TABS, SectionTabs } from "@/components/section-tabs";
import { SparkBox } from "@/components/swipe-form";
import { Card, EmptyState, PageHeader, Pill, SourceLink } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { addDays, shortDate, todayDay } from "@/lib/calendar/dates";
import { specialDays } from "@/lib/calendar/days";
import type { Swipe } from "@/lib/domain/types";
import { compact, relativeTime } from "@/lib/format";
import { confirmed } from "@/lib/learning";
import { personName } from "@/lib/people";
import { load } from "@/lib/queries";
import { nameMap, reactionIds, viewer } from "@/lib/viewer";

export const metadata = { title: "Learning" };

const OWNER = { ours: "Ours", competitor: "Competitor", other: "Someone else's" } as const;
const VERDICT = { right: "said Brian got it", partly: "said partly", wrong: "said no" } as const;

const matchesEvent = (s: Swipe, title: string) => !!s.event && title.toLowerCase().includes(s.event.toLowerCase().split(/\s+/)[0]);

/**
 * Learning: the team links campaigns that worked, Brian explains why, the team
 * corrects him. What's confirmed becomes Cashy's identity, and every idea run
 * starts from it (Rob, 21 Oct: "probably the most important section").
 */
export default async function LearningPage() {
  const db = await load();
  const me = await viewer();
  const names = nameMap(db, [...reactionIds(db), ...(db.people ?? []).map((p) => p.id)]);
  const people = (db.people ?? []).map((p) => ({ id: p.id, name: p.name }));
  const swipes = db.swipes ?? [];
  const ai = modelReady();
  const today = todayDay();
  const upcoming = specialDays(today, addDays(today, 60)).filter((d) => d.kind !== "cashy").slice(0, 8);
  const toReview = swipes.filter((s) => s.breakdown && !s.feedback?.length).length;

  return (
    <>
      <SectionTabs space="Learning" tabs={LEARNING_TABS} active="examples" />
      <PageHeader
        title="What worked, and why"
        subtitle="Link campaigns and posts you rate: ours, rivals', anyone's, old or new. Brian explains why each one worked, you tell him if he got it, and what you confirm becomes Cashy's identity. Every idea run starts from this, then looks at what's happening today."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <Card className="p-5">
            <LearnForm events={upcoming.map((d) => d.title)} ai={ai} />
          </Card>
          {toReview > 0 && (
            <p className="px-1 text-[13px] text-ink-2">
              {toReview} explanation{toReview === 1 ? "" : "s"} waiting for you to say if Brian got it.
            </p>
          )}
          {swipes.length === 0 ? (
            <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="Nothing to learn from yet" body="Paste a campaign you rate. Add why if you can; Brian works out the rest." />
          ) : (
            swipes.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                  <Pill>{s.platform}</Pill>
                  {s.event && <Pill tone="accent">{s.event}</Pill>}
                  {s.owner && <Pill>{OWNER[s.owner]}</Pill>}
                  {confirmed(s) && <Pill tone="good">Confirmed</Pill>}
                  {s.author && <span>{s.author}</span>}
                  {s.metrics &&
                    Object.entries(s.metrics).map(([k, v]) => (
                      <span key={k}>
                        {compact(v)} {k}
                      </span>
                    ))}
                  <span>
                    · added by {personName(db, s.addedBy)} {relativeTime(s.addedAt)}
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-4 text-[15.5px] font-semibold leading-snug">{s.title}</h3>
                {s.why && (
                  <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">
                    <span className="font-medium text-ink">Why we rate it: </span>
                    {s.why}
                  </p>
                )}
                <div className="mt-2">
                  <SourceLink url={s.url} />
                </div>

                {s.breakdown ? (
                  <div className="mt-4 rounded-[14px] bg-surface-2 p-4 text-[13.5px] leading-relaxed">
                    <div className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Brian&rsquo;s take</div>
                    <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink">{s.breakdown.lesson}</p>
                    <dl className="mt-3 grid gap-2">
                      {(
                        [
                          ["What happened", s.breakdown.whatHappened],
                          ["The feeling", s.breakdown.feeling],
                          ["Why people shared it", s.breakdown.whySpread],
                          ["Why the brand got the credit", s.breakdown.whyBrand],
                          ["What it rode", s.breakdown.timing],
                          ["Never copy", s.breakdown.dontCopy],
                          ...(s.breakdown.unsure ? [["What he couldn't tell", s.breakdown.unsure]] : []),
                        ] as [string, string][]
                      ).map(([k, v]) => (
                        <div key={k}>
                          <dt className="text-[12px] text-ink-3">{k}</dt>
                          <dd className="text-ink-2">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    {!!s.feedback?.length && (
                      <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[12.5px] text-ink-2">
                        {s.feedback.map((f, i) => (
                          <li key={i}>
                            <span className="font-medium text-ink">{personName(db, f.by)}</span> {VERDICT[f.verdict]}
                            {f.note ? `: ${f.note}` : ""} <span className="text-ink-3">{relativeTime(f.at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-3 border-t border-line pt-3">
                      <FeedbackBox id={s.id} ai={ai} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <ActionButton endpoint={`/api/learning/${s.id}/breakdown`} size="sm" pending="Brian is reading it…" disabled={!ai} disabledReason="Connect a model in Settings first.">
                      Explain why it worked (about $0.03)
                    </ActionButton>
                  </div>
                )}

                <div className="mt-3">
                  <Reactions type="swipe" id={s.id} initial={db.reactions?.[s.id] ?? {}} me={me.id} names={names} size="sm" />
                </div>
                <details className="mt-3 rounded-[12px] bg-surface-2 px-3.5 py-2">
                  <summary className="cursor-pointer text-[12.5px] text-ink-2">
                    Comments ({(db.comments ?? []).filter((c) => c.target.type === "swipe" && c.target.id === s.id).length}) and ideas from this
                  </summary>
                  <div className="space-y-4 pb-2 pt-3">
                    <Comments type="swipe" id={s.id} me={me.id} admin={me.admin} people={people} />
                    <SparkBox swipeId={s.id} disabled={!ai} compact />
                  </div>
                </details>
                <div className="mt-2">
                  <ActionButton endpoint={`/api/swipes/${s.id}`} method="DELETE" variant="ghost" size="sm" pending="Removing…">
                    Remove
                  </ActionButton>
                </div>
              </Card>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Coming up: what worked before</div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-3">Tag examples with the event they were made for. Ideas for that day start from them.</p>
            <ul className="mt-3 space-y-3">
              {upcoming.map((d) => {
                const n = swipes.filter((s) => matchesEvent(s, d.title)).length;
                return (
                  <li key={d.id} className="text-[13px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{d.title}</span>
                      <span className="shrink-0 text-[12px] text-ink-3">{shortDate(d.date)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-ink-3">
                      <span>{n ? `${n} example${n === 1 ? "" : "s"} to learn from` : "No examples yet"}</span>
                      {ai && (
                        <ActionButton endpoint="/api/ideas" body={{ dayId: d.id }} navigateTo="/ideas/{id}" variant="ghost" size="sm" pending="Thinking…">
                          Get ideas
                        </ActionButton>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {ai && <p className="mt-3 text-[11.5px] text-ink-3">An idea run costs about $0.70, or about $2 on max quality.</p>}
          </Card>
        </aside>
      </div>
    </>
  );
}
