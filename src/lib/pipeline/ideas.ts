import * as z from "zod/v4";
import { callStructured, research } from "@/lib/adapters/model";
import type { BrandId, Claim, Citation, Idea, Moment, Signal, Trend } from "@/lib/domain/types";
import { ATTENTION_PLAYBOOK, QUALITY_BAR } from "@/lib/brand/quality-bar";
import { totalScore } from "@/lib/scores";
import { sourceContextFor } from "@/lib/source-context";
import { lensById } from "@/lib/brand/lenses";
import { newId, repo } from "@/lib/store";
import { memoryForRun } from "@/lib/memory";
import { ACCURACY_RULES, brandVoiceContext, qualityBarContext, resolveUrl, trendEvidence } from "./context";

const EdgeEnum = z.enum(["safe", "spicy", "wild"]);
const ClaimOut = z.object({ text: z.string(), url: z.string().nullable() });

const InventorOut = z.object({
  candidates: z.array(
    z.object({
      name: z.string().describe("Short, memorable campaign name"),
      oneLiner: z.string().describe("The one sentence someone would retell at a bar"),
      mechanism: z.string().describe("What actually happens, in two or three sentences. Never about Cashy's product or strengths."),
      attentionMechanic: z.enum(ATTENTION_PLAYBOOK.map((m) => m.id) as [string, ...string[]]),
      borrowedAttention: z.string().describe("The existing thing it rides: meme, moment, person, object, platform behaviour"),
      shareMoment: z.string().describe("The exact thing people screenshot, clip or repost"),
      whoAmplifies: z.string().describe("Who passes it on unpaid: which meme pages, creators, communities or press"),
      cashyRole: z.string().describe("How Cashy rides along subtly but unmistakably (logo, name, signature, Easter egg). Never a sales message."),
      headline: z.string().describe("The headline gaming, culture, crypto or mainstream press would write"),
      edge: EdgeEnum,
      backlash: z.string().describe("Who will be annoyed or offended, and how it plays out"),
      keyVisualPrompt: z.string().describe("A one-paragraph art direction for the key visual. No real people's faces."),
      evidence: z.array(ClaimOut),
    }),
  ),
});

const CriticOut = z.object({
  reviews: z.array(
    z.object({
      index: z.number().describe("0-based index of the candidate"),
      tests: z.array(z.object({ id: z.string(), pass: z.boolean(), note: z.string() })),
      bannedPatternHit: z.string().nullable(),
      verdict: z.enum(["pass", "kill"]),
      reasons: z.array(z.string()),
      shareability: z.object({ value: z.number(), reason: z.string() }),
      reach: z.object({ value: z.number(), reason: z.string() }),
      novelty: z.object({ value: z.number(), reason: z.string() }),
      attribution: z.object({ value: z.number(), reason: z.string() }),
      cost: z.object({ value: z.number(), reason: z.string() }),
    }),
  ),
});

const RedLinesOut = z.object({
  pass: z.boolean(),
  issues: z.array(z.string()).describe("Red-line breaches only. Empty if none."),
  consequences: z.array(z.string()).describe("Non-blocking consequences: who it annoys, platform risk, press angle"),
});

const PriorArtOut = z.object({
  found: z.boolean(),
  summary: z.string(),
  examples: z.array(ClaimOut),
});

export interface IdeaRunResult {
  cards: Idea[];
  killed: Idea[];
}

/** Inventor → Critic → Red Lines → Prior Art for one trend or moment. */
export async function generateIdeas(opts: {
  brandId: BrandId;
  trendId?: string;
  momentId?: string;
  lens?: string;
  steer?: string;
}): Promise<IdeaRunResult> {
  const db = await repo.read();
  const { text: sourceText, allowed, subject, trend, moment } = opts.lens
    ? labContext(db.moments, db.signals, opts.lens, opts.steer)
    : subjectContext(db.trends, db.moments, db.signals, opts);

  if ((trend?.sensitivity ?? moment?.sensitivity) === "blocked") {
    throw new Error(`Blocked by the red-line filter: ${trend?.sensitivityReason ?? moment?.sensitivityReason ?? "sensitive topic"}`);
  }

  const memory = await memoryForRun(opts.brandId, `inventing ideas for ${subject}`);
  const system = [
    memory,
    "You are the Inventor at Brian, Cashy's marketing brain. Your only job is attention: ideas that get Cashy in front of huge numbers of people in ways they share, screenshot and argue about. Think like Liquid Death, MSCHF, Duolingo's social team and the best crypto shitposters, not like a casino marketer. Nobody cares about a casino's strengths, so never make an idea about Cashy's product, payouts, terms, fairness, transparency or the Justice Fund. Cashy is the brand behind the stunt, never its subject.",
    brandVoiceContext(opts.brandId),
    qualityBarContext(),
    ACCURACY_RULES,
  ].join("\n\n");

  const inv = await callStructured({
    agent: "inventor",
    subject,
    schema: InventorOut,
    system,
    prompt: opts.lens
      ? `${sourceText}

Generate 10 original candidate ideas through this lens. Find openings nobody has used; never copy the reference stunts. Use at least 6 different attention mechanics across the 10. Each must be explainable in one sentence and be something a meme page would post. Prefer spicy and wild. Do not produce anything on the banned list. Cite evidence URLs where you use a fact; use null where you are reasoning.`
      : `${sourceText}

Generate 10 candidate ideas that ride this. Use at least 6 different attention mechanics across the 10. Each must be explainable in one sentence and be something a meme page would post. Prefer spicy and wild. Do not produce anything on the banned list. Ground every factual statement in the evidence above and cite its URL; use null where you are reasoning rather than citing.`,
  });

  const candidates = inv.candidates.slice(0, 10);
  const critic = await callStructured({
    agent: "critic",
    subject,
    schema: CriticOut,
    system: [
      memory,
      "You are the Critic at Brian. You judge ideas the way a meme page editor and a viral marketer would: would this actually get shared? You are deliberately harsh and most ideas die with you. Automatic kills: anything that is really about Cashy's product or strengths (payouts, terms, fairness, transparency, the Justice Fund), anything that is mainly a page of data, and anything a viewer would scroll past.",
      brandVoiceContext(opts.brandId),
      qualityBarContext(),
      `Run all five tests for every candidate using these ids: ${QUALITY_BAR.tests.map((t) => t.id).join(", ")}. Score from 1 to 10, each with a one-line reason: shareability (would people repost it unprompted?), reach (how far it can travel: who amplifies it), novelty (has anyone seen this before?), attribution (will people say Cashy's name when they share it?), cost (10 = nearly free). Pass at most three.`,
    ].join("\n\n"),
    prompt: `${sourceText}\n\n<candidates>\n${candidates.map((c, i) => `${i}. ${c.name}: ${c.oneLiner}\nWhat happens: ${c.mechanism}\nMechanic: ${c.attentionMechanic}. Share moment: ${c.shareMoment}\nWho amplifies: ${c.whoAmplifies}\nCashy's name: ${c.cashyRole}\nEdge: ${c.edge}`).join("\n\n")}\n</candidates>`,
  });

  const now = new Date().toISOString();
  const ideas: Idea[] = candidates.map((c, i) => {
    const r = critic.reviews.find((x) => x.index === i);
    const passed = r?.verdict === "pass" && !r.bannedPatternHit;
    return {
      id: newId("idea"),
      brandId: opts.brandId,
      trendId: trend?.id,
      momentId: moment?.id,
      origin: opts.lens ? "lab" : trend ? "trend" : "moment",
      lens: opts.lens,
      name: c.name,
      oneLiner: c.oneLiner,
      headline: c.headline,
      edge: c.edge,
      backlash: c.backlash,
      mechanism: c.mechanism,
      borrowedAttention: c.borrowedAttention,
      engine: 2,
      attentionMechanic: c.attentionMechanic,
      shareMoment: c.shareMoment,
      whoAmplifies: c.whoAmplifies,
      cashyRole: c.cashyRole,
      evidence: toClaims(c.evidence, allowed),
      scores: {
        shareability: clampScore(r?.shareability),
        reach: clampScore(r?.reach),
        novelty: clampScore(r?.novelty),
        attribution: clampScore(r?.attribution),
        cost: clampScore(r?.cost),
      },
      screening: {
        critic: {
          verdict: passed ? "pass" : "kill",
          tests: (r?.tests ?? []).map((t) => ({
            name: QUALITY_BAR.tests.find((q) => q.id === t.id)?.name ?? t.id,
            pass: t.pass,
            note: t.note,
          })),
          bannedPatternHit: r?.bannedPatternHit ?? undefined,
          reasons: r?.reasons ?? ["The Critic did not review this candidate."],
        },
        priorArt: null,
        redLines: null,
      },
      status: passed ? "candidate" : "killed",
      keyVisualPrompt: c.keyVisualPrompt,
      createdAt: now,
    };
  });

  const survivors = ideas
    .filter((i) => i.status === "candidate")
    .sort((a, b) => totalScore(b) - totalScore(a))
    .slice(0, 3);

  await Promise.all(
    survivors.map(async (idea) => {
      const [red, prior] = await Promise.all([checkRedLines(idea, opts.brandId, sourceText), checkPriorArt(idea)]);
      idea.screening.redLines = red;
      idea.screening.priorArt = prior;
      idea.status = red.pass ? "card" : "killed";
      if (!red.pass) idea.screening.critic.reasons.unshift(`Red line: ${red.issues.join("; ")}`);
    }),
  );
  for (const i of ideas) if (i.status === "candidate") {
    i.status = "killed";
    i.screening.critic.reasons.unshift("Passed the Critic but ranked below the top three.");
  }

  // Keep the source with each idea so it can be shown wherever the idea travels.
  for (const i of ideas) i.sourceContext = sourceContextFor(i, db);
  await repo.update((d) => {
    d.ideas = [...ideas, ...d.ideas];
  });
  return { cards: ideas.filter((i) => i.status === "card"), killed: ideas.filter((i) => i.status === "killed") };
}

async function checkRedLines(idea: Idea, brandId: BrandId, sourceText: string) {
  return callStructured({
    agent: "redLines",
    subject: idea.name,
    schema: RedLinesOut,
    system: [
      "You are Red Lines at Brian. Default to pass. Fail an idea only if it clearly breaches one of the listed hard stops; when in doubt, pass it and write the risk as a consequence. You never make ideas tamer: offensive, crude or dark humour, shock, taboo, swearing, roasting rivals and public figures, harmless pranks, stunts that annoy platforms or press, and stunts that physically happen in markets where we don't take players are all allowed and listed as consequences (say which market legal should check). If an idea only works by disguising gambling promotion to get past a platform's rules, that's a consequence: say plainly it risks losing the account.",
      brandVoiceContext(brandId),
      qualityBarContext(),
    ].join("\n\n"),
    prompt: `${sourceText}\n\n<idea>\n${idea.name}: ${idea.oneLiner}\n${idea.mechanism}\nEdge: ${idea.edge}\n</idea>\n\nDoes this breach a red line? List breaches as issues (fail) and everything else as consequences.`,
  });
}

async function checkPriorArt(idea: Idea): Promise<Idea["screening"]["priorArt"]> {
  try {
    const r = await research({
      agent: "priorArt",
      subject: idea.name,
      system: "You are Prior Art at Brian. You check whether any casino, crypto brand or major brand has already run a stunt with the same twist. Be specific: brand, date, link.",
      prompt: `Has anyone done this or something with the same twist?\n\n${idea.name}: ${idea.oneLiner}\nMechanism: ${idea.mechanism}\n\nSearch the web. Report what you find with links and dates, or say clearly that you found nothing close.`,
      maxSearches: 4,
    });
    const structured = await callStructured({
      agent: "priorArt",
      subject: idea.name,
      schema: PriorArtOut,
      system: "Structure these research notes. Only use URLs from the source list. If nothing close was found, found=false.",
      prompt: `<notes>\n${r.notes}\n</notes>\n<sources>\n${r.sources.map((s) => `- ${s.title} ${s.url}`).join("\n")}\n</sources>`,
    });
    return { found: structured.found, summary: structured.summary, examples: toClaims(structured.examples, r.sources) };
  } catch (e) {
    return { found: false, summary: `Prior art check failed: ${(e as Error).message}`, examples: [] };
  }
}

function subjectContext(
  trends: Trend[],
  moments: Moment[],
  signals: Signal[],
  opts: { trendId?: string; momentId?: string },
) {
  if (opts.trendId) {
    const trend = trends.find((t) => t.id === opts.trendId);
    if (!trend) throw new Error("Trend not found. Run a sweep first.");
    const ev = trendEvidence(trend, signals);
    return { ...ev, subject: trend.title, trend, moment: undefined };
  }
  const moment = moments.find((m) => m.id === opts.momentId);
  if (!moment) throw new Error("Moment not found.");
  const allowed: Citation[] = (moment.sources ?? (moment.sourceUrl ? [{ title: moment.title, url: moment.sourceUrl, outlet: "" }] : [])).map(
    (s) => ({ url: s.url, title: s.title, publisher: s.outlet, retrievedAt: moment.date }),
  );
  const text = `<moment kind="${moment.kind}" date="${moment.date}">\nTitle: ${moment.title}\nCategory: ${moment.category}\n${moment.description}\nSources (cite these URLs only):\n${allowed.map((a) => `- [${a.publisher}] ${a.title} ${a.url}`).join("\n")}\n</moment>`;
  return { text, allowed, subject: moment.title, trend: undefined, moment };
}

export function toClaims(items: { text: string; url: string | null }[], allowed: Citation[]): Claim[] {
  return items.map((c) => {
    const cite = resolveUrl(c.url, allowed);
    return { text: c.text, citations: cite ? [cite] : [], status: cite ? "verified" : "unresolved" };
  });
}

function clampScore(s?: { value: number; reason: string }) {
  if (!s) return { value: 0, reason: "Not scored" };
  return { value: Math.max(1, Math.min(10, Math.round(s.value))), reason: s.reason };
}

export { totalScore };

/** Context for an original idea: the lens, plus the evidence that lens needs. */
function labContext(moments: Moment[], signals: Signal[], lensId: string, steer?: string) {
  const lens = lensById(lensId);
  if (!lens) throw new Error("Unknown lens");
  const pick = (xs: Signal[], n: number) => xs.slice(0, n);
  const trade = signals.filter((s) => s.sourceId === "press" && s.topics.includes("trade"));
  const rivals = trade.filter((s) => /\b(stake|shuffle|rollbit|roobet|bc\.game|rainbet|duel)\b/i.test(`${s.title} ${s.summary ?? ""}`));
  const culture = moments.filter((m) => m.kind === "breaking" && !m.industry && m.sensitivity !== "blocked");
  const calendar = moments.filter((m) => m.kind === "calendar");
  const coins = signals.filter((s) => s.sourceId === "trenches" && s.narrative?.kind === "culture");

  const evidence: Signal[] = [
    ...(lensId === "troll" ? pick(rivals, 12) : pick(rivals, 3)),
    ...(lensId === "internet-object" || lensId === "hijack-now" ? pick(coins, 10) : pick(coins, 3)),
  ];
  const allowed: Citation[] = [
    ...evidence.map((s) => ({ url: s.url, title: s.title, publisher: s.author ?? s.sourceId, retrievedAt: s.capturedAt })),
    ...culture.slice(0, 12).flatMap((m) => (m.sourceUrl ? [{ url: m.sourceUrl, title: m.title, publisher: "news", retrievedAt: m.date }] : [])),
    ...calendar.flatMap((m) => (m.sourceUrl ? [{ url: m.sourceUrl, title: m.title, publisher: "calendar", retrievedAt: m.date }] : [])),
  ];

  const text = `<lens name="${lens.name}">
${lens.prompt}
</lens>
${steer ? `\n<steer>\nThe campaign owner adds: ${steer}\n</steer>\n` : ""}
<context note="What is happening right now, for awareness. You are not required to use any of it.">
Culture right now:
${culture.slice(0, lensId === "hijack-now" || lensId === "creator-chaos" ? 25 : 12).map((m) => `- ${m.title} ${m.sourceUrl ?? ""}`).join("\n")}

Coming up:
${calendar.slice(0, 8).map((m) => `- ${m.date.slice(0, 10)} ${m.title} ${m.sourceUrl ?? ""}`).join("\n")}

${evidence.length ? `Evidence (cite these URLs only):\n${evidence.map((s) => `- [${s.author ?? s.sourceId}] ${s.title} ${s.url}${s.narrative ? ` (coin: ${s.narrative.reference})` : ""}`).join("\n")}` : ""}
</context>`;
  return { text, allowed, subject: `Lab: ${lens.name}`, trend: undefined, moment: undefined };
}

export class RedLineError extends Error {}

/**
 * The gate every idea passes before it can be developed. The Critic can be
 * overruled (taste); Red Lines cannot (legal and safety). An idea that never
 * reached Red Lines, because the Critic killed it first, is checked now.
 */
export async function ensureRedLinesPass(ideaId: string): Promise<void> {
  const db = await repo.read();
  const idea = db.ideas.find((i) => i.id === ideaId);
  if (!idea) throw new Error("Idea not found");
  let red = idea.screening.redLines;
  if (!red) {
    const trend = db.trends.find((t) => t.id === idea.trendId);
    const source = trend ? trendEvidence(trend, db.signals).text : `<idea_context>${idea.borrowedAttention}</idea_context>`;
    red = await checkRedLines(idea, idea.brandId, source);
    await repo.update((d) => {
      const i = d.ideas.find((x) => x.id === ideaId);
      if (i) i.screening.redLines = red;
    });
  }
  if (!red.pass) {
    throw new RedLineError(`Red lines can't be overruled. ${red.issues.join(" ") || "This idea breaches a legal or safety line."}`);
  }
}

const SteerCheck = z.object({ pass: z.boolean(), issue: z.string().nullable() });

/** Steering can't be used to walk a package over a red line. */
export async function checkSteeringRedLines(ideaId: string, instruction: string): Promise<void> {
  const db = await repo.read();
  const idea = db.ideas.find((i) => i.id === ideaId);
  if (!idea) throw new Error("Idea not found");
  const r = await callStructured({
    agent: "redLines",
    subject: `steer: ${instruction.slice(0, 60)}`,
    schema: SteerCheck,
    system: [
      "You are Red Lines at Brian. Decide whether applying a steering instruction to a campaign would clearly breach one of the hard stops. Default to pass: making an idea bolder, ruder, darker, more offensive or more rival-baiting is allowed.",
      qualityBarContext(),
    ].join("\n\n"),
    prompt: `<idea>\n${idea.name}: ${idea.oneLiner}\n</idea>\n<instruction>\n${instruction}\n</instruction>`,
  });
  if (!r.pass) throw new RedLineError(`That change would cross a red line: ${r.issue ?? "legal or safety"}`);
}
