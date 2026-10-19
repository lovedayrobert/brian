import type { CalendarChannel, CalendarItem } from "@/lib/domain/types";

/** Calendar types shared by the server and the browser (no server imports here). */
export type StatusType = "backlog" | "unstarted" | "started" | "completed" | "canceled";

export interface Task {
  id: string;
  source: "linear" | "brian" | "crm-sheet";
  title: string;
  description?: string;
  date: string | null;
  status: { id: string; name: string; type: StatusType; color?: string };
  priority: number;
  assignee?: { id?: string; name: string; avatarUrl?: string | null };
  labels: { id?: string; name: string; color?: string }[];
  project?: { id?: string; name: string; color?: string };
  team?: { id: string; key: string };
  identifier?: string;
  url?: string;
  estimate?: number | null;
  parent?: { identifier: string; title: string };
  subtasks?: { identifier: string; title: string; done: boolean }[];
  channel?: CalendarChannel;
  kind?: CalendarItem["type"];
  needsSocial?: boolean;
  ideaId?: string;
  specialDayId?: string;
  /** Who made it in Brian */
  createdBy?: string;
  readOnly?: boolean;
}

/** Statuses for tasks kept in Brian (no Linear). */
export const LOCAL_STATES: Task["status"][] = [
  { id: "idea", name: "Idea", type: "backlog", color: "#bec2c8" },
  { id: "planned", name: "Planned", type: "unstarted", color: "#e2e2e2" },
  { id: "in-progress", name: "In progress", type: "started", color: "#f2c94c" },
  { id: "scheduled", name: "Scheduled", type: "started", color: "#5e6ad2" },
  { id: "live", name: "Live", type: "started", color: "#26b5ce" },
  { id: "done", name: "Done", type: "completed", color: "#4cb782" },
];

/** What the task editor sends. Linear ids when Linear is connected; plain names when it isn't. */
export interface TaskInput {
  title?: string;
  description?: string;
  date?: string | null;
  teamId?: string;
  statusId?: string;
  assigneeId?: string | null;
  assigneeName?: string;
  priority?: number;
  labelIds?: string[];
  labelNames?: string[];
  projectId?: string | null;
  projectName?: string;
  estimate?: number | null;
  parentId?: string | null;
  channel?: CalendarChannel;
  kind?: CalendarItem["type"];
  ideaId?: string;
  specialDayId?: string;
}

export const CHANNELS: CalendarChannel[] = ["X", "TikTok", "Instagram", "YouTube", "Kick", "Telegram", "Discord", "Email", "Push", "SMS", "Website", "IRL", "Other"];


export const PRIORITIES = [
  { value: 0, name: "No priority" },
  { value: 1, name: "Urgent" },
  { value: 2, name: "High" },
  { value: 3, name: "Medium" },
  { value: 4, name: "Low" },
];

export const KINDS: { value: CalendarItem["type"]; name: string }[] = [
  { value: "social", name: "Social" },
  { value: "crm", name: "CRM" },
  { value: "campaign", name: "Campaign" },
  { value: "stunt", name: "Stunt / act" },
  { value: "other", name: "Other" },
];
