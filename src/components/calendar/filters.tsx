"use client";

import clsx from "clsx";
import { Check, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DayKind } from "@/lib/calendar/days";
import { DAY_KIND } from "@/lib/calendar/day-kinds";
export { DAY_KIND };
import type { CalendarData } from "@/lib/calendar/service";
import { CHANNELS, type Task } from "@/lib/calendar/types";

export interface Filters {
  q: string;
  teams: string[];
  projects: string[];
  labels: string[];
  statuses: Task["status"]["type"][];
  assignees: string[];
  channels: string[];
  sources: Task["source"][];
  needsSocial: boolean;
  dayKinds: DayKind[];
}

export const EMPTY_FILTERS: Filters = { q: "", teams: [], projects: [], labels: [], statuses: [], assignees: [], channels: [], sources: [], needsSocial: false, dayKinds: [] };


const SOURCE_NAME: Record<Task["source"], string> = { linear: "Linear", brian: "Brian", "crm-sheet": "CRM sheet" };
const STATUS_NAME: Record<Task["status"]["type"], string> = { backlog: "Backlog / idea", unstarted: "Planned", started: "In progress", completed: "Done", canceled: "Cancelled" };

export function matches(t: Task, f: Filters): boolean {
  if (f.q) {
    const q = f.q.toLowerCase();
    if (![t.title, t.identifier, t.description, t.assignee?.name, t.project?.name, ...t.labels.map((l) => l.name)].some((x) => x?.toLowerCase().includes(q))) return false;
  }
  if (f.sources.length && !f.sources.includes(t.source)) return false;
  if (f.needsSocial && !t.needsSocial) return false;
  // CRM sends are a layer, like special days: Linear filters (team, label, project, assignee, status) don't hide them.
  if (t.source === "crm-sheet") return true;
  if (f.teams.length && !(t.team && f.teams.includes(t.team.key))) return false;
  if (f.projects.length && !(t.project && f.projects.includes(t.project.name))) return false;
  if (f.labels.length && !t.labels.some((l) => f.labels.includes(l.name))) return false;
  if (f.statuses.length && !f.statuses.includes(t.status.type)) return false;
  if (f.assignees.length && !f.assignees.includes(t.assignee?.name ?? "Unassigned")) return false;
  if (f.channels.length && !(t.channel && f.channels.includes(t.channel))) return false;
  return true;
}

type Key = Exclude<keyof Filters, "q" | "needsSocial">;

export function FilterBar({ data, filters, setFilters }: { data: CalendarData; filters: Filters; setFilters: (f: Filters | ((f: Filters) => Filters)) => void }) {
  const [open, setOpen] = useState<Key | "menu" | null>(null);
  const [find, setFind] = useState("");
  const all = useMemo(() => [...data.tasks, ...data.unscheduled], [data.tasks, data.unscheduled]);
  const options: Record<Key, { label: string; values: { value: string; name: string; color?: string }[] }> = useMemo(() => {
    const uniq = (xs: { value: string; name: string; color?: string }[]) => [...new Map(xs.map((x) => [x.value, x])).values()].sort((a, b) => a.name.localeCompare(b.name));
    const lin = data.linear.connected ? data.linear : null;
    return {
      teams: { label: "Team", values: uniq(lin ? lin.teams.map((t) => ({ value: t.key, name: `${t.name} (${t.key})` })) : []) },
      projects: { label: "Project", values: uniq([...(lin?.projects.map((p) => ({ value: p.name, name: p.name, color: p.color })) ?? []), ...all.flatMap((t) => (t.project ? [{ value: t.project.name, name: t.project.name, color: t.project.color }] : []))]) },
      labels: { label: "Label", values: uniq([...(lin?.labels.map((l) => ({ value: l.name, name: l.name, color: l.color })) ?? []), ...all.flatMap((t) => t.labels.map((l) => ({ value: l.name, name: l.name, color: l.color })))]) },
      statuses: { label: "Status", values: (Object.keys(STATUS_NAME) as Task["status"]["type"][]).filter((s) => s !== "canceled").map((s) => ({ value: s, name: STATUS_NAME[s] })) },
      assignees: { label: "Assignee", values: uniq([{ value: "Unassigned", name: "Unassigned" }, ...(lin?.users.map((u) => ({ value: u.name, name: u.name })) ?? []), ...all.flatMap((t) => (t.assignee ? [{ value: t.assignee.name, name: t.assignee.name }] : []))]) },
      channels: { label: "Channel", values: CHANNELS.map((c) => ({ value: c, name: c })) },
      sources: { label: "Source", values: (Object.keys(SOURCE_NAME) as Task["source"][]).map((s) => ({ value: s, name: SOURCE_NAME[s] })) },
      dayKinds: { label: "Special days", values: (Object.keys(DAY_KIND) as DayKind[]).map((k) => ({ value: k, name: `${DAY_KIND[k].icon} ${DAY_KIND[k].name}` })) },
    };
  }, [data.linear, all]);

  const toggle = (k: Key, v: string) =>
    setFilters((f) => {
      const cur = f[k] as string[];
      return { ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    });
  const active = (Object.keys(options) as Key[]).filter((k) => (filters[k] as string[]).length);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <div className="relative">
        <button onClick={() => setOpen(open ? null : "menu")} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-[12.5px] text-ink-2 shadow-card hover:text-ink">
          <Filter className="h-3.5 w-3.5" /> Filter
          {active.length + (filters.needsSocial ? 1 : 0) > 0 && <span className="rounded-full bg-ink px-1.5 text-[10.5px] text-bg">{active.length + (filters.needsSocial ? 1 : 0)}</span>}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(null)} />
            <div className="absolute left-0 top-10 z-40 flex rounded-[16px] bg-surface shadow-raised">
              <div className="w-[180px] border-r border-line p-1.5">
                {(Object.keys(options) as Key[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setOpen(k);
                      setFind("");
                    }} className={clsx("flex w-full items-center justify-between rounded-[10px] px-2.5 py-1.5 text-left text-[13px]", open === k ? "bg-surface-3" : "hover:bg-surface-2")}>
                    {options[k].label}
                    {(filters[k] as string[]).length > 0 && <span className="text-[11px] text-ink-3">{(filters[k] as string[]).length}</span>}
                  </button>
                ))}
                <label className="mt-1 flex cursor-pointer items-center justify-between rounded-[10px] px-2.5 py-1.5 text-[13px] hover:bg-surface-2">
                  Only CRM sends needing social
                  <input type="checkbox" checked={filters.needsSocial} onChange={() => setFilters((f) => ({ ...f, needsSocial: !f.needsSocial }))} />
                </label>
                <button onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q })} className="mt-1 w-full rounded-[10px] px-2.5 py-1.5 text-left text-[12.5px] text-ink-3 hover:text-ink">
                  Clear all
                </button>
              </div>
              {open !== "menu" && (
                <div className="max-h-[380px] w-[260px] overflow-auto p-1.5">
                  {options[open].values.length > 8 && (
                    <input
                      autoFocus
                      value={find}
                      onChange={(e) => setFind(e.target.value)}
                      placeholder={`Find a ${options[open].label.toLowerCase()}…`}
                      className="mb-1 h-8 w-full rounded-[10px] bg-surface-3 px-2.5 text-[12.5px] outline-none placeholder:text-ink-3"
                    />
                  )}
                  {options[open].values.length === 0 && <p className="p-2.5 text-[12.5px] text-ink-3">Nothing to filter by yet.</p>}
                  {[...options[open].values]
                    .filter((o) => !find || o.name.toLowerCase().includes(find.toLowerCase()))
                    .sort((a, b) => Number((filters[open] as string[]).includes(b.value)) - Number((filters[open] as string[]).includes(a.value)))
                    .slice(0, 150)
                    .map((o) => {
                    const on = (filters[open] as string[]).includes(o.value);
                    return (
                      <button key={o.value} onClick={() => toggle(open, o.value)} className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-2">
                        <span className={clsx("flex h-4 w-4 items-center justify-center rounded border", on ? "border-ink bg-ink text-bg" : "border-line")}>{on && <Check className="h-3 w-3" />}</span>
                        {o.color && <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />}
                        <span className="truncate">{o.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {active.map((k) => (
        <span key={k} className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft pl-3 pr-1.5 text-[12.5px] text-accent-ink">
          <span className="font-medium">{options[k].label}:</span>
          <span className="max-w-[220px] truncate">{(filters[k] as string[]).map((v) => options[k].values.find((o) => o.value === v)?.name ?? v).join(", ")}</span>
          <button onClick={() => setFilters((f) => ({ ...f, [k]: [] }))} className="rounded-full p-0.5 hover:bg-white/50">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {filters.needsSocial && (
        <span className="inline-flex h-8 items-center gap-1 rounded-full bg-[#fdebd8] pl-3 pr-1.5 text-[12.5px] text-[#b4580f]">
          CRM needing social
          <button onClick={() => setFilters((f) => ({ ...f, needsSocial: false }))} className="rounded-full p-0.5 hover:bg-white/50">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
    </div>
  );
}
