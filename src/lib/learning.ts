import * as z from "zod/v4";
import { logActivity } from "@/lib/activity";
import { currentActor } from "@/lib/actor";
import { callStructured } from "@/lib/adapters/model";
import { STYLE_RULES } from "@/lib/brand/style";
import type { Breakdown, Identity, Swipe } from "@/lib/domain/types";
import { repo } from "@/lib/store";

/**
 * Learning (Rob, 21 Oct): Brian learns from campaigns the team links, not just
 * from what's on the internet today. For each link Brian explains why it worked;
 * the team says right, partly or wrong, and Brian rewrites it with their words
 * as the truth. Everything confirmed becomes Cashy's identity, which every idea
 * run starts from. One Opus call per link (about $0.03), one per correction, and
 * one to rebuild the identity (about $0.10).
 */

const BreakdownOut = z.object({
  whatHappened: z.string().describe("What the brand actually did, in one or two plain sentences"),
  feeling: z.string().describe("The feeling it used (hate, hype, disbelief, envy, schadenfreude, love...) and who already had it"),
  whySpread: z.string().describe("Why people shared it: what sharing it let them say about themselves"),
  whyBrand: z.string().describe("Why the brand got the credit: why it can't be retold without the brand's name"),
  timing: z.string().describe("What it rode: an event, a season, a moment, a conversation. 'None' if it was timeless"),
  lesson: z.string().describe("The one reusable lesson, in one sentence, abstract enough to apply to a completely different idea"),
  dontCopy: z.string().describe("The surface to never reuse: the object, format, target or joke"),
  unsure: z.string().nullable().describe("What you can't tell from the link (e.g. it's a video you can't watch, no numbers). null if nothing"),
});

const TEACHER = [
  "You are the Teacher at Brian, the marketing brain of Cashy, a crypto casino. The team links campaigns and posts they think worked (theirs, rivals', anyone's), and you explain why, like a sharp marketer briefing a colleague. You're after the mechanism, not a summary: the feeling it used, why people shared it, why the brand got the credit, what it rode. The lesson must transfer to a completely different idea; the surface (object, format, target, joke) is what must never be copied.",
  "When the team has said why they like it, or corrected you, their words are the truth: build on them, never argue with them. If you can't see something (a video, an image), say so in unsure rather than guessing.",
  STYLE_RULES,
].join("\n\n");

function describe(s: Swipe): string {
  const metrics = s.metrics && Object.keys(s.metrics).length ? Object.entries(s.metrics).map(([k, v]) => `${v.toLocaleString("en-US")} ${k}`).join(", ") : "no numbers";
  return [
    `Link: ${s.url} (${s.platform}${s.author ? `, ${s.author}` : ""}${s.owner ? `, ${s.owner === "ours" ? "Cashy's own" : s.owner === "competitor" ? "a competitor's" : "someone else's"}` : ""})`,
    s.event ? `Made for: ${s.event}` : "",
    `Numbers: ${metrics}`,
    `What it says:\n${(s.text || s.title).slice(0, 6000)}`,
    s.why ? `Why the team likes it: ${s.why}` : "The team didn't say why. Work it out.",
    ...(s.feedback ?? []).map((f) => `The team said your last explanation was ${f.verdict}${f.note ? `: ${f.note}` : "."}`),
    s.breakdown ? `Your last explanation: ${JSON.stringify({ ...s.breakdown, at: undefined })}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function breakDown(id: string): Promise<Breakdown> {
  const s = (await repo.read()).swipes?.find((x) => x.id === id);
  if (!s) throw new Error("That example is gone.");
  const out = await callStructured({
    agent: "teacher",
    subject: s.title.slice(0, 60),
    schema: BreakdownOut,
    maxTokens: 4000,
    system: TEACHER,
    prompt: `${describe(s)}\n\n${s.breakdown ? "Rewrite your explanation using the team's feedback." : "Explain why it worked."}`,
  });
  const breakdown: Breakdown = { at: new Date().toISOString(), ...out, unsure: out.unsure ?? undefined };
  await repo.update((d) => {
    const x = d.swipes?.find((y) => y.id === id);
    if (x) x.breakdown = breakdown;
  });
  return breakdown;
}

/** The team's verdict on Brian's explanation. A note means Brian rewrites it. */
export async function giveFeedback(id: string, verdict: "right" | "partly" | "wrong", note: string | undefined, by: string): Promise<void> {
  const clean = note?.trim().slice(0, 1500) || undefined;
  if (verdict !== "right" && !clean) throw new Error("Say what Brian got wrong. That's what he learns from.");
  await repo.update((d) => {
    const x = d.swipes?.find((y) => y.id === id);
    if (!x) throw new Error("That example is gone.");
    x.feedback = [...(x.feedback ?? []), { by, at: new Date().toISOString(), verdict, note: clean }];
    logActivity(d, { by, type: "learning.feedback", text: `told Brian his take on “${x.title.slice(0, 60)}” was ${verdict}`, ref: { kind: "swipe", id: x.id, label: x.title.slice(0, 60) } });
  });
  if (clean) await breakDown(id);
}

/** Confirmed: the last word from the team was "right". These are what Brian believes. */
export function confirmed(s: Swipe): boolean {
  return !!s.breakdown && s.feedback?.at(-1)?.verdict === "right";
}

const IdentityOut = z.object({
  summary: z.string().describe("Who Cashy is as a marketer, in three or four plain sentences: what it does, what it never does, what it's after"),
  taste: z.array(z.string()).describe("What the team loves, 4-8 short lines, concrete"),
  lessons: z
    .array(z.object({ lesson: z.string(), why: z.string().describe("Why it works, one line"), examples: z.array(z.string()).describe("Titles of the examples it comes from") }))
    .describe("The lessons, merged where they overlap, strongest first. Only lessons the examples support"),
  avoid: z.array(z.string()).describe("What the team has said doesn't work or that Brian got wrong, 2-8 lines"),
});

export async function buildIdentity(): Promise<Identity> {
  const db = await repo.read();
  const all = (db.swipes ?? []).filter((s) => s.breakdown);
  if (!all.length) throw new Error("Add a few examples first. Brian builds the identity from them.");
  const lines = all.map((s) => {
    const last = s.feedback?.at(-1);
    const status = confirmed(s) ? "CONFIRMED by the team" : last ? `the team said ${last.verdict}` : "not reviewed yet";
    return `- ${s.title.slice(0, 120)} [${status}${s.event ? `, ${s.event}` : ""}]\n  Lesson: ${s.breakdown!.lesson}\n  Feeling: ${s.breakdown!.feeling}\n  Why it spread: ${s.breakdown!.whySpread}${s.why ? `\n  Team: ${s.why}` : ""}${(s.feedback ?? []).filter((f) => f.note).map((f) => `\n  Team correction: ${f.note}`).join("")}`;
  });
  const out = await callStructured({
    agent: "teacher",
    subject: "identity",
    schema: IdentityOut,
    maxTokens: 6000,
    system: `${TEACHER}\n\nNow build Cashy's identity as a marketer from everything the team has taught you. Confirmed examples count most; team corrections are rules. Plain words, no slogans.`,
    prompt: lines.join("\n"),
  });
  const identity: Identity = { at: new Date().toISOString(), ...out, basedOn: all.length };
  await repo.update((d) => {
    d.identity = identity;
    logActivity(d, { by: currentActor(), type: "learning.identity", text: `rebuilt Cashy's identity from ${all.length} examples` });
  });
  return identity;
}

/**
 * What Brian has learned, for the Inventor and the panel. Comes before the room:
 * the room says when, this says what good looks like. With an event (Halloween),
 * examples made for that event go first.
 */
export function learningContext(swipes: Swipe[] | undefined, identity: Identity | undefined, event?: string): string {
  const list = swipes ?? [];
  const forEvent = event ? list.filter((s) => s.event && s.event.toLowerCase().includes(event.toLowerCase().split(/\s+/)[0])) : [];
  const rest = list.filter((s) => !forEvent.includes(s) && s.breakdown).sort((a, b) => Number(confirmed(b)) - Number(confirmed(a)));
  const line = (s: Swipe) =>
    `- ${s.title.slice(0, 160)}${s.event ? ` (${s.event})` : ""}${confirmed(s) ? " [confirmed]" : ""}\n  Lesson: ${s.breakdown?.lesson ?? s.why}${s.breakdown ? `\n  Feeling: ${s.breakdown.feeling}. Never reuse: ${s.breakdown.dontCopy}` : ""}${s.why ? `\n  Team: ${s.why}` : ""}`;
  const parts: string[] = [];
  if (identity) {
    parts.push(
      `<cashy_identity note="Built from campaigns the team picked and corrected. This is what good looks like for Cashy. Start here.">\n${identity.summary}\nThe team loves:\n${identity.taste.map((t) => `- ${t}`).join("\n")}\nLessons:\n${identity.lessons.map((l) => `- ${l.lesson} (${l.why})`).join("\n")}\nAvoid:\n${identity.avoid.map((a) => `- ${a}`).join("\n")}\n</cashy_identity>`,
    );
  }
  if (forEvent.length) parts.push(`<what_worked_before event="${event}" note="Campaigns made for this same moment in the past. Learn why they worked and do something new in that spirit. Never reuse their concept, object, format or target.">\n${forEvent.slice(0, 10).map(line).join("\n")}\n</what_worked_before>`);
  if (rest.length) parts.push(`<lessons_from_examples note="Examples the team linked, with why they worked. Use the lessons; copies are killed.">\n${rest.slice(0, 15).map(line).join("\n")}\n</lessons_from_examples>`);
  return parts.join("\n\n");
}
