"use client";

import clsx from "clsx";
import { ExternalLink, Lightbulb, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CalendarData } from "@/lib/calendar/service";
import { Comments } from "@/components/comments";
import type { Viewer } from "./calendar-app";
import { CHANNELS, KINDS, LOCAL_STATES, PRIORITIES, type Task, type TaskInput } from "@/lib/calendar/types";

export type DrawerState =
  | { mode: "edit"; task: Task }
  | { mode: "create"; preset?: { date?: string | null; title?: string; description?: string; channel?: Task["channel"]; kind?: Task["kind"]; ideaId?: string; specialDayId?: string } };

export function TaskDrawer({ state, data, viewer, onClose, onSaved }: { state: DrawerState; data: CalendarData; viewer: Viewer; onClose: () => void; onSaved: (t: Task | null, removedId?: string) => void }) {
  const t = state.mode === "edit" ? state.task : undefined;
  const p = state.mode === "create" ? (state.preset ?? {}) : {};
  const lin = data.linear.connected ? data.linear : null;
  const isLinear = state.mode === "create" ? !!lin : t?.source === "linear";
  const readOnly = !!t?.readOnly;

  const [title, setTitle] = useState(t?.title ?? p.title ?? "");
  const [description, setDescription] = useState(t?.description ?? p.description ?? "");
  const [date, setDate] = useState<string>(t?.date ?? p.date ?? "");
  const [teamId, setTeamId] = useState(t?.team?.id ?? lin?.defaultTeamId ?? "");
  const team = lin?.teams.find((x) => x.id === teamId);
  const states = isLinear ? (team?.states ?? []).filter((s) => s.type !== "canceled") : LOCAL_STATES;
  const [statusId, setStatusId] = useState(t?.status.id ?? (isLinear ? (team?.states.find((s) => s.type === "unstarted")?.id ?? "") : "planned"));
  const [assignee, setAssignee] = useState(isLinear ? (t?.assignee?.id ?? "") : (t?.assignee?.name ?? ""));
  const [priority, setPriority] = useState(t?.priority ?? 0);
  const [labelIds, setLabelIds] = useState<string[]>(t?.labels.flatMap((l) => (l.id ? [l.id] : [])) ?? []);
  const [labelText, setLabelText] = useState(t?.labels.map((l) => l.name).join(", ") ?? "");
  const [projectId, setProjectId] = useState(t?.project?.id ?? "");
  const [projectText, setProjectText] = useState(t?.project?.name ?? "");
  const [estimate, setEstimate] = useState<string>(t?.estimate != null ? String(t.estimate) : "");
  const [channel, setChannel] = useState<Task["channel"] | "">(t?.channel ?? p.channel ?? "");
  const [kind, setKind] = useState<Task["kind"] | "">(t?.kind ?? p.kind ?? "social");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamLabels = useMemo(() => (lin ? lin.labels.filter((l) => !l.teamId || l.teamId === teamId) : []), [lin, teamId]);
  const teamProjects = useMemo(() => (lin ? lin.projects.filter((pr) => !pr.teamIds.length || pr.teamIds.includes(teamId)) : []), [lin, teamId]);

  async function save() {
    setBusy("save");
    setError(null);
    const body: TaskInput = {
      title,
      description,
      date: date || null,
      statusId: statusId || undefined,
      priority,
      channel: channel || undefined,
      kind: kind || undefined,
      ...(state.mode === "create" ? { ideaId: p.ideaId, specialDayId: p.specialDayId } : {}),
      ...(isLinear
        ? { teamId: teamId || undefined, assigneeId: assignee || null, labelIds, projectId: projectId || null, estimate: estimate === "" ? null : Number(estimate) }
        : { assigneeName: assignee, labelNames: labelText.split(","), projectName: projectText }),
    };
    const res = await fetch(state.mode === "edit" ? `/api/calendar/tasks/${t!.id}` : "/api/calendar/tasks", {
      method: state.mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(json.error ?? "Couldn't save");
    onSaved(json.task);
  }

  async function remove() {
    if (!t || !confirm(isLinear ? `Archive ${t.identifier ?? "this issue"} in Linear?` : "Delete this task?")) return;
    setBusy("delete");
    const res = await fetch(`/api/calendar/tasks/${t.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't delete");
    onSaved(null, t.id);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col bg-bg shadow-raised">
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className="text-[12.5px] font-medium text-ink-3">
            {state.mode === "create" ? (isLinear ? `New Linear issue${team ? ` in ${team.key}` : ""}` : "New task (saved in Brian)") : (t?.identifier ?? (t?.source === "crm-sheet" ? "From the CRM sheet" : "Task"))}
          </span>
          {t?.url && (
            <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12.5px] text-accent-ink hover:underline">
              Open in Linear <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button onClick={onClose} className="ml-auto rounded-full p-1 text-ink-3 hover:bg-surface-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
          {readOnly && <p className="rounded-[10px] bg-[#fdebd8] px-3 py-2 text-[12.5px] text-[#b4580f]">This row comes from the CRM sheet. Edit it there; Brian re-reads the sheet every 30 minutes.</p>}
          <input
            autoFocus={state.mode === "create"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={readOnly}
            placeholder="Task title"
            className="w-full bg-transparent text-[20px] font-semibold tracking-tight outline-none placeholder:text-ink-3"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={readOnly}
            rows={6}
            placeholder="Description, brief, copy, links… (Markdown)"
            className="w-full resize-y rounded-[12px] bg-surface px-3.5 py-2.5 text-[14px] leading-relaxed outline-none placeholder:text-ink-3"
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={readOnly} className={INPUT} />
            </Field>
            <Field label="Status">
              <select value={statusId} onChange={(e) => setStatusId(e.target.value)} disabled={readOnly} className={INPUT}>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            {isLinear && lin && (
              <Field label="Team">
                <select
                  value={teamId}
                  onChange={(e) => {
                    setTeamId(e.target.value);
                    setStatusId(lin.teams.find((x) => x.id === e.target.value)?.states.find((s) => s.type === "unstarted")?.id ?? "");
                    setLabelIds([]);
                  }}
                  className={INPUT}
                >
                  {lin.teams.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} ({x.key})
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Assignee">
              {isLinear && lin ? (
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={INPUT}>
                  <option value="">Unassigned</option>
                  {lin.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={assignee} onChange={(e) => setAssignee(e.target.value)} disabled={readOnly} placeholder="Name" className={INPUT} />
              )}
            </Field>
            <Field label="Priority">
              <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} disabled={readOnly} className={INPUT}>
                {PRIORITIES.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Project">
              {isLinear && lin ? (
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={INPUT}>
                  <option value="">No project</option>
                  {teamProjects.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={projectText} onChange={(e) => setProjectText(e.target.value)} disabled={readOnly} placeholder="Project" className={INPUT} />
              )}
            </Field>
            {isLinear && (
              <Field label="Estimate">
                <input type="number" min={0} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="Points" className={INPUT} />
              </Field>
            )}
            <Field label="Channel">
              <select value={channel} onChange={(e) => setChannel(e.target.value as Task["channel"])} disabled={readOnly} className={INPUT}>
                <option value="">None</option>
                {CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select value={kind} onChange={(e) => setKind(e.target.value as Task["kind"])} disabled={readOnly} className={INPUT}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Labels">
            {isLinear && lin ? (
              <div className="flex flex-wrap gap-1.5">
                {teamLabels.map((l) => {
                  const on = labelIds.includes(l.id);
                  return (
                    <button key={l.id} type="button" onClick={() => setLabelIds(on ? labelIds.filter((x) => x !== l.id) : [...labelIds, l.id])} className={clsx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]", on ? "border-ink bg-surface" : "border-line text-ink-3")}>
                      <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                      {l.name}
                    </button>
                  );
                })}
                {teamLabels.length === 0 && <span className="text-[12.5px] text-ink-3">No labels in this team.</span>}
              </div>
            ) : (
              <input value={labelText} onChange={(e) => setLabelText(e.target.value)} disabled={readOnly} placeholder="Comma separated, e.g. Cashy Social, GTA" className={INPUT} />
            )}
          </Field>

          {(t?.ideaId || p.ideaId) && (
            <Link href={`/ideas/${t?.ideaId ?? p.ideaId}`} className="flex items-center gap-2 rounded-[12px] bg-accent-soft px-3 py-2 text-[13px] text-accent-ink hover:underline">
              <Lightbulb className="h-3.5 w-3.5" /> From a Brian idea: open it
            </Link>
          )}
          {t?.parent && <p className="text-[12.5px] text-ink-3">Sub-task of {t.parent.identifier}: {t.parent.title}</p>}
          {t?.subtasks && t.subtasks.length > 0 && (
            <div>
              <div className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Sub-tasks</div>
              <ul className="space-y-1 text-[13px]">
                {t.subtasks.map((s) => (
                  <li key={s.identifier} className={clsx(s.done && "text-ink-3 line-through")}>
                    {s.identifier} · {s.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {t && (
            <div className="border-t border-line pt-4">
              <div className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">
                Comments{t.source === "linear" ? " (in Linear)" : ""}
                {t.createdBy && <span className="ml-2 normal-case tracking-normal text-ink-3">· created in Brian by {viewer.people.find((p) => p.id === t.createdBy)?.name ?? t.createdBy}</span>}
              </div>
              <Comments type="task" id={t.id} me={viewer.id} admin={viewer.admin} people={viewer.people} />
            </div>
          )}
          {error && <p className="text-[12.5px] text-bad">{error}</p>}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 border-t border-line px-5 py-3">
            <button onClick={save} disabled={!!busy || !title.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-5 text-[13.5px] font-medium text-bg hover:opacity-90 disabled:opacity-45">
              {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {state.mode === "create" ? (isLinear ? "Create in Linear" : "Create task") : "Save"}
            </button>
            <button onClick={onClose} className="h-9 rounded-full px-4 text-[13.5px] text-ink-2 hover:text-ink">
              Cancel
            </button>
            {state.mode === "edit" && (
              <button onClick={remove} disabled={!!busy} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-bad hover:bg-bad-soft">
                {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {isLinear ? "Archive" : "Delete"}
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

const INPUT = "h-9 w-full rounded-[10px] bg-surface px-3 text-[13.5px] outline-none disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">{label}</span>
      {children}
    </label>
  );
}
