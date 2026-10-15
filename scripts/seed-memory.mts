// Seeds Brian's memory with the feedback Rob gave while Brian was being built (15 Oct 2026).
// Idempotent: re-running doesn't duplicate.
import { repo } from "@/lib/store";
import type { Memory } from "@/lib/memory";

const at = "2026-10-15T08:00:00.000Z";
const seeds: Pick<Memory, "id" | "kind" | "text">[] = [
  { id: "mem_seed_original", kind: "preference", text: "Original ideas matter as much as trend reactions. Look for openings that are Cashy's own, not copies of what's already trending." },
  { id: "mem_seed_culture", kind: "preference", text: "Culture, creator drama and scandals beat trade news. Regulation, licensing and corporate deals are boring however relevant the topic." },
  { id: "mem_seed_promote", kind: "rule", text: "Find channels and formats where a casino is allowed or nobody has looked yet. Don't rely on disguising gambling promotion to get past platform rules." },
  { id: "mem_seed_coins", kind: "preference", text: "Memecoins are a research signal for spotting memes early, not a focus for ideas." },
];

await repo.update((d) => {
  for (const s of seeds) {
    if (d.memories.some((m) => m.id === s.id)) continue;
    d.memories.push({ ...s, brandId: "cashy", source: "feedback", weight: 1, active: true, createdAt: at, updatedAt: at, usedCount: 0, refs: [] });
    d.memoryEvents.push({ id: `mev_${s.id}`, at, type: "learned", text: s.text, memoryId: s.id });
  }
  d.memoryEvents.sort((a, b) => b.at.localeCompare(a.at));
});
console.log("Memory seeded");
