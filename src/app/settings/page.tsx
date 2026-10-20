import clsx from "clsx";
import { CostPlanner } from "@/components/cost-planner";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { SETTINGS_TABS, SectionTabs } from "@/components/section-tabs";
import { AGENTS, agentConfig, checkerModel, checkerReady, modelReady, qualityMax, spendStatus, type AgentName } from "@/lib/adapters/model";
import { authMode } from "@/lib/auth";
import { imageReady } from "@/lib/adapters/image";
import { sourceState } from "@/lib/adapters/sources/registry";
import { linearReady } from "@/lib/adapters/tasks/linear";
import { BRANDS } from "@/lib/brand/brands";
import { QUALITY_BAR, STUNTS } from "@/lib/brand/quality-bar";
import { CAMPAIGN_COST, PRESETS, RADAR_COSTS, SOURCES } from "@/lib/config/sources";
import { relativeTime, usd } from "@/lib/format";
import { admins, initials, isAdmin } from "@/lib/people";
import { viewer } from "@/lib/viewer";
import { ToolkitForm } from "@/components/toolkit-form";
import { ActionButton } from "@/components/action-button";
import { ensureLiveBrand, type LiveBrand } from "@/lib/brand/live-brand";
import { DEFAULT_TOOLKIT } from "@/lib/pipeline/context";
import { load, spend } from "@/lib/queries";

export const metadata = { title: "Settings" };



export default async function Settings({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "coverage" } = await searchParams;
  const db = await load();
  const me = await viewer();

  return (
    <>
      <SectionTabs space="Settings" tabs={SETTINGS_TABS} active={tab} />

      {tab === "team" && <Team db={db} />}

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
      {tab === "brand" && <BrandTab toolkit={db.toolkit?.cashy?.trim() || DEFAULT_TOOLKIT.cashy} canEdit={me.admin} live={await ensureLiveBrand()} />}
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
    { name: "Login", ok: authMode() === "on", env: "BRIAN_USERS, BRIAN_SESSION_SECRET", note: authMode() === "on" ? "Every page and action needs a sign-in" : "Off for local development; required in production" },
    { name: "Partner feed import", ok: (process.env.BRIAN_INGEST_TOKEN?.length ?? 0) >= 32, env: "BRIAN_INGEST_TOKEN", note: `POST /api/ingest in Brian Signal Format v1 (docs/07). ${db.imported.length} records held` },
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

function BrandTab({ toolkit, canEdit, live }: { toolkit: string; canEdit: boolean; live: LiveBrand | null }) {
  const b = BRANDS.cashy;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6 lg:col-span-2">
        <div className="text-[17px] font-semibold">What Cashy can actually do</div>
        <p className="mb-3 mt-1 max-w-[720px] text-[13.5px] text-ink-2">
          Brian kills any idea that needs more than this: our real channels, money, people and limits. Add creators or partners you genuinely have, and what you can spend. {canEdit ? "" : "Only admins can change it."}
        </p>
        <ToolkitForm brandId="cashy" initial={toolkit} canEdit={canEdit} />
      </Card>
      <Card className="p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[17px] font-semibold">How Cashy sounds</div>
          <ActionButton endpoint="/api/brand/refresh" pending="Reading cashy.com…" variant="secondary" size="sm">
            Read again
          </ActionButton>
        </div>
        <p className="mb-4 mt-1 max-w-[720px] text-[13.5px] text-ink-2">
          No brand book: Brian reads Cashy&rsquo;s own website and channels every day and matches that voice. {live ? `Last read ${relativeTime(live.at)}.` : "Not read yet."}
        </p>
        {live && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">From {live.site.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</div>
              <p className="mt-1.5 text-[14px] font-medium">{live.site.title}</p>
              <p className="mt-1 text-[13.5px] text-ink-2">{live.site.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {live.site.headlines.slice(0, 10).map((h) => (
                  <Pill key={h}>{h}</Pill>
                ))}
              </div>
              {live.xBio && <p className="mt-3 text-[13px] text-ink-2"><span className="font-medium text-ink">X bio:</span> {live.xBio}</p>}
            </div>
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Our latest Telegram posts</div>
              <ul className="mt-1.5 space-y-2 text-[13px] leading-snug">
                {live.telegram.slice(-6).map((t) => (
                  <li key={t} className="rounded-[10px] bg-surface-2 px-3 py-2">{t.slice(0, 220)}{t.length > 220 ? "…" : ""}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="mt-6 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Compliance (always applies)</div>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] text-ink-2">
          {b.compliance.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>
      <Card className="p-6 lg:col-span-2">
        <div className="mb-3 text-[17px] font-semibold">The quality bar</div>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">The tests</div>
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
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">What worked, and why</div>
            <ul className="mt-2 space-y-2 text-[13px]">
              {STUNTS.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.brand}:</span> <span className="text-ink-2">{s.what} {s.emotion}</span>
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

async function SpendCap() {
  const st = await spendStatus();
  const bar = (spent: number, cap: number) => (cap > 0 ? Math.min(100, (spent / cap) * 100) : 100);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[15px] font-semibold">Hard spend cap</div>
        <span className="text-[12px] text-ink-3">BRIAN_DAILY_CAP_USD · BRIAN_MONTHLY_CAP_USD</span>
      </div>
      {(
        [
          ["Today", st.spentToday, st.caps.dailyUsd],
          ["This month", st.spentThisMonth, st.caps.monthlyUsd],
        ] as const
      ).map(([l, spent, cap]) => (
        <div key={l} className="mb-3">
          <div className="flex justify-between text-[13px]">
            <span className="text-ink-2">{l}</span>
            <span className="tabular font-medium">
              ${spent.toFixed(2)} of ${cap}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className={`h-full rounded-full ${bar(spent, cap) > 85 ? "bg-bad" : "bg-accent"}`} style={{ width: `${bar(spent, cap)}%` }} />
          </div>
        </div>
      ))}
      <p className="text-[12px] leading-relaxed text-ink-3">
        Every AI call reserves its worst-case cost before it runs and is refused if it could take spend past either cap. Set a spend limit in the Anthropic Console as well, as a second backstop.
      </p>
    </Card>
  );
}

function ModelsTab({ db }: { db: Awaited<ReturnType<typeof load>> }) {
  const s = spend(db);
  return (
    <div className="space-y-6">
      <SpendCap />
      <Card className="p-5 text-[13.5px] leading-relaxed">
        {qualityMax() ? (
          <>
            <span className="font-medium">Max quality is on.</span> Fable 5.1{checkerReady() ? " and GPT-6 Astra" : ""} each write ideas, in parallel; Opus 5.5 runs the audience panel and judges them all. Each idea shows which model made it. About $2 per idea run.
          </>
        ) : (
          <>
            <span className="font-medium">Standard quality.</span> Opus 5.5 writes and judges ideas. About $0.65 per idea run. Set BRIAN_QUALITY=max for Fable and GPT-6 Astra.
          </>
        )}
      </Card>
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
            {Object.entries(AGENTS)
              // Only the agents this setup actually uses.
              .filter(([k]) => (k === "planner" ? process.env.BRIAN_PLANNER === "1" : k === "checker" ? process.env.BRIAN_SECOND_OPINION === "1" && checkerReady() : k === "astra" ? qualityMax() && checkerReady() : true))
              .map(([k, base]) => {
              const model = k === "astra" || k === "checker" ? checkerModel() : agentConfig(k as AgentName).model;
              const a = { ...base, model, label: k === "inventor" && model.includes("fable") ? "Inventor (Fable)" : base.label };
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

function Team({ db }: { db: Awaited<ReturnType<typeof load>> }) {
  const month = new Date().toISOString().slice(0, 7);
  const spendBy = new Map<string, number>();
  for (const r of db.agentRuns) if (r.startedAt.startsWith(month)) spendBy.set(r.by ?? "brian", (spendBy.get(r.by ?? "brian") ?? 0) + r.costUsd);
  const people = [...(db.people ?? [])].sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
  return (
    <div className="space-y-6">
      <p className="max-w-[680px] text-[15px] leading-relaxed text-ink-2">
        Everyone who has signed in. Anyone can react, comment, get ideas, approve them and plan in the calendar. Admins ({admins().join(", ")}) can also edit what Brian has learned and change settings. Admins are set with BRIAN_ADMINS.
      </p>
      <Card className="divide-y divide-line">
        {people.length === 0 && <p className="px-5 py-4 text-[13.5px] text-ink-3">Nobody has signed in on this server yet.</p>}
        {people.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-ink">{initials(p.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium">
                {p.name} {isAdmin(p.id) && <Pill tone="accent">Admin</Pill>}
              </div>
              <div className="text-[12.5px] text-ink-3">
                {p.email ?? p.id} · last seen {relativeTime(p.lastSeen)}
              </div>
            </div>
            <div className="text-right text-[12.5px] text-ink-2">
              {usd(spendBy.get(p.id) ?? 0)} <span className="text-ink-3">AI this month</span>
            </div>
          </div>
        ))}
        {spendBy.get("brian") ? (
          <div className="flex items-center justify-between px-5 py-3 text-[12.5px] text-ink-3">
            <span>Before sign-in tracking, or run by Brian on its own</span>
            <span>{usd(spendBy.get("brian") ?? 0)}</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
