"use client";

import clsx from "clsx";
import { Loader2, Plus, Sparkles, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { SpecialDay } from "@/lib/calendar/days";
import { shortDate } from "@/lib/calendar/dates";
import type { Task } from "@/lib/calendar/types";
import { DAY_KIND } from "./filters";
import type { DrawerState } from "./task-drawer";
import { TaskCard } from "./task-card";

type Take = { take: string; format: string; edge: string; redLine: { pass: boolean; note: string }; riskNote: string };
type Preset = NonNullable<Extract<DrawerState, { mode: "create" }>["preset"]>;

const guessChannel = (format: string): Task["channel"] => {
  const f = format.toLowerCase();
  if (/tiktok|reel|video/.test(f)) return "TikTok";
  if (/telegram/.test(f)) return "Telegram";
  if (/discord/.test(f)) return "Discord";
  if (/insta/.test(f)) return "Instagram";
  if (/irl|real|physical|stunt/.test(f)) return "IRL";
  return "X";
};

/** One day: its special days, Brian's ideas for it, and its tasks. */
export function DayPanel({ date, days, tasks, ai, onClose, onOpenTask, onCreate }: { date: string; days: SpecialDay[]; tasks: Task[]; ai: boolean; onClose: () => void; onOpenTask: (t: Task) => void; onCreate: (p: Preset) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [takes, setTakes] = useState<Record<string, Take[]>>({});
  const [moves, setMoves] = useState<Record<string, { id: string | null; cards: number; killed: number }>>({});
  const [steer, setSteer] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function postIdeas(day: SpecialDay) {
    setBusy(`post:${day.id}`);
    setError(null);
    const res = await fetch("/api/calendar/day-ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayId: day.id, steer: steer[day.id] }) });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(json.error ?? "Couldn't get ideas");
    setTakes((t) => ({ ...t, [day.id]: json.takes }));
  }

  async function biggerMove(day: SpecialDay) {
    setBusy(`move:${day.id}`);
    setError(null);
    const res = await fetch("/api/ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayId: day.id, steer: steer[day.id] }) });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(json.error ?? "Couldn't run Brian");
    setMoves((m) => ({ ...m, [day.id]: json }));
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-bg shadow-raised">
        <div className="flex items-center border-b border-line px-5 py-3">
          <h2 className="text-[18px] font-semibold tracking-tight">{shortDate(date)}</h2>
          <button onClick={() => onCreate({})} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-bg hover:opacity-90">
            <Plus className="h-3.5 w-3.5" /> New task
          </button>
          <button onClick={onClose} className="ml-2 rounded-full p-1 text-ink-3 hover:bg-surface-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-auto px-5 py-4">
          {days.length === 0 && <p className="text-[13px] text-ink-3">No special day today. Start from a spark in the Lab, or add a task.</p>}
          {days.map((day) => (
            <section key={day.id} className="rounded-[16px] bg-surface p-4 shadow-card">
              <div className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-[11.5px] font-medium", DAY_KIND[day.kind].cls)}>
                {DAY_KIND[day.kind].icon} {DAY_KIND[day.kind].name}
              </div>
              <h3 className="mt-2 text-[16px] font-semibold tracking-tight">{day.title}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{day.why}</p>
              {day.check && <p className="mt-1 text-[12px] text-ink-3">Date note: {day.check}</p>}
              <input
                value={steer[day.id] ?? ""}
                onChange={(e) => setSteer((s) => ({ ...s, [day.id]: e.target.value }))}
                placeholder="Optional steer, e.g. “tie it to GTA 6”"
                className="mt-3 h-8 w-full rounded-full bg-surface-3 px-3 text-[12.5px] outline-none placeholder:text-ink-3"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={() => postIdeas(day)} disabled={!ai || !!busy} title={!ai ? "Needs the AI key" : undefined} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-bg hover:opacity-90 disabled:opacity-45">
                  {busy === `post:${day.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Post ideas <span className="opacity-70">~$0.10</span>
                </button>
                <button onClick={() => biggerMove(day)} disabled={!ai || !!busy} title={!ai ? "Needs the AI key" : undefined} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 text-[12.5px] font-medium text-ink hover:bg-accent-soft disabled:opacity-45">
                  {busy === `move:${day.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} A bigger move <span className="text-ink-3">~$0.75</span>
                </button>
                <button onClick={() => onCreate({ title: day.title, specialDayId: day.id, description: day.why })} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-ink-2 hover:text-ink">
                  <Plus className="h-3.5 w-3.5" /> Plan it myself
                </button>
              </div>
              {busy === `move:${day.id}` && <p className="mt-2 text-[12px] text-ink-3">Brian is reading the room, inventing and running the audience panel. This takes a few minutes.</p>}
              {moves[day.id] && (
                <p className="mt-3 text-[13px]">
                  {moves[day.id].cards} card{moves[day.id].cards === 1 ? "" : "s"} made, {moves[day.id].killed} killed.{" "}
                  <Link href={moves[day.id].id ? `/ideas/${moves[day.id].id}` : "/ideas"} className="text-accent-ink hover:underline">
                    Open them
                  </Link>
                  , then use Add to calendar on the one you want.
                </p>
              )}
              {takes[day.id] && (
                <ul className="mt-3 space-y-2">
                  {takes[day.id].map((tk, i) => (
                    <li key={i} className="rounded-[12px] bg-surface-2 p-3">
                      <div className="text-[13.5px] font-medium leading-snug">{tk.take}</div>
                      <div className="mt-1 text-[12px] text-ink-3">
                        {tk.format} · {tk.edge}
                        {!tk.redLine.pass && <span className="text-bad"> · red line: {tk.redLine.note}</span>}
                      </div>
                      {tk.redLine.pass && (
                        <button
                          onClick={() => onCreate({ title: tk.take, specialDayId: day.id, channel: guessChannel(tk.format), kind: "social", description: `**Idea for ${day.title}** (from Brian)\n\n${tk.take}\n\n**Format:** ${tk.format}\n**Edge:** ${tk.edge}\n**Watch out for:** ${tk.riskNote}` })}
                          className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-surface px-3 text-[12px] font-medium shadow-card hover:shadow-raised"
                        >
                          <Plus className="h-3 w-3" /> Add as task
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {error && <p className="text-[12.5px] text-bad">{error}</p>}
          <section>
            <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Tasks</div>
            <div className="space-y-1.5">
              {tasks.map((t) => (
                <TaskCard key={t.id} task={t} display={{ weekends: true, completed: true, days: true, compact: false, props: { identifier: true, assignee: true, priority: true, labels: true, project: true, channel: true } }} onOpen={() => onOpenTask(t)} onDragStart={() => {}} onDragEnd={() => {}} />
              ))}
              {tasks.length === 0 && <p className="text-[13px] text-ink-3">Nothing planned.</p>}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
