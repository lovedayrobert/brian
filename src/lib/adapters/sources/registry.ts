import { SOURCES, isConfigured } from "@/lib/config/sources";
import { gdelt } from "./gdelt";
import { googleTrends } from "./googletrends";
import { polymarket } from "./polymarket";
import { press } from "./press";
import { trenches } from "./trenches";
import type { SourceAdapter } from "./types";
import { wikipedia } from "./wikipedia";
import { youtube } from "./youtube";

/**
 * Sources with an implemented adapter. Every other source in the catalogue is
 * a slot: once budget is approved and keys are in .env, its adapter is added
 * here and the sweep picks it up. Nothing else changes.
 */
const IMPLEMENTED: SourceAdapter[] = [googleTrends, press, trenches, youtube, gdelt, wikipedia, polymarket];

export function adapters(): SourceAdapter[] {
  return IMPLEMENTED;
}

export type SourceState = "live" | "needs-key" | "not-connected";

export function sourceState(id: string): SourceState {
  const impl = IMPLEMENTED.find((a) => a.id === id);
  const def = SOURCES.find((s) => s.id === id);
  if (impl) return impl.ready() ? "live" : "needs-key";
  if (def && isConfigured(def) && def.envKeys.length) return "needs-key"; // key present, adapter still to build
  return "not-connected";
}
