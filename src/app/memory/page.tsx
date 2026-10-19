import { BrainCircuit, BookOpen, Eye, Lightbulb, Pause, Pencil, Sparkles, ThumbsDown, ThumbsUp, Trash2, Wand2 } from "lucide-react";
import { SETTINGS_TABS, SectionTabs } from "@/components/section-tabs";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { MemoryItem, TeachBox } from "@/components/memory-controls";
import { Card, EmptyState, PageHeader, SectionTitle, Stat } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { relativeTime } from "@/lib/format";
import type { MemoryEvent, MemoryKind } from "@/lib/memory";
import { load, memoryWeek } from "@/lib/queries";

export const metadata = { title: "What Brian has learned" };

const KIND_TITLE: Record<MemoryKind, { title: string; note: string }> = {
  rule: { title: "Rules", note: "Hard requirements every agent must follow" },
  preference: { title: "Preferences", note: "Your taste, from feedback and what you do" },
  lesson: { title: "Lessons", note: "Patterns Brian has learned" },
};

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const db = await load();
  const ai = modelReady();
  const memories = db.memories.filter((m) => m.brandId === "cashy");
  const active = memories.filter((m) => m.active);
  const pending = db.feedback.filter((f) => !f.consolidated).length;
  const { usedThisWeek, learnedThisWeek } = memoryWeek(db.memoryEvents);
  const timeline = db.memoryEvents.filter((e) => show === "all" || e.type !== "used").slice(0, 60);

  return (
    <>
      <SectionTabs space="Settings" tabs={SETTINGS_TABS} active="memory" />
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5" /> Memory
          </span>
        }
        title="What Brian has learned"
        subtitle="Every verdict you give, every Critic decision you overrule and every rule you teach becomes a memory. Active memories go into the brief of every agent, so Brian's ideas move towards your taste. Nothing is hidden: edit, pause or forget anything."
      />

      <Card className="mb-8 grid grid-cols-2 gap-6 p-5 sm:grid-cols-4 sm:p-6">
        <Stat label="Active memories" value={active.length} hint={`${memories.length - active.length} paused`} />
        <Stat label="Feedback given" value={db.feedback.length} hint={pending ? `${pending} waiting to become lessons` : "All turned into memories"} />
        <Stat label="Learned this week" value={learnedThisWeek} hint="New memories" />
        <Stat label="Agent runs this week" value={usedThisWeek} hint="Runs that used your memories" />
      </Card>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <TeachBox />

          {memories.length === 0 ? (
            <EmptyState
              icon={<BrainCircuit className="h-5 w-5" />}
              title="Nothing learned yet"
              body="Give a verdict on an idea, overrule the Critic, or teach Brian a rule above."
            />
          ) : (
            (["rule", "preference", "lesson"] as const).map((k) => {
              const list = memories.filter((m) => m.kind === k);
              if (!list.length) return null;
              return (
                <section key={k}>
                  <SectionTitle>
                    {KIND_TITLE[k].title} <span className="ml-1 text-[13px] font-normal text-ink-3">{KIND_TITLE[k].note}</span>
                  </SectionTitle>
                  <Card className="divide-y divide-line">
                    {list.map((m) => (
                      <MemoryItem key={m.id} m={m} />
                    ))}
                  </Card>
                </section>
              );
            })
          )}

          <Card className="flex flex-wrap items-center gap-4 p-5">
            <div className="flex-1 text-[13.5px]">
              <div className="font-semibold">Find the patterns</div>
              <div className="mt-0.5 text-ink-2">
                {pending >= 2
                  ? `${pending} pieces of feedback haven't been turned into lessons yet. Brian can look across them for what they have in common.`
                  : "When you've given a few verdicts, Brian can look across them and write down the patterns as lessons."}
              </div>
            </div>
            <ActionButton
              endpoint="/api/memory/consolidate"
              pending="Looking for patterns…"
              icon={<Wand2 className="h-3.5 w-3.5" />}
              variant="secondary"
              disabled={!ai || pending < 2}
              disabledReason={!ai ? "Needs the AI key" : pending < 2 ? "Needs at least two new verdicts" : undefined}
            >
              Learn from feedback
            </ActionButton>
          </Card>
        </div>

        <aside>
          <SectionTitle
            action={
              <Link href={show === "all" ? "/memory" : "/memory?show=all"} className="text-[12.5px] text-accent-ink hover:underline">
                {show === "all" ? "Hide usage" : "Show usage"}
              </Link>
            }
          >
            Timeline
          </SectionTitle>
          {timeline.length ? (
            <ol className="relative space-y-0 border-l border-line pl-5">
              {timeline.map((e) => (
                <TimelineRow key={e.id} e={e} />
              ))}
            </ol>
          ) : (
            <p className="text-[13px] text-ink-3">The timeline fills as Brian learns.</p>
          )}
        </aside>
      </div>
    </>
  );
}

const EVENT_STYLE: Record<MemoryEvent["type"], { icon: typeof Sparkles; label: string; cls: string }> = {
  learned: { icon: Sparkles, label: "Learned", cls: "bg-accent text-white" },
  feedback: { icon: Lightbulb, label: "Feedback", cls: "bg-ink text-bg" },
  used: { icon: Eye, label: "Remembered", cls: "bg-surface-3 text-ink-2" },
  edited: { icon: Pencil, label: "Edited", cls: "bg-surface-3 text-ink-2" },
  paused: { icon: Pause, label: "Paused", cls: "bg-warn text-white" },
  forgotten: { icon: Trash2, label: "Forgotten", cls: "bg-bad text-white" },
  consolidated: { icon: BookOpen, label: "Found a pattern", cls: "bg-good text-white" },
};

function TimelineRow({ e }: { e: MemoryEvent }) {
  const s = EVENT_STYLE[e.type];
  const Icon = e.type === "feedback" && e.sentiment ? (e.sentiment === "up" ? ThumbsUp : ThumbsDown) : s.icon;
  const href = e.ref ? (e.ref.type === "idea" ? `/ideas/${e.ref.id}` : `/develop/${e.ref.id}`) : null;
  return (
    <li className="relative pb-5">
      <span className={`absolute -left-[31px] top-0 grid h-[22px] w-[22px] place-items-center rounded-full ring-4 ring-bg ${s.cls}`}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="text-[11.5px] text-ink-3">
        <span className="font-medium text-ink-2">{s.label}</span> · {relativeTime(e.at)}
      </div>
      <div className="mt-0.5 text-[13px] leading-snug">
        {href ? (
          <Link href={href} className="hover:text-accent-ink">
            {e.text}
          </Link>
        ) : (
          e.text
        )}
      </div>
    </li>
  );
}
