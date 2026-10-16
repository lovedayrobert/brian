import * as z from "zod/v4";
import { callStructured, research } from "@/lib/adapters/model";
import type { BrandId, Claim, Citation, Idea, Moment, Signal, Trend } from "@/lib/domain/types";
import { CONTENT_FORMATS, QUALITY_BAR } from "@/lib/brand/quality-bar";
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
      name: z.string().describe("What it is, plainly, like a line in a content calendar: 'TikTok POV: the slot after you say last spin'. No pun names, no campaign titles."),
      format: z.enum(CONTENT_FORMATS.map((m) => m.id) as [string, ...string[]]),
      platform: z.string().describe("Where it goes first: TikTok, Reels, X, Kick clips, a link people share"),
      hook: z.string().describe("The exact first line on screen, or what happens in the first second"),
      script: z.string().describe("The content itself, written out: the post text, the slides one per line, the video beats with on-screen text, or what the build does when you open it. Ready to make."),
      oneLiner: z.string().describe("What it is in one plain sentence"),
      whyViews: z.string().describe("Why it gets views with zero ad spend: the relatable truth, the trending sound or format it rides, the reply bait"),
      shareMoment: z.string().describe("Why someone sends it to the group chat or tags a friend"),
      borrowedAttention: z.string().describe("The meme, format, sound, moment or in-joke it rides, if any"),
      whoAmplifies: z.string().describe("Who reposts it unpaid: which meme pages, clip accounts, creators or communities"),
      cashyRole: z.string().describe("How Cashy's name travels with it: the posting account, a watermark, a small part of the bit. Never a sales message."),
      series: z.string().nullable().describe("How it repeats as a recurring bit, or null if it's a one-off"),
      makeIt: z.string().describe("Who makes it, with what, and how long: '1 person, phone + CapCut, 2 hours'"),
      shelfLife: z.string().describe("How long it keeps working (e.g. '24 hours', 'weeks as a series')"),
      edge: EdgeEnum,
      backlash: z.string().describe("Who could be annoyed, and how it plays out. 'Nobody much' is a fine answer."),
      keyVisualPrompt: z.string().describe("What the first frame or the image looks like, lo-fi and native to the platform. No real people's faces."),
      evidence: z.array(ClaimOut),
    }),
  ),
});

const CriticOut = z.object({
  reviews: z.array(
    z.object({
      index: z.number().describe("0-based index of the candidate"),
      tests: z.array(z.object({ id: z.string(), pass: z.boolean(), note: z.string() })),
      bannedPatternHit: z.string().nullable().describe("The banned or cringe-list item it hits, or null"),
      verdict: z.enum(["pass", "kill"]),
      reasons: z.array(z.string()),
      views: z.object({ value: z.number(), reason: z.string() }),
      shareability: z.object({ value: z.number(), reason: z.string() }),
      native: z.object({ value: z.number(), reason: z.string() }),
      makeable: z.object({ value: z.number(), reason: z.string() }),
      attribution: z.object({ value: z.number(), reason: z.string() }),
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
const HORIZON_BRIEF: Record<Horizon, string> = {
  reactive:
    "These are QUICK REACTIONS to something that will be over in 24-48 hours: a post, a meme, a reply, a slideshow or a quick edit that Cashy's social team can have live today. Small and sharp. The joke everyone's thinking, said first and said well.",
  evergreen:
    "These are BIGGER PLAYS, but still simple content: a recurring bit or series that can run for weeks, a tiny build people keep sharing, or a set of posts prepared for a big moment people wait weeks for (GTA 6, the World Cup, a holiday) and posted on the day. Never a campaign, a stunt or a deal. Nothing a crypto casino (Stake, Shuffle, Rollbit, Roobet, BC.Game, Duel, Rainbet) has already done.",
};

const HORIZON_TEST: Record<Horizon, { id: string; name: string; question: string }> = {
  reactive: { id: "speed", name: "Speed test", question: "Can it be live today, while the moment is still hot?" },
  evergreen: { id: "legs", name: "Legs test", question: "Does it keep working: can it run as a series for weeks, keep getting shared as a build, or land on the day of a big moment? And has no crypto casino already done it?" },
};

export async function generateIdeas(opts: {
  brandId: BrandId;
  trendId?: string;
  momentId?: string;
  lens?: string;
  steer?: string;
  /** Override: ask for quick reactions or big ideas from the same trend or moment */
  horizon?: Horizon;
}): Promise<IdeaRunResult> {
  const db = await repo.read();
  const { text: sourceText, allowed, subject, trend, moment } = opts.lens
    ? labContext(db.moments, db.signals, opts.lens, opts.steer)
    : subjectContext(db.trends, db.moments, db.signals, opts);

  if ((trend?.sensitivity ?? moment?.sensitivity) === "blocked") {
    throw new Error(`Blocked by the red-line filter: ${trend?.sensitivityReason ?? moment?.sensitivityReason ?? "sensitive topic"}`);
  }

  // Breaking stories default to quick reactions, calendar moments to big ideas; either can be overridden.
  const horizon: Horizon =
    opts.horizon ?? (opts.lens ? (REACTIVE_LENSES.has(opts.lens) ? "reactive" : "evergreen") : moment?.kind === "calendar" ? "evergreen" : "reactive");
  const memory = await memoryForRun(opts.brandId, `inventing ideas for ${subject}`);
  const system = [
    memory,
    "You are the Inventor at Brian, Cashy's content brain. You write for a social team of two who post on TikTok, X, Reels and Kick clip accounts. Your job is content that gets views and gets sent to group chats: posts, videos, slideshows, memes, replies, recurring bits and tiny vibe-coded builds that one or two people can make this week. You are not an ad agency and you don't do campaigns, stunts, events, deals or launches. Write like the funniest person on crypto Twitter and gambling TikTok: deadpan, relatable, self-aware, a bit unhinged in the way real people are, never in the way brands try to be. Nobody cares about a casino's strengths, so never make anything about Cashy's product, payouts, terms, fairness or the Justice Fund. Cashy is the account posting the joke, never its subject. Before you write each idea, ask: would a 21-year-old who's online all day post this, or send it to a friend? If it sounds like an ad, an agency or an AI wrote it, throw it away.",
    brandVoiceContext(opts.brandId),
    qualityBarContext(),
    `<horizon>\n${HORIZON_BRIEF[horizon]}\n</horizon>`,
    ACCURACY_RULES,
  ].join("\n\n");

  const inv = await callStructured({
    agent: "inventor",
    subject,
    schema: InventorOut,
    system,
    prompt: opts.lens
      ? `${sourceText}

Write 10 pieces of content through this lens. Each one is a real thing to post or build: give the exact hook and write the script or post out in full. Simple beats clever: one joke per idea. Use at least 4 different formats across the 10 unless the lens names one. Nothing from the banned or cringe lists, and no pun names. Cite evidence URLs where you use a fact; use null where you are reasoning.`
      : `${sourceText}

Write 10 pieces of content that ride this. Each one is a real thing to post or build: give the exact hook and write the script or post out in full. Simple beats clever: one joke per idea, and the joke people are already making, said better, beats a concept. Use at least 4 different formats across the 10. Nothing from the banned or cringe lists, and no pun names. Ground every factual statement in the evidence above and cite its URL; use null where you are reasoning rather than citing.`,
  });

  const candidates = inv.candidates.slice(0, 10);
  const critic = await callStructured({
    agent: "critic",
    subject,
    schema: CriticOut,
    system: [
      memory,
      "You are the Critic at Brian. You are 22, you run a meme page and a clip account, and you have watched every brand try too hard. You judge one thing: would this actually get views and get sent around, or would people scroll past it or screenshot it to laugh at the brand? You are harsh and most ideas die with you. Automatic kills: anything about Cashy's product or strengths; any stunt, event, deal, sponsorship, purchase, product launch or merch drop; anything that needs more than a week or a couple of thousand dollars; anything on the cringe list; pun names; and anything that reads like an ad agency or an AI wrote it.",
      brandVoiceContext(opts.brandId),
      qualityBarContext(),
      `<horizon>\n${HORIZON_BRIEF[horizon]}\n</horizon>`,
      `Run all six tests for every candidate using these ids: ${[...QUALITY_BAR.tests, HORIZON_TEST[horizon]].map((t) => t.id).join(", ")}. The sixth is the ${HORIZON_TEST[horizon].name}: ${HORIZON_TEST[horizon].question} Fail any test and the idea dies. Score from 1 to 10, each with a one-line reason: views (would it get views with zero ad spend?), shareability (would people send it to the group chat?), native (does it look like a real person made it? 1 = obvious ad or AI), makeable (10 = one person, today), attribution (will Cashy's name travel with it?). Pass at most three.`,
    ].join("\n\n"),
    prompt: `${sourceText}\n\n<candidates>\n${candidates.map((c, i) => `${i}. ${c.name} [${c.format}, ${c.platform}]\nHook: ${c.hook}\nThe content:\n${c.script}\nWhy views: ${c.whyViews}\nWhy it gets sent: ${c.shareMoment}\nCashy's name: ${c.cashyRole}\nMake it: ${c.makeIt}\nSeries: ${c.series ?? "one-off"}\nEdge: ${c.edge}`).join("\n\n")}\n</candidates>`,
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
      headline: c.hook,
      edge: c.edge,
      backlash: c.backlash,
      mechanism: c.script,
      borrowedAttention: c.borrowedAttention,
      engine: 3,
      horizon,
      effort: c.makeIt,
      shelfLife: c.shelfLife,
      attentionMechanic: c.format,
      platform: c.platform,
      hook: c.hook,
      script: c.script,
      whyViews: c.whyViews,
      series: c.series ?? undefined,
      shareMoment: c.shareMoment,
      whoAmplifies: c.whoAmplifies,
      cashyRole: c.cashyRole,
      evidence: toClaims(c.evidence, allowed),
      scores: {
        views: clampScore(r?.views),
        shareability: clampScore(r?.shareability),
        native: clampScore(r?.native),
        makeable: clampScore(r?.makeable),
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
  const lens = lensById(lensId);
  if (!lens) throw new Error("Unknown lens");
  const pick = (xs: Signal[], n: number) => xs.slice(0, n);
  const culture = moments.filter((m) => m.kind === "breaking" && !m.industry && m.sensitivity !== "blocked");
  const calendar = moments.filter((m) => m.kind === "calendar");
  const coins = signals.filter((s) => s.sourceId === "trenches" && s.narrative?.kind === "culture");
  const builds = signals.filter((s) => s.sourceId === "builds");
  const posts = signals.filter((s) => s.sourceId.startsWith("ext:"));

  const evidence: Signal[] = [
    ...(lensId === "tiny-builds" ? pick(builds, 20) : pick(builds, 4)),
    ...(lensId === "hijack-now" ? pick(coins, 8) : pick(coins, 3)),
    ...pick(posts, lensId === "hijack-now" || lensId === "shitposts" ? 20 : 8),
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
${culture.slice(0, lensId === "hijack-now" || lensId === "clips" || lensId === "shitposts" ? 25 : 12).map((m) => `- ${m.title} ${m.sourceUrl ?? ""}`).join("\n")}

Coming up:
${calendar.slice(0, 8).map((m) => `- ${m.date.slice(0, 10)} ${m.title} ${m.sourceUrl ?? ""}`).join("\n")}

${evidence.length ? `Evidence (cite these URLs only):\n${evidence.map((s) => `- [${s.author ?? s.sourceId}] ${s.title} ${s.url}${s.metric ? ` (${s.metric.value.toLocaleString("en-US")} ${s.metric.label.toLowerCase()})` : ""}${s.narrative ? ` (coin: ${s.narrative.reference})` : ""}${s.sourceId === "builds" && s.summary ? `\n  ${s.summary.slice(0, 200)}` : ""}`).join("\n")}` : ""}
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
