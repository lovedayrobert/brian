import type { LookResult } from "@/lib/lookback";
import { newId, repo } from "@/lib/store";

/**
 * Research history (Rob, 27 Oct): every look-back is saved, so the team can
 * reopen past research for free, and running the same look again reuses it
 * instead of paying twice.
 */
export interface SavedLook extends LookResult {
  id: string;
  at: string;
  by: string;
  /** "Halloween 2024", or the dates when there was no moment */
  label: string;
  campaignId?: string;
  keywords: string[];
  paid: boolean;
}

export type LookSummary = Pick<SavedLook, "id" | "at" | "by" | "label" | "handle" | "from" | "to" | "campaignId"> & { count: number; others: number };

/** Same brand, same dates, same words, same routes: the same look. */
export function lookKey(x: { handle: string; from: string; to: string; keywords?: string[]; paid: boolean }): string {
  return [x.handle.toLowerCase(), x.from, x.to, [...(x.keywords ?? [])].map((k) => k.toLowerCase()).sort().join(","), x.paid ? "paid" : "free"].join("|");
}

export async function findLook(key: string): Promise<SavedLook | undefined> {
  return (await repo.read()).looks?.find((l) => lookKey(l) === key);
}

export async function saveLook(r: LookResult, meta: { by: string; label?: string; campaignId?: string; keywords: string[]; paid: boolean }): Promise<SavedLook> {
  const saved: SavedLook = { ...r, id: newId("look"), at: new Date().toISOString(), by: meta.by, label: meta.label || `${r.from} to ${r.to}`, campaignId: meta.campaignId, keywords: meta.keywords, paid: meta.paid };
  const key = lookKey(saved);
  await repo.update((d) => {
    d.looks = [saved, ...(d.looks ?? []).filter((l) => lookKey(l) !== key)].slice(0, 300);
  });
  return saved;
}

export function summarise(l: SavedLook): LookSummary {
  return { id: l.id, at: l.at, by: l.by, label: l.label, handle: l.handle, from: l.from, to: l.to, campaignId: l.campaignId, count: l.posts.length, others: l.others.length };
}
