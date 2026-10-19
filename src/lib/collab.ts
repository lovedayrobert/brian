import { currentActor } from "@/lib/actor";
import { logActivity } from "@/lib/activity";
import { REACTIONS, type Comment, type Reaction } from "@/lib/collab-types";
import { recordFeedback } from "@/lib/memory";
import { personName } from "@/lib/people";
import { newId, repo, type DB } from "@/lib/store";

/** Reactions and comments on ideas, inspiration posts and calendar tasks. */
type Target = Comment["target"];

function label(db: DB, t: Target): string {
  if (t.type === "idea") return db.ideas.find((i) => i.id === t.id)?.name ?? "an idea";
  if (t.type === "swipe") return db.swipes?.find((s) => s.id === t.id)?.title.slice(0, 80) ?? "a post";
  return db.calendar?.find((c) => `loc_${c.id}` === t.id || c.id === t.id)?.title ?? "a task";
}

/** Add or remove the current person's reaction. 🔥 and 👍 count as a like for Brian, 👎 as a dislike. */
export async function toggleReaction(target: Target, emoji: string): Promise<Record<string, string[]>> {
  if (!REACTIONS.includes(emoji as Reaction)) throw new Error("Unknown reaction.");
  const by = currentActor() ?? "local";
  let added = false;
  let name = "";
  const db = await repo.update((d) => {
    d.reactions ??= {};
    const forTarget = (d.reactions[target.id] ??= {});
    const who = forTarget[emoji] ?? [];
    added = !who.includes(by);
    forTarget[emoji] = added ? [...who, by] : who.filter((x) => x !== by);
    if (!forTarget[emoji].length) delete forTarget[emoji];
    name = label(d, target);
    if (added) logActivity(d, { type: "reaction", text: `reacted ${emoji} to “${name}”`, ref: { kind: target.type, id: target.id, label: name } });
  });
  if (added && target.type === "idea" && emoji !== "😂") {
    await recordFeedback({ target: { type: "idea", id: target.id, label: name }, sentiment: emoji === "👎" ? "down" : "up" });
  }
  return db.reactions[target.id] ?? {};
}

/** Team score for sorting: 🔥 counts double, 👎 counts against. */
export function reactionScore(r: Record<string, string[]> | undefined): number {
  if (!r) return 0;
  return (r["🔥"]?.length ?? 0) * 2 + (r["👍"]?.length ?? 0) - (r["👎"]?.length ?? 0);
}

/** @mentions by first name, full name or email, matched against people who have signed in. */
export function findMentions(text: string, db: Pick<DB, "people">): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/@([\w.\-@]+(?:\s[A-Z][\w-]+)?)/g)) {
    const q = m[1].toLowerCase();
    const p = (db.people ?? []).find((x) => x.id.toLowerCase() === q || x.email?.toLowerCase() === q || x.name.toLowerCase() === q || x.name.split(" ")[0].toLowerCase() === q.split(" ")[0]);
    if (p) out.add(p.id);
  }
  return [...out];
}

export async function addComment(target: Target, text: string, linearId?: string): Promise<Comment> {
  const body = text.trim();
  if (!body) throw new Error("Write a comment first.");
  if (body.length > 4000) throw new Error("That comment is too long.");
  const by = currentActor() ?? "local";
  let comment!: Comment;
  await repo.update((d) => {
    comment = { id: newId("cmt"), target, by, at: new Date().toISOString(), text: body, mentions: findMentions(body, d), linearId };
    d.comments = [...(d.comments ?? []), comment];
    const name = label(d, target);
    logActivity(d, {
      type: "comment",
      text: `commented on “${name}”: “${body.slice(0, 120)}”`,
      ref: { kind: target.type, id: target.id, label: name },
      mentions: comment.mentions,
    });
  });
  return comment;
}

export async function deleteComment(id: string, asAdmin: boolean): Promise<void> {
  const by = currentActor() ?? "local";
  await repo.update((d) => {
    const c = d.comments?.find((x) => x.id === id);
    if (!c) throw new Error("Comment not found.");
    if (c.by !== by && !asAdmin) throw new Error("You can only delete your own comments.");
    d.comments = d.comments.filter((x) => x.id !== id);
  });
}

export function commentsFor(db: Pick<DB, "comments" | "people">, target: Target) {
  return (db.comments ?? []).filter((c) => c.target.type === target.type && c.target.id === target.id).map((c) => ({ ...c, name: personName(db, c.by) }));
}
