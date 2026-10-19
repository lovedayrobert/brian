import type { CalendarItem } from "@/lib/domain/types";
import { archiveIssue, createIssue, issuesInRange, linearMeta, linearReady, type LinearIssue, type LinearMeta, unscheduledIssues, updateIssue } from "@/lib/integrations/linear";
import { pullSheet, sheetReady } from "@/lib/integrations/sheet";
import { newId, repo, type DB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { type SpecialDay, specialDays } from "./days";
import { CHANNELS, LOCAL_STATES, type StatusType, type Task, type TaskInput } from "./types";
export { CHANNELS, LOCAL_STATES, type StatusType, type Task, type TaskInput };

/**
 * The marketing calendar. Tasks live in Linear when it's connected (every
 * create and edit is a real Linear issue); without Linear they're stored in
 * Brian with the same fields. CRM sheet rows are read-only, and special days
 * are a layer on top. Brian keeps only what Linear has no field for: the
 * channel, and the idea or special day a task came from.
 */
export interface CalendarData {
  from: string;
  to: string;
  tasks: Task[];
  unscheduled: Task[];
  days: SpecialDay[];
  linear: (LinearMeta & { connected: true }) | { connected: false };
  sheet: { connected: boolean; sync: DB["crmSync"] };
  errors: string[];
}

function fromIssue(i: LinearIssue, meta: DB["calendarMeta"]): Task {
  const m = meta[i.id] ?? {};
  return {
    id: `lin_${i.id}`,
    source: "linear",
    title: i.title,
    description: i.description ?? undefined,
    date: i.dueDate,
    status: { id: i.state.id, name: i.state.name, type: i.state.type as StatusType, color: i.state.color },
    priority: i.priority,
    assignee: i.assignee ? { id: i.assignee.id, name: i.assignee.name, avatarUrl: i.assignee.avatarUrl } : undefined,
    labels: i.labels.nodes,
    project: i.project ?? undefined,
    team: i.team,
    identifier: i.identifier,
    url: i.url,
    estimate: i.estimate,
    parent: i.parent ? { identifier: i.parent.identifier, title: i.parent.title } : undefined,
    subtasks: i.children.nodes.map((c) => ({ identifier: c.identifier, title: c.title, done: c.state.type === "completed" })),
    channel: m.channel,
    kind: m.kind,
    ideaId: m.ideaId,
    specialDayId: m.specialDayId,
    createdBy: m.createdBy,
  };
}

function fromItem(c: CalendarItem): Task {
  const status = LOCAL_STATES.find((s) => s.id === c.status) ?? LOCAL_STATES[1];
  return {
    id: c.source === "crm-sheet" ? c.id : `loc_${c.id}`,
    source: c.source === "crm-sheet" ? "crm-sheet" : "brian",
    title: c.title,
    description: c.notes,
    date: c.date || null,
    status,
    priority: c.priority ?? 0,
    assignee: c.owner ? { name: c.owner } : undefined,
    labels: (c.labels ?? []).map((name) => ({ name })),
    project: c.project ? { name: c.project } : undefined,
    channel: c.channel,
    kind: c.type,
    needsSocial: c.needsSocial,
    ideaId: c.ideaId,
    specialDayId: c.specialDayId,
    createdBy: c.createdBy,
    readOnly: c.source === "crm-sheet",
  };
}

const CRM_STALE_MS = 30 * 60_000;

/** Re-read the CRM sheet into the calendar. Replaces the previous rows; the sheet is the source of truth. */
export async function syncCrm(): Promise<NonNullable<DB["crmSync"]>> {
  try {
    const { items, skipped } = await pullSheet();
    const sync = { at: new Date().toISOString(), ok: true, rows: items.length, skipped };
    await repo.update((d) => {
      d.calendar = [...(d.calendar ?? []).filter((c) => c.source !== "crm-sheet"), ...items];
      d.crmSync = sync;
    });
    return sync;
  } catch (e) {
    const sync = { at: new Date().toISOString(), ok: false, rows: 0, skipped: 0, error: (e as Error).message };
    await repo.update((d) => {
      d.crmSync = sync;
    });
    return sync;
  }
}

/** Everything between two dates. Home passes a team key and skips the undated tray to stay quick. */
export async function getCalendar(from: string, to: string, opts: { teamKey?: string; unscheduled?: boolean } = {}): Promise<CalendarData> {
  const errors: string[] = [];
  if (sheetReady()) {
    const last = (await repo.read()).crmSync;
    if (!last || Date.now() - new Date(last.at).getTime() > CRM_STALE_MS) {
      const s = await syncCrm();
      if (!s.ok) errors.push(`CRM sheet: ${s.error}`);
    }
  }
  const db = await repo.read();
  const local = (db.calendar ?? []).map(fromItem);
  let linear: CalendarData["linear"] = { connected: false };
  let issues: Task[] = [];
  let unscheduled: Task[] = [];
  if (linearReady()) {
    try {
      const [meta, inRange, noDate] = await Promise.all([linearMeta(), issuesInRange(from, to, opts.teamKey), opts.unscheduled === false ? Promise.resolve([]) : unscheduledIssues()]);
      linear = { ...meta, connected: true };
      issues = inRange.map((i) => fromIssue(i, db.calendarMeta ?? {}));
      unscheduled = noDate.map((i) => fromIssue(i, db.calendarMeta ?? {}));
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return {
    from,
    to,
    tasks: [...issues, ...local.filter((t) => t.date && t.date >= from && t.date <= to)],
    unscheduled: [...unscheduled, ...local.filter((t) => !t.date && !t.readOnly)],
    days: specialDays(from, to),
    linear,
    sheet: { connected: sheetReady(), sync: db.crmSync ?? null },
    errors,
  };
}

function validate(input: TaskInput, creating: boolean) {
  if (creating && !input.title?.trim()) throw new Error("Give the task a title.");
  if (input.title !== undefined && input.title.length > 300) throw new Error("Title is too long.");
  if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Date must be YYYY-MM-DD.");
  if (input.priority !== undefined && ![0, 1, 2, 3, 4].includes(input.priority)) throw new Error("Priority must be 0-4.");
  if (input.channel && !CHANNELS.includes(input.channel)) throw new Error("Unknown channel.");
}

async function saveMeta(issueId: string, input: TaskInput & { createdBy?: string }) {
  const patch = Object.fromEntries(Object.entries({ channel: input.channel, kind: input.kind, ideaId: input.ideaId, specialDayId: input.specialDayId, createdBy: input.createdBy }).filter(([, v]) => v !== undefined));
  if (!Object.keys(patch).length) return;
  await repo.update((d) => {
    d.calendarMeta = { ...(d.calendarMeta ?? {}), [issueId]: { ...(d.calendarMeta?.[issueId] ?? {}), ...patch } };
  });
}

async function logTask(task: Task, input: TaskInput, created: boolean) {
  await repo.update((d) => {
    if (created && input.ideaId) logActivity(d, { type: "idea.scheduled", text: `added “${task.title}” to the calendar for ${task.date ?? "no date yet"}`, ref: { kind: "idea", id: input.ideaId, label: task.title } });
    else if (created) logActivity(d, { type: "task.created", text: `created “${task.title}”${task.date ? ` for ${task.date}` : ""}${task.identifier ? ` (${task.identifier})` : ""}`, ref: { kind: "task", id: task.id, label: task.title } });
    else {
      const what = input.date !== undefined && Object.keys(input).length === 1 ? `moved “${task.title}” to ${task.date ?? "no date"}` : input.statusId && Object.keys(input).length === 1 ? `set “${task.title}” to ${task.status.name}` : `updated “${task.title}”`;
      logActivity(d, { type: "task.updated", text: what, ref: { kind: "task", id: task.id, label: task.title } });
    }
  });
}

export async function createTask(input: TaskInput, by: string): Promise<Task> {
  const task = await createTaskInner(input, by);
  await logTask(task, input, true);
  return task;
}

async function createTaskInner(input: TaskInput, by: string): Promise<Task> {
  validate(input, true);
  if (linearReady()) {
    const meta = await linearMeta();
    const teamId = input.teamId || meta.defaultTeamId;
    if (!teamId) throw new Error("No Linear team to create the task in.");
    const issue = await createIssue({
      title: input.title!.trim(),
      description: input.description,
      teamId,
      stateId: input.statusId,
      assigneeId: input.assigneeId ?? undefined,
      priority: input.priority,
      labelIds: input.labelIds,
      projectId: input.projectId ?? undefined,
      estimate: input.estimate ?? undefined,
      dueDate: input.date ?? undefined,
      parentId: input.parentId ?? undefined,
    });
    await saveMeta(issue.id, { ...input, createdBy: by });
    return fromIssue(issue, { [issue.id]: { channel: input.channel, kind: input.kind, ideaId: input.ideaId, specialDayId: input.specialDayId, createdBy: by } });
  }
  const item: CalendarItem = {
    id: newId("cal"),
    title: input.title!.trim(),
    date: input.date ?? "",
    channel: input.channel ?? "Other",
    type: input.kind ?? "social",
    status: (LOCAL_STATES.find((s) => s.id === input.statusId)?.id ?? "planned") as CalendarItem["status"],
    owner: input.assigneeName?.trim() || undefined,
    notes: input.description,
    priority: input.priority ?? 0,
    labels: input.labelNames?.map((l) => l.trim()).filter(Boolean),
    project: input.projectName?.trim() || undefined,
    ideaId: input.ideaId,
    specialDayId: input.specialDayId,
    source: "brian",
    createdBy: by,
    updatedAt: new Date().toISOString(),
  };
  await repo.update((d) => {
    d.calendar = [item, ...(d.calendar ?? [])];
  });
  return fromItem(item);
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  const task = await updateTaskInner(id, input);
  await logTask(task, input, false);
  return task;
}

async function updateTaskInner(id: string, input: TaskInput): Promise<Task> {
  validate(input, false);
  if (id.startsWith("lin_")) {
    if (!linearReady()) throw new Error("Linear isn't connected.");
    const issueId = id.slice(4);
    const issue = await updateIssue(issueId, {
      title: input.title,
      description: input.description,
      teamId: input.teamId,
      stateId: input.statusId,
      assigneeId: input.assigneeId,
      priority: input.priority,
      labelIds: input.labelIds,
      projectId: input.projectId,
      estimate: input.estimate,
      dueDate: input.date,
      parentId: input.parentId,
    });
    await saveMeta(issueId, input);
    return fromIssue(issue, (await repo.read()).calendarMeta ?? {});
  }
  if (!id.startsWith("loc_")) throw new Error("CRM rows are edited in the CRM sheet.");
  const localId = id.slice(4);
  let updated: CalendarItem | undefined;
  await repo.update((d) => {
    const c = d.calendar.find((x) => x.id === localId);
    if (!c) throw new Error("Task not found.");
    if (input.title !== undefined) c.title = input.title.trim();
    if (input.description !== undefined) c.notes = input.description;
    if (input.date !== undefined) c.date = input.date ?? "";
    if (input.statusId && LOCAL_STATES.some((s) => s.id === input.statusId)) c.status = input.statusId as CalendarItem["status"];
    if (input.assigneeName !== undefined) c.owner = input.assigneeName.trim() || undefined;
    if (input.priority !== undefined) c.priority = input.priority;
    if (input.labelNames !== undefined) c.labels = input.labelNames.map((l) => l.trim()).filter(Boolean);
    if (input.projectName !== undefined) c.project = input.projectName.trim() || undefined;
    if (input.channel) c.channel = input.channel;
    if (input.kind) c.type = input.kind;
    c.updatedAt = new Date().toISOString();
    updated = { ...c };
  });
  return fromItem(updated!);
}

export async function deleteTask(id: string): Promise<void> {
  if (id.startsWith("lin_")) {
    if (!linearReady()) throw new Error("Linear isn't connected.");
    await archiveIssue(id.slice(4));
    return;
  }
  if (!id.startsWith("loc_")) throw new Error("CRM rows are edited in the CRM sheet.");
  await repo.update((d) => {
    d.calendar = d.calendar.filter((c) => c.id !== id.slice(4));
  });
}
