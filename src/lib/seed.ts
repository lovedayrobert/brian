import { promises as fs } from "node:fs";
import path from "node:path";
import type { Idea } from "@/lib/domain/types";
import type { DB } from "@/lib/store";
import { repo } from "@/lib/store";

/**
 * Ideas and Memory rules made on a local Brian travel to the server inside the
 * deploy (seed/brian-seed.json), so moving them needs no login or token. Merged
 * once per server start; anything already there (same id, or same memory
 * text) is left alone, so a rating or edit made on the server is never undone.
 */
const g = globalThis as unknown as { brianSeeded?: Promise<void> };

export function applySeed(): Promise<void> {
  return (g.brianSeeded ??= merge().catch((e) => console.error("Seed merge failed:", e)));
}

async function merge() {
  let seed: { ideas?: Idea[]; memories?: DB["memories"]; retireMemoryPrefixes?: string[]; swipes?: DB["swipes"]; pulses?: DB["pulses"] };
  try {
    seed = JSON.parse(await fs.readFile(path.join(process.cwd(), "seed", "brian-seed.json"), "utf8"));
  } catch {
    return; // no seed file
  }
  const db = await repo.read();
  const haveIdeas = new Set(db.ideas.map((i) => i.id));
  const haveMem = new Set(db.memories.map((m) => m.text));
  const ideas = (seed.ideas ?? []).filter((i) => !haveIdeas.has(i.id));
  const memories = (seed.memories ?? []).filter((m) => !haveMem.has(m.text));
  const retire = (m: DB["memories"][number]) => (seed.retireMemoryPrefixes ?? []).some((p) => m.text.startsWith(p));
  const haveSwipes = new Set((db.swipes ?? []).map((s) => s.url));
  const swipes = (seed.swipes ?? []).filter((s) => !haveSwipes.has(s.url));
  const havePulses = new Set((db.pulses ?? []).map((p) => p.id));
  const pulses = (seed.pulses ?? []).filter((p) => !havePulses.has(p.id));
  if (!ideas.length && !memories.length && !swipes.length && !pulses.length && !db.memories.some(retire)) return;
  await repo.update((d) => {
    const ids = new Set(d.ideas.map((i) => i.id));
    const texts = new Set(d.memories.map((m) => m.text));
    d.ideas = [...ideas.filter((i) => !ids.has(i.id)), ...d.ideas];
    d.memories = [...memories.filter((m) => !texts.has(m.text)), ...d.memories.filter((m) => !retire(m))];
    const urls = new Set((d.swipes ?? []).map((s) => s.url));
    d.swipes = [...swipes.filter((s) => !urls.has(s.url)), ...(d.swipes ?? [])];
    const pids = new Set((d.pulses ?? []).map((p) => p.id));
    d.pulses = [...pulses.filter((p) => !pids.has(p.id)), ...(d.pulses ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}
