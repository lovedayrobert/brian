import clsx from "clsx";
import { AlertTriangle, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import type { Confidence, EdgeLevel, LifecycleStage, Provenance, Sensitivity } from "@/lib/domain/types";
import { shortDate } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] font-medium text-ink-2">{eyebrow}</div>}
        <h1 className="display text-[28px] leading-[1.1] sm:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("rounded-[18px] bg-surface shadow-card", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[17px] font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "good" | "warn" | "bad";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-3 text-ink-2",
    accent: "bg-accent-soft text-accent-ink",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

const STAGE_TONE: Record<LifecycleStage, "accent" | "good" | "warn" | "neutral" | "bad"> = {
  emerging: "accent",
  rising: "good",
  peaking: "warn",
  saturated: "neutral",
  declining: "bad",
};

export function StagePill({ stage }: { stage: LifecycleStage }) {
  return (
    <Pill tone={STAGE_TONE[stage]}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {stage[0].toUpperCase() + stage.slice(1)}
    </Pill>
  );
}

export function ConfidenceDots({ confidence }: { confidence: Confidence }) {
  const n = confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2" title={`${confidence} confidence`}>
      <span className="flex gap-[3px]">
        {[0, 1, 2].map((i) => (
          <span key={i} className={clsx("h-[6px] w-[6px] rounded-full", i < n ? "bg-ink-2" : "bg-line-strong")} />
        ))}
      </span>
      {confidence[0].toUpperCase() + confidence.slice(1)} confidence
    </span>
  );
}

export function SensitivityBadge({ level, reason }: { level: Sensitivity; reason?: string }) {
  if (level === "clear") return null;
  return level === "blocked" ? (
    <Pill tone="bad" className="max-w-full">
      <ShieldAlert className="h-3 w-3" /> <span className="truncate">Red line{reason ? `: ${reason}` : ""}</span>
    </Pill>
  ) : (
    <Pill tone="warn" className="max-w-full">
      <AlertTriangle className="h-3 w-3" /> <span className="truncate">{reason ?? "Handle with care"}</span>
    </Pill>
  );
}

export function SafeBadge() {
  return (
    <Pill tone="good">
      <ShieldCheck className="h-3 w-3" /> Clear
    </Pill>
  );
}

export function EdgeBadge({ edge }: { edge: EdgeLevel }) {
  const map = { safe: { t: "neutral" as const, l: "Safe" }, spicy: { t: "warn" as const, l: "Spicy" }, wild: { t: "bad" as const, l: "Wild" } };
  return <Pill tone={map[edge].t}>{map[edge].l}</Pill>;
}

export function ProvenanceTag({ p }: { p: Provenance }) {
  const map = {
    measured: { tone: "good" as const, label: "Measured" },
    benchmark: { tone: "accent" as const, label: "Benchmark" },
    assumption: { tone: "warn" as const, label: "Assumption" },
  };
  return <Pill tone={map[p].tone}>{map[p].label}</Pill>;
}

export function Stat({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("min-w-0", className)}>
      <div className="text-[12.5px] text-ink-2">{label}</div>
      <div className="display tabular mt-1 text-[26px] leading-none">{value}</div>
      {hint && <div className="mt-1.5 text-[12px] text-ink-3">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center rounded-[18px] border border-dashed border-line-strong px-6 py-14 text-center", className)}>
      {icon && <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-surface-3 text-ink-2">{icon}</div>}
      <div className="text-[15px] font-semibold">{title}</div>
      {body && <div className="mt-1.5 max-w-[440px] text-[13.5px] leading-relaxed text-ink-2">{body}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SourceLink({ url, label, className }: { url: string; label?: string; className?: string }) {
  if (url.startsWith("internal:")) {
    return <span className={clsx("text-[12px] text-ink-3", className)}>{label ?? "Internal brief"}</span>;
  }
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className={clsx("inline-flex max-w-full items-center gap-1 text-[12px] text-accent-ink hover:underline", className)}
    >
      <span className="truncate">{label ?? host}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

/** Small inline trend line. Values only; no axis. */
export function Sparkline({ values, className, stroke = "var(--accent)" }: { values: number[]; className?: string; stroke?: string }) {
  if (values.length < 2) return <div className={clsx("h-8", className)} />;
  const w = 120;
  const h = 32;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `sg${Math.round(values.reduce((a, b) => a + b, 0)) % 100000}${values.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={clsx("h-8 w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="2.4" fill={stroke} />
    </svg>
  );
}

/** Area chart with light axes for trend detail pages. */
export function AreaChart({ series, label }: { series: { date: string; value: number }[]; label: string }) {
  if (series.length < 2) return null;
  const w = 720;
  const h = 220;
  const padL = 44;
  const padB = 24;
  const max = Math.max(...series.map((s) => s.value), 1) * 1.1;
  const x = (i: number) => padL + (i / (series.length - 1)) * (w - padL - 8);
  const y = (v: number) => 8 + (1 - v / max) * (h - padB - 8);
  const d = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const labelIdx = [0, Math.floor(series.length / 2), series.length - 1];
  const fmt = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${Math.round(v)}`);
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" role="img" aria-label={`${label} over the last ${series.length} days`}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - 8} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)" className="tabular">
              {fmt(t)}
            </text>
          </g>
        ))}
        <path d={`${d} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#area)" />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(series.length - 1)} cy={y(series.at(-1)!.value)} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={h - 6} textAnchor={i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--ink-3)">
            {shortDate(series[i].date)}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 text-[12px] text-ink-3">{label}</figcaption>
    </figure>
  );
}

export function ScoreBar({ label, value, reason }: { label: string; value: number; reason: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12.5px]">
        <span className="text-ink-2">{label}</span>
        <span className="tabular font-semibold">{value}/10</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-accent" style={{ width: `${value * 10}%` }} />
      </div>
      <div className="mt-1.5 text-[12px] leading-snug text-ink-3">{reason}</div>
    </div>
  );
}
