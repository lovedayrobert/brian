/**
 * Hard spend cap. Before every model call Brian reserves the worst-case cost
 * of that call (full output budget, conservative input estimate, the pricier
 * of the model and its refusal fallback, every allowed web search) and refuses
 * the call if spent + in-flight reservations + this call would pass the daily
 * or monthly cap. Actual cost replaces the reservation when the call returns.
 *
 * The one thing this can't bound exactly is how many tokens web search results
 * add server-side, so research calls reserve a generous fixed allowance per
 * search. Set a spend limit in the Anthropic Console as a second backstop.
 */
export interface Price {
  input: number; // USD per million tokens
  output: number;
}

export const PRICES: Record<string, Price> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

/** Refusal fallbacks may route to an older model priced at up to $5/$25. */
export const FALLBACK_WORST: Price = { input: 5, output: 25 };
export const WEB_SEARCH_USD = 0.01;
/** Tokens a single web search can add to the context, reserved up front. */
export const SEARCH_TOKEN_ALLOWANCE = 25_000;

export function worstCaseCost(opts: {
  model: string;
  inputChars: number;
  maxOutputTokens: number;
  searches?: number;
  fallback?: boolean;
}): number {
  const base = PRICES[opts.model] ?? FALLBACK_WORST;
  const price = opts.fallback ? { input: Math.max(base.input, FALLBACK_WORST.input), output: Math.max(base.output, FALLBACK_WORST.output) } : base;
  // ~3 characters per token is conservative for English prose and JSON.
  const inputTokens = Math.ceil(opts.inputChars / 3) + (opts.searches ?? 0) * SEARCH_TOKEN_ALLOWANCE;
  const cost = (inputTokens * price.input + opts.maxOutputTokens * price.output) / 1e6 + (opts.searches ?? 0) * WEB_SEARCH_USD;
  return Math.round(cost * 10_000) / 10_000;
}

export interface Caps {
  dailyUsd: number;
  monthlyUsd: number;
}

export function capsFromEnv(env: Record<string, string | undefined> = process.env): Caps {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && v !== undefined && v !== "" ? n : d;
  };
  return { dailyUsd: num(env.BRIAN_DAILY_CAP_USD, 50), monthlyUsd: num(env.BRIAN_MONTHLY_CAP_USD, 300) };
}

export interface SpendState {
  spentToday: number;
  spentThisMonth: number;
  reserved: number;
}

export type BudgetDecision = { ok: true } | { ok: false; reason: string };

export function checkBudget(state: SpendState, estimate: number, caps: Caps): BudgetDecision {
  const day = state.spentToday + state.reserved + estimate;
  const month = state.spentThisMonth + state.reserved + estimate;
  if (day > caps.dailyUsd) {
    return { ok: false, reason: `Daily AI spend cap of $${caps.dailyUsd} reached ($${state.spentToday.toFixed(2)} spent today). It resets at midnight UTC, or raise BRIAN_DAILY_CAP_USD.` };
  }
  if (month > caps.monthlyUsd) {
    return { ok: false, reason: `Monthly AI spend cap of $${caps.monthlyUsd} reached ($${state.spentThisMonth.toFixed(2)} spent this month). Raise BRIAN_MONTHLY_CAP_USD to continue.` };
  }
  return { ok: true };
}

/** Spend so far, from the agent-run log. Days and months are UTC. */
export function spendFromRuns(runs: { startedAt: string; costUsd: number }[], now = new Date()): Omit<SpendState, "reserved"> {
  const day = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  let spentToday = 0;
  let spentThisMonth = 0;
  for (const r of runs) {
    if (r.startedAt.slice(0, 7) !== month) continue;
    spentThisMonth += r.costUsd;
    if (r.startedAt.slice(0, 10) === day) spentToday += r.costUsd;
  }
  return { spentToday, spentThisMonth };
}
