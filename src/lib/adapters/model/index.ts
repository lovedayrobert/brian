import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type * as z from "zod/v4";
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
  | "analyst"
  | "inventor"
  | "critic"
  | "priorArt"
  | "redLines"
  | "factChecker"
  | "strategist"
  | "creativeDirector"
  | "producer"
  | "rapidResponse";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export const AGENTS: Record<AgentName, { model: string; effort: Effort; label: string; job: string }> = {
  cartographer: { model: "claude-haiku-5-5", effort: "low", label: "Cartographer", job: "Scores relevance and clusters signals" },
  analyst: { model: "claude-sonnet-5-5", effort: "medium", label: "Analyst", job: "Why a trend is spreading and who drives it" },
  inventor: { model: "claude-opus-5-5", effort: "high", label: "Inventor", job: "Finds the one twist that makes a trend Cashy's" },
  critic: { model: "claude-opus-5-5", effort: "high", label: "Critic", job: "Applies the quality bar, kills anything boring" },
  priorArt: { model: "claude-sonnet-5-5", effort: "medium", label: "Prior Art", job: "Has anyone done it? Searches the web" },
  redLines: { model: "claude-opus-5-5", effort: "medium", label: "Red Lines", job: "Legal, minors, real people, RG, data use" },
  factChecker: { model: "claude-sonnet-5-5", effort: "medium", label: "Fact Checker", job: "Traces every claim to a source" },
  strategist: { model: "claude-opus-5-5", effort: "high", label: "Strategist", job: "Strategy, channel plan, business case" },
  creativeDirector: { model: "claude-opus-5-5", effort: "high", label: "Creative Director", job: "Concept, copy, key visual system" },
  producer: { model: "claude-sonnet-5-5", effort: "medium", label: "Producer", job: "Production plan, runbook, Linear project" },
  rapidResponse: { model: "claude-opus-5-5", effort: "medium", label: "Rapid Response", job: "Three reactive takes within minutes" },
};

export class SpendCapError extends Error {}

/**
 * Hard spend cap. Every call reserves its worst-case cost first and is refused
 * if spent + in-flight + this call would pass the daily or monthly cap
 * (BRIAN_DAILY_CAP_USD, BRIAN_MONTHLY_CAP_USD). See src/lib/engine/spend.ts.
 */
const reservations = new Map<string, number>();

async function reserve(id: string, estimate: number): Promise<void> {
  const db = await repo.read();
  const spent = spendFromRuns(Object.entries(db.spendLedger ?? {}).map(([day, costUsd]) => ({ startedAt: day, costUsd })));
  const reserved = [...reservations.values()].reduce((a, b) => a + b, 0);
  // No await between the check and the reservation, so concurrent calls can't both slip under the cap.
  const decision = checkBudget({ ...spent, reserved }, estimate, capsFromEnv());
  if (!decision.ok) throw new SpendCapError(decision.reason);
  reservations.set(id, estimate);
}

export async function spendStatus() {
  const db = await repo.read();
  const spent = spendFromRuns(Object.entries(db.spendLedger ?? {}).map(([day, costUsd]) => ({ startedAt: day, costUsd })));
  return { ...spent, caps: capsFromEnv() };
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
const supportsFallback = (model: string) => !model.includes("haiku");

export async function callStructured<S extends z.ZodType>(opts: {
  agent: AgentName;
  system: string;
  prompt: string;
  schema: S;
  subject?: string;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const cfg = AGENTS[opts.agent];
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
  const maxTokens = opts.maxTokens ?? 16000;
  try {
    getClient();
    await reserve(run.id, worstCaseCost({ model: cfg.model, inputChars: opts.system.length + opts.prompt.length + 4000, maxOutputTokens: maxTokens, fallback: supportsFallback(cfg.model) }));
    const res = await getClient().beta.messages.parse({
      model: cfg.model,
      max_tokens: maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { effort: cfg.effort, format: betaZodOutputFormat(opts.schema) },
      ...(supportsFallback(cfg.model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    record(run, res.usage, res.model ?? cfg.model);
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
      db.agentRuns = [run, ...db.agentRuns].slice(0, 2000);
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
  const cfg = AGENTS[opts.agent];
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
      db.agentRuns = [run, ...db.agentRuns].slice(0, 2000);
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
