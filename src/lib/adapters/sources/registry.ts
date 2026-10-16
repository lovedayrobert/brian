import { SOURCES, isConfigured } from "@/lib/config/sources";
import { audience } from "./audience";
import { builds } from "./builds";
import { gdelt } from "./gdelt";
import { imported } from "./imported";
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
const IMPLEMENTED: SourceAdapter[] = [imported, googleTrends, press, audience, builds, trenches, youtube, gdelt, wikipedia, polymarket];

export function adapters(): SourceAdapter[] {
  // The blind test runs on free sources only, so partner imports can be switched off.
  return process.env.BRIAN_FREE_SOURCES_ONLY ? IMPLEMENTED.filter((a) => a.id !== "imported") : IMPLEMENTED;
}

export type SourceState = "live" | "needs-key" | "not-connected";

export function sourceState(id: string): SourceState {
  const impl = IMPLEMENTED.find((a) => a.id === id);
  const def = SOURCES.find((s) => s.id === id);
  if (impl) return impl.ready() ? "live" : "needs-key";
  if (def && isConfigured(def) && def.envKeys.length) return "needs-key"; // key present, adapter still to build
  return "not-connected";
}
