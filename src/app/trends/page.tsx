import clsx from "clsx";
import { Activity } from "lucide-react";
import Link from "next/link";
import { categoryLabel, TrendCard } from "@/components/trend-card";
import { EmptyState, PageHeader } from "@/components/ui";
import type { LifecycleStage } from "@/lib/domain/types";
import { load } from "@/lib/queries";

export const metadata = { title: "Trends" };

const STAGES: LifecycleStage[] = ["emerging", "rising", "peaking", "saturated", "declining"];

export default async function Trends({ searchParams }: { searchParams: Promise<{ stage?: string; cat?: string; all?: string }> }) {
  const { stage, cat, all } = await searchParams;
  const db = await load();
  const relevant = all ? db.trends : db.trends.filter((t) => t.relevance >= 0.4);
  const list = relevant.filter((t) => (!stage || t.lifecycle.stage === stage) && (!cat || t.category === cat));
  const cats = [...new Set(relevant.map((t) => t.category))];

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { stage, cat, all, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/trends${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Trends"
        subtitle="Everything Brian is tracking, staged by lifecycle from its daily curve. Search spikes are paired with their 30-day attention curve so you can see whether you're early or late."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        <Chip href={qs({ stage: undefined })} active={!stage}>
          All stages
        </Chip>
        {STAGES.map((s) => (
          <Chip key={s} href={qs({ stage: s })} active={stage === s}>
            {s[0].toUpperCase() + s.slice(1)} <span className="text-ink-3">{relevant.filter((t) => t.lifecycle.stage === s).length}</span>
          </Chip>
        ))}
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Chip href={qs({ cat: undefined })} active={!cat} small>
          All topics
        </Chip>
        {cats.map((c) => (
          <Chip key={c} href={qs({ cat: c })} active={cat === c} small>
            {categoryLabel(c)}
          </Chip>
        ))}
        <Link href={qs({ all: all ? undefined : "1" })} className="ml-auto text-[12.5px] text-accent-ink hover:underline">
          {all ? "Hide low-relevance" : `Show low-relevance (${db.trends.length - db.trends.filter((t) => t.relevance >= 0.4).length})`}
        </Link>
      </div>

      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <TrendCard key={t.id} trend={t} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Activity className="h-5 w-5" />} title="No trends match" body="Try another stage or topic, or run a sweep." />
      )}
    </>
  );
}

function Chip({ href, active, children, small }: { href: string; active: boolean; children: React.ReactNode; small?: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full transition",
        small ? "px-3 py-1 text-[12.5px]" : "px-3.5 py-1.5 text-[13px]",
        active ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
