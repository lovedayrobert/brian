import * as z from "zod/v4";
import { currentActor } from "@/lib/actor";
import { logActivity } from "@/lib/activity";
import type { BrandId } from "@/lib/domain/types";
import { newId, repo, type DB } from "@/lib/store";

/**
 * Brian's memory. Three ways in:
 *  1. Feedback: thumbs up/down with a reason on ideas and packages.
 *  2. Behaviour: overruling the Critic, rejecting a card, repeated steering.
 *  3. Teaching: rules written directly on the Memory screen.
 * Active memories are injected into every agent's brief. Every change is an
 * event on the timeline, and any memory can be edited, paused or forgotten.
 */
export type MemoryKind = "rule" | "preference" | "lesson";
export type MemorySource = "taught" | "feedback" | "behaviour" | "consolidated";

export interface Memory {
  id: string;
  brandId: BrandId;
  kind: MemoryKind;
  text: string;
  source: MemorySource;
  /** How many feedback events support it; consolidation raises this. */
  weight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  usedCount: number;
  lastUsedAt?: string;
  refs: { type: "idea" | "package"; id: string; label: string }[];
  /** Who taught it, or whose feedback it came from */
  by?: string;
}

export type MemoryEventType = "feedback" | "learned" | "used" | "edited" | "paused" | "forgotten" | "consolidated";

export interface MemoryEvent {
  id: string;
  at: string;
  type: MemoryEventType;
  text: string;
  memoryId?: string;
  ref?: { type: "idea" | "package"; id: string; label: string };
  sentiment?: "up" | "down";
  by?: string;
}

export interface Feedback {
  id: string;
  at: string;
  target: { type: "idea" | "package"; id: string; label: string };
  sentiment: "up" | "down";
  reason?: string;
  consolidated: boolean;
  by?: string;
}

function event(db: DB, e: Omit<MemoryEvent, "id" | "at">) {
  db.memoryEvents.unshift({ id: newId("mev"), at: new Date().toISOString(), by: currentActor(), ...e });
  db.memoryEvents = db.memoryEvents.slice(0, 1000);
}

function remember(
  db: DB,
  m: Pick<Memory, "kind" | "text" | "source"> & { refs?: Memory["refs"]; weight?: number; brandId?: BrandId },
): Memory {
  const now = new Date().toISOString();
  const mem: Memory = {
    id: newId("mem"),
    brandId: m.brandId ?? "cashy",
    kind: m.kind,
    text: m.text.trim(),
    source: m.source,
    weight: m.weight ?? 1,
    active: true,
    createdAt: now,
    updatedAt: now,
    usedCount: 0,
    refs: m.refs ?? [],
    by: currentActor(),
  };
  db.memories.unshift(mem);
  event(db, { type: "learned", text: mem.text, memoryId: mem.id, ref: mem.refs[0] });
  return mem;
}

/** Thumbs up/down. A reason becomes a preference right away; a bare thumb waits for consolidation. */
export async function recordFeedback(f: { target: Feedback["target"]; sentiment: "up" | "down"; reason?: string }) {
  await repo.update((db) => {
    const fb: Feedback = { id: newId("fb"), at: new Date().toISOString(), ...f, reason: f.reason?.trim() || undefined, consolidated: false, by: currentActor() };
    db.feedback.unshift(fb);
    event(db, {
      type: "feedback",
      sentiment: f.sentiment,
      text: `${f.sentiment === "up" ? "Liked" : "Didn't like"} “${f.target.label}”${fb.reason ? `: ${fb.reason}` : ""}`,
      ref: f.target,
    });
    if (fb.reason) {
      remember(db, {
        kind: "preference",
        source: "feedback",
        text: `${f.sentiment === "up" ? "More like" : "Less like"} “${f.target.label}”: ${fb.reason}`,
        refs: [f.target],
      });
      fb.consolidated = true;
    }
  });
}

export async function teach(text: string, kind: MemoryKind = "rule") {
  if (!text.trim()) throw new Error("Write something to teach Brian first.");
  await repo.update((db) => {
    const m = remember(db, { kind, text, source: "taught" });
    logActivity(db, { type: "memory.taught", text: `taught Brian: “${m.text.slice(0, 140)}”`, ref: { kind: "memory", id: m.id, label: m.text.slice(0, 60) } });
  });
}

/** Behavioural signals: the things you do that say more than ratings. */
export async function learnFromBehaviour(b:
  | { type: "overrule"; ideaId: string; label: string; criticReason?: string }
  | { type: "reject"; ideaId: string; label: string; reason?: string }
  | { type: "steer"; packageId: string; label: string; instruction: string }) {
  await repo.update((db) => {
    if (b.type === "overrule") {
      logActivity(db, { type: "idea.overruled", text: `overruled the panel on “${b.label}”`, ref: { kind: "idea", id: b.ideaId, label: b.label } });
      event(db, { type: "feedback", sentiment: "up", text: `Overruled the Critic and developed “${b.label}”`, ref: { type: "idea", id: b.ideaId, label: b.label } });
      remember(db, {
        kind: "lesson",
        source: "behaviour",
        text: `The Critic was too harsh on “${b.label}”${b.criticReason ? ` (it said: ${b.criticReason})` : ""}. Ideas like this are worth keeping.`,
        refs: [{ type: "idea", id: b.ideaId, label: b.label }],
      });
    }
    if (b.type === "reject") {
      logActivity(db, { type: "idea.rejected", text: `rejected “${b.label}”${b.reason ? `: ${b.reason}` : ""}`, ref: { kind: "idea", id: b.ideaId, label: b.label } });
      event(db, { type: "feedback", sentiment: "down", text: `Rejected “${b.label}”${b.reason ? `: ${b.reason}` : ""}`, ref: { type: "idea", id: b.ideaId, label: b.label } });
      if (b.reason) remember(db, { kind: "preference", source: "behaviour", text: `Avoid ideas like “${b.label}”: ${b.reason}`, refs: [{ type: "idea", id: b.ideaId, label: b.label }] });
    }
    if (b.type === "steer") {
      const ref = { type: "package" as const, id: b.packageId, label: b.label };
      event(db, { type: "feedback", text: `Steered “${b.label}”: ${b.instruction}`, ref });
      // The same kind of instruction twice becomes a standing preference.
      const norm = normalise(b.instruction);
      const similar = db.memoryEvents.filter((e) => e.type === "feedback" && e.text.startsWith("Steered") && normalise(e.text.split(": ").slice(1).join(": ")) === norm);
      const existing = db.memories.find((m) => m.source === "behaviour" && normalise(m.text).includes(norm));
      if (similar.length >= 2 && !existing) {
        remember(db, { kind: "preference", source: "behaviour", weight: similar.length, text: `By default: ${b.instruction} (you've asked for this ${similar.length} times)`, refs: [ref] });
      } else if (existing) {
        existing.weight += 1;
        existing.updatedAt = new Date().toISOString();
      }
    }
  });
}

function normalise(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

export async function editMemory(id: string, patch: { text?: string; active?: boolean; forget?: boolean }) {
  await repo.update((db) => {
    const m = db.memories.find((x) => x.id === id);
    if (!m) throw new Error("Memory not found");
    if (patch.forget) {
      db.memories = db.memories.filter((x) => x.id !== id);
      event(db, { type: "forgotten", text: m.text, memoryId: id });
      return;
    }
    if (patch.text !== undefined && patch.text.trim() && patch.text.trim() !== m.text) {
      event(db, { type: "edited", text: `“${m.text}” → “${patch.text.trim()}”`, memoryId: id });
      logActivity(db, { type: "memory.edited", text: `edited a rule: “${patch.text.trim().slice(0, 120)}”`, ref: { kind: "memory", id, label: patch.text.trim().slice(0, 60) } });
      m.text = patch.text.trim();
    }
    if (patch.active !== undefined && patch.active !== m.active) {
      m.active = patch.active;
      event(db, { type: patch.active ? "learned" : "paused", text: `${patch.active ? "Switched back on" : "Paused"}: ${m.text}`, memoryId: id });
    }
    m.updatedAt = new Date().toISOString();
  });
}

/**
 * The memory block every agent sees. Also records that these memories were
 * used, so the Memory screen can show what actually shapes Brian's output.
 */
export async function memoryForRun(brandId: BrandId, purpose: string): Promise<string> {
  const db = await repo.read();
  const active = db.memories.filter((m) => m.active && m.brandId === brandId).sort((a, b) => b.weight - a.weight).slice(0, 40);
  if (!active.length) return "";
  const now = new Date().toISOString();
  await repo.update((d) => {
    for (const m of d.memories) if (active.some((a) => a.id === m.id)) {
      m.usedCount += 1;
      m.lastUsedAt = now;
    }
    event(d, { type: "used", text: `Used ${active.length} memor${active.length === 1 ? "y" : "ies"} while ${purpose}` });
  });
  const by = (k: MemoryKind) => active.filter((m) => m.kind === k);
  return `<memory note="What the campaign owner has taught Brian. Rules are hard requirements. Preferences and lessons shape judgement; follow them unless they clash with a red line or the facts.">
${by("rule").length ? `Rules:\n${by("rule").map((m) => `- ${m.text}`).join("\n")}\n` : ""}${by("preference").length ? `Preferences:\n${by("preference").map((m) => `- ${m.text}`).join("\n")}\n` : ""}${by("lesson").length ? `Lessons:\n${by("lesson").map((m) => `- ${m.text}`).join("\n")}` : ""}
</memory>`;
}

const ConsolidateOut = z.object({
  lessons: z.array(z.object({ text: z.string().describe("One short, actionable lesson about the owner's taste"), supportingFeedbackIds: z.array(z.string()) })),
});

/** Merge raw feedback into a few clear lessons (needs the AI key). */
export async function consolidate(): Promise<number> {
  const { callStructured } = await import("@/lib/adapters/model");
  const db = await repo.read();
  const raw = db.feedback.filter((f) => !f.consolidated);
  if (raw.length < 2) throw new Error("Brian needs at least two new pieces of feedback to find a pattern.");
  const ideaText = (id: string) => {
    const i = db.ideas.find((x) => x.id === id);
    return i ? `${i.name}: ${i.oneLiner} (edge ${i.edge}, lens ${i.lens ?? "trend"})` : "";
  };
  const out = await callStructured({
    agent: "critic",
    subject: "memory consolidation",
    schema: ConsolidateOut,
    system:
      "You distil a marketing lead's feedback into a few short lessons about their taste that will steer future ideas. Only state patterns the feedback supports. Prefer 1 to 4 lessons. Never invent reasons they didn't give.",
    prompt: raw
      .map((f) => `[${f.id}] ${f.sentiment === "up" ? "LIKED" : "DISLIKED"} ${f.target.label}. ${f.reason ?? "(no reason)"} ${f.target.type === "idea" ? ideaText(f.target.id) : ""}`)
      .join("\n"),
  });
  await repo.update((d) => {
    for (const l of out.lessons) {
      const m = remember(d, { kind: "lesson", source: "consolidated", text: l.text, weight: l.supportingFeedbackIds.length });
      event(d, { type: "consolidated", text: `From ${l.supportingFeedbackIds.length} pieces of feedback: ${l.text}`, memoryId: m.id });
    }
    for (const f of d.feedback) if (raw.some((r) => r.id === f.id)) f.consolidated = true;
  });
  return out.lessons.length;
}
