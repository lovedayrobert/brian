"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Inbox, Loader2, Plus, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SpecialDay } from "@/lib/calendar/days";
import { addDays, addMonths, daysBetween, monthName, rangeFor, shortDate, todayDay, type View, weekday } from "@/lib/calendar/dates";
import type { CalendarData } from "@/lib/calendar/service";
import type { Task } from "@/lib/calendar/types";
import { DayPanel } from "./day-panel";
import { TaskDrawer, type DrawerState } from "./task-drawer";
import { DAY_KIND, FilterBar, type Filters, matches, EMPTY_FILTERS } from "./filters";
import { TaskCard, type Display } from "./task-card";

export interface Viewer {
  id: string;
  admin: boolean;
  /** Your names as they appear on tasks (Linear name, Brian name) */
  names: string[];
  people: { id: string; name: string }[];
  prefs: { calendarFilters?: unknown; calendarDisplay?: unknown };
}

const DEFAULT_DISPLAY: Display = { weekends: true, completed: true, days: true, compact: true, props: { identifier: true, assignee: true, priority: true, labels: false, project: false, channel: true } };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // private window: preferences just don't persist
  }
}

export function CalendarApp({
  initial,
  initialView,
  initialAnchor,
  ai,
  prefill,
  openDay,
  viewer,
}: {
  initial: CalendarData;
  initialView: View;
  initialAnchor: string;
  ai: boolean;
  prefill?: DrawerState;
  openDay?: string;
  viewer: Viewer;
}) {
  const [view, setView] = useState<View>(initialView);
  const [anchor, setAnchor] = useState(initialAnchor);
  const [data, setData] = useState<CalendarData>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Saved per person on the server, so they follow you across devices; this browser's copy is the fallback.
  const [filters, setFilters] = useState<Filters>(() => ({ ...EMPTY_FILTERS, ...((viewer.prefs.calendarFilters as Filters) ?? load("brian.cal.filters", EMPTY_FILTERS)) }));
  const [display, setDisplay] = useState<Display>(() => ({ ...DEFAULT_DISPLAY, ...((viewer.prefs.calendarDisplay as Display) ?? load("brian.cal.display", DEFAULT_DISPLAY)) }));
  const [drawer, setDrawer] = useState<DrawerState | null>(prefill ?? null);
  const [dayPanel, setDayPanel] = useState<string | null>(openDay ?? null);
  const [tray, setTray] = useState(false);
  const [quick, setQuick] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [displayOpen, setDisplayOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    save("brian.cal.filters", filters);
    save("brian.cal.display", display);
    const t = setTimeout(() => {
      fetch("/api/prefs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarFilters: filters, calendarDisplay: display }) }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [filters, display]);
  const mine = viewer.names.length > 0 && filters.assignees.length > 0 && filters.assignees.every((a) => viewer.names.includes(a));

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);

  const fetchRange = useCallback(async (from: string, to: string) => {
    const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Couldn't load the calendar");
    return json as CalendarData;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await fetchRange(range.from, range.to));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRange, range.from, range.to]);

  const stale = range.from !== data.from || range.to !== data.to;
  const loading = refreshing || stale;

  useEffect(() => {
    if (!stale) return;
    let cancelled = false;
    fetchRange(range.from, range.to)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [stale, fetchRange, range.from, range.to]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    url.searchParams.set("d", anchor);
    url.searchParams.delete("new");
    url.searchParams.delete("ideaId");
    url.searchParams.delete("open");
    window.history.replaceState(null, "", url.toString());
  }, [view, anchor]);

  const step = useCallback(
    (dir: number) => setAnchor((a) => (view === "month" ? addMonths(a, dir) : addDays(a, dir * (view === "week" ? 7 : view === "agenda" ? 42 : 28)))),
    [view],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "Escape") {
        // Close the top layer first: editor, then day panel, then menus.
        if (drawer) setDrawer(null);
        else if (dayPanel) setDayPanel(null);
        else {
          setQuick(null);
          setDisplayOpen(false);
        }
        return;
      }
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (drawer || dayPanel) return;
      else if (e.key === "t") setAnchor(todayDay());
      else if (e.key === "ArrowLeft" || e.key === "k") step(-1);
      else if (e.key === "ArrowRight" || e.key === "j") step(1);
      else if (e.key === "c") setDrawer({ mode: "create", preset: { date: anchor } });
      else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "m") setView("month");
      else if (e.key === "w") setView("week");
      else if (e.key === "a") setView("agenda");
      else if (e.key === "b") setView("board");
      else if (e.key === "u") setTray((x) => !x);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, dayPanel, step, anchor]);

  const visible = useMemo(() => data.tasks.filter((t) => matches(t, filters) && (display.completed || t.source === "crm-sheet" || t.status.type !== "completed")), [data.tasks, filters, display.completed]);
  const byDay = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of visible) if (t.date) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    for (const list of m.values()) list.sort((a, b) => order(a) - order(b) || (a.priority || 9) - (b.priority || 9));
    return m;
  }, [visible]);
  const daysByDate = useMemo(() => {
    const m = new Map<string, SpecialDay[]>();
    // Special days always show on their date, whatever the filters (Rob's call).
    for (const d of data.days) m.set(d.date, [...(m.get(d.date) ?? []), d]);
    return m;
  }, [data.days]);

  /** Optimistic update, then the server's answer. */
  const patch = useCallback(
    async (task: Task, body: Record<string, unknown>, optimistic: Partial<Task>) => {
      setData((d) => ({ ...d, tasks: upsert(d.tasks, { ...task, ...optimistic }), unscheduled: optimistic.date ? d.unscheduled.filter((u) => u.id !== task.id) : d.unscheduled }));
      const res = await fetch(`/api/calendar/tasks/${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Couldn't save");
        refresh();
        return;
      }
      setData((d) => ({ ...d, tasks: upsert(d.tasks, json.task) }));
    },
    [refresh],
  );

  const moveTo = (id: string, date: string) => {
    const t = [...data.tasks, ...data.unscheduled].find((x) => x.id === id);
    if (!t || t.readOnly || t.date === date) return;
    patch(t, { date }, { date });
  };

  const onSaved = (task: Task | null, removedId?: string) => {
    setData((d) => ({
      ...d,
      tasks: removedId ? d.tasks.filter((t) => t.id !== removedId) : task && task.date ? upsert(d.tasks, task) : d.tasks.filter((t) => t.id !== task?.id),
      unscheduled: removedId ? d.unscheduled.filter((t) => t.id !== removedId) : task && !task.date ? upsert(d.unscheduled, task) : d.unscheduled.filter((t) => t.id !== task?.id),
    }));
    setDrawer(null);
  };

  const quickCreate = async (date: string, title: string) => {
    setQuick(null);
    if (!title.trim()) return;
    const res = await fetch("/api/calendar/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date, ...(filters.labels.length && data.linear.connected ? { labelIds: data.linear.labels.filter((l) => filters.labels.includes(l.name)).map((l) => l.id) } : {}) }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return setError(json.error ?? "Couldn't create");
    onSaved(json.task);
  };

  const days = daysBetween(range.from, range.to).filter((d) => display.weekends || weekday(d) < 5);
  const cols = view === "week" || view === "month" ? (display.weekends ? 7 : 5) : 0;
  const today = todayDay();
  const title = view === "month" ? monthName(anchor) : view === "week" ? `${shortDate(range.from)} – ${shortDate(range.to)}` : `${shortDate(range.from)} onwards`;

  const cell = (d: string, tall: boolean) => {
    const tasks = byDay.get(d) ?? [];
    const special = daysByDate.get(d) ?? [];
    const outside = view === "month" && d.slice(0, 7) !== anchor.slice(0, 7);
    const limit = tall ? 99 : display.compact ? 4 : 3;
    return (
      <div
        key={d}
        onDragOver={(e) => {
          if (dragId) e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId) moveTo(dragId, d);
          setDragId(null);
        }}
        onDoubleClick={() => setQuick(d)}
        className={clsx("group relative flex min-h-[132px] flex-col gap-1 border-b border-r border-line p-1.5", tall && "min-h-[520px]", outside && "bg-surface-2/60", dragId && "hover:bg-accent-soft")}
      >
        <div className="flex items-center justify-between px-1">
          <button onClick={() => setDayPanel(d)} className={clsx("rounded-full px-1.5 text-[12.5px] tabular hover:bg-surface-3", d === today ? "bg-bad font-semibold text-white hover:bg-bad" : outside ? "text-ink-3" : "text-ink-2")} title="Open the day: special days and Brian's ideas">
            {Number(d.slice(8))}
            {d.slice(8) === "01" && view === "month" && <span className="ml-1">{monthName(d).split(" ")[0].slice(0, 3)}</span>}
          </button>
          <button onClick={() => setQuick(d)} className="rounded-full p-0.5 text-ink-3 opacity-0 transition hover:bg-surface-3 hover:text-ink group-hover:opacity-100" title="New task">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {special.map((s) => (
          <button key={s.id} onClick={() => setDayPanel(d)} className={clsx("truncate rounded-[6px] px-1.5 py-0.5 text-left text-[11.5px] font-medium", DAY_KIND[s.kind].cls)} title={`${s.title}: ${s.why}`}>
            {DAY_KIND[s.kind].icon} {s.title}
          </button>
        ))}
        {tasks.slice(0, limit).map((t) => (
          <TaskCard key={t.id} task={t} display={display} onOpen={() => setDrawer({ mode: "edit", task: t })} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
        ))}
        {tasks.length > limit && (
          <button onClick={() => setDayPanel(d)} className="px-1.5 text-left text-[11.5px] text-ink-3 hover:text-ink">
            +{tasks.length - limit} more
          </button>
        )}
        {quick === d && <QuickAdd onDone={(title) => quickCreate(d, title)} onMore={(title) => {
          setQuick(null);
          setDrawer({ mode: "create", preset: { date: d, title } });
        }} />}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100dvh-150px)] min-h-[600px] flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-[22px] font-semibold tracking-tight">{title}</h1>
        <div className="flex items-center rounded-full bg-surface shadow-card">
          <IconBtn onClick={() => step(-1)} title="Previous (←)">
            <ChevronLeft className="h-4 w-4" />
          </IconBtn>
          <button onClick={() => setAnchor(today)} className="px-2 text-[13px] font-medium text-ink-2 hover:text-ink" title="Today (t)">
            Today
          </button>
          <IconBtn onClick={() => step(1)} title="Next (→)">
            <ChevronRight className="h-4 w-4" />
          </IconBtn>
        </div>
        <div className="flex rounded-full bg-surface p-0.5 shadow-card">
          {(["month", "week", "agenda", "board"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)} className={clsx("rounded-full px-3 py-1 text-[13px] capitalize transition", view === v ? "bg-ink text-bg" : "text-ink-2 hover:text-ink")} title={`${v} (${v[0]})`}>
              {v}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilters((f) => ({ ...f, assignees: mine ? [] : viewer.names }))}
          className={clsx("h-9 rounded-full px-3.5 text-[13px] shadow-card transition", mine ? "bg-ink text-bg" : "bg-surface text-ink-2 hover:text-ink")}
          title="Only tasks assigned to you"
        >
          Mine
        </button>
        <div className="relative ml-auto flex items-center">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-ink-3" />
          <input
            ref={searchRef}
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="Search (/)"
            className="h-9 w-[180px] rounded-full bg-surface pl-8 pr-3 text-[13px] shadow-card outline-none placeholder:text-ink-3 focus:w-[240px]"
          />
        </div>
        <div className="relative">
          <button onClick={() => setDisplayOpen((x) => !x)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] text-ink-2 shadow-card hover:text-ink">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Display
          </button>
          {displayOpen && <DisplayMenu display={display} setDisplay={setDisplay} onClose={() => setDisplayOpen(false)} />}
        </div>
        <IconBtn onClick={refresh} title="Refresh" boxed>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </IconBtn>
        <button onClick={() => setDrawer({ mode: "create", preset: { date: view === "month" && anchor.slice(0, 7) !== today.slice(0, 7) ? anchor : today } })} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg hover:opacity-90" title="New task (c)">
          <Plus className="h-3.5 w-3.5" /> New task
        </button>
      </div>

      <FilterBar data={data} filters={filters} setFilters={setFilters} />

      {(error || data.errors.length > 0) && (
        <div className="mb-2 flex items-start gap-2 rounded-[12px] bg-bad-soft px-3.5 py-2 text-[12.5px] text-bad">
          <span className="flex-1">{error ?? data.errors.join(" · ")}</span>
          <button onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {!data.linear.connected && (
        <div className="mb-2 rounded-[12px] bg-warn-soft px-3.5 py-2 text-[12.5px] text-ink-2">
          Linear isn&rsquo;t connected yet, so tasks are saved in Brian. Once LINEAR_API_KEY is set, new tasks are created as Linear issues and your Linear tasks appear here.
        </div>
      )}

      {/* Views */}
      <div className="min-h-0 flex-1 overflow-auto rounded-[18px] bg-surface shadow-card">
        {(view === "month" || view === "week") && (
          <div>
            <div className="sticky top-0 z-10 grid border-b border-line bg-surface" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].slice(0, cols).map((w, i) => (
                <div key={w} className="border-r border-line px-3 py-2 text-[12px] font-medium text-ink-3">
                  {w}
                  {view === "week" && <span className="ml-1.5 text-ink-2">{Number(addDays(range.from, i).slice(8))}</span>}
                </div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {days.map((d) => cell(d, view === "week"))}
            </div>
          </div>
        )}
        {view === "agenda" && (
          <div className="divide-y divide-line">
            {daysBetween(range.from, range.to)
              .filter((d) => (byDay.get(d)?.length ?? 0) + (daysByDate.get(d)?.length ?? 0) > 0)
              .map((d) => (
                <div key={d} className="flex gap-4 px-5 py-3.5" onDragOver={(e) => dragId && e.preventDefault()} onDrop={() => dragId && moveTo(dragId, d)}>
                  <button onClick={() => setDayPanel(d)} className={clsx("w-[110px] shrink-0 pt-1 text-left text-[13px] font-medium", d === today ? "text-bad" : "text-ink-2")}>
                    {shortDate(d)}
                  </button>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {(daysByDate.get(d) ?? []).map((s) => (
                      <button key={s.id} onClick={() => setDayPanel(d)} className={clsx("block max-w-full truncate rounded-[8px] px-2 py-1 text-left text-[12.5px] font-medium", DAY_KIND[s.kind].cls)}>
                        {DAY_KIND[s.kind].icon} {s.title} <span className="font-normal opacity-80">· {s.why}</span>
                      </button>
                    ))}
                    {(byDay.get(d) ?? []).map((t) => (
                      <TaskCard key={t.id} task={t} display={{ ...display, compact: false }} onOpen={() => setDrawer({ mode: "edit", task: t })} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
                    ))}
                  </div>
                </div>
              ))}
            {visible.length === 0 && data.days.length === 0 && <p className="p-8 text-center text-[13.5px] text-ink-3">Nothing in this period.</p>}
          </div>
        )}
        {view === "board" && <Board tasks={visible} data={data} display={display} onOpen={(t) => setDrawer({ mode: "edit", task: t })} onMove={(t, statusId, name, type) => patch(t, { statusId }, { status: { id: statusId, name, type } })} />}
      </div>

      {/* Unscheduled tray */}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => setTray((x) => !x)} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12.5px] text-ink-2 shadow-card hover:text-ink" title="Tasks without a due date (u)">
          <Inbox className="h-3.5 w-3.5" /> No due date <span className="rounded-full bg-surface-3 px-1.5 text-[11px]">{data.unscheduled.filter((t) => matches(t, filters)).length}</span>
        </button>
        <span className="text-[11.5px] text-ink-3">Drag a task onto a day to schedule it · double-click a day to add · t today · ←/→ · c new · m/w/a/b views</span>
      </div>
      {tray && (
        <div className="mt-2 max-h-[220px] overflow-auto rounded-[16px] bg-surface p-3 shadow-raised">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {data.unscheduled.filter((t) => matches(t, filters)).map((t) => (
              <TaskCard key={t.id} task={t} display={display} onOpen={() => setDrawer({ mode: "edit", task: t })} onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)} />
            ))}
            {data.unscheduled.length === 0 && <p className="text-[12.5px] text-ink-3">Every task has a date.</p>}
          </div>
        </div>
      )}

      {drawer && <TaskDrawer state={drawer} data={data} viewer={viewer} onClose={() => setDrawer(null)} onSaved={onSaved} />}
      {dayPanel && (
        <DayPanel
          date={dayPanel}
          days={data.days.filter((x) => x.date === dayPanel)}
          tasks={byDay.get(dayPanel) ?? []}
          ai={ai}
          onClose={() => setDayPanel(null)}
          onOpenTask={(t) => {
            setDayPanel(null);
            setDrawer({ mode: "edit", task: t });
          }}
          onCreate={(preset) => {
            setDayPanel(null);
            setDrawer({ mode: "create", preset: { date: dayPanel, ...preset } });
          }}
        />
      )}
    </div>
  );
}

const order = (t: Task) => ({ started: 0, unstarted: 1, backlog: 2, completed: 3, canceled: 4 })[t.status.type];

function upsert(list: Task[], t: Task): Task[] {
  return list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t];
}

function IconBtn({ children, onClick, title, boxed }: { children: React.ReactNode; onClick: () => void; title: string; boxed?: boolean }) {
  return (
    <button onClick={onClick} title={title} className={clsx("inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:text-ink", boxed && "bg-surface shadow-card")}>
      {children}
    </button>
  );
}

function QuickAdd({ onDone, onMore }: { onDone: (title: string) => void; onMore: (title: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="rounded-[8px] bg-surface p-1 shadow-raised">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDone(v);
          if (e.key === "Escape") onDone("");
        }}
        onBlur={() => !v && onDone("")}
        placeholder="Task title, Enter to add"
        className="w-full rounded-[6px] bg-surface-3 px-2 py-1 text-[12.5px] outline-none"
      />
      <button onMouseDown={(e) => e.preventDefault()} onClick={() => onMore(v)} className="mt-0.5 px-1 text-[11px] text-accent-ink hover:underline">
        All fields…
      </button>
    </div>
  );
}

function DisplayMenu({ display, setDisplay, onClose }: { display: Display; setDisplay: (d: Display) => void; onClose: () => void }) {
  const toggle = (k: keyof Omit<Display, "props">) => setDisplay({ ...display, [k]: !display[k] });
  const prop = (k: keyof Display["props"]) => setDisplay({ ...display, props: { ...display.props, [k]: !display.props[k] } });
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute right-0 top-11 z-40 w-[280px] rounded-[16px] bg-surface p-4 shadow-raised">
        {(
          [
            ["weekends", "Show weekends"],
            ["completed", "Show completed"],
            ["compact", "Compact cards"],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between py-1.5 text-[13px]">
            {l}
            <input type="checkbox" checked={display[k]} onChange={() => toggle(k)} className="accent-[var(--color-ink,#111)]" />
          </label>
        ))}
        <div className="mt-3 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">On cards</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(display.props) as (keyof Display["props"])[]).map((k) => (
            <button key={k} onClick={() => prop(k)} className={clsx("rounded-full px-2.5 py-1 text-[12px] capitalize", display.props[k] ? "bg-accent-soft text-accent-ink" : "bg-surface-3 text-ink-3")}>
              {k}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

const COLUMNS: { type: Task["status"]["type"]; name: string }[] = [
  { type: "backlog", name: "Ideas / backlog" },
  { type: "unstarted", name: "Planned" },
  { type: "started", name: "In progress" },
  { type: "completed", name: "Done" },
];

function Board({ tasks, data, display, onOpen, onMove }: { tasks: Task[]; data: CalendarData; display: Display; onOpen: (t: Task) => void; onMove: (t: Task, statusId: string, name: string, type: Task["status"]["type"]) => void }) {
  const [drag, setDrag] = useState<Task | null>(null);
  const drop = (type: Task["status"]["type"]) => {
    if (!drag || drag.readOnly || drag.status.type === type) return;
    if (drag.source === "linear") {
      // Linear tasks move to the first state of that type in their own team.
      const states = data.linear.connected ? (data.linear.teams.find((t) => t.id === drag.team?.id)?.states ?? []) : [];
      const s = states.find((x) => x.type === type);
      if (s) onMove(drag, s.id, s.name, type);
    } else {
      const local = { backlog: ["idea", "Idea"], unstarted: ["planned", "Planned"], started: ["in-progress", "In progress"], completed: ["done", "Done"], canceled: ["done", "Done"] }[type];
      onMove(drag, local[0], local[1], type);
    }
  };
  return (
    <div className="grid h-full min-w-[880px] grid-cols-4 gap-3 p-3">
      {COLUMNS.map((c) => {
        const list = tasks.filter((t) => t.status.type === c.type).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        return (
          <div key={c.type} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(c.type)} className="flex flex-col rounded-[14px] bg-surface-2 p-2">
            <div className="mb-2 flex items-center justify-between px-1 text-[12.5px] font-medium text-ink-2">
              {c.name} <span className="text-ink-3">{list.length}</span>
            </div>
            <div className="space-y-1.5">
              {list.map((t) => (
                <div key={t.id}>
                  <div className="px-1 text-[11px] text-ink-3">{t.date ? shortDate(t.date) : "No date"}</div>
                  <TaskCard task={t} display={{ ...display, compact: false }} onOpen={() => onOpen(t)} onDragStart={() => setDrag(t)} onDragEnd={() => setDrag(null)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

