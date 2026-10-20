import * as z from "zod/v4";
import { callChecker, callStructured, checkerReady, qualityMax, research, SpendCapError } from "@/lib/adapters/model";
import type { BrandId, Claim, Citation, Idea, Moment, Signal, Trend } from "@/lib/domain/types";
import { AUDIENCE_PANEL, EMOTIONS, MOVES, QUALITY_BAR } from "@/lib/brand/quality-bar";
import { pulseContext } from "./pulse";
import { currentActor } from "@/lib/actor";
import { logActivity } from "@/lib/activity";
import { specialDayById } from "@/lib/calendar/days";
import { swipeContext, swipeLine } from "@/lib/swipe";
import type { DB } from "@/lib/store";
import { totalScore } from "@/lib/scores";
import { sourceContextFor } from "@/lib/source-context";
import { REACTIVE_LENSES } from "@/lib/horizon";
import type { Horizon } from "@/lib/domain/types";
import { lensById } from "@/lib/brand/lenses";
import { newId, repo } from "@/lib/store";
import { memoryForRun } from "@/lib/memory";
import { ACCURACY_RULES, brandVoiceContext, qualityBarContext, resolveUrl, trendEvidence } from "./context";

const EdgeEnum = z.enum(["safe", "spicy", "wild"]);
const ClaimOut = z.object({ text: z.string(), url: z.string().nullable() });

const InventorOut = z.object({
  candidates: z.array(
    z.object({
      move: z.string().describe("The act, in one sentence, the way people will retell it: 'Cashy paid X to …', 'Cashy put its logo on …', 'A guy gambled on Cashy using …'. No campaign names."),
      archetype: z.enum(MOVES.map((m) => m.id) as [string, ...string[]]),
      emotion: z.enum(EMOTIONS.map((e) => e.id) as [string, ...string[]]),
      emotionTarget: z.string().describe("Who or what the feeling is aimed at, and why the audience already feels it"),
      pulseRef: z.string().nullable().describe("The Pulse item or signal it rides, named, or null"),
      shareLine: z.string().describe("The exact words people type when they share it, in their voice, lower case if that's how they'd write it"),
      reactions: z.array(z.object({ who: z.string(), says: z.string() })).describe("Three gut reactions from different corners of the internet, in their own words"),
      howItWorks: z.string().describe("How Cashy actually does it: who, where, what's needed, what it costs, how long. Raw, not polished."),
      proof: z.string().describe("What gets filmed or screenshotted as evidence it happened"),
      headline: z.string().describe("The title a drama channel, clip account or press would give it"),
      cashyRole: z.string().describe("Why you can't retell it without saying Cashy"),
      firstness: z.string().describe("Why nobody has done this"),
      edge: EdgeEnum,
      backlash: z.string().describe("Who will be angry, and how that helps or hurts"),
      cost: z.string().describe("Rough cost and time, e.g. '$300, a weekend'"),
      keyVisualPrompt: z.string().describe("The raw phone-camera frame that proves it happened. No real people's faces."),
      evidence: z.array(ClaimOut),
    }),
  ),
});

const CriticOut = z.object({
  reviews: z.array(
    z.object({
      index: z.number().describe("0-based index of the candidate"),
      panel: z
        .array(z.object({ id: z.string(), reaction: z.string().describe("Their gut reaction, in their voice, one line"), shares: z.boolean(), feeling: z.string() }))
        .describe("One entry per panel member, in order"),
      tests: z.array(z.object({ id: z.string(), pass: z.boolean(), note: z.string() })),
      bannedPatternHit: z.string().nullable(),
      verdict: z.enum(["pass", "kill"]),
      reasons: z.array(z.string()),
      charge: z.object({ value: z.number(), reason: z.string() }),
      spread: z.object({ value: z.number(), reason: z.string() }),
      simplicity: z.object({ value: z.number(), reason: z.string() }),
      realness: z.object({ value: z.number(), reason: z.string() }),
      attribution: z.object({ value: z.number(), reason: z.string() }),
    }),
  ),
});

const PlanOut = z.object({
  angles: z
    .array(
      z.object({
        feeling: z.enum(EMOTIONS.map((e) => e.id) as [string, ...string[]]),
        target: z.string().describe("Who or what the feeling is aimed at, named"),
        move: z.enum(MOVES.map((m) => m.id) as [string, ...string[]]),
        why: z.string().describe("Why this angle could produce something people share, in one line"),
      }),
    )
    .describe("Four distinct angles, strongest first"),
  avoid: z.array(z.string()).describe("Obvious ideas every brand will have here, to steer away from"),
});

const PlanCheckOut = z.object({ notes: z.string(), angles: PlanOut.shape.angles, avoid: z.array(z.string()) });

const SecondOpinionOut = z.object({
  verdicts: z.array(z.object({ index: z.number(), pass: z.boolean(), reason: z.string().describe("One line, blunt") })),
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
const HORIZON_BRIEF: Record<Horizon, string> = {
  reactive:
    "These are QUICK MOVES on something people feel strongly about right now and will forget in a day or two. Each must be an act Cashy can do within 24-48 hours, while the feeling is hot.",
  evergreen:
    "These are BIGGER MOVES: one act big enough that people are still talking about it next week, either aimed at a feeling that lasts (a villain people have hated for months, a long-running rivalry) or ready for a big moment people wait weeks for (GTA 6, the World Cup, a holiday). Still one act, still one sentence, still raw. Never a campaign or a series.",
};

const HORIZON_TEST: Record<Horizon, { id: string; name: string; question: string }> = {
  reactive: { id: "speed", name: "Speed test", question: "Can Cashy do it within 48 hours, while the feeling is still hot?" },
  evergreen: { id: "talked-about", name: "Next-week test", question: "Will drama channels, clip accounts and press still be talking about it a week later?" },
};

export async function generateIdeas(opts: {
  brandId: BrandId;
  trendId?: string;
  momentId?: string;
  lens?: string;
  steer?: string;
  /** Override: ask for quick reactions or big ideas from the same trend or moment */
  horizon?: Horizon;
  /** A special day from the marketing calendar */
  dayId?: string;
  /** Start from the team's own half-idea or a swiped post ("they did this, could we do something like it?") */
  spark?: { text: string; swipeId?: string };
}): Promise<IdeaRunResult> {
  const db = await repo.read();
  if (opts.spark) opts = { ...opts, lens: "spark" };
  const { text: sourceText, allowed, subject, trend, moment } = opts.spark
    ? sparkContext(db, opts.spark)
    : opts.lens
      ? labContext(db.moments, db.signals, opts.lens, opts.steer)
      : subjectContext(db.trends, opts.dayId ? [...db.moments, dayMoment(opts.dayId)] : db.moments, db.signals, opts.dayId ? { momentId: opts.dayId } : opts);

  const pulse = pulseContext(db.pulses);
  if ((trend?.sensitivity ?? moment?.sensitivity) === "blocked") {
    throw new Error(`Blocked by the red-line filter: ${trend?.sensitivityReason ?? moment?.sensitivityReason ?? "sensitive topic"}`);
  }

  // Breaking stories default to quick reactions, calendar moments to big ideas; either can be overridden.
  const horizon: Horizon =
    opts.horizon ?? (opts.lens ? (REACTIVE_LENSES.has(opts.lens) ? "reactive" : "evergreen") : moment?.kind === "calendar" ? "evergreen" : "reactive");
  const memory = await memoryForRun(opts.brandId, `inventing ideas for ${subject}`);
  const system = [
    memory,
    "You are the Inventor at Brian. You think like the person at Shuffle who had the idea of paying Jack Doherty to stop posting, the person at Duel who put the host in that costume, and the person at Stake who put the logo on every viral video. You don't make content and you don't run campaigns. You find ONE act Cashy can do in the real world that aims a feeling the audience already has (hate, outrage, wtf, schadenfreude, tribalism, disgust, love) at full strength, so they share it to say something about themselves. Start from the feeling, never from the brand: who do they hate right now, what would make them say 'they actually did that', where would a casino be absurd. Every idea is one sentence a 20-year-old would retell. Nobody cares about a casino's strengths, so Cashy's product is never the point. If it sounds like an ad agency, an AI, a TikTok series or a marketing plan, throw it away.",
    brandVoiceContext(opts.brandId),
    qualityBarContext(),
    swipeContext(db.swipes),
    `<horizon>\n${HORIZON_BRIEF[horizon]}\n</horizon>`,
    ACCURACY_RULES,
  ].join("\n\n");

  // Max quality (Marko's setup): a stronger model picks the angles first, the Inventor writes to them.
  let plan = "";
  if (qualityMax()) {
    const p = await callStructured({
      agent: "planner",
      subject,
      schema: PlanOut,
      system: [memory, "You are the Planner at Brian. Before anyone writes ideas, you decide where to look: the four most promising angles (a feeling, who it's aimed at, and the kind of act), and the obvious ideas to avoid. Think like the people behind Shuffle muting Jack Doherty and Stake's logo on every viral video: novel, never generic.", qualityBarContext()].join("\n\n"),
      prompt: `${pulse}\n${sourceText}\n\nPick the four angles and list the obvious ideas to avoid.`,
    });
    // Marko's setup: a second model (GPT-6 Astra) checks the plan before anyone writes.
    if (checkerReady()) {
      try {
        const c = await callChecker({
          subject: `plan check: ${subject}`,
          schema: PlanCheckOut,
          system: ["You check another model's plan for a crypto casino's marketing ideas. Be blunt. Kill generic angles, keep novel ones, and replace weak angles with better ones. The goal is one real act people share because of a feeling they already have (hate, outrage, wtf, schadenfreude, tribal, love). Nothing about the casino's product.", qualityBarContext()].join("\n\n"),
          prompt: `${pulse}\n${sourceText}\n\n<plan>\n${JSON.stringify(p)}\n</plan>\n\nCheck the plan. Return the improved four angles and the obvious ideas to avoid.`,
        });
        p.angles = c.angles.length ? c.angles : p.angles;
        p.avoid = [...new Set([...p.avoid, ...c.avoid])];
      } catch (e) {
        if (e instanceof SpendCapError) throw e; // otherwise carry on with the unchecked plan
      }
    }
    plan = `<plan note="Write the 10 acts across these angles, at least two per angle.">\n${p.angles.map((a, i) => `${i + 1}. ${a.feeling} aimed at ${a.target}, as ${a.move}: ${a.why}`).join("\n")}\nAvoid (too obvious): ${p.avoid.join("; ")}\n</plan>`;
  }

  const inv = await callStructured({
    agent: "inventor",
    subject,
    schema: InventorOut,
    system,
    prompt: opts.lens
      ? `${pulse}
${sourceText}
${plan}

Find 10 acts through this lens. Read the pulse first: aim at feelings people have right now, at the people and things they're actually reacting to. Each act is one sentence, real, raw and a first. Write the line people type when they share it. Nothing from the banned list: no posts, series, POVs, skits or campaigns. Cite evidence URLs where you use a fact; use null where you are reasoning.`
      : `${pulse}
${sourceText}
${plan}

Find 10 acts Cashy could do on this. First work out what people actually feel about it (hate, outrage, wtf, schadenfreude, tribal, love) and who or what that feeling is aimed at; then find the act that points it. Use at least 4 different kinds of move across the 10. Each act is one sentence, real, raw and a first. Write the line people type when they share it. Nothing from the banned list: no posts, series, POVs, skits or campaigns. Ground every factual statement in the evidence above and cite its URL; use null where you are reasoning rather than citing.`,
  });

  const candidates = inv.candidates.slice(0, 10);
  const critic = await callStructured({
    agent: "critic",
    subject,
    schema: CriticOut,
    system: [
      memory,
      "You are the audience panel at Brian. For every candidate you first react as each panel member, instantly and in their own voice, the way they'd react seeing it on their timeline: would they share it, and what would they feel? Only then do you judge. You are harsh: most ideas die here. Love-hate counts: if haters would share it to condemn it, that's distribution. Automatic kills: scripted content dressed up as an idea (POVs, acted skits, series, threads, memes; a real act filmed with real people reacting is fine), campaigns, polished agency stunts, anything about Cashy's product, anything with no strong feeling behind it, and anything that sounds like an ad or an AI wrote it.",
      `<panel>\n${AUDIENCE_PANEL.map((p) => `- [${p.id}] ${p.who}`).join("\n")}\n</panel>`,
      brandVoiceContext(opts.brandId),
      qualityBarContext(),
      `<horizon>\n${HORIZON_BRIEF[horizon]}\n</horizon>`,
      `For each candidate: give the panel's five reactions using ids ${AUDIENCE_PANEL.map((p) => p.id).join(", ")}. Then run all seven tests using these ids: ${[...QUALITY_BAR.tests, HORIZON_TEST[horizon]].map((t) => t.id).join(", ")}. The seventh is the ${HORIZON_TEST[horizon].name}: ${HORIZON_TEST[horizon].question} Fail any test and the idea dies, and so does any idea fewer than three panel members would share. Score from 1 to 10, each with a one-line reason: charge (how strong the feeling is), spread (how far it travels: who reposts it), simplicity (10 = one sentence, nothing to explain), realness (10 = Cashy could do it this week, raw), attribution (10 = impossible to retell without Cashy). Pass at most three.`,
    ].join("\n\n"),
    prompt: `${pulse}\n${sourceText}\n\n<candidates>\n${candidates.map((c, i) => `${i}. ${c.move}\nMove: ${c.archetype}. Feeling: ${c.emotion}, aimed at ${c.emotionTarget}\nShare line: "${c.shareLine}"\nHow it's done: ${c.howItWorks} (${c.cost})\nProof: ${c.proof}\nWhy it's Cashy's: ${c.cashyRole}\nWhy it's a first: ${c.firstness}\nEdge: ${c.edge}`).join("\n\n")}\n</candidates>`,
  });

  const now = new Date().toISOString();
  const ideas: Idea[] = candidates.map((c, i) => {
    const r = critic.reviews.find((x) => x.index === i);
    const passed = r?.verdict === "pass" && !r.bannedPatternHit && (r.panel ?? []).filter((x) => x.shares).length >= 3;
    return {
      id: newId("idea"),
      brandId: opts.brandId,
      trendId: trend?.id,
      momentId: moment?.id,
      origin: opts.lens ? "lab" : trend ? "trend" : "moment",
      lens: opts.lens,
      name: c.move,
      oneLiner: c.move,
      headline: c.headline,
      edge: c.edge,
      backlash: c.backlash,
      mechanism: c.howItWorks,
      borrowedAttention: c.emotionTarget,
      engine: 4,
      horizon,
      effort: c.cost,
      attentionMechanic: c.archetype,
      emotion: c.emotion,
      emotionTarget: c.emotionTarget,
      pulseRef: c.pulseRef ?? undefined,
      howItWorks: c.howItWorks,
      proof: c.proof,
      shareMoment: c.shareLine,
      whoAmplifies: c.firstness,
      cashyRole: c.cashyRole,
      // The panel's reactions when it gave them; the Inventor's guesses otherwise.
      reactions: r?.panel?.length
        ? r.panel.map((x) => ({ who: AUDIENCE_PANEL.find((p) => p.id === x.id)?.who.split(":")[0] ?? x.id, says: x.reaction, shares: x.shares }))
        : c.reactions.map((x) => ({ who: x.who, says: x.says, shares: true })),
      evidence: toClaims(c.evidence, allowed),
      scores: {
        charge: clampScore(r?.charge),
        spread: clampScore(r?.spread),
        simplicity: clampScore(r?.simplicity),
        realness: clampScore(r?.realness),
        attribution: clampScore(r?.attribution),
      },
      screening: {
        critic: {
          verdict: passed ? "pass" : "kill",
          tests: (r?.tests ?? []).map((t) => ({
            name: [...QUALITY_BAR.tests, HORIZON_TEST[horizon]].find((q) => q.id === t.id)?.name ?? t.id,
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
      createdBy: currentActor(),
      spark: opts.spark ? { text: opts.spark.text, swipeId: opts.spark.swipeId } : undefined,
      createdAt: now,
    };
  });

  // Max quality: GPT-6 Astra gives an independent verdict on what the panel passed. Both must agree.
  if (qualityMax() && checkerReady()) {
    const passed = ideas.map((i, n) => ({ i, n })).filter(({ i }) => i.status === "candidate");
    if (passed.length) {
      try {
        const second = await callChecker({
          subject: `second opinion: ${subject}`,
          schema: SecondOpinionOut,
          system: ["You are a second, independent judge of marketing ideas for a crypto casino. Would real people share this act because of how it makes them feel, and is it a genuine first? Pass only ideas you'd bet on. Be harsh.", qualityBarContext()].join("\n\n"),
          prompt: `${pulse}\n<ideas>\n${passed.map(({ i, n }) => `${n}. ${i.name}\nShared as: "${i.shareMoment}"\nHow: ${i.howItWorks}`).join("\n\n")}\n</ideas>\n\nGive a verdict for each, using its number as index.`,
        });
        for (const v of second.verdicts) {
          const idea = ideas[v.index];
          if (!idea || idea.status !== "candidate") continue;
          idea.screening.critic.tests.push({ name: "Second opinion (GPT-6 Astra)", pass: v.pass, note: v.reason });
          if (!v.pass) {
            idea.status = "killed";
            idea.screening.critic.verdict = "kill";
            idea.screening.critic.reasons.unshift(`Second opinion (GPT-6 Astra): ${v.reason}`);
          }
        }
      } catch (e) {
        if (e instanceof SpendCapError) throw e;
      }
    }
  }

  const survivors = ideas
    .filter((i) => i.status === "candidate")
    .sort((a, b) => totalScore(b) - totalScore(a))
    .slice(0, 3);

  // Save straight after the Critic: the paid work is done, and a later failure must never lose it.
  for (const i of ideas) i.sourceContext = sourceContextFor(i, db);
  const save = (log?: boolean) =>
    repo.update((d) => {
      const ids = new Set(ideas.map((i) => i.id));
      d.ideas = [...ideas, ...d.ideas.filter((i) => !ids.has(i.id))];
      if (log) {
        const kept = ideas.filter((i) => i.status === "card");
        logActivity(d, {
          type: "idea.generated",
          text: `got ${ideas.length} ideas from ${subject}; the panel kept ${kept.length}`,
          ref: kept[0] ? { kind: "idea", id: kept[0].id, label: kept[0].name } : undefined,
        });
      }
    });
  await save();

  // One at a time, so the spend cap reserves one check's worst case, not three.
  for (const idea of survivors) {
    try {
      // BRIAN_SKIP_PRIOR_ART=1 drops the web check to save credit on test runs; Red Lines always runs.
      const [red, prior] = await Promise.all([
        checkRedLines(idea, opts.brandId, sourceText),
        process.env.BRIAN_SKIP_PRIOR_ART ? Promise.resolve({ found: false, summary: "Web check skipped on this test run.", examples: [] }) : checkPriorArt(idea),
      ]);
      idea.screening.redLines = red;
      idea.screening.priorArt = prior;
      idea.status = red.pass ? "card" : "killed";
      if (!red.pass) idea.screening.critic.reasons.unshift(`Red line: ${red.issues.join("; ")}`);
    } catch (e) {
      // Shown as a card with Red Lines still to run; ensureRedLinesPass runs it before anything is developed.
      idea.status = "card";
      idea.screening.redLines = null;
      idea.screening.critic.reasons.push(`Red Lines hasn't checked this yet (${(e as Error).message}). It runs before the idea can be developed.`);
    }
  }
  for (const i of ideas) if (i.status === "candidate") {
    i.status = "killed";
    i.screening.critic.reasons.unshift("Passed the Critic but ranked below the top three.");
  }
  await save(true);
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
    prompt: `${sourceText}\n\n<idea>\n${idea.name}: ${idea.oneLiner}\n${idea.hook ? `Hook: ${idea.hook}\n` : ""}${idea.mechanism}\nEdge: ${idea.edge}\n</idea>\n\nDoes this breach a red line? List breaches as issues (fail) and everything else as consequences.`,
  });
}

async function checkPriorArt(idea: Idea): Promise<Idea["screening"]["priorArt"]> {
  try {
    const r = await research({
      agent: "priorArt",
      subject: idea.name,
      system: "You are Prior Art at Brian. You check whether a crypto casino (Stake, Shuffle, Rollbit, Roobet, BC.Game, Duel, Rainbet) or another big brand account has already posted the same joke or format. Common meme formats are fine to reuse; flag only the same joke. Be specific: account, date, link.",
      prompt: `Has a brand already posted this joke?\n\n${idea.name}: ${idea.oneLiner}\nThe content: ${idea.mechanism}\n\nSearch the web. Report what you find with links and dates, or say clearly that you found nothing close.`,
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
  if (lensId === "spark") lensId = "blank-page";
  const lens = lensById(lensId);
  if (!lens) throw new Error("Unknown lens");
  const pick = (xs: Signal[], n: number) => xs.slice(0, n);
  const culture = moments.filter((m) => m.kind === "breaking" && !m.industry && m.sensitivity !== "blocked");
  const calendar = moments.filter((m) => m.kind === "calendar");
  const coins = signals.filter((s) => s.sourceId === "trenches" && s.narrative?.kind === "culture");
  const builds = signals.filter((s) => s.sourceId === "builds");
  const posts = signals.filter((s) => s.sourceId.startsWith("ext:"));
  // X: the most engaged posts first (what people are actually saying), and what's trending right now.
  const xPosts = signals.filter((s) => s.sourceId === "x").sort((a, b) => (b.metric?.value ?? 0) - (a.metric?.value ?? 0));
  const xTrends = signals
    .filter((s) => s.sourceId === "xtrends" && /united-states|worldwide|united-kingdom/.test(s.id))
    .sort((a, b) => (b.series?.at(-1)?.value ?? 0) + (b.metric?.value ?? 0) * 2 - ((a.series?.at(-1)?.value ?? 0) + (a.metric?.value ?? 0) * 2));
  const rivals = signals.filter((s) => s.sourceId === "press" && /\b(stake|shuffle|rollbit|roobet|bc\.game|rainbet|duel)\b/i.test(`${s.title} ${s.summary ?? ""}`));

  const evidence: Signal[] = [
    ...(lensId === "wrong-place" || lensId === "everywhere" ? pick(builds, 12) : pick(builds, 4)),
    ...(lensId === "main-character" ? pick(coins, 8) : pick(coins, 3)),
    ...pick(signals.filter((s) => s.sourceId === "audience"), lensId === "blank-page" || lensId === "main-character" || lensId === "villain" ? 40 : 20),
    ...pick(xPosts, lensId === "main-character" || lensId === "villain" || lensId === "schadenfreude" || lensId === "blank-page" ? 40 : 25),
    ...pick(posts, 25),
    ...pick(rivals, lensId === "rival-raid" ? 15 : 3),
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
${culture.slice(0, lensId === "main-character" || lensId === "villain" || lensId === "schadenfreude" ? 25 : 12).map((m) => `- ${m.title} ${m.sourceUrl ?? ""}`).join("\n")}

Trending on X right now (hours in the top 50 of the last 24):
${[...new Map(xTrends.map((t) => [t.title.toLowerCase(), t])).values()].slice(0, 25).map((t) => `- ${t.title} (${t.metric?.value ?? 0}h)`).join("\n")}

Coming up:
${calendar.slice(0, 8).map((m) => `- ${m.date.slice(0, 10)} ${m.title} ${m.sourceUrl ?? ""}`).join("\n")}

${evidence.length ? `Evidence (cite these URLs only):\n${evidence.map((s) => `- [${s.author ?? s.sourceId}] ${s.title} ${s.url}${s.metric ? ` (${s.metric.value.toLocaleString("en-US")} ${s.metric.label.toLowerCase()})` : ""}${s.narrative ? ` (coin: ${s.narrative.reference})` : ""}${s.sourceId === "builds" && s.summary ? `\n  ${s.summary.slice(0, 200)}` : ""}`).join("\n")}` : ""}
</context>`;
  return { text, allowed, subject: `Lab: ${lens.name}`, trend: undefined, moment: undefined };
}

/** Context for a spark: the team's starting point, plus what's happening for awareness. */
function sparkContext(db: DB, spark: { text: string; swipeId?: string }) {
  const swipe = spark.swipeId ? db.swipes?.find((s) => s.id === spark.swipeId) : undefined;
  const base = labContext(db.moments, db.signals, "blank-page");
  const text = `<spark note="The team's own starting point. Develop it: push it further, find 10 versions Cashy could actually do, never copy the original.">
${spark.text.trim() ? `The team says: ${spark.text.trim()}` : "The team wants something in the spirit of this:"}
${swipe ? `Reference post:\n${swipeLine(swipe)}\n${swipe.url}` : ""}
</spark>
${base.text.replace(/<lens[^]*?<\/lens>\n/, "")}`;
  return {
    ...base,
    text,
    allowed: swipe ? [...base.allowed, { url: swipe.url, title: swipe.title, publisher: swipe.platform, retrievedAt: swipe.addedAt }] : base.allowed,
    subject: `Spark: ${(spark.text.trim() || swipe?.title || "").slice(0, 60)}`,
  };
}

function dayMoment(dayId: string): Moment {
  const day = specialDayById(dayId);
  if (!day) throw new Error("That day isn't in the calendar.");
  return { id: day.id, kind: "calendar", title: `${day.title} (${day.date})`, date: `${day.date}T00:00:00Z`, category: "culture", description: day.why, sensitivity: "clear", dateNote: day.check };
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
