import * as z from "zod/v4";
import { callStructured } from "@/lib/adapters/model";
import { STYLE_RULES } from "@/lib/brand/style";
import type { BrainNode, BrainQuestion, Breakdown, Digest, Swipe } from "@/lib/domain/types";
import { newId, repo } from "@/lib/store";

/**
 * Brian's brain (Rob, 21 Oct: "the mega brain of our industry, our audiences,
 * our marketing"). Three kinds of knowledge, each with its evidence:
 *
 * - truth:    what our audiences feel, want, hate, laugh at
 * - mechanic: why things spread
 * - industry: what's been done, how it landed, and what could have been better (the gap)
 *
 * Every link the team feeds is digested in one Opus call against the whole
 * brain: it strengthens what Brian already knows, adds what's new, records the
 * campaign in industry memory, and asks the team when something doesn't add up.
 * Ideas are built on truths and mechanics (never on examples, so they can't be
 * copied), and the team's verdict on each idea flows back: knowledge that keeps
 * producing liked ideas gets stronger, knowledge nobody uses fades.
 */

/** The moment an example was made for, without the year: "Halloween 2024" → "Halloween". */
export function momentOf(event?: string): string | undefined {
  const m = event?.replace(/\s*\b(19|20)\d{2}\b\s*/g, " ").replace(/\s+/g, " ").trim();
  return m || undefined;
}

export type Health = "strong" | "growing" | "weak" | "fading";

const DAY = 86_400_000;

/** How much Brian trusts a piece of knowledge. Evidence counts, the team counts double, liked ideas count most. */
export function strength(n: BrainNode): number {
  const ev = n.evidence.reduce((a, e) => a + (e.supports ? 1 : -1), 0);
  const team = n.team.reduce((a, t) => a + (t.agree ? 2 : -2), 0);
  const uses = n.uses.reduce((a, u) => a + (u.verdict === "liked" ? 1.5 : u.verdict === "rejected" ? -1 : 0), 0);
  return Math.max(0, Math.round((ev + team + uses) * 10) / 10);
}

/**
 * Fading: knowledge that isn't earning its place. Either nothing has touched it
 * in 30 days and no idea built on it was ever liked, or ideas built on it keep
 * getting rejected.
 */
export function health(n: BrainNode, now = Date.now()): Health {
  const liked = n.uses.filter((u) => u.verdict === "liked").length;
  const rejected = n.uses.filter((u) => u.verdict === "rejected").length;
  const last = Math.max(new Date(n.updatedAt).getTime(), ...n.uses.map((u) => new Date(u.at).getTime()));
  // Only timeless truths and mechanics fade with time: moment knowledge waits a year for its moment.
  const ages = !n.moment && (n.kind === "truth" || n.kind === "mechanic");
  if ((rejected >= 2 && liked === 0) || (ages && now - last > 30 * DAY && liked === 0)) return "fading";
  const s = strength(n);
  return s >= 4 ? "strong" : s >= 2 ? "growing" : "weak";
}

const DigestOut = z.object({
  notes: z
    .array(z.object({ step: z.string().describe("2-4 words, e.g. 'What it is', 'The feeling', 'Seen this before', 'What's new', 'Could have been better', 'What I'll keep'"), note: z.string().describe("One or two plain sentences, first person, written for the team") }))
    .describe("Short working notes for the team, in order, so they can follow how you filed this example. 4-7 notes"),
  whatHappened: z.string().describe("What the brand actually did, one or two sentences"),
  feeling: z.string().describe("The feeling it used and who already had it"),
  whySpread: z.string().describe("Why people shared it: what sharing it let them say about themselves"),
  whyBrand: z.string().describe("Why the brand got the credit"),
  timing: z.string().describe("What it rode, or 'None'"),
  lesson: z.string().describe("The one lesson, abstract enough to apply to a completely different idea"),
  dontCopy: z.string().describe("The surface never to reuse: object, format, target, joke"),
  unsure: z.string().nullable().describe("What you can't tell from the link. null if nothing"),
  links: z
    .array(z.object({ nodeId: z.string(), supports: z.boolean().describe("false if this example argues against it"), note: z.string().describe("How this example bears on it, one line") }))
    .describe("Existing brain pieces this example bears on, by id. Prefer this over adding new pieces"),
  newKnowledge: z
    .array(
      z.object({
        kind: z.enum(["truth", "mechanic"]),
        scope: z.enum(["timeless", "moment"]).describe("timeless: true on any day of the year. moment: only true around this example's moment (e.g. what people want at Halloween). Only use moment when the example was made for one"),
        text: z.string().describe("One sentence, general, no brand or campaign names"),
        detail: z.string().describe("Why it's true or why it works, one line"),
      }),
    )
    .describe("Only what's genuinely new to the brain. 0-4. A truth is about people; a mechanic is about how things spread"),
  cliches: z
    .array(z.string().describe("One line: a move brands always make around this moment, e.g. 'spooky giveaway with a pumpkin emoji'"))
    .describe("Only when the example was made for a moment: what everyone does around it, so ideas can avoid it. 0-3, only ones this example shows. Empty otherwise"),
  industry: z
    .object({ brand: z.string(), what: z.string().describe("What they did, one sentence"), landed: z.string().describe("How it landed and with whom"), couldBeBetter: z.string().describe("What could have been better: the gap someone else could use") })
    .nullable()
    .describe("The campaign itself, for industry memory. null if it's not a brand's campaign or post"),
  question: z.string().nullable().describe("If this example clashes with something the team taught you, or you can't tell what they liked about it, one short question for them. null if not"),
  questionNodeIds: z.array(z.string()).describe("Brain ids the question is about, or empty"),
});

const SYSTEM = [
  "You are Brian, the marketing brain of Cashy, a crypto casino. The team feeds you campaigns and posts that worked, theirs, rivals', anyone's. You digest each one into your brain. You're building three kinds of knowledge: truths about our audiences (degens, crypto people, gamblers, internet culture), mechanics of why things spread, and memory of what the industry has done and what could have been better.",
  "Keep two kinds of memory apart. What's timeless is true on any day of the year. What belongs to a moment (Halloween, Christmas, the Super Bowl) is only true around it, and goes in that moment's playbook: what the audience wants then, what brands did, and the clichés everyone repeats. A seasonal example usually teaches both: the timeless lesson underneath (e.g. 'reach bought with prizes isn't creativity') and the moment-only part (e.g. 'guess-the-thing giveaways are the standard casino Halloween move'). Never file a seasonal detail as timeless.",
  "Think like a sharp marketer, not a summariser: the feeling, why people shared it, why the brand got credit, what it rode. Truths and mechanics must be general enough to build completely different ideas on; never write a campaign's surface (its object, format, target or joke) into them. Link to what you already know before adding anything new; your brain should get sharper, not longer.",
  "The team's words are the truth: when they've said why they like something or corrected you, build on it. If something clashes with what they taught you before, ask them.",
  STYLE_RULES,
].join("\n\n");

/** The brain as Brian reads it when digesting: strongest first, with ids. */
export function brainSnapshot(all: BrainNode[], moment?: string, max = 120): string {
  // Brian files against what's timeless and against this moment's playbook, never another moment's.
  const nodes = all.filter((n) => !n.moment || n.moment === moment);
  if (!nodes.length) return "Your brain is empty. This is your first example.";
  const by = (k: BrainNode["kind"]) =>
    nodes
      .filter((n) => n.kind === k)
      .sort((a, b) => strength(b) - strength(a))
      .slice(0, max)
      .map((n) => `- [${n.id}] ${n.moment ? `(${n.moment} only) ` : ""}${k === "industry" ? `${n.brand}: ` : ""}${n.text} (strength ${strength(n)}, ${health(n)})`)
      .join("\n");
  return `<your_brain>\nTruths about our audiences:\n${by("truth") || "none yet"}\n\nMechanics of why things spread:\n${by("mechanic") || "none yet"}\n\nIndustry memory:\n${by("industry") || "none yet"}${moment ? `\n\n${moment} clichés (what everyone does):\n${by("cliche") || "none yet"}` : ""}\n</your_brain>`;
}

function exampleText(s: Swipe): string {
  const metrics = s.metrics && Object.keys(s.metrics).length ? Object.entries(s.metrics).map(([k, v]) => `${v.toLocaleString("en-US")} ${k}`).join(", ") : "no numbers";
  return [
    `Link: ${s.url} (${s.platform}${s.author ? `, ${s.author}` : ""}${s.owner ? `, ${s.owner === "ours" ? "Cashy's own" : s.owner === "competitor" ? "a competitor's" : "someone else's"}` : ""})`,
    s.event ? `Made for: ${s.event}` : "",
    `Numbers: ${metrics}`,
    `What it says:\n${(s.text || s.title).slice(0, 6000)}`,
    s.why ? `Why the team rates it: ${s.why}` : "The team didn't say why. Work it out.",
    ...(s.feedback ?? []).map((f) => `The team said your last take was ${f.verdict}${f.note ? `: ${f.note}` : "."}`),
  ]
    .filter(Boolean)
    .join("\n");
}

type DigestResult = z.infer<typeof DigestOut>;

/**
 * Applies one digest to the brain. Pure, so it's tested. Re-digesting an example
 * first takes back what it said last time, so evidence is never double counted.
 */
export function applyDigest(brain: BrainNode[], swipeId: string, out: DigestResult, now: string, makeId: () => string, moment?: string): { brain: BrainNode[]; touched: Digest["touched"] } {
  // Take back this example's earlier evidence; drop pieces that only it supported and nobody has judged or used.
  let next = brain
    .map((n) => ({ ...n, evidence: n.evidence.filter((e) => e.swipeId !== swipeId) }))
    .filter((n) => n.evidence.length || n.team.length || n.uses.length);
  const touched: Digest["touched"] = [];
  const known = new Set(next.map((n) => n.id));
  for (const l of out.links) {
    if (!known.has(l.nodeId)) continue;
    next = next.map((n) => (n.id === l.nodeId ? { ...n, evidence: [...n.evidence, { swipeId, note: l.note, supports: l.supports, at: now }], updatedAt: now } : n));
    touched.push({ nodeId: l.nodeId, change: l.supports ? "stronger" : "weaker" });
  }
  const add = (n: Omit<BrainNode, "id" | "createdAt" | "updatedAt" | "team" | "uses">) => {
    const id = makeId();
    next.push({ ...n, id, team: [], uses: [], createdAt: now, updatedAt: now });
    touched.push({ nodeId: id, change: "new" });
  };
  const first = { swipeId, note: "Where Brian first learned this", supports: true, at: now };
  for (const k of out.newKnowledge.slice(0, 4)) add({ kind: k.kind, text: k.text, detail: k.detail, moment: k.scope === "moment" && moment ? moment : undefined, evidence: [first] });
  if (out.industry) add({ kind: "industry", text: out.industry.what, detail: out.industry.landed, brand: out.industry.brand, gap: out.industry.couldBeBetter, moment, evidence: [{ ...first, note: "The campaign itself" }] });
  if (moment) for (const c of (out.cliches ?? []).slice(0, 3)) add({ kind: "cliche", text: c, detail: `What brands keep doing around ${moment}`, moment, evidence: [{ ...first, note: "Seen here" }] });
  return { brain: next, touched };
}

/** Digest one example into the brain: one Opus call (about $0.04). */
export async function digest(swipeId: string): Promise<Digest> {
  const db = await repo.read();
  const s = db.swipes?.find((x) => x.id === swipeId);
  if (!s) throw new Error("That example is gone.");
  const brain = (db.brain ?? []).map((n) => ({ ...n, evidence: n.evidence.filter((e) => e.swipeId !== swipeId) }));
  const moment = momentOf(s.event);
  const out = await callStructured({
    agent: "teacher",
    subject: s.title.slice(0, 60),
    schema: DigestOut,
    maxTokens: 8000,
    system: SYSTEM,
    prompt: `${brainSnapshot(brain, moment)}${moment ? `\n\nThis example was made for ${moment}. File the timeless lesson underneath it as timeless, and what only holds around ${moment} as moment knowledge and clichés.` : "\n\nThis example wasn't made for a particular moment: everything you learn from it is timeless."}\n\n<example>\n${exampleText(s)}\n</example>\n\n${s.breakdown ? "You've digested this before; the team has since given feedback. Digest it again with their words as the truth." : "Digest this example into your brain."}`,
  });
  const now = new Date().toISOString();
  const breakdown: Breakdown = { at: now, whatHappened: out.whatHappened, feeling: out.feeling, whySpread: out.whySpread, whyBrand: out.whyBrand, timing: out.timing, lesson: out.lesson, dontCopy: out.dontCopy, unsure: out.unsure ?? undefined };
  let result: Digest = { swipeId, at: now, thinking: out.notes.map((n) => ({ step: n.step, thought: n.note })), touched: [] };
  await repo.update((d) => {
    const applied = applyDigest(d.brain ?? [], swipeId, out, now, () => newId("bn"), moment);
    d.brain = applied.brain;
    result = { ...result, touched: applied.touched };
    d.digests = [result, ...(d.digests ?? []).filter((x) => x.swipeId !== swipeId)].slice(0, 500);
    const x = d.swipes?.find((y) => y.id === swipeId);
    if (x) x.breakdown = breakdown;
    if (out.question) {
      const q: BrainQuestion = { id: newId("bq"), text: out.question, nodeIds: out.questionNodeIds.filter((id) => d.brain!.some((n) => n.id === id)), swipeId, createdAt: now };
      d.brainQuestions = [q, ...(d.brainQuestions ?? []).filter((y) => !(y.swipeId === swipeId && !y.answer))];
    }
  });
  return result;
}

/** The team answers one of Brian's questions. The answer counts as a team verdict on the pieces it was about. */
export async function answerQuestion(id: string, text: string, by: string): Promise<void> {
  const clean = text.trim().slice(0, 1500);
  if (!clean) throw new Error("Write an answer first.");
  const now = new Date().toISOString();
  await repo.update((d) => {
    const q = d.brainQuestions?.find((x) => x.id === id);
    if (!q) throw new Error("That question is gone.");
    q.answer = { by, at: now, text: clean };
    for (const n of d.brain ?? []) if (q.nodeIds.includes(n.id)) n.team.push({ by, at: now, agree: true, note: `Answering "${q.text}": ${clean}` });
  });
}

/** The team agrees or disagrees with one piece of knowledge directly. */
export async function judgeNode(id: string, agree: boolean, note: string | undefined, by: string): Promise<void> {
  await repo.update((d) => {
    const n = d.brain?.find((x) => x.id === id);
    if (!n) throw new Error("That piece of Brian's brain is gone.");
    n.team.push({ by, at: new Date().toISOString(), agree, note: note?.trim().slice(0, 1000) || undefined });
    n.updatedAt = new Date().toISOString();
  });
}

/** Ideas remember what they were built on. */
export function recordUses(brain: BrainNode[], ideaId: string, nodeIds: string[], at: string): void {
  for (const n of brain) if (nodeIds.includes(n.id) && !n.uses.some((u) => u.ideaId === ideaId)) n.uses.push({ ideaId, at });
}

/** The team's verdict on an idea flows back into what it was built on. */
export async function ideaVerdict(ideaId: string, verdict: "liked" | "rejected"): Promise<void> {
  await repo.update((d) => {
    for (const n of d.brain ?? []) for (const u of n.uses) if (u.ideaId === ideaId) u.verdict = verdict;
  });
}

/**
 * What the Inventor builds from: truths and mechanics only, strongest first.
 * Industry memory stays out of the Inventor's view, so it can't lift a surface;
 * the panel gets it instead, to kill anything too close (industryContext).
 */
export function brainContext(brain: BrainNode[] | undefined, moment?: string): string {
  const live = (brain ?? []).filter((n) => health(n) !== "fading" && strength(n) > 0).sort((a, b) => strength(b) - strength(a));
  const line = (n: BrainNode) => `- [${n.id}] ${n.text} (${n.detail}; strength ${strength(n)})`;
  // Timeless knowledge always; a moment's playbook only for ideas for that moment, so seasonal lessons never leak into a normal day.
  const timeless = (k: BrainNode["kind"]) => live.filter((n) => !n.moment && n.kind === k).slice(0, 40).map(line).join("\n");
  const parts: string[] = [];
  if (live.some((n) => !n.moment && n.kind !== "industry" && n.kind !== "cliche"))
    parts.push(
      `<brian_brain note="What the team has taught you, true on any day. Build every idea on at least one truth about our audience and one mechanic, and list their ids in builtOn. Combine them with what's happening right now. Never build on a campaign you've seen: build on why it worked.">\nTruths about our audiences:\n${timeless("truth") || "none yet"}\n\nMechanics of why things spread:\n${timeless("mechanic") || "none yet"}\n</brian_brain>`,
    );
  if (moment) {
    const here = live.filter((n) => n.moment?.toLowerCase() === momentOf(moment)?.toLowerCase());
    if (here.length) {
      const of = (k: BrainNode["kind"]) => here.filter((n) => n.kind === k);
      parts.push(
        `<playbook moment="${momentOf(moment)}" note="Only for ideas for this moment. Use what the audience wants then; steer clear of the clichés (an idea that is one of them is dead); the gaps are where originality lives. Cite ids in builtOn too.">\nWhat our audience wants around it:\n${[...of("truth"), ...of("mechanic")].map(line).join("\n") || "nothing yet"}\n\nClichés everyone does (avoid):\n${of("cliche").map((n) => `- ${n.text}`).join("\n") || "none recorded"}\n\nGaps brands left (what could have been better):\n${of("industry").filter((n) => n.gap).map((n) => `- ${n.gap}`).join("\n") || "none recorded"}\n</playbook>`,
      );
    }
  }
  return parts.join("\n\n");
}

/** For the panel: what's been done, so anything too close dies. */
export function industryContext(brain: BrainNode[] | undefined): string {
  const done = (brain ?? []).filter((n) => n.kind === "industry");
  if (!done.length) return "";
  return `<industry_memory note="Campaigns that exist. Kill any candidate that a viewer would say is the same idea as one of these.">\n${done.map((n) => `- ${n.brand}: ${n.text}`).join("\n")}\n</industry_memory>`;
}
