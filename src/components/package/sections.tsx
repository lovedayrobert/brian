"use client";

import clsx from "clsx";
import { AlertTriangle, Check, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";
import type { Input } from "@/lib/domain/types";
import { computeAllScenarios, type FunnelKey, type FunnelResult } from "@/lib/engine/funnel";
import type * as S from "@/lib/pipeline/package-schemas";
import { MockupGallery, type StoryboardFrame } from "../mockups/gallery";
import type { VisualSpec } from "@/lib/brand/formats";

/* ---------- shared bits ---------- */

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-3">{children}</div>;
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-[14px] border border-line p-4", className)}>{children}</div>;
}

function Cite({ url }: { url: string | null }) {
  if (!url)
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-warn-soft px-1.5 py-[1px] align-middle text-[10.5px] font-medium text-warn">
        <AlertTriangle className="h-2.5 w-2.5" /> unsourced
      </span>
    );
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <a href={url} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[11.5px] text-accent-ink hover:underline">
      {host}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function Prov({ p }: { p: "measured" | "benchmark" | "assumption" }) {
  const map = { measured: "bg-good-soft text-good", benchmark: "bg-accent-soft text-accent-ink", assumption: "bg-warn-soft text-warn" };
  return <span className={clsx("rounded-full px-1.5 py-[1px] text-[10.5px] font-medium", map[p])}>{p}</span>;
}

/* ---------- executive ---------- */

export function ExecutiveView({ c }: { c: S.Executive }) {
  return (
    <div className="overflow-hidden rounded-[18px] bg-[#0b0b0f] text-white">
      <div className="aspect-[16/9] w-full p-[5%] [container-type:inline-size]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between text-[clamp(9px,1.3cqw,13px)] uppercase tracking-[0.16em] text-white/50">
            <span>Cashy · Campaign proposal</span>
            <span>For Marko</span>
          </div>
          <h3 className="mt-[3cqw] max-w-[80%] text-[clamp(20px,4.4cqw,52px)] font-[700] leading-[1.02] tracking-[-0.03em]">{c.title}</h3>
          <p className="mt-[1.5cqw] max-w-[78%] text-[clamp(11px,1.6cqw,19px)] leading-snug text-white/75">{c.idea}</p>
          <div className="mt-auto grid grid-cols-3 gap-[2cqw] text-[clamp(9px,1.15cqw,14px)] leading-snug">
            {(
              [
                ["Why now", c.whyNow],
                ["Why Cashy", c.whyCashy],
                ["What it takes", c.whatItTakes],
                ["What it should return", c.expectedReturn],
                ["Main risk", c.mainRisk],
                ["Decision needed", c.decision],
              ] as const
            ).map(([k, v], i) => (
              <div key={k} className={clsx("border-t pt-[1cqw]", i === 5 ? "border-[#2BD96B]" : "border-white/15")}>
                <div className={clsx("mb-[0.5cqw] font-semibold uppercase tracking-[0.08em]", i === 5 ? "text-[#2BD96B]" : "text-white/50")}>{k}</div>
                <div className="line-clamp-4 text-white/85">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- insight ---------- */

export function InsightView({ c }: { c: S.Insight }) {
  return (
    <div className="space-y-6 text-[14.5px] leading-relaxed">
      <div>
        <Label>What&rsquo;s happening</Label>
        <p>{c.whatsHappening}</p>
      </div>
      <div>
        <Label>Who&rsquo;s driving it</Label>
        <ul className="space-y-1.5">
          {c.drivers.map((d, i) => (
            <li key={i}>
              {d.text}
              <Cite url={d.url} />
            </li>
          ))}
        </ul>
      </div>
      <Panel className="bg-surface-2">
        <Label>The cultural insight</Label>
        <p className="text-[17px] font-medium leading-snug tracking-tight">{c.culturalInsight}</p>
      </Panel>
      <div>
        <Label>Competitive landscape</Label>
        <div className="divide-y divide-line rounded-[14px] border border-line">
          {c.competitors.map((x, i) => (
            <div key={i} className="flex gap-4 px-4 py-3 text-[13.5px]">
              <div className="w-28 shrink-0 font-medium">{x.brand}</div>
              <div className="flex-1">
                {x.what}
                {x.date && <span className="text-ink-3"> · {x.date}</span>}
                <Cite url={x.url} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel>
          <Label>Why Cashy can own it</Label>
          <p className="text-[13.5px]">{c.whyCashy}</p>
        </Panel>
        <Panel>
          <Label>How a rival would copy it</Label>
          <p className="text-[13.5px]">{c.moat.howTheyWouldCopy}</p>
        </Panel>
        <Panel>
          <Label>Why it wouldn&rsquo;t work for them</Label>
          <p className="text-[13.5px]">{c.moat.whyItWouldNotWorkForThem}</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- strategy ---------- */

export function StrategyView({ c }: { c: S.Strategy }) {
  return (
    <div className="space-y-6 text-[14.5px] leading-relaxed">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Panel>
          <Label>Objective</Label>
          <p>{c.objective}</p>
        </Panel>
        <Panel className="bg-accent-soft border-transparent">
          <Label>The one metric that matters</Label>
          <p className="font-semibold">{c.oneMetric.metric}</p>
          <p className="mt-1 text-[13.5px]">
            Target: {c.oneMetric.target} <Prov p={c.oneMetric.provenance} />
          </p>
        </Panel>
      </div>
      <div>
        <Label>KPIs</Label>
        <div className="overflow-x-auto rounded-[14px] border border-line">
          <table className="w-full min-w-[520px] text-left text-[13px]">
            <thead className="bg-surface-2 text-[11.5px] text-ink-3">
              <tr>
                <th className="px-4 py-2 font-medium">Metric</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">Kill below</th>
                <th className="px-4 py-2 font-medium">Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {c.kpis.map((k, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 font-medium">{k.metric}</td>
                  <td className="px-4 py-2.5">{k.target}</td>
                  <td className="px-4 py-2.5 text-bad">{k.killThreshold}</td>
                  <td className="px-4 py-2.5">
                    <Prov p={k.provenance} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <Label>Audience</Label>
        <div className="grid gap-3 md:grid-cols-2">
          {c.audience.map((a, i) => (
            <Panel key={i}>
              <div className="font-semibold">{a.segment}</div>
              <p className="mt-1 text-[13.5px] text-ink-2">{a.whoTheyAre}</p>
              <p className="mt-2 text-[13px]">
                <span className="text-ink-3">Where they are: </span>
                {a.whereTheySpendTime}
              </p>
              {a.evidence.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12.5px] text-ink-2">
                  {a.evidence.map((e, j) => (
                    <li key={j}>
                      {e.text}
                      <Cite url={e.url} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <Label>Positioning</Label>
          <p>{c.positioning}</p>
        </Panel>
        <Panel>
          <Label>Core idea</Label>
          <p>{c.coreIdea}</p>
        </Panel>
      </div>
      <div>
        <Label>Message house</Label>
        <div className="rounded-[14px] border border-line">
          <div className="border-b border-line bg-surface-2 px-5 py-4 text-center text-[17px] font-semibold tracking-tight">{c.messageHouse.key}</div>
          <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
            {c.messageHouse.supporting.map((s, i) => (
              <div key={i} className="p-4">
                <div className="text-[14px] font-medium">{s.message}</div>
                <ul className="mt-2 space-y-1 text-[12.5px] text-ink-2">
                  {s.proofPoints.map((p, j) => (
                    <li key={j} className="flex gap-1.5">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-good" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-line px-5 py-3 text-[12.5px] text-ink-2">Tone: {c.messageHouse.tone}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- creative ---------- */

export function CreativeView({ c }: { c: S.Creative }) {
  const [tab, setTab] = useState<"concept" | "copy" | "video" | "mechanic">("concept");
  const tabs = [
    ["concept", "Concept & visual system"],
    ["copy", "Copy deck"],
    ["video", "Video & storyboard"],
    ...(c.mechanic ? [["mechanic", "Mechanic"]] : []),
  ] as [typeof tab, string][];
  return (
    <div className="text-[14.5px] leading-relaxed">
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-surface-3 p-1 scrollbar-none">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={clsx("shrink-0 rounded-full px-3.5 py-1.5 text-[12.5px] transition", tab === k ? "bg-surface font-medium shadow-card" : "text-ink-2")}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "concept" && (
        <div className="space-y-5">
          <div>
            <Label>Concept</Label>
            <p className="text-[17px] font-medium leading-snug tracking-tight">{c.concept}</p>
          </div>
          <div>
            <Label>Rationale</Label>
            <p>{c.rationale}</p>
          </div>
          <div>
            <Label>Key visual system</Label>
            <div className="grid gap-3 md:grid-cols-2">
              <Panel className="md:col-span-2">
                <p>{c.keyVisual.description}</p>
                <p className="mt-2 text-[13px] text-ink-2">
                  Hero line: <span className="font-semibold text-ink">“{c.keyVisual.heroLine}”</span>
                </p>
              </Panel>
              <Panel>
                <Label>Composition</Label>
                <p className="text-[13.5px]">{c.keyVisual.composition}</p>
              </Panel>
              <Panel>
                <Label>Type</Label>
                <p className="text-[13.5px]">{c.keyVisual.typeRules}</p>
              </Panel>
              <Panel>
                <Label>Colour</Label>
                <p className="text-[13.5px]">{c.keyVisual.colourRules}</p>
              </Panel>
              <Panel>
                <Label>Recurring element</Label>
                <p className="text-[13.5px]">{c.keyVisual.recurringElement}</p>
              </Panel>
            </div>
          </div>
        </div>
      )}

      {tab === "copy" && (
        <div className="space-y-4">
          <CopyBlock title="X post">{c.copy.x.post}</CopyBlock>
          <CopyBlock title="X thread">
            <ol className="list-decimal space-y-1.5 pl-5">
              {c.copy.x.thread.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
            <p className="mt-2 text-ink-2">Reply bait: {c.copy.x.replyBait}</p>
          </CopyBlock>
          <CopyBlock title="Instagram caption">{c.copy.instagram.caption}</CopyBlock>
          <CopyBlock title="TikTok">
            <p className="font-medium">Hook: {c.copy.tiktok.hook}</p>
            <p className="mt-1">{c.copy.tiktok.caption}</p>
          </CopyBlock>
          <CopyBlock title="Telegram">{c.copy.telegram}</CopyBlock>
          <CopyBlock title="Discord">{c.copy.discord}</CopyBlock>
          <div>
            <Label>A/B variants</Label>
            <div className="space-y-2">
              {c.copy.variants.map((v, i) => (
                <Panel key={i}>
                  <div className="text-[12px] text-ink-3">{v.channel}</div>
                  <div className="mt-1 grid gap-2 md:grid-cols-2">
                    <div className="rounded-[10px] bg-surface-2 p-2.5 text-[13.5px]">
                      <span className="mr-1.5 font-semibold text-ink-3">A</span>
                      {v.a}
                    </div>
                    <div className="rounded-[10px] bg-surface-2 p-2.5 text-[13.5px]">
                      <span className="mr-1.5 font-semibold text-ink-3">B</span>
                      {v.b}
                    </div>
                  </div>
                  <p className="mt-2 text-[12.5px] text-ink-2">Hypothesis: {v.hypothesis}</p>
                </Panel>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "video" && (
        <div className="space-y-5">
          <Panel className="whitespace-pre-line bg-surface-2 font-mono text-[12.5px] leading-relaxed">{c.video.script}</Panel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.video.storyboard.map((f) => (
              <div key={f.frame} className="overflow-hidden rounded-[14px] border border-line">
                <div className="relative grid aspect-video place-items-center bg-[#0b0b0f] p-3 text-center text-[11.5px] leading-snug text-white/70">
                  <span className="absolute left-2 top-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">{f.frame}</span>
                  {f.visual}
                </div>
                <div className="p-3 text-[12.5px]">
                  <div className="font-medium">{f.shot}</div>
                  <div className="mt-1 text-ink-2">{f.audio}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-ink-3">Generated storyboard frames arrive with the video model in Phase 2. Frames show the art direction for now.</p>
        </div>
      )}

      {tab === "mechanic" && c.mechanic && (
        <div className="grid gap-3 md:grid-cols-2">
          <Panel>
            <Label>User flow</Label>
            <ol className="list-decimal space-y-1 pl-5 text-[13.5px]">
              {c.mechanic.userFlow.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Panel>
          <Panel>
            <Label>Rules</Label>
            <ul className="list-disc space-y-1 pl-5 text-[13.5px]">
              {c.mechanic.rules.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Panel>
          <Panel>
            <Label>Reward economics</Label>
            <p className="text-[13.5px]">{c.mechanic.rewardEconomics}</p>
          </Panel>
          <Panel>
            <Label>Edge cases</Label>
            <ul className="list-disc space-y-1 pl-5 text-[13.5px]">
              {c.mechanic.edgeCases.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </Panel>
          <Panel className="md:col-span-2">
            <Label>Draft terms (legal to review)</Label>
            <ol className="list-decimal space-y-1 pl-5 text-[13px] text-ink-2">
              {c.mechanic.draftTerms.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </div>
  );
}

function CopyBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel>
      <Label>{title}</Label>
      <div className="whitespace-pre-line text-[14px]">{children}</div>
    </Panel>
  );
}

/* ---------- mockups (inline preview) ---------- */

export interface MockupsContent {
  keyVisualUrl: string | null;
  visuals?: VisualSpec[];
  storyboardFrames?: StoryboardFrame[];
  teaser?: { url: string } | null;
}

export function MockupsView({ creative, mockups, ideaName }: { creative?: S.Creative; mockups?: MockupsContent; ideaName: string }) {
  if (!creative) return <p className="text-[13.5px] text-ink-3">Mockups render once the creative section is ready.</p>;
  return (
    <MockupGallery
      creative={creative}
      keyVisualUrl={mockups?.keyVisualUrl ?? null}
      visuals={mockups?.visuals}
      storyboardFrames={mockups?.storyboardFrames}
      teaserUrl={mockups?.teaser?.url ?? null}
      ideaName={ideaName}
      compact
    />
  );
}

/* ---------- channels ---------- */

export function ChannelsView({ c }: { c: S.Channels }) {
  const total = c.channels.reduce((s, x) => s + (x.available ? x.budgetWeight : 0), 0) || 1;
  return (
    <div className="space-y-6 text-[14.5px] leading-relaxed">
      <div className="divide-y divide-line rounded-[14px] border border-line">
        {c.channels.map((ch, i) => (
          <div key={i} className={clsx("grid gap-2 px-4 py-3.5 md:grid-cols-[180px_1fr_120px]", !ch.available && "opacity-55")}>
            <div>
              <div className="font-medium">{ch.name}</div>
              <div className="text-[12px] capitalize text-ink-3">{ch.type}</div>
            </div>
            <div className="text-[13.5px]">
              {ch.role}
              <div className="mt-0.5 text-[12.5px] text-ink-3">{ch.note}</div>
            </div>
            <div className="text-right text-[13px]">
              {ch.available ? (
                ch.budgetWeight > 0 ? (
                  <>
                    <div className="tabular font-semibold">{Math.round((ch.budgetWeight / total) * 100)}%</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full bg-accent" style={{ width: `${(ch.budgetWeight / total) * 100}%` }} />
                    </div>
                  </>
                ) : (
                  <span className="text-ink-3">Unpaid</span>
                )
              ) : (
                <span className="text-bad">Not available</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <Panel className="bg-warn-soft border-transparent text-[13.5px]">{c.paidMediaNote}</Panel>
      <div>
        <Label>Phasing (days from launch)</Label>
        <div className="space-y-2">
          {c.phasing.map((p, i) => (
            <div key={i} className="flex gap-4 rounded-[12px] bg-surface-2 px-4 py-3 text-[13.5px]">
              <div className="w-24 shrink-0">
                <div className="font-semibold capitalize">{p.phase}</div>
                <div className="tabular text-[12px] text-ink-3">
                  Day {p.startDay} to {p.endDay}
                </div>
              </div>
              <div>{p.whatHappens}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label>Creator criteria</Label>
        <ul className="list-disc space-y-1 pl-5 text-[13.5px]">
          {c.creatorCriteria.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-ink-3">A named shortlist needs live X, Kick and TikTok data. It switches on with those sources.</p>
      </div>
    </div>
  );
}

/* ---------- business case (live, editable) ---------- */

export interface BusinessContent {
  inputs: Record<FunnelKey, Input>;
  paidReachShare: number;
  rationale: string;
  scenarios: FunnelResult[];
  baselineCostPerFtd: number | null;
  vsBaseline: number | null;
}

export function BusinessView({ c }: { c: BusinessContent }) {
  const [inputs, setInputs] = useState(c.inputs);
  const { scenarios, error } = useMemo(() => {
    try {
      return { scenarios: computeAllScenarios(inputs), error: null };
    } catch (e) {
      return { scenarios: c.scenarios, error: (e as Error).message };
    }
  }, [inputs, c.scenarios]);
  const edited = JSON.stringify(inputs) !== JSON.stringify(c.inputs);

  const set = (k: FunnelKey, field: "low" | "expected" | "high", raw: string) => {
    const i = inputs[k];
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    const value = i.unit === "ratio" ? v / 100 : v;
    setInputs({ ...inputs, [k]: { ...i, [field]: value, provenance: "assumption", origin: `Edited by you (was ${i.origin})` } });
  };
  const show = (i: Input, v: number) => (i.unit === "ratio" ? +(v * 100).toFixed(3) : Math.round(v));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {scenarios.map((s) => (
          <div
            key={s.scenario}
            className={clsx("rounded-[16px] p-4", s.scenario === "expected" ? "bg-ink text-bg" : "bg-surface-2")}
          >
            <div className={clsx("text-[12px] capitalize", s.scenario === "expected" ? "opacity-70" : "text-ink-3")}>{s.scenario}</div>
            <div className="display tabular mt-1 text-[30px] leading-none">{s.ftds.toLocaleString("en-GB")}</div>
            <div className={clsx("mt-1 text-[12px]", s.scenario === "expected" ? "opacity-70" : "text-ink-3")}>first-time depositors</div>
            <div className="tabular mt-3 text-[13px]">
              {s.costPerFtd === null ? "No FTDs forecast" : `$${(s.costPerFtd >= 10 ? Math.round(s.costPerFtd) : s.costPerFtd).toLocaleString("en-US")} per FTD`}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[14px] border border-line">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead className="bg-surface-2 text-left text-[11.5px] text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Funnel</th>
              {scenarios.map((s) => (
                <th key={s.scenario} className="px-4 py-2 text-right font-medium capitalize">
                  {s.scenario}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-line">
            {(["reach", "engagements", "visits", "signups", "ftds"] as const).map((k) => (
              <tr key={k}>
                <td className="px-4 py-2 capitalize">{k === "ftds" ? "FTDs" : k === "signups" ? "Sign-ups" : k}</td>
                {scenarios.map((s) => (
                  <td key={s.scenario} className="px-4 py-2 text-right">
                    {s[k].toLocaleString("en-GB")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Inputs (edit any number; everything recalculates)</Label>
          {edited && (
            <button onClick={() => setInputs(c.inputs)} className="text-[12px] text-accent-ink hover:underline">
              Reset
            </button>
          )}
        </div>
        {error && <p className="mb-2 text-[12.5px] text-bad">{error}</p>}
        <div className="divide-y divide-line rounded-[14px] border border-line">
          {(Object.keys(inputs) as FunnelKey[]).map((k) => {
            const i = inputs[k];
            return (
              <div key={k} className="grid gap-3 px-4 py-3 md:grid-cols-[180px_1fr]">
                <div>
                  <div className="text-[13.5px] font-medium">{i.label}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Prov p={i.provenance} />
                    <span className="text-[11px] text-ink-3">{i.unit === "ratio" ? "%" : i.unit === "usd" ? "USD" : "people"}</span>
                  </div>
                </div>
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "expected", "high"] as const).map((f) => (
                      <label key={f} className="block">
                        <span className="text-[10.5px] capitalize text-ink-3">{f}</span>
                        <input
                          type="number"
                          step="any"
                          defaultValue={show(i, i[f])}
                          key={`${k}-${f}-${c.inputs[k][f]}-${inputs === c.inputs}`}
                          onBlur={(e) => set(k, f, e.target.value)}
                          className="tabular mt-0.5 w-full rounded-[8px] border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-snug text-ink-2">
                    {i.origin}
                    {i.citation && <Cite url={i.citation.url} />}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Panel className="text-[13.5px] leading-relaxed">
        <Label>Rationale</Label>
        {c.rationale}
      </Panel>
      <Panel className="bg-warn-soft border-transparent text-[13px]">
        {c.baselineCostPerFtd
          ? `Current cost per FTD on existing channels: $${c.baselineCostPerFtd}.`
          : "No measured cost per FTD from existing channels has been supplied yet, so this case can't be compared with what we already pay. Add it in Settings → Benchmarks."}
      </Panel>
    </div>
  );
}

/* ---------- production ---------- */

export function ProductionView({ c, launchDate }: { c: S.Production; launchDate: string }) {
  const dateFor = (day: number) =>
    new Date(new Date(launchDate).getTime() + day * 86_400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const sorted = [...c.deliverables].sort((a, b) => a.dueDay - b.dueDay);
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-[14px] border border-line">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="bg-surface-2 text-[11.5px] text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Deliverable</th>
              <th className="px-4 py-2 font-medium">Spec</th>
              <th className="px-4 py-2 font-medium">Owner</th>
              <th className="px-4 py-2 font-medium">Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((d, i) => (
              <tr key={i} className="align-top">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-[12px] text-ink-3">{d.channel}</div>
                </td>
                <td className="px-4 py-2.5 text-ink-2">{d.spec}</td>
                <td className="px-4 py-2.5 capitalize">{d.role}</td>
                <td className="tabular whitespace-nowrap px-4 py-2.5">
                  {dateFor(d.dueDay)}
                  <div className="text-[11.5px] text-ink-3">Day {d.dueDay}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Label>Approval gates</Label>
        <div className="grid gap-3 md:grid-cols-3">
          {c.approvalGates.map((g, i) => (
            <Panel key={i}>
              <div className="font-medium">{g.name}</div>
              <div className="text-[12.5px] text-ink-2">
                {g.approver} · {dateFor(g.dueDay)}
              </div>
              <ul className="mt-2 space-y-1 text-[12.5px]">
                {g.checks.map((x, j) => (
                  <li key={j} className="flex gap-1.5">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-ink-3" /> {x}
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </div>
      <div>
        <Label>Launch-day runbook</Label>
        <div className="divide-y divide-line rounded-[14px] border border-line">
          {c.runbook.map((r, i) => (
            <div key={i} className="grid gap-1 px-4 py-3 text-[13px] md:grid-cols-[80px_1fr_140px]">
              <div className="tabular font-semibold">{r.time}</div>
              <div>
                {r.action}
                <div className="mt-0.5 text-[12px] text-ink-3">If it breaks: {r.ifItBreaks}</div>
              </div>
              <div className="text-ink-2">{r.owner}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- measurement ---------- */

export function MeasurementView({ c }: { c: S.Measurement }) {
  return (
    <div className="space-y-6 text-[13.5px]">
      <div className="divide-y divide-line rounded-[14px] border border-line">
        {c.tracking.map((t, i) => (
          <div key={i} className="grid gap-1 px-4 py-3 md:grid-cols-[160px_1fr]">
            <div className="font-medium">{t.channel}</div>
            <div>
              {t.method}
              <code className="mt-1 block break-all rounded-[8px] bg-surface-2 px-2 py-1 font-mono text-[11.5px] text-ink-2">{t.example}</code>
            </div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-line">
        <table className="w-full min-w-[560px] text-left">
          <thead className="bg-surface-2 text-[11.5px] text-ink-3">
            <tr>
              <th className="px-4 py-2 font-medium">Checkpoint</th>
              <th className="px-4 py-2 font-medium">Metric</th>
              <th className="px-4 py-2 font-medium">Success</th>
              <th className="px-4 py-2 font-medium">Kill</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {c.thresholds.map((t, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5 font-medium">{t.checkpoint}</td>
                <td className="px-4 py-2.5">{t.metric}</td>
                <td className="px-4 py-2.5 text-good">{t.success}</td>
                <td className="px-4 py-2.5 text-bad">{t.kill}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <Label>Dashboard</Label>
          <ul className="list-disc space-y-1 pl-5">
            {c.dashboard.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <Label>What we learn even if it underperforms</Label>
          <ul className="list-disc space-y-1 pl-5">
            {c.learnings.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- risk ---------- */

export function RiskView({ c }: { c: S.Risk }) {
  const tone = { low: "text-good", medium: "text-warn", high: "text-bad" };
  return (
    <div className="space-y-6 text-[13.5px]">
      <Panel>
        <Label>Responsible gambling, built in</Label>
        <ul className="space-y-1">
          {c.responsibleGambling.map((x, i) => (
            <li key={i} className="flex gap-1.5">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-good" />
              {x}
            </li>
          ))}
        </ul>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <Label>Regulatory (legal to confirm)</Label>
          <ul className="space-y-1.5">
            {c.regulatory.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.market}: </span>
                {r.point}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <Label>Platform policy</Label>
          <ul className="space-y-1.5">
            {c.platformPolicy.map((p, i) => (
              <li key={i}>
                <span className="font-medium">{p.platform}: </span>
                {p.risk} <span className="text-ink-2">→ {p.mitigation}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div>
        <Label>Reputational risks and prepared responses</Label>
        <div className="divide-y divide-line rounded-[14px] border border-line">
          {c.reputational.map((r, i) => (
            <div key={i} className="grid gap-1 px-4 py-3 md:grid-cols-[1fr_80px_1.2fr]">
              <div className="font-medium">{r.risk}</div>
              <div className={clsx("capitalize", tone[r.likelihood])}>{r.likelihood}</div>
              <div className="text-ink-2">{r.response}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel>
          <Label>Community FAQ</Label>
          <dl className="space-y-2">
            {c.faq.map((f, i) => (
              <div key={i}>
                <dt className="font-medium">{f.q}</dt>
                <dd className="text-ink-2">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <Label>Moderation</Label>
          <ul className="list-disc space-y-1 pl-5">
            {c.moderation.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- handover ---------- */

export function HandoverView({ c, launchDate }: { c: S.Handover; launchDate: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const count = c.epics.reduce((s, e) => s + e.issues.length, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-2">
        <span>
          <span className="font-semibold text-ink">{c.projectName}</span> · {c.epics.length} epics · {count} issues · launch{" "}
          {new Date(launchDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
        </span>
      </div>
      {c.epics.map((e) => (
        <div key={e.name} className="rounded-[14px] border border-line">
          <div className="border-b border-line bg-surface-2 px-4 py-2.5 text-[13px] font-semibold">{e.name}</div>
          <div className="divide-y divide-line">
            {e.issues.map((iss) => {
              const k = `${e.name}/${iss.title}`;
              return (
                <div key={k}>
                  <button onClick={() => setOpen(open === k ? null : k)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-ink-3" />
                    <span className="flex-1 font-mono text-[12.5px]">{iss.title}</span>
                    <span className="hidden text-[12px] capitalize text-ink-3 sm:inline">{iss.role}</span>
                    <span className="tabular text-[12px] text-ink-3">Day {iss.dueDay}</span>
                  </button>
                  {open === k && (
                    <div className="space-y-2 bg-surface-2 px-11 py-3 text-[13px]">
                      <p>
                        <span className="text-ink-3">Objective: </span>
                        {iss.objective}
                      </p>
                      <p>
                        <span className="text-ink-3">Spec: </span>
                        {iss.spec}
                      </p>
                      {iss.copy && <p className="whitespace-pre-line rounded-[8px] bg-surface p-2">{iss.copy}</p>}
                      <ul className="space-y-0.5">
                        {iss.acceptance.map((a, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-[3px] border border-ink-3" /> {a}
                          </li>
                        ))}
                      </ul>
                      {iss.dependsOn.length > 0 && <p className="text-ink-3">Depends on: {iss.dependsOn.join(", ")}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
