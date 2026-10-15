import type { Signal } from "@/lib/domain/types";

/** Every data source implements this. Swapping a provider = one new file + a registry line. */
export interface SourceAdapter {
  id: string;
  /** False when required keys are missing; the sweep skips it and Settings shows why. */
  ready(): boolean;
  fetchSignals(ctx: SweepContext): Promise<Signal[]>;
}

export interface SweepContext {
  now: Date;
  log: (msg: string) => void;
}

export const USER_AGENT = "BrianPrototype/0.1 (internal marketing research tool; low volume)";

/** JSON fetch with polite retries on rate limits (honours Retry-After). */
export async function getJson<T>(url: string, init?: RequestInit & { timeoutMs?: number }, attempt = 1): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(init?.timeoutMs ?? 20_000),
  });
  if (res.status === 429 && attempt < 4) {
    const wait = Number(res.headers.get("retry-after")) * 1000 || 4_000 * attempt;
    await sleep(Math.min(wait, 20_000));
    return getJson<T>(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${new URL(url).host}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Non-JSON response from ${new URL(url).host}: ${text.slice(0, 120)}`);
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}
