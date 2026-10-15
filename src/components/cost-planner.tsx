"use client";

import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import { useState } from "react";
import type { CostLine, Preset, SourceDef } from "@/lib/config/sources";

type State = "live" | "needs-key" | "not-connected";

export function CostPlanner({
  sources,
  states,
  radar,
  campaign,
  presets,
}: {
  sources: SourceDef[];
  states: Record<string, State>;
  radar: CostLine[];
  campaign: { low: number; high: number; note: string };
  presets: Preset[];
}) {
  const [preset, setPreset] = useState<Preset["id"]>("lean");
  const [campaigns, setCampaigns] = useState(2);
  const p = presets.find((x) => x.id === preset)!;

  const lineCost = (s: SourceDef) => (s.id === "x" ? (preset === "full" ? { low: 5000, high: 5000 } : { low: 200, high: 200 }) : s.monthlyCost);
  const included = sources.filter((s) => p.sourceIds.includes(s.id));
  // Included first; within them, idea sources above supporting ones (Wikipedia, Polymarket).
  const SUPPORTING = ["wikipedia", "polymarket"];
  const rank = (s: SourceDef) => (p.sourceIds.includes(s.id) ? 2 : 0) - (SUPPORTING.includes(s.id) ? 1 : 0);
  const totals = (() => {
    const src = included.reduce((a, s) => ({ low: a.low + lineCost(s).low, high: a.high + lineCost(s).high }), { low: 0, high: 0 });
    const r = radar.reduce((a, l) => ({ low: a.low + l.monthlyCost.low, high: a.high + l.monthlyCost.high }), { low: 0, high: 0 });
    return {
      radar: { low: src.low + r.low, high: src.high + r.high },
      builds: { low: campaign.low * campaigns, high: campaign.high * campaigns },
    };
  })();
  const range = (x: { low: number; high: number }) =>
    x.low === x.high ? `$${x.low.toLocaleString("en-US")}` : `$${x.low.toLocaleString("en-US")}–${x.high.toLocaleString("en-US")}`;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-3">
        {presets.map((x) => (
          <button
            key={x.id}
            onClick={() => setPreset(x.id)}
            className={clsx(
              "rounded-[18px] p-5 text-left transition",
              preset === x.id ? "bg-ink text-bg shadow-raised" : "bg-surface shadow-card hover:shadow-raised",
            )}
          >
            <div className="text-[15px] font-semibold">{x.name}</div>
            <div className={clsx("mt-1 text-[13px] leading-snug", preset === x.id ? "opacity-75" : "text-ink-2")}>{x.summary}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[20px] bg-surface p-6 shadow-card">
          <div className="text-[12.5px] text-ink-2">Always-on radar</div>
          <div className="display tabular mt-1 text-[34px] leading-none">
            {range(totals.radar)}
            <span className="text-[15px] font-medium text-ink-3"> /month</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            Fixed. Sweeps, lifecycle staging, daily ideas, the morning summary and Rapid Response on breaking moments.
          </p>
        </div>
        <div className="rounded-[20px] bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between text-[12.5px] text-ink-2">
            <span>Campaign builds</span>
            <span className="flex items-center gap-2">
              <button onClick={() => setCampaigns(Math.max(0, campaigns - 1))} className="grid h-6 w-6 place-items-center rounded-full bg-surface-3" aria-label="Fewer">
                <Minus className="h-3 w-3" />
              </button>
              <span className="tabular w-16 text-center">
                {campaigns} / month
              </span>
              <button onClick={() => setCampaigns(campaigns + 1)} className="grid h-6 w-6 place-items-center rounded-full bg-surface-3" aria-label="More">
                +
              </button>
            </span>
          </div>
          <div className="display tabular mt-1 text-[34px] leading-none">
            {range(totals.builds)}
            <span className="text-[15px] font-medium text-ink-3"> /month</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            Pay per use, about {range(campaign)} per full package. {campaign.note.split(". ").slice(-1)[0]}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] bg-surface shadow-card">
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line px-5 py-3 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3 md:grid-cols-[1.1fr_1.6fr_120px_120px]">
          <span>Source</span>
          <span className="hidden md:block">What it adds</span>
          <span className="hidden md:block">Status</span>
          <span className="text-right">Monthly</span>
        </div>
        {[...sources]
          .sort((a, b) => rank(b) - rank(a))
          .map((s) => {
            const on = p.sourceIds.includes(s.id);
            const st = states[s.id];
            const c = lineCost(s);
            return (
              <div
                key={s.id}
                className={clsx(
                  "grid grid-cols-[1fr_auto] items-start gap-4 border-b border-line px-5 py-3.5 last:border-0 md:grid-cols-[1.1fr_1.6fr_120px_120px]",
                  !on && "opacity-45",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[14px] font-medium">
                    <span className={clsx("grid h-4 w-4 place-items-center rounded-full", on ? "bg-good text-white" : "border border-line-strong")}>
                      {on && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    {s.name}
                  </div>
                  <div className="mt-1 pl-6 text-[12px] leading-snug text-ink-3">{s.costNote}</div>
                  {s.termsNote && <div className="mt-1 pl-6 text-[12px] leading-snug text-warn">{s.termsNote}</div>}
                  <div className="mt-1 pl-6 text-[12.5px] leading-snug text-ink-2 md:hidden">{s.unlocks}</div>
                </div>
                <div className="hidden text-[13px] leading-snug text-ink-2 md:block">{s.unlocks}</div>
                <div className="hidden md:block">
                  <StatusTag state={st} />
                </div>
                <div className="tabular text-right text-[13.5px] font-medium">{c.high === 0 ? "Free" : range(c)}</div>
              </div>
            );
          })}
        {radar.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_auto] items-start gap-4 border-t border-line bg-surface-2 px-5 py-3.5 md:grid-cols-[1.1fr_1.6fr_120px_120px]">
            <div className="text-[14px] font-medium">{l.name}</div>
            <div className="hidden text-[13px] text-ink-2 md:block">{l.note}</div>
            <div className="hidden md:block" />
            <div className="tabular text-right text-[13.5px] font-medium">{range(l.monthlyCost)}</div>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-relaxed text-ink-3">
        All costs are estimates from public pricing in October 2026 and should be confirmed with each provider. Claude pricing: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per million tokens; web search $10 per 1,000 searches. Actual spend per agent is logged in Models.
      </p>
    </div>
  );
}

function StatusTag({ state }: { state: State }) {
  if (state === "live") return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-good"><span className="h-1.5 w-1.5 rounded-full bg-good" />Live</span>;
  if (state === "needs-key") return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-warn"><span className="h-1.5 w-1.5 rounded-full bg-warn" />Needs key</span>;
  return <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3"><span className="h-1.5 w-1.5 rounded-full bg-ink-3" />Slot ready</span>;
}
