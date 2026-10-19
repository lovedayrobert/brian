"use client";

import clsx from "clsx";
import { AlertTriangle, Lightbulb } from "lucide-react";
import type { Task } from "@/lib/calendar/types";

export interface Display {
  weekends: boolean;
  completed: boolean;
  days: boolean;
  compact: boolean;
  props: { identifier: boolean; assignee: boolean; priority: boolean; labels: boolean; project: boolean; channel: boolean };
}

const PRIORITY_ICON: Record<number, { label: string; cls: string; bars: number }> = {
  1: { label: "Urgent", cls: "text-bad", bars: 3 },
  2: { label: "High", cls: "text-ink", bars: 3 },
  3: { label: "Medium", cls: "text-ink", bars: 2 },
  4: { label: "Low", cls: "text-ink", bars: 1 },
};

export function StatusDot({ status }: { status: Task["status"] }) {
  const done = status.type === "completed";
  const started = status.type === "started";
  return (
    <span
      className={clsx("inline-block h-3 w-3 shrink-0 rounded-full border-[1.5px]", status.type === "backlog" && "border-dashed")}
      style={{ borderColor: status.color ?? "#9ca3af", background: done ? status.color : started ? `linear-gradient(90deg, ${status.color} 50%, transparent 50%)` : undefined }}
      title={status.name}
    />
  );
}

export function PriorityIcon({ priority }: { priority: number }) {
  const p = PRIORITY_ICON[priority];
  if (!p) return null;
  if (priority === 1) return <AlertTriangle className="h-3 w-3 shrink-0 text-bad" aria-label="Urgent" />;
  return (
    <span className="inline-flex h-3 shrink-0 items-end gap-[1.5px]" title={p.label}>
      {[1, 2, 3].map((b) => (
        <span key={b} className={clsx("w-[2.5px] rounded-sm", b <= p.bars ? "bg-ink-2" : "bg-surface-3")} style={{ height: `${b * 4}px` }} />
      ))}
    </span>
  );
}

export function Initials({ name }: { name: string }) {
  const i = name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex h-4.5 w-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent-ink" title={name}>
      {i}
    </span>
  );
}

const SOURCE_EDGE: Record<Task["source"], string> = { linear: "border-l-[#5e6ad2]", brian: "border-l-ink", "crm-sheet": "border-l-[#f2994a]" };

export function TaskCard({ task: t, display, onOpen, onDragStart, onDragEnd }: { task: Task; display: Display; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const p = display.props;
  return (
    <button
      draggable={!t.readOnly}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={clsx(
        "group/card w-full rounded-[8px] border border-line border-l-[3px] bg-surface px-1.5 py-1 text-left shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:shadow-card",
        SOURCE_EDGE[t.source],
        t.status.type === "completed" && "opacity-55",
        t.needsSocial && "ring-1 ring-[#f2994a]",
      )}
      title={t.title}
    >
      <div className="flex items-center gap-1.5">
        <StatusDot status={t.status} />
        <span className={clsx("min-w-0 flex-1 text-[12.5px] leading-snug", display.compact ? "truncate" : "line-clamp-3", t.status.type === "completed" && "line-through")}>{t.title}</span>
        {p.priority && <PriorityIcon priority={t.priority} />}
        {t.ideaId && <Lightbulb className="h-3 w-3 shrink-0 text-accent-ink" aria-label="From a Brian idea" />}
        {p.assignee && t.assignee && <Initials name={t.assignee.name} />}
      </div>
      {!display.compact && (
        <div className="mt-1 flex flex-wrap items-center gap-1 pl-[18px] text-[10.5px] text-ink-3">
          {p.identifier && t.identifier && <span>{t.identifier}</span>}
          {p.channel && t.channel && t.channel !== "Other" && <span className="rounded-full bg-surface-3 px-1.5">{t.channel}</span>}
          {t.source === "crm-sheet" && <span className="rounded-full bg-[#fdebd8] px-1.5 text-[#b4580f]">CRM</span>}
          {t.needsSocial && <span className="rounded-full bg-[#fdebd8] px-1.5 text-[#b4580f]">needs social</span>}
          {p.project && t.project && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.project.color ?? "#9ca3af" }} />
              {t.project.name}
            </span>
          )}
          {p.labels &&
            t.labels.map((l) => (
              <span key={l.name} className="inline-flex items-center gap-1 rounded-full border border-line px-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: l.color ?? "#9ca3af" }} />
                {l.name}
              </span>
            ))}
        </div>
      )}
      {display.compact && p.identifier && t.identifier && <span className="sr-only">{t.identifier}</span>}
    </button>
  );
}
