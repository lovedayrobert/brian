import type * as z from "zod/v4";
import { callStructured, research, type AgentName } from "@/lib/adapters/model";
import { generateKeyVisual } from "@/lib/adapters/image";
import { BRANDS } from "@/lib/brand/brands";
import type { Citation, Idea, Input, Package, SectionKey, Signal, Trend } from "@/lib/domain/types";
import { computeAllScenarios, compareToBaseline, type FunnelKey } from "@/lib/engine/funnel";
import { newId, repo } from "@/lib/store";
import { learnFromBehaviour, memoryForRun } from "@/lib/memory";
import { ACCURACY_RULES, brandContext, qualityBarContext, trendEvidence } from "./context";
import * as S from "./package-schemas";

/**
 * Develop: turns an Idea Card into the full campaign package. Sections run in
 * dependency order, each saved as it finishes so the UI shows live progress.
 * Steering re-runs a section and everything downstream of it, so strategy,
 * creative, plan and budget stay consistent.
 */
export const SECTION_ORDER: SectionKey[] = [
  "executive",
  "insight",
  "strategy",
  "creative",
  "mockups",
  "channels",
  "business",
  "production",
  "measurement",
  "risk",
  "handover",
];

export const SECTION_META: Record<SectionKey, { title: string; agent: AgentName | null; deps: SectionKey[] }> = {
  insight: { title: "Insight and opportunity", agent: "strategist", deps: [] },
  strategy: { title: "Strategy", agent: "strategist", deps: ["insight"] },
  creative: { title: "Creative", agent: "creativeDirector", deps: ["strategy"] },
  mockups: { title: "Mockups", agent: null, deps: ["creative"] },
  channels: { title: "Channel and media plan", agent: "strategist", deps: ["strategy", "creative"] },
  business: { title: "Business case", agent: "strategist", deps: ["channels"] },
  production: { title: "Production plan", agent: "producer", deps: ["creative", "channels"] },
  measurement: { title: "Measurement plan", agent: "producer", deps: ["strategy", "channels"] },
  risk: { title: "Risk and compliance", agent: "redLines", deps: ["creative", "channels"] },
  executive: { title: "Executive summary", agent: "strategist", deps: ["insight", "strategy", "creative", "business", "risk"] },
  handover: { title: "Linear handover", agent: "producer", deps: ["production", "creative"] },
};

/** Run stages; sections within a stage run in parallel. */
const STAGES: SectionKey[][] = [
  ["insight"],
  ["strategy"],
  ["creative"],
  ["mockups", "channels"],
  ["business", "production", "measurement", "risk"],
  ["executive", "handover"],
];

export async function startPackage(ideaId: string): Promise<Package> {
  const db = await repo.read();
  const idea = db.ideas.find((i) => i.id === ideaId);
  if (!idea) throw new Error("Idea not found");
  const existing = db.packages.find((p) => p.ideaId === ideaId);
  if (existing) return existing;
  if (idea.status === "killed") {
    await learnFromBehaviour({ type: "overrule", ideaId, label: idea.name, criticReason: idea.screening.critic.reasons[0] });
  }
  const now = new Date().toISOString();
  const trend = db.trends.find((t) => t.id === idea.trendId);
  // First mover: launch fast while a trend is still rising.
  const lead = trend?.lifecycle.stage === "emerging" ? 7 : trend?.lifecycle.stage === "rising" ? 4 : 10;
  const pkg: Package = {
    id: newId("pkg"),
    ideaId,
    brandId: idea.brandId,
    status: "draft",
    version: 1,
    launchDate: new Date(Date.now() + lead * 86_400_000).toISOString().slice(0, 10),
    sections: Object.fromEntries(SECTION_ORDER.map((k) => [k, { key: k, status: "pending" }])) as Package["sections"],
    steering: [],
    createdAt: now,
    updatedAt: now,
  };
  await repo.update((d) => {
    d.packages.unshift(pkg);
    const i = d.ideas.find((x) => x.id === ideaId);
    if (i) i.status = "developing";
  });
  return pkg;
}

/** Runs all pending (or the given) sections. Fire-and-forget from the API; progress is persisted. */
export async function runPackage(packageId: string, only?: SectionKey[]): Promise<void> {
  for (const stage of STAGES) {
    const keys = stage.filter((k) => !only || only.includes(k));
    await Promise.all(keys.map((k) => runSection(packageId, k)));
  }
  await repo.update((d) => {
    const p = d.packages.find((x) => x.id === packageId);
    if (!p) return;
    const allDone = SECTION_ORDER.every((k) => p.sections[k].status === "done");
    const idea = d.ideas.find((i) => i.id === p.ideaId);
    if (idea && allDone) idea.status = "developed";
  });
}

/** Steering: apply an instruction to one section and regenerate it and everything downstream. */
export async function steerPackage(packageId: string, instruction: string, from: SectionKey): Promise<SectionKey[]> {
  const affected = downstream(from);
  await repo.update((d) => {
    const p = d.packages.find((x) => x.id === packageId);
    if (!p) throw new Error("Package not found");
    p.steering.push({ at: new Date().toISOString(), instruction: `[${SECTION_META[from].title}] ${instruction}` });
    p.version += 1;
    for (const k of affected) p.sections[k] = { ...p.sections[k], status: "pending" };
  });
  const db = await repo.read();
  const pkg = db.packages.find((p) => p.id === packageId);
  const idea = db.ideas.find((i) => i.id === pkg?.ideaId);
  await learnFromBehaviour({ type: "steer", packageId, label: idea?.name ?? "package", instruction });
  void runPackage(packageId, affected);
  return affected;
}

export function downstream(from: SectionKey): SectionKey[] {
  const out = new Set<SectionKey>([from]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const k of SECTION_ORDER) {
      if (!out.has(k) && SECTION_META[k].deps.some((d) => out.has(d))) {
        out.add(k);
        grew = true;
      }
    }
  }
  return SECTION_ORDER.filter((k) => out.has(k));
}

async function setSection(packageId: string, key: SectionKey, patch: Partial<Package["sections"][SectionKey]>) {
  await repo.update((d) => {
    const p = d.packages.find((x) => x.id === packageId);
    if (!p) return;
    p.sections[key] = { ...p.sections[key], ...patch, updatedAt: new Date().toISOString() };
    p.updatedAt = new Date().toISOString();
  });
}

async function runSection(packageId: string, key: SectionKey): Promise<void> {
  const db = await repo.read();
  const pkg = db.packages.find((p) => p.id === packageId);
  if (!pkg) return;
  if (pkg.sections[key].status === "done") return;
  const blocked = SECTION_META[key].deps.find((d) => pkg.sections[d].status !== "done");
  if (blocked) {
    await setSection(packageId, key, { status: "error", error: `Waiting on ${SECTION_META[blocked].title}, which did not finish.` });
    return;
  }
  await setSection(packageId, key, { status: "running", error: undefined });
  try {
    const memory = await memoryForRun(pkg.brandId, `writing the ${SECTION_META[key].title.toLowerCase()} section`);
    const ctx = buildContext(pkg, db.ideas, db.trends, db.signals, memory);
    const content = sanitizeUrls(await GENERATORS[key](ctx, pkg), ctx.allowed);
    await setSection(packageId, key, { status: "done", content, model: SECTION_META[key].agent ?? "code" });
  } catch (e) {
    await setSection(packageId, key, { status: "error", error: (e as Error).message });
  }
}

interface Ctx {
  idea: Idea;
  trend?: Trend;
  evidenceText: string;
  allowed: Citation[];
  launchDate: string;
  system: (role: string) => string;
  deps: (keys: SectionKey[]) => string;
  steering: string;
}

function buildContext(pkg: Package, ideas: Idea[], trends: Trend[], signals: Signal[], memory = ""): Ctx {
  const idea = ideas.find((i) => i.id === pkg.ideaId);
  if (!idea) throw new Error("Idea missing");
  const trend = trends.find((t) => t.id === idea.trendId);
  const ev = trend ? trendEvidence(trend, signals) : { text: "", allowed: [] as Citation[] };
  // Sources already validated into earlier sections may be cited again downstream.
  for (const k of SECTION_ORDER) collectUrls(pkg.sections[k].content, ev.allowed);
  const launchDate = pkg.launchDate;
  const ideaText = `<idea>\nName: ${idea.name}\nOne-liner: ${idea.oneLiner}\nMechanism: ${idea.mechanism}\nBorrowed attention: ${idea.borrowedAttention}\nPress headline: ${idea.headline}\nEdge: ${idea.edge}. Likely backlash: ${idea.backlash}\n</idea>`;
  return {
    idea,
    trend,
    evidenceText: `${ideaText}\n\n${ev.text}\n\nTarget launch date: ${launchDate} (today is ${new Date().toISOString().slice(0, 10)}).`,
    allowed: ev.allowed,
    launchDate,
    system: (role) =>
      [
        memory,
        `You are the ${role} at Brian, Cashy's marketing brain. Your output goes straight to the co-founder and the design team without editing, so it must be finished, specific and agency-grade. No filler, no generic marketing language.`,
        brandContext(pkg.brandId),
        qualityBarContext(),
        ACCURACY_RULES,
      ].join("\n\n"),
    deps: (keys) =>
      keys
        .filter((k) => pkg.sections[k]?.content)
        .map((k) => `<section name="${k}">\n${JSON.stringify(pkg.sections[k].content)}\n</section>`)
        .join("\n"),
    steering: pkg.steering.length
      ? `\n\n<steering>\nApply these instructions from the campaign owner. They override earlier choices:\n${pkg.steering.map((s) => `- ${s.instruction}`).join("\n")}\n</steering>`
      : "",
  };
}

async function gen<T extends z.ZodType>(ctx: Ctx, agent: AgentName, role: string, schema: T, task: string, deps: SectionKey[]) {
  return callStructured({
    agent,
    schema,
    subject: ctx.idea.name,
    system: ctx.system(role),
    prompt: `${ctx.evidenceText}\n\n${ctx.deps(deps)}${ctx.steering}\n\n<task>\n${task}\n</task>`,
  });
}

const GENERATORS: Record<SectionKey, (ctx: Ctx, pkg: Package) => Promise<unknown>> = {
  async insight(ctx) {
    const r = await research({
      agent: "priorArt",
      subject: ctx.idea.name,
      system: "You research the competitive landscape for a crypto casino campaign. Report what competitors (Stake, Shuffle, Rollbit, Roobet, BC.Game, Rainbet, Duel and others) have done near this idea or trend, with links and dates.",
      prompt: `${ctx.evidenceText}\n\nWhat have competitors and other brands done in this space recently? Who is driving this trend?`,
      maxSearches: 5,
    });
    ctx.allowed.push(...r.sources);
    return gen(
      ctx,
      "strategist",
      "Strategist",
      S.InsightSchema,
      `Write the insight and opportunity section. Use the research below for competitors; cite only URLs that appear in the evidence or research sources.\n\n<research>\n${r.notes}\n\nSources:\n${r.sources.map((s) => `- ${s.title} ${s.url}`).join("\n")}\n</research>`,
      [],
    );
  },
  strategy: (ctx) =>
    gen(ctx, "strategist", "Strategist", S.StrategySchema,
      "Write the strategy: objective, the one metric that matters, KPIs with targets and kill thresholds, audience segments (grounded in the evidence, never invented personas; if evidence is thin, say so), positioning, core idea and message house.",
      ["insight"]),
  creative: (ctx) =>
    gen(ctx, "creativeDirector", "Creative Director", S.CreativeSchema,
      `Write the creative: concept, rationale, key visual system, full copy deck for X, Instagram (feed caption, 5-slide carousel, 3-frame story), TikTok (hook, 20-40s script, caption), Telegram, Discord and the landing page, plus A/B variants and a video script with a 6-frame storyboard. Include the interactive mechanic only if the idea has one; otherwise null. Every player-facing piece carries 18+ and a responsible gambling line where the format allows. Write in the brand voice. Never use banned phrases.`,
      ["strategy", "insight"]),
  async mockups(ctx) {
    // Code-built mockups render from the creative section. The image model only
    // fills the key visual slot, and only when an image key is configured.
    const image = await generateKeyVisual(ctx.idea.keyVisualPrompt, ctx.idea.id);
    return { keyVisualUrl: image?.url ?? null, keyVisualModel: image?.model ?? null };
  },
  channels: (ctx) =>
    gen(ctx, "strategist", "Strategist", S.ChannelsSchema,
      `Write the channel and media plan. Days are relative to launch (${ctx.launchDate}). Be realistic: Meta, Google and TikTok paid ads generally refuse offshore-licensed crypto casinos, and X restricts gambling ads by market. Mark such channels available=false and give the budget to channels we can actually use (owned, earned, creators, crypto-native and partner placements). Creator shortlists need live X/TikTok/Kick data that is not connected yet, so give selection criteria rather than invented names.`,
      ["strategy", "creative"]),
  async business(ctx, pkg) {
    const out = await gen(ctx, "strategist", "Strategist", S.BusinessSchema,
      `Propose the funnel inputs for the business case as ranges (low, expected, high). Cashy has supplied no measured performance data yet, so use provenance "benchmark" only with a real source URL from the evidence, otherwise "assumption" with your reasoning in origin. Keep ranges honest and wide where uncertain. Do not calculate the funnel; code does that.`,
      ["channels", "strategy"]);
    const inputs = Object.fromEntries(
      (Object.keys(out.inputs) as FunnelKey[]).map((k) => {
        const v = out.inputs[k];
        const sorted = [v.low, v.expected, v.high].sort((a, b) => a - b);
        const isRatio = k !== "budget" && k !== "reach";
        const [low, expected, high] = isRatio ? sorted.map((x) => Math.min(1, Math.max(0, x))) : sorted.map((x) => Math.max(0, x));
        const cite = v.url ? ctx.allowed.find((a) => a.url === v.url) : undefined;
        const input: Input = {
          key: k,
          label: FUNNEL_LABELS[k],
          unit: k === "budget" ? "usd" : k === "reach" ? "count" : "ratio",
          low, expected, high,
          provenance: v.provenance === "benchmark" && !cite ? "assumption" : v.provenance === "measured" ? "assumption" : v.provenance,
          origin: v.provenance === "measured" ? `${v.origin} (relabelled: no measured data has been supplied yet)` : v.origin,
          citation: cite,
        };
        return [k, input];
      }),
    ) as Record<FunnelKey, Input>;
    const scenarios = computeAllScenarios(inputs);
    const baseline = BRANDS[pkg.brandId].baselineCostPerFtd.value;
    return {
      inputs,
      paidReachShare: Math.min(1, Math.max(0, out.paidReachShare)),
      rationale: out.rationale,
      scenarios,
      baselineCostPerFtd: baseline,
      vsBaseline: baseline ? compareToBaseline(scenarios[1].costPerFtd, baseline) : null,
    };
  },
  production: (ctx) =>
    gen(ctx, "producer", "Producer", S.ProductionSchema,
      `Write the production plan working back from launch day (day 0 = ${ctx.launchDate}). List every deliverable in the creative section with exact specs, owner role, due day and dependencies. Include approval gates (brand review, compliance and legal, final sign-off) and a launch-day runbook with what to do if something breaks.`,
      ["creative", "channels"]),
  measurement: (ctx) =>
    gen(ctx, "producer", "Producer", S.MeasurementSchema,
      "Write the measurement plan: tracking per channel (UTM pattern, unique links, promo codes, pixels where allowed) with concrete examples, dashboard metrics, checkpoints with success and kill thresholds, and what we learn even if it underperforms.",
      ["strategy", "channels"]),
  risk: (ctx) =>
    gen(ctx, "redLines", "Risk and Compliance lead", S.RiskSchema,
      "Write risk and compliance: responsible gambling measures built into the mechanic and copy, regulatory points to check by market (flag that legal must confirm), platform policy per channel, reputational risks with prepared responses, a community FAQ and moderation guidance. Protect against real legal and safety lines; do not tame the idea.",
      ["creative", "channels"]),
  async executive(ctx, pkg) {
    const fresh = (await repo.read()).packages.find((p) => p.id === pkg.id) ?? pkg;
    const biz = fresh.sections.business.content as { scenarios?: unknown } | undefined;
    return gen(ctx, "strategist", "Strategist", S.ExecutiveSchema,
      `Write a one-screen executive summary for Marko (co-founder): the idea, why now, why Cashy, what it will take, what it should return, the main risk and the decision needed. For the return, quote only these computed scenarios and say they rest on assumptions until Cashy's own data is connected: ${JSON.stringify(biz?.scenarios ?? null)}`,
      ["insight", "strategy", "creative", "risk"]);
  },
  handover: (ctx) =>
    gen(ctx, "producer", "Producer", S.HandoverSchema,
      `Structure the Linear project: one epic per workstream, every issue fully briefed (objective, spec, copy where relevant, acceptance criteria, owner role, due day relative to launch, dependencies by issue title). Naming convention, exactly:\n- Design issues: "Cashy | Social | [Format] | [Description]"\n- Content issues: "Cashy | [Description] | [Channel] [Type]"`,
      ["production", "creative"]),
};

const FUNNEL_LABELS: Record<FunnelKey, string> = {
  budget: "Total budget",
  reach: "People reached",
  engagementRate: "Engagement rate",
  clickThroughRate: "Visit rate",
  signupRate: "Sign-up rate",
  ftdRate: "FTD rate",
};

/** Fact check: every claim in the package either traces to evidence we hold or is flagged. */
export function factCheck(pkg: Package): { total: number; unresolved: { section: SectionKey; text: string }[] } {
  const unresolved: { section: SectionKey; text: string }[] = [];
  let total = 0;
  const walk = (section: SectionKey, v: unknown) => {
    if (Array.isArray(v)) return v.forEach((x) => walk(section, x));
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if ("url" in o && ("text" in o || "what" in o)) {
        total++;
        if (!o.url) unresolved.push({ section, text: String(o.text ?? o.what) });
      }
      Object.values(o).forEach((x) => walk(section, x));
    }
  };
  for (const k of SECTION_ORDER) walk(k, pkg.sections[k].content);
  return { total, unresolved };
}

/** Any URL the model wrote that is not in our evidence becomes null, so it shows as unresolved. */
function sanitizeUrls<T>(v: T, allowed: Citation[]): T {
  const ok = new Set(allowed.map((a) => norm(a.url)));
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(x)) {
        o[k] = k === "url" && typeof val === "string" && !ok.has(norm(val)) ? null : walk(val);
      }
      return o;
    }
    return x;
  };
  return walk(v) as T;
}

function collectUrls(v: unknown, into: Citation[]) {
  if (Array.isArray(v)) return v.forEach((x) => collectUrls(x, into));
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.url === "string" && !into.some((c) => norm(c.url) === norm(o.url as string))) {
      into.push({ url: o.url, title: String(o.text ?? o.what ?? o.brand ?? o.url), retrievedAt: new Date().toISOString() });
    }
    Object.values(o).forEach((x) => collectUrls(x, into));
  }
}

const norm = (u: string) => u.replace(/[#?].*$/, "").replace(/\/$/, "");
