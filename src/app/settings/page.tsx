import clsx from "clsx";
import Link from "next/link";
import { CostPlanner } from "@/components/cost-planner";
import { Card, PageHeader, Pill, SectionTitle, SourceLink } from "@/components/ui";
import { AGENTS, modelReady } from "@/lib/adapters/model";
import { imageReady } from "@/lib/adapters/image";
import { sourceState } from "@/lib/adapters/sources/registry";
import { linearReady } from "@/lib/adapters/tasks/linear";
import { BRANDS } from "@/lib/brand/brands";
import { QUALITY_BAR, STUNTS } from "@/lib/brand/quality-bar";
import { CAMPAIGN_COST, PRESETS, RADAR_COSTS, SOURCES } from "@/lib/config/sources";
import { relativeTime, usd } from "@/lib/format";
import { load, spend } from "@/lib/queries";

export const metadata = { title: "Settings" };

const TABS = [
  ["coverage", "Coverage & cost"],
  ["sources", "Sources"],
  ["brand", "Brand"],
  ["models", "Models"],
  ["accuracy", "Accuracy"],
] as const;

export default async function Settings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "coverage" } = await searchParams;
  const db = await load();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="-mx-4 mb-8 flex gap-1 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <div className="flex gap-1 rounded-full bg-surface-3 p-1">
          {TABS.map(([k, l]) => (
            <Link
              key={k}
              href={`/settings?tab=${k}`}
              className={clsx("shrink-0 rounded-full px-4 py-1.5 text-[13px] transition", tab === k ? "bg-surface font-medium shadow-card" : "text-ink-2 hover:text-ink")}
            >
              {l}
            </Link>
          ))}
        </div>
      </div>

      {tab === "coverage" && (
        <>
          <p className="mb-6 max-w-[680px] text-[15px] leading-relaxed text-ink-2">
            Brian runs at two speeds. The radar is always on and costs a fixed amount each month. Campaign builds only cost money when you press Develop. Pick a coverage level to see what each adds and what it costs.
          </p>
          <CostPlanner
            sources={SOURCES}
            states={Object.fromEntries(SOURCES.map((s) => [s.id, sourceState(s.id)]))}
            radar={RADAR_COSTS}
            campaign={CAMPAIGN_COST}
            presets={PRESETS}
          />
        </>
      )}

      {tab === "sources" && <SourcesTab db={db} />}
      {tab === "brand" && <BrandTab />}
      {tab === "models" && <ModelsTab db={db} />}
      {tab === "accuracy" && <AccuracyTab db={db} />}
    </>
  );
}

function SourcesTab({ db }: { db: Awaited<ReturnType<typeof load>> }) {
  const last = db.sweeps[0];
  const integrations = [
    { name: "Anthropic (Claude)", ok: modelReady(), env: "ANTHROPIC_API_KEY", note: "Ideas, Critic, Red Lines, packages, Rapid Response" },
    { name: "Image model", ok: imageReady(), env: "OPENAI_API_KEY", note: "Key visuals. Without it, mockups use code-built brand visuals" },
    { name: "Linear", ok: linearReady(), env: "LINEAR_API_KEY, LINEAR_TEAM_ID", note: "Pushes the briefed project" },
    { name: "Slack", ok: !!process.env.SLACK_WEBHOOK_URL, env: "SLACK_WEBHOOK_URL", note: "Breaking alerts and the morning summary" },
  ];
  return (
    <div className="space-y-10">
      <section>
        <SectionTitle>Integrations</SectionTitle>
        <Card className="divide-y divide-line">
          {integrations.map((i) => (
            <div key={i.name} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span className={clsx("h-2 w-2 rounded-full", i.ok ? "bg-good" : "bg-ink-3")} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium">{i.name}</div>
                <div className="text-[12.5px] text-ink-2">{i.note}</div>
              </div>
              <code className="rounded bg-surface-3 px-2 py-0.5 text-[11.5px] text-ink-2">{i.env}</code>
              <Pill tone={i.ok ? "good" : "neutral"}>{i.ok ? "Connected" : "Not set"}</Pill>
            </div>
          ))}
        </Card>
      </section>
      <section>
        <SectionTitle>Last sweep {last && <span className="font-normal text-ink-3">· {relativeTime(last.finishedAt)}</span>}</SectionTitle>
        <Card className="divide-y divide-line">
          {(last?.sources ?? []).map((s) => (
            <div key={s.sourceId} className="flex items-start gap-3 px-5 py-3 text-[13.5px]">
              <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", s.ok && s.signals > 0 ? "bg-good" : s.ok ? "bg-warn" : "bg-bad")} />
              <div className="flex-1">
                <div className="font-medium">{SOURCES.find((x) => x.id === s.sourceId)?.name ?? s.sourceId}</div>
                {s.error && <div className="text-[12.5px] text-ink-2">{s.error}</div>}
              </div>
              <span className="tabular text-ink-2">{s.signals} signals</span>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function BrandTab() {
  const b = BRANDS.cashy;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[17px] font-semibold">Cashy brand book</div>
          {b.placeholderIdentity && <Pill tone="warn">Visual identity is a placeholder</Pill>}
        </div>
        <p className="text-[14px] leading-relaxed">{b.positioning}</p>
        <div className="mt-5 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Voice</div>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px]">
          {b.voice.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <div className="mt-5 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Banned phrases</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {b.bannedPhrases.map((p) => (
            <Pill key={p} tone="bad">{p}</Pill>
          ))}
        </div>
        <div className="mt-5 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Colour (placeholder until brand files arrive)</div>
        <div className="mt-2 flex gap-2">
          {Object.entries({ primary: b.visual.primary, accent: b.visual.accent, surface: b.visual.surface, ink: b.visual.ink }).map(([k, v]) => (
            <div key={k} className="text-center">
              <div className="h-10 w-14 rounded-[10px] border border-line" style={{ background: v }} />
              <div className="mt-1 text-[11px] text-ink-3">{k}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <div className="mb-3 text-[17px] font-semibold">Advantage inventory</div>
        <ul className="divide-y divide-line">
          {b.advantages.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]">
              {a.claim}
              {a.proof?.url.startsWith("internal:") ? <Pill tone="warn">Proof link needed</Pill> : a.proof ? <SourceLink url={a.proof.url} /> : null}
            </li>
          ))}
        </ul>
        <div className="mb-2 mt-6 text-[17px] font-semibold">Compliance rules</div>
        <ul className="list-disc space-y-1 pl-5 text-[13.5px]">
          {b.compliance.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>
      <Card className="p-6 lg:col-span-2">
        <div className="mb-3 text-[17px] font-semibold">The quality bar</div>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Five tests</div>
            <ul className="mt-2 space-y-2 text-[13px]">
              {QUALITY_BAR.tests.map((t) => (
                <li key={t.id}>
                  <span className="font-medium">{t.name}.</span> <span className="text-ink-2">{t.question}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Banned</div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[13px] text-ink-2">
              {QUALITY_BAR.banned.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Stunt library</div>
            <ul className="mt-2 space-y-2 text-[13px]">
              {STUNTS.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.brand}:</span> <span className="text-ink-2">{s.twist}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-ink-3">Results and source links to be added per entry.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ModelsTab({ db }: { db: Awaited<ReturnType<typeof load>> }) {
  const s = spend(db);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-[12.5px] text-ink-2">Spend, last 30 days</div>
          <div className="display tabular mt-1 text-[28px]">{usd(s.total)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[12.5px] text-ink-2">Model calls</div>
          <div className="display tabular mt-1 text-[28px]">{s.calls}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[12.5px] text-ink-2">Status</div>
          <div className="mt-2">{modelReady() ? <Pill tone="good">Claude connected</Pill> : <Pill tone="warn">No API key</Pill>}</div>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead className="border-b border-line text-[11.5px] text-ink-3">
            <tr>
              <th className="px-5 py-3 font-medium">Agent</th>
              <th className="px-5 py-3 font-medium">Job</th>
              <th className="px-5 py-3 font-medium">Model</th>
              <th className="px-5 py-3 text-right font-medium">Calls</th>
              <th className="px-5 py-3 text-right font-medium">Cost</th>
              <th className="px-5 py-3 text-right font-medium">Avg time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(AGENTS).map(([k, a]) => {
              const u = s.byAgent.get(k);
              return (
                <tr key={k}>
                  <td className="px-5 py-3 font-medium">{a.label}</td>
                  <td className="px-5 py-3 text-ink-2">{a.job}</td>
                  <td className="px-5 py-3">
                    <code className="text-[12px]">{a.model}</code> <span className="text-ink-3">· {a.effort}</span>
                  </td>
                  <td className="tabular px-5 py-3 text-right">{u?.calls ?? 0}</td>
                  <td className="tabular px-5 py-3 text-right">{u ? `$${u.cost.toFixed(2)}` : "–"}</td>
                  <td className="tabular px-5 py-3 text-right">{u ? `${(u.ms / u.calls / 1000).toFixed(1)}s` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <p className="text-[12.5px] text-ink-3">
        Every call goes through one adapter, so models are assigned by config and logged with cost and latency. Refusals on Opus and Sonnet fall back automatically to Anthropic&rsquo;s recommended model.
      </p>
    </div>
  );
}

function AccuracyTab({ db }: { db: Awaited<ReturnType<typeof load>> }) {
  const bt = db.backtest;
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="text-[17px] font-semibold">Lifecycle forecaster backtest</div>
        <p className="mt-1.5 max-w-[720px] text-[14px] leading-relaxed text-ink-2">
          Brian replays history day by day. On each day it stages the trend using only the data available then, and checks the call against what happened over the next 14 days. A Rising or Emerging call is correct if attention kept growing by at least 10%. Declining is correct if it kept falling. Peaking or Saturated is correct if it did not grow by more than 30%.
        </p>
        {bt ? (
          <div className="mt-6">
            {bt.launchWindow && (
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[14px] bg-ink p-5 text-bg">
                  <div className="text-[12.5px] opacity-70">Launch-window calls that were right</div>
                  <div className="display tabular mt-1 text-[38px] leading-none">{Math.round(bt.launchWindow.precision * 100)}%</div>
                  <div className="mt-2 text-[12.5px] opacity-70">
                    When Brian says Emerging or Rising, attention grew at least 10% within two weeks. {bt.launchWindow.calls.toLocaleString("en-GB")} calls.
                  </div>
                </div>
                <div className="rounded-[14px] bg-surface-2 p-5">
                  <div className="text-[12.5px] text-ink-2">Naive momentum on the same data</div>
                  <div className="display tabular mt-1 text-[38px] leading-none">{Math.round(bt.launchWindow.baselinePrecision * 100)}%</div>
                  <div className="mt-2 text-[12.5px] text-ink-2">
                    &ldquo;Up the last three days means rising.&rdquo; {bt.launchWindow.baselineCalls.toLocaleString("en-GB")} calls.
                  </div>
                </div>
              </div>
            )}
            {bt.launchWindow && bt.launchWindow.precision <= bt.launchWindow.baselinePrecision && (
              <p className="mb-5 rounded-[12px] bg-warn-soft px-4 py-3 text-[13px] leading-relaxed text-ink">
                <span className="font-semibold">Read this honestly:</span> on free attention data alone, Brian&rsquo;s rules do not yet beat simple momentum. They are fixed and explainable, but not better. Accuracy should improve once the forecaster can use cross-platform spread (X, Reddit, TikTok) and is recalibrated against real campaign results. Until then, treat lifecycle stages as directional.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-[14px] bg-surface-2 p-4">
                <div className="text-[12px] text-ink-2">All calls</div>
                <div className="display tabular mt-1 text-[24px]">{Math.round(bt.overall.accuracy * 100)}%</div>
                <div className="text-[12px] text-ink-3">{bt.overall.calls.toLocaleString("en-GB")} calls</div>
              </div>
              {bt.byStage.map((s) => (
                <div key={s.stage} className="rounded-[14px] bg-surface-2 p-4">
                  <div className="text-[12px] capitalize text-ink-2">{s.stage}</div>
                  <div className="display tabular mt-1 text-[24px]">{s.calls ? `${Math.round(s.accuracy * 100)}%` : "–"}</div>
                  <div className="text-[12px] text-ink-3">{s.calls} calls</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-ink-3">
              {bt.series} topics, {bt.days} days of daily Wikipedia attention each, run {relativeTime(bt.ranAt)}. Peaking, Saturated and Declining calls are weak on this data: Wikipedia attention is noisy, with weekly cycles and repeat spikes. A naive momentum rule scores {Math.round(bt.baseline * 100)}% across all its calls.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-[13.5px] text-ink-3">Not run yet. Run <code className="rounded bg-surface-3 px-1">npm run backtest</code>.</p>
        )}
      </Card>
    </div>
  );
}
