import { currentActor } from "@/lib/actor";
import { newId, repo, type DB } from "@/lib/store";

/**
 * What the team did, newest first: shown on Home and on the things themselves.
 * Every entry says who (the signed-in person, or Brian) and when.
 */
export type ActivityType =
  | "idea.generated"
  | "learning.feedback"
  | "learning.identity"
  | "idea.scheduled"
  | "idea.developed"
  | "idea.rejected"
  | "idea.overruled"
  | "swipe.added"
  | "task.created"
  | "task.updated"
  | "comment"
  | "reaction"
  | "memory.taught"
  | "memory.edited"
  | "pulse.read";

export interface Activity {
  id: string;
  at: string;
  by: string; // person id, or "brian"
  type: ActivityType;
  text: string;
  ref?: { kind: "idea" | "swipe" | "task" | "memory" | "package"; id: string; label: string };
  mentions?: string[];
}

export function logActivity(db: DB, a: Omit<Activity, "id" | "at" | "by"> & { by?: string }) {
  db.activity = [{ id: newId("act"), at: new Date().toISOString(), by: a.by ?? currentActor() ?? "brian", ...a }, ...(db.activity ?? [])].slice(0, 3000);
}

export async function activity(a: Omit<Activity, "id" | "at" | "by"> & { by?: string }) {
  const by = a.by ?? currentActor() ?? "brian";
  await repo.update((db) => logActivity(db, { ...a, by }));
}
