import { currentActor } from "@/lib/actor";
import { logActivity } from "@/lib/activity";
import { attachLink, linearReady } from "@/lib/integrations/linear";
import { newId, repo } from "@/lib/store";
import { AUTO, fetchStats, platformOf, type Platform, type Stats } from "./platforms";
import { campaignSlug } from "./utm";

/**
 * A post that went out for a calendar task. Brian reads its numbers when it's
 * added and again at roughly 1 hour, 24 hours and 7 days, so posts are compared
 * at the same age. Platforms Brian can't read yet take numbers by hand.
 */
export interface Snapshot extends Stats {
  at: string;
  source: "auto" | "manual";
}

export interface Publication {
  id: string;
  taskId: string;
  taskTitle: string;
  taskDate: string | null;
  ideaId?: string;
  campaign: string;
  url: string;
  platform: Platform;
  addedBy: string;
  addedAt: string;
  snapshots: Snapshot[];
  error?: string;
}

const CHECKPOINTS_H = [1, 24, 168];

export function latest(p: Publication): Snapshot | undefined {
  return p.snapshots[p.snapshots.length - 1];
}

/** The snapshot closest to an age, for like-for-like comparisons. */
export function atAge(p: Publication, hours: number): Snapshot | undefined {
  const target = new Date(p.addedAt).getTime() + hours * 3_600_000;
  return [...p.snapshots].filter((s) => new Date(s.at).getTime() <= target + 6 * 3_600_000).pop();
}

export async function addPublication(input: { taskId: string; taskTitle: string; taskDate: string | null; ideaId?: string; url: string }): Promise<Publication> {
  let url: URL;
  try {
    url = new URL(input.url.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    throw new Error("Paste the full link to the post, starting with https://");
  }
  const pub: Publication = {
    id: newId("pub"),
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    taskDate: input.taskDate,
    ideaId: input.ideaId,
    campaign: campaignSlug(input.taskTitle, input.taskId),
    url: url.toString(),
    platform: platformOf(url.toString()),
    addedBy: currentActor() ?? "local",
    addedAt: new Date().toISOString(),
    snapshots: [],
  };
  const first = await readSafely(pub.url, pub.platform);
  if (first.stats) pub.snapshots.push({ at: pub.addedAt, source: "auto", ...first.stats });
  pub.error = first.error;
  await repo.update((d) => {
    d.publications = [...(d.publications ?? []), pub];
    logActivity(d, { type: "task.updated", text: `published “${pub.taskTitle}” on ${pub.platform}`, ref: { kind: pub.ideaId ? "idea" : "task", id: pub.ideaId ?? pub.taskId, label: pub.taskTitle } });
  });
  // The link also goes on the Linear issue, so the team sees it there.
  if (pub.taskId.startsWith("lin_") && linearReady()) await attachLink(pub.taskId.slice(4), pub.url, `${pub.platform} post`).catch(() => {});
  return pub;
}

async function readSafely(url: string, platform: Platform): Promise<{ stats?: Stats; error?: string }> {
  if (!AUTO.includes(platform)) return { error: `Brian can't read ${platform} yet. Add the numbers by hand.` };
  try {
    const stats = await fetchStats(url);
    return stats ? { stats } : { error: "Couldn't read this post's numbers. Is it public?" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function addManualStats(id: string, stats: Stats): Promise<Publication> {
  const clean = Object.fromEntries(Object.entries(stats).filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v >= 0)) as Stats;
  if (!Object.keys(clean).length) throw new Error("Enter at least one number.");
  let out!: Publication;
  await repo.update((d) => {
    const p = d.publications?.find((x) => x.id === id);
    if (!p) throw new Error("Post not found.");
    p.snapshots.push({ at: new Date().toISOString(), source: "manual", ...clean });
    out = { ...p };
  });
  return out;
}

export async function removePublication(id: string): Promise<void> {
  await repo.update((d) => {
    d.publications = (d.publications ?? []).filter((p) => p.id !== id);
  });
}

/** Read every post that has passed a checkpoint (1h, 24h, 7d) since its last reading. */
export async function refreshDue(now = Date.now()): Promise<number> {
  const db = await repo.read();
  const due = (db.publications ?? []).filter((p) => {
    if (!AUTO.includes(p.platform)) return false;
    const age = (now - new Date(p.addedAt).getTime()) / 3_600_000;
    const last = latest(p);
    const lastAge = last ? (new Date(last.at).getTime() - new Date(p.addedAt).getTime()) / 3_600_000 : -1;
    return CHECKPOINTS_H.some((h) => age >= h && lastAge < h) || (age < 24 * 30 && now - (last ? new Date(last.at).getTime() : 0) > 24 * 3_600_000);
  });
  for (const p of due) {
    const r = await readSafely(p.url, p.platform);
    await repo.update((d) => {
      const x = d.publications?.find((y) => y.id === p.id);
      if (!x) return;
      if (r.stats) x.snapshots.push({ at: new Date().toISOString(), source: "auto", ...r.stats });
      x.error = r.stats ? undefined : r.error;
    });
  }
  return due.length;
}
