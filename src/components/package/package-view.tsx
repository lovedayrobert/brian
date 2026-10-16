"use client";

import clsx from "clsx";
import { AlertCircle, ArrowUp, Check, Loader2, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Idea, Package, SectionKey } from "@/lib/domain/types";
import type * as S from "@/lib/pipeline/package-schemas";
import {
  BusinessView,
  ChannelsView,
  CreativeView,
  ExecutiveView,
  HandoverView,
  InsightView,
  MeasurementView,
  MockupsView,
  ProductionView,
  RiskView,
  StrategyView,
  type BusinessContent,
  type MockupsContent,
} from "./sections";

export interface SectionInfo {
  key: SectionKey;
  title: string;
  agent: string | null;
}

export function PackageView({
  initial,
  idea,
  sections,
  linearReady,
  factCheck,
}: {
  initial: Package;
  idea: Idea;
  sections: SectionInfo[];
  linearReady: boolean;
  factCheck: { total: number; unresolved: { section: SectionKey; text: string }[] };
}) {
  const [pkg, setPkg] = useState(initial);
  const busy = Object.values(pkg.sections).some((s) => s.status === "running" || s.status === "pending");
  const anyError = Object.values(pkg.sections).some((s) => s.status === "error");
  const done = sections.filter((s) => pkg.sections[s.key].status === "done").length;

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/develop/${pkg.id}`, { cache: "no-store" });
      if (res.ok) setPkg(await res.json());
    }, 2500);
    return () => clearInterval(t);
  }, [busy, pkg.id]);

  const content = <T,>(k: SectionKey) => pkg.sections[k]?.content as T | undefined;

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Outline */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="mb-3 flex items-center justify-between text-[12px] text-ink-3">
          <span>
            {done} of {sections.length} sections
          </span>
          <span>v{pkg.version}</span>
        </div>
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${(done / sections.length) * 100}%` }} />
        </div>
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 scrollbar-none lg:mx-0 lg:block lg:space-y-0.5 lg:px-0">
          {sections.map((s) => {
            const st = pkg.sections[s.key].status;
            return (
              <a
                key={s.key}
                href={`#${s.key}`}
                className="flex shrink-0 items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-[13px] text-ink-2 transition hover:bg-surface hover:text-ink"
              >
                <StatusIcon status={st} />
                {s.title}
              </a>
            );
          })}
        </nav>
        {anyError && !busy && <RetryButton id={pkg.id} onDone={setPkg} />}
        <div className="mt-6 hidden rounded-[14px] bg-surface p-4 text-[12.5px] shadow-card lg:block">
          <div className="font-medium">Fact check</div>
          <p className="mt-1 text-ink-2">
            {factCheck.total === 0
              ? "Runs when sections finish."
              : factCheck.unresolved.length === 0
                ? `All ${factCheck.total} cited claims trace to a source.`
                : `${factCheck.unresolved.length} of ${factCheck.total} claims have no source and are flagged in place.`}
          </p>
        </div>
      </aside>

      {/* Sections */}
      <div className="min-w-0 space-y-6">
        {sections.map((s) => {
          const sec = pkg.sections[s.key];
          return (
            <section key={s.key} id={s.key} className="scroll-mt-6 rounded-[20px] bg-surface p-5 shadow-card sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[19px] font-semibold tracking-tight">{s.title}</h2>
                <span className="text-[11.5px] text-ink-3">
                  {sec.status === "done" ? (s.agent ? `By the ${s.agent}` : "Rendered from the creative") : null}
                </span>
              </div>
              {sec.status === "done" ? (
                <SectionBody k={s.key} pkg={pkg} idea={idea} content={content} />
              ) : sec.status === "error" ? (
                <div className="flex items-start gap-2 rounded-[12px] bg-bad-soft p-4 text-[13.5px] text-bad">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {sec.error}
                </div>
              ) : (
                <Skeleton running={sec.status === "running"} agent={s.agent} />
              )}
            </section>
          );
        })}

        <Steer pkg={pkg} sections={sections} onSteered={setPkg} disabled={busy} />

        <div className="flex flex-wrap items-center gap-3 rounded-[20px] bg-surface p-5 shadow-card">
          <div className="flex-1 text-[13.5px]">
            <div className="font-semibold">Handover</div>
            <div className="text-ink-2">
              {linearReady
                ? "Create the Linear project with every issue briefed."
                : "Linear isn't connected. Add LINEAR_API_KEY and LINEAR_TEAM_ID to push this project; the preview above is exactly what will be created."}
            </div>
          </div>
          <Link href={`/mockups/${pkg.id}`} className="inline-flex h-9 items-center rounded-full bg-surface-3 px-4 text-[13px] font-medium hover:bg-line">
            Open mockups
          </Link>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(pkg, null, 2))}`}
            download={`${idea.name.replace(/\W+/g, "-").toLowerCase()}-package.json`}
            className="inline-flex h-9 items-center rounded-full bg-surface-3 px-4 text-[13px] font-medium hover:bg-line"
          >
            Download package
          </a>
          {linearReady && <LinearButton id={pkg.id} disabled={pkg.sections.handover.status !== "done"} />}
        </div>
      </div>
    </div>
  );
}

function SectionBody({
  k,
  pkg,
  idea,
  content,
}: {
  k: SectionKey;
  pkg: Package;
  idea: Idea;
  content: <T>(k: SectionKey) => T | undefined;
}) {
  switch (k) {
    case "executive":
      return <ExecutiveView c={content<S.Executive>(k)!} />;
    case "insight":
      return <InsightView c={content<S.Insight>(k)!} />;
    case "strategy":
      return <StrategyView c={content<S.Strategy>(k)!} />;
    case "creative":
      return <CreativeView c={content<S.Creative>(k)!} />;
    case "mockups":
      return <MockupsView creative={content<S.Creative>("creative")} mockups={content<MockupsContent>("mockups")} ideaName={idea.name} />;
    case "channels":
      return <ChannelsView c={content<S.Channels>(k)!} />;
    case "business":
      return <BusinessView c={content<BusinessContent>(k)!} />;
    case "production":
      return <ProductionView c={content<S.Production>(k)!} launchDate={pkg.launchDate} />;
    case "measurement":
      return <MeasurementView c={content<S.Measurement>(k)!} />;
    case "risk":
      return <RiskView c={content<S.Risk>(k)!} />;
    case "handover":
      return <HandoverView c={content<S.Handover>(k)!} launchDate={pkg.launchDate} />;
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done")
    return (
      <span className="grid h-4 w-4 place-items-center rounded-full bg-good text-white">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-bad" />;
  return <span className="h-4 w-4 rounded-full border-[1.5px] border-line-strong" />;
}

function Skeleton({ running, agent }: { running: boolean; agent: string | null }) {
  return (
    <div>
      <div className="mb-4 text-[13px] text-ink-3">
        {running ? `The ${agent ?? "renderer"} is working on this…` : "Queued. Waits for the sections it depends on."}
      </div>
      <div className="space-y-2.5">
        {[92, 78, 85, 60].map((w, i) => (
          <div key={i} className={clsx("h-3 rounded-full", running ? "shimmer" : "bg-surface-3")} style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function Steer({
  pkg,
  sections,
  onSteered,
  disabled,
}: {
  pkg: Package;
  sections: SectionInfo[];
  onSteered: (p: Package) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");
  const [from, setFrom] = useState<SectionKey>("strategy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/develop/${pkg.id}/steer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, from }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setText("");
      const fresh = await fetch(`/api/develop/${pkg.id}`, { cache: "no-store" });
      onSteered(await fresh.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-10 rounded-[20px] bg-surface/90 p-3 shadow-float backdrop-blur-xl">
      {pkg.steering.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5 px-1">
          {pkg.steering.slice(-3).map((s, i) => (
            <span key={i} className="rounded-full bg-surface-3 px-2.5 py-1 text-[11.5px] text-ink-2">
              {s.instruction}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value as SectionKey)}
          className="h-10 shrink-0 rounded-full bg-surface-3 px-3 text-[12.5px] outline-none"
          aria-label="Section to change"
        >
          {sections
            .filter((s) => s.agent)
            .map((s) => (
              <option key={s.key} value={s.key}>
                {s.title}
              </option>
            ))}
        </select>
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={disabled ? "Wait for generation to finish to steer…" : "Steer it: “make it bolder”, “cut the budget in half”, “drop TikTok”"}
          disabled={disabled || busy}
          className="min-h-10 flex-1 resize-none rounded-[20px] bg-surface-3 px-4 py-2.5 text-[13.5px] outline-none placeholder:text-ink-3 disabled:opacity-60"
        />
        <button
          onClick={submit}
          disabled={disabled || busy || !text.trim()}
          aria-label="Apply"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-bg transition disabled:opacity-30"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-2 px-2 text-[12.5px] text-bad">{error}</p>}
      <p className="mt-1.5 px-2 text-[11px] text-ink-3">Changes cascade: the section you pick and everything downstream regenerate. Every change is versioned.</p>
    </div>
  );
}

function RetryButton({ id, onDone }: { id: string; onDone: (p: Package) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/develop/${id}`, { method: "POST" });
        const res = await fetch(`/api/develop/${id}`, { cache: "no-store" });
        onDone(await res.json());
        setBusy(false);
      }}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[12.5px] font-medium shadow-card"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry failed sections
    </button>
  );
}

function LinearButton({ id, disabled }: { id: string; disabled: boolean }) {
  const [state, setState] = useState<{ busy?: boolean; url?: string; error?: string }>({});
  if (state.url)
    return (
      <a href={state.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center rounded-full bg-good px-4 text-[13px] font-medium text-white">
        Open in Linear
      </a>
    );
  return (
    <span className="flex flex-col">
      <button
        disabled={disabled || state.busy}
        onClick={async () => {
          setState({ busy: true });
          const res = await fetch(`/api/develop/${id}/linear`, { method: "POST" });
          const json = await res.json();
          setState(res.ok ? { url: json.projectUrl } : { error: json.error });
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bg disabled:opacity-40"
      >
        {state.busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Push to Linear
      </button>
      {state.error && <span className="mt-1 text-[12px] text-bad">{state.error}</span>}
    </span>
  );
}
