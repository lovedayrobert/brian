import { AsyncLocalStorage } from "node:async_hooks";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import { currentActor } from "@/lib/actor";
import type { AgentRun, Citation } from "@/lib/domain/types";
import { newId, repo } from "@/lib/store";
import { capsFromEnv, checkBudget, FALLBACK_WORST, PRICES, spendFromRuns, WEB_SEARCH_USD, worstCaseCost } from "@/lib/engine/spend";

/**
 * Model adapter. Every agent call goes through here, so models are assigned
 * by config (brief §8), every call is logged with cost and latency, and a
 * second provider can be added behind the same function later.
 */
export type AgentName =
  | "cartographer"
  | "pulse"
  | "planner"
  | "checker"
  | "astra"
  | "analyst"
  | "inventor"
  | "critic"
  | "priorArt"
  | "redLines"
  | "factChecker"
  | "strategist"
  | "creativeDirector"
  | "producer"
  | "rapidResponse"
  | "artDirector"
  | "teacher";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export const AGENTS: Record<AgentName, { model: string; effort: Effort; label: string; job: string }> = {
  cartographer: { model: "claude-haiku-5-5", effort: "low", label: "Cartographer", job: "Scores relevance and clusters signals" },
  astra: { model: "gpt-6-astra", effort: "high", label: "Inventor (GPT-6 Astra)", job: "Max quality: a second inventor from a different model family" },
  checker: { model: "gpt-6-astra", effort: "high", label: "Checker (GPT-6 Astra)", job: "Max quality only: a second model checks the plan and the panel's picks" },
  planner: { model: "claude-opus-5-5", effort: "high", label: "Planner", job: "Max quality only: picks the angles before the Inventor writes" },
  pulse: { model: "claude-sonnet-5-5", effort: "medium", label: "Pulse", job: "Reads what the audience is consuming and the emotion driving it" },
  analyst: { model: "claude-sonnet-5-5", effort: "medium", label: "Analyst", job: "Why a trend is spreading and who drives it" },
  inventor: { model: "claude-opus-5-5", effort: "high", label: "Inventor", job: "Writes ideas from what people feel right now, sized to the moment: mostly posts and replies" },
  critic: { model: "claude-opus-5-5", effort: "high", label: "Audience panel", job: "Five real-audience reactions; kills anything nobody would share" },
  priorArt: { model: "claude-sonnet-5-5", effort: "medium", label: "Prior Art", job: "Has anyone done it? Searches the web" },
  redLines: { model: "claude-sonnet-5-5", effort: "medium", label: "Red Lines", job: "Legal, minors, real people, RG, data use" },
  factChecker: { model: "claude-sonnet-5-5", effort: "medium", label: "Fact Checker", job: "Traces every claim to a source" },
  strategist: { model: "claude-opus-5-5", effort: "high", label: "Strategist", job: "Strategy, channel plan, business case" },
  creativeDirector: { model: "claude-opus-5-5", effort: "high", label: "Creative Director", job: "Concept, copy, key visual system" },
  producer: { model: "claude-sonnet-5-5", effort: "medium", label: "Producer", job: "Production plan, runbook, Linear project" },
  rapidResponse: { model: "claude-opus-5-5", effort: "medium", label: "Rapid Response", job: "Three reactive takes within minutes" },
  teacher: { model: "claude-opus-5-5", effort: "medium", label: "Teacher", job: "Explains why a campaign the team linked worked, learns from their feedback, and builds Cashy's identity" },
  artDirector: { model: "claude-opus-5-5", effort: "medium", label: "Art Director", job: "Picks a native format for every asset; commissions images and video" },
};

/**
 * Quality tier (Marko's setup). BRIAN_QUALITY=max: Fable 5.1 plans the angles
 * and runs the audience panel, Opus 5.5 writes. About twice the cost per run,
 * so the default stays on Opus and Sonnet. BRIAN_MODEL_<AGENT> (e.g.
 * BRIAN_MODEL_CRITIC=claude-fable-5-1) overrides a single agent either way.
 */
// Max quality: Fable writes ideas (alongside GPT-6 Astra); Opus stays the audience panel.
const MAX_TIER: Partial<Record<AgentName, string>> = { planner: "claude-fable-5-1", inventor: "claude-fable-5-1" };

const standard = new AsyncLocalStorage<boolean>();

/** Runs fn on the standard models (Opus alone), whatever BRIAN_QUALITY says. Automatic runs use it to stay cheap. */
export function withStandardQuality<T>(fn: () => T): T {
  return standard.run(true, fn);
}

export function qualityMax(): boolean {
  return process.env.BRIAN_QUALITY === "max" && !standard.getStore();
}

/** GPT-6 Astra writing ideas alongside Fable. Off since 21 Oct (BRIAN_ASTRA=1 turns it back on): its ideas were the weakest and it doubled the cost. */
export function astraOn(): boolean {
  return qualityMax() && checkerReady() && process.env.BRIAN_ASTRA === "1";
}

export function agentConfig(agent: AgentName) {
  const base = AGENTS[agent];
  const override = process.env[`BRIAN_MODEL_${agent.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`];
  return { ...base, model: override || (qualityMax() && MAX_TIER[agent]) || base.model };
}

export class SpendCapError extends Error {}

/**
 * Hard spend cap. Every call reserves its worst-case cost first and is refused
 * if spent + in-flight + this call would pass the daily or monthly cap
 * (BRIAN_DAILY_CAP_USD, BRIAN_MONTHLY_CAP_USD). See src/lib/engine/spend.ts.
 */
const reservations = new Map<string, number>();

async function reserve(id: string, estimate: number): Promise<void> {
  const db = await repo.read();
  const caps = capsFromEnv();
  const spent = spendFromRuns(Object.entries(db.spendLedger ?? {}).map(([day, costUsd]) => ({ startedAt: day, costUsd })), new Date(), caps.budgetSince);
  const reserved = [...reservations.values()].reduce((a, b) => a + b, 0);
  // No await between the check and the reservation, so concurrent calls can't both slip under the cap.
  const decision = checkBudget({ ...spent, reserved }, estimate, caps);
  if (!decision.ok) throw new SpendCapError(decision.reason);
  reservations.set(id, estimate);
}

/**
 * Before a multi-step run (an idea run is five or more calls), check the whole
 * run fits under the caps, so money is never spent on a run that the cap would
 * stop halfway. Uses the same worst case as each call's own reservation.
 */
export async function preflight(steps: { agent: AgentName; inputChars: number; maxTokens?: number }[], what: string): Promise<void> {
  const db = await repo.read();
  const caps = capsFromEnv();
  const spent = spendFromRuns(Object.entries(db.spendLedger ?? {}).map(([day, costUsd]) => ({ startedAt: day, costUsd })), new Date(), caps.budgetSince);
  const reserved = [...reservations.values()].reduce((a, b) => a + b, 0);
  const estimate = steps.reduce((sum, st) => {
    const model = st.agent === "checker" ? "claude-fable-5-1" : agentConfig(st.agent).model; // checker priced like Fable ($10/$50)
    return sum + worstCaseCost({ model, inputChars: st.inputChars + 4000, maxOutputTokens: st.maxTokens ?? 32000, fallback: supportsFallback(model) });
  }, 0);
  const decision = checkBudget({ ...spent, reserved }, estimate, caps);
  if (!decision.ok) throw new SpendCapError(`Not starting ${what}: it could cost up to $${estimate.toFixed(2)} and that would pass a cap. ${decision.reason}`);
}

export async function spendStatus() {
  const db = await repo.read();
  const caps = capsFromEnv();
  const spent = spendFromRuns(Object.entries(db.spendLedger ?? {}).map(([day, costUsd]) => ({ startedAt: day, costUsd })), new Date(), caps.budgetSince);
  return { ...spent, caps };
}

export class ModelUnavailableError extends Error {
  constructor() {
    super("No ANTHROPIC_API_KEY configured. Add it to .env.local to run the AI pipeline.");
  }
}

export function modelReady(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!modelReady()) throw new ModelUnavailableError();
  return (client ??= new Anthropic());
}

// Claude Haiku 5.5 has no server-side refusal fallback; the others route a
// declined request to Anthropic's recommended fallback model automatically.
// Fable is left out until its fallback support is confirmed: an unsupported beta would fail the call.
const supportsFallback = (model: string) => !model.includes("haiku") && !model.includes("fable");

export async function callStructured<S extends z.ZodType>(opts: {
  agent: AgentName;
  system: string;
  prompt: string;
  schema: S;
  subject?: string;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const cfg = agentConfig(opts.agent);
  const started = Date.now();
  const run: AgentRun = {
    id: newId("run"),
    agent: opts.agent,
    model: cfg.model,
    startedAt: new Date(started).toISOString(),
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    ok: false,
    subject: opts.subject,
  };
  // Streamed so long outputs (thinking counts towards max_tokens) don't hit HTTP timeouts.
  const maxTokens = opts.maxTokens ?? 32000;
  try {
    getClient();
    const estimate = worstCaseCost({ model: cfg.model, inputChars: opts.system.length + opts.prompt.length + 4000, maxOutputTokens: maxTokens, fallback: supportsFallback(cfg.model) });
    await reserve(run.id, estimate);
    let failedAttemptCost = 0;
    const request = () =>
      getClient()
        .beta.messages.stream({
          model: cfg.model,
          max_tokens: maxTokens,
          system: opts.system,
          messages: [{ role: "user", content: opts.prompt }],
          output_config: { effort: cfg.effort, format: betaZodOutputFormat(opts.schema) },
          ...(supportsFallback(cfg.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        })
        .finalMessage();
    let res;
    try {
      res = await request();
    } catch (e) {
      // A cut-off or malformed JSON answer is retried once; API errors are not.
      if (e instanceof Anthropic.APIError || !/parse|JSON/i.test((e as Error).message)) throw e;
      // The failed attempt's usage isn't returned, so it's charged at its worst case to keep the cap honest.
      failedAttemptCost = estimate;
      await reserve(`${run.id}:retry`, estimate);
      try {
        res = await request();
      } finally {
        reservations.delete(`${run.id}:retry`);
      }
    }
    record(run, res.usage, res.model ?? cfg.model);
    run.costUsd = Math.round((run.costUsd + failedAttemptCost) * 10000) / 10000;
    if (res.stop_reason === "refusal") throw new Error(`The model declined this request (${res.stop_details?.category ?? "no category"}).`);
    if (res.stop_reason === "max_tokens") throw new Error("Output hit the token limit before finishing.");
    if (!res.parsed_output) throw new Error("Model output did not match the expected structure.");
    run.ok = true;
    return res.parsed_output as z.infer<S>;
  } catch (e) {
    run.error = errorMessage(e);
    throw e instanceof ModelUnavailableError || e instanceof SpendCapError ? e : new Error(`${cfg.label}: ${run.error}`);
  } finally {
    run.durationMs = Date.now() - started;
    await repo.update((db) => {
      db.agentRuns = [{ ...run, by: currentActor() }, ...db.agentRuns].slice(0, 2000);
      // The ledger is never trimmed, so caps stay accurate however many calls run.
      const day = run.startedAt.slice(0, 10);
      db.spendLedger = { ...(db.spendLedger ?? {}), [day]: Math.round(((db.spendLedger?.[day] ?? 0) + run.costUsd) * 10000) / 10000 };
    });
    reservations.delete(run.id);
  }
}

/**
 * Web research with Claude's server-side web search. Returns the model's notes
 * plus every URL the search actually returned, so downstream steps may only
 * cite sources that exist.
 */
export async function research(opts: {
  agent: AgentName;
  system: string;
  prompt: string;
  maxSearches?: number;
  subject?: string;
}): Promise<{ notes: string; sources: Citation[] }> {
  const cfg = agentConfig(opts.agent);
  const started = Date.now();
  const run: AgentRun = {
    id: newId("run"), agent: opts.agent, model: cfg.model, startedAt: new Date(started).toISOString(),
    durationMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, ok: false, subject: opts.subject,
  };
  const maxSearches = opts.maxSearches ?? 5;
  try {
    getClient();
    await reserve(run.id, worstCaseCost({ model: cfg.model, inputChars: opts.system.length + opts.prompt.length + 4000, maxOutputTokens: 16000, searches: maxSearches }));
    const res = await getClient().messages.create({
      model: cfg.model,
      max_tokens: 16000,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: maxSearches }],
      output_config: { effort: cfg.effort },
    });
    const searches = res.usage.server_tool_use?.web_search_requests ?? 0;
    record(run, res.usage, cfg.model, searches);
    const now = new Date().toISOString();
    const sources = new Map<string, Citation>();
    let notes = "";
    for (const block of res.content) {
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) sources.set(r.url, { url: r.url, title: r.title, retrievedAt: now });
      }
      if (block.type === "text") notes += block.text;
    }
    run.ok = true;
    return { notes: notes.trim(), sources: [...sources.values()] };
  } catch (e) {
    run.error = errorMessage(e);
    throw e instanceof ModelUnavailableError || e instanceof SpendCapError ? e : new Error(`${cfg.label}: ${run.error}`);
  } finally {
    run.durationMs = Date.now() - started;
    await repo.update((db) => {
      db.agentRuns = [{ ...run, by: currentActor() }, ...db.agentRuns].slice(0, 2000);
      // The ledger is never trimmed, so caps stay accurate however many calls run.
      const day = run.startedAt.slice(0, 10);
      db.spendLedger = { ...(db.spendLedger ?? {}), [day]: Math.round(((db.spendLedger?.[day] ?? 0) + run.costUsd) * 10000) / 10000 };
    });
    reservations.delete(run.id);
  }
}

function record(
  run: AgentRun,
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number | null },
  model: string,
  searches = 0,
) {
  // A refusal fallback can be served by another model; unknown models are priced at the worst case.
  const price = PRICES[model] ?? FALLBACK_WORST;
  run.model = model;
  run.inputTokens = usage.input_tokens + (usage.cache_read_input_tokens ?? 0);
  run.outputTokens = usage.output_tokens;
  // Cache reads are billed cheaper than input; counting them at input price keeps the cap conservative.
  run.costUsd = Math.round(((run.inputTokens * price.input + usage.output_tokens * price.output) / 1e6 + searches * WEB_SEARCH_USD) * 10000) / 10000;
}

function errorMessage(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "Rate limited by the API. Try again shortly.";
  if (e instanceof Anthropic.AuthenticationError) return "The Anthropic API key was rejected.";
  if (e instanceof Anthropic.APIError) return `API error ${e.status}: ${e.message}`;
  return (e as Error).message;
}

/**
 * Paid calls to other providers (image and video generation) go through the
 * same hard cap: reserve the price up front, log the run, charge the ledger.
 */
export async function chargeExternal<T>(
  opts: { agent: AgentName; model: string; subject?: string; costUsd: number },
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const run: AgentRun = {
    id: newId("run"), agent: opts.agent, model: opts.model, startedAt: new Date(started).toISOString(),
    durationMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, ok: false, subject: opts.subject,
  };
  try {
    await reserve(run.id, opts.costUsd);
    const out = await fn();
    run.ok = true;
    run.costUsd = opts.costUsd;
    return out;
  } catch (e) {
    run.error = (e as Error).message;
    // A failed generation may still have been billed; charge it to stay under the cap.
    run.costUsd = e instanceof SpendCapError ? 0 : opts.costUsd;
    throw e;
  } finally {
    run.durationMs = Date.now() - started;
    await repo.update((db) => {
      db.agentRuns = [{ ...run, by: currentActor() }, ...db.agentRuns].slice(0, 2000);
      const day = run.startedAt.slice(0, 10);
      db.spendLedger = { ...(db.spendLedger ?? {}), [day]: Math.round(((db.spendLedger?.[day] ?? 0) + run.costUsd) * 10000) / 10000 };
    });
    reservations.delete(run.id);
  }
}

/**
 * The second opinion (Marko's setup): GPT-6 Astra checks the Planner's
 * angles and the panel's picks. Needs OPENAI_API_KEY; BRIAN_CHECKER_MODEL can
 * name another OpenAI model (default gpt-6-astra). Prices for the cap come
 * from OPENAI_PRICE_IN / OPENAI_PRICE_OUT (USD per million tokens),
 * defaulting to Astra's listed $10/$50. Same hard cap, same run log.
 */
export function checkerReady(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export const checkerModel = () => process.env.BRIAN_CHECKER_MODEL || "gpt-6-astra";

export async function callChecker<S extends z.ZodType>(opts: { system: string; prompt: string; schema: S; subject?: string; maxTokens?: number; agent?: "checker" | "astra" }): Promise<z.infer<S>> {
  const model = checkerModel();
  const price = { input: Number(process.env.OPENAI_PRICE_IN) || 10, output: Number(process.env.OPENAI_PRICE_OUT) || 50 };
  const maxTokens = opts.maxTokens ?? 16000;
  const started = Date.now();
  const run: AgentRun = {
    id: newId("run"), agent: opts.agent ?? "checker", model, startedAt: new Date(started).toISOString(),
    durationMs: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, ok: false, subject: opts.subject,
  };
  try {
    const estimate = (((opts.system.length + opts.prompt.length) / 3 + 1000) * price.input + maxTokens * price.output) / 1e6;
    await reserve(run.id, estimate);
    const { $schema: _drop, ...schema } = z.toJSONSchema(opts.schema) as Record<string, unknown>;
    void _drop;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.prompt },
        ],
        response_format: { type: "json_schema", json_schema: { name: "output", strict: true, schema } },
      }),
      signal: AbortSignal.timeout(300_000),
    });
    const j = (await res.json()) as {
      choices?: { message: { content: string | null; refusal?: string | null }; finish_reason: string }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
      error?: { message: string };
    };
    if (j.usage) {
      run.inputTokens = j.usage.prompt_tokens;
      run.outputTokens = j.usage.completion_tokens;
      run.costUsd = Math.round(((run.inputTokens * price.input + run.outputTokens * price.output) / 1e6) * 10000) / 10000;
    }
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${j.error?.message ?? "error"}`);
    const msg = j.choices?.[0];
    if (msg?.message.refusal) throw new Error(`The checker declined: ${msg.message.refusal}`);
    if (msg?.finish_reason === "length") throw new Error("Checker output hit the token limit.");
    const parsed = opts.schema.safeParse(JSON.parse(msg?.message.content ?? "null"));
    if (!parsed.success) throw new Error("Checker output did not match the expected structure.");
    run.ok = true;
    return parsed.data as z.infer<S>;
  } catch (e) {
    run.error = (e as Error).message;
    throw e instanceof SpendCapError ? e : new Error(`Checker (${model}): ${run.error}`);
  } finally {
    run.durationMs = Date.now() - started;
    await repo.update((db) => {
      db.agentRuns = [{ ...run, by: currentActor() }, ...db.agentRuns].slice(0, 2000);
      const day = run.startedAt.slice(0, 10);
      db.spendLedger = { ...(db.spendLedger ?? {}), [day]: Math.round(((db.spendLedger?.[day] ?? 0) + run.costUsd) * 10000) / 10000 };
    });
    reservations.delete(run.id);
  }
}
