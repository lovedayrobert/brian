import { ArrowLeft, Lightbulb, Wand2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { IdeaCard } from "@/components/idea-card";
import { categoryLabel, RelevancePill } from "@/components/trend-card";
import { AreaChart, Card, ConfidenceDots, PageHeader, SectionTitle, SensitivityBadge, SourceLink, StagePill } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { compact, relativeTime } from "@/lib/format";
import { keyVisualFor, load } from "@/lib/queries";

export default async function TrendDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load();
  const t = db.trends.find((x) => x.id === id);
  if (!t) notFound();
  const evidence = db.signals.filter((s) => t.signalIds.includes(s.id) && s.id !== t.signalIds[0]);
  const ideas = db.ideas.filter((i) => i.trendId === t.id);
  const live = ideas.filter((i) => i.status !== "killed");
  const ai = modelReady();
  const blocked = t.sensitivity === "blocked";

  return (
    <>
      <Link href="/radar/trends" className="mb-5 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Trends
      </Link>
      <PageHeader
        eyebrow={`${categoryLabel(t.category)} · updated ${relativeTime(t.updatedAt)}`}
        title={t.title}
        subtitle={t.whyItMatters ?? (t.summary ? t.summary.slice(0, 280) + (t.summary.length > 280 ? "…" : "") : undefined)}
        actions={
          <>
            <ActionButton
              endpoint="/api/ideas"
              body={{ trendId: t.id, horizon: "reactive" }}
              variant="secondary"
              pending="Inventing quick reactions… (about 3 min)"
              icon={<Wand2 className="h-3.5 w-3.5" />}
              disabled={!ai || blocked}
              disabledReason={blocked ? "Red line: Brian won't generate ideas from this." : !ai ? "Needs the AI key." : undefined}
            >
              Quick reactions
            </ActionButton>
            <ActionButton
              endpoint="/api/ideas"
              body={{ trendId: t.id, horizon: "evergreen" }}
              pending="Inventing big ideas… (about 4 min)"
              icon={<Wand2 className="h-3.5 w-3.5" />}
              disabled={!ai || blocked}
            >
              Big ideas
            </ActionButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-5 sm:p-6">
          {t.series.length > 1 ? (
            <AreaChart series={t.series} label={`${t.seriesLabel}, last ${t.series.length} days`} />
          ) : (
            <div className="py-10 text-center text-[13px] text-ink-3">This source gives rolling averages, not a daily curve.</div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Lifecycle</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StagePill stage={t.lifecycle.stage} />
            <ConfidenceDots confidence={t.lifecycle.confidence} />
          </div>
          <ul className="mt-4 space-y-2.5 text-[13.5px] leading-snug">
            {t.lifecycle.evidence.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-3" />
                {e}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <RelevancePill trend={t} />
            {t.headline && (
              <span className="tabular text-[12px] text-ink-2">
                {compact(t.headline.value)} {t.headline.label.toLowerCase()}
              </span>
            )}
          </div>
          {t.sensitivity !== "clear" && (
            <div className="mt-3">
              <SensitivityBadge level={t.sensitivity} reason={t.sensitivityReason} />
            </div>
          )}
          <p className="mt-4 text-[12px] leading-relaxed text-ink-3">
            Stages are computed from the curve by fixed rules, so the same data always gives the same answer. Accuracy is backtested in Settings.
          </p>
        </Card>
      </div>

      <section className="mt-10">
        <SectionTitle>Evidence</SectionTitle>
        {evidence.length ? (
          <Card className="divide-y divide-line">
            {evidence.slice(0, 12).map((e) => (
              <div key={e.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="text-[14px] leading-snug">{e.title}</div>
                  <div className="mt-0.5 text-[12px] text-ink-3">
                    {e.author ?? e.sourceId}
                    {e.publishedAt ? ` · ${relativeTime(e.publishedAt)}` : ""}
                  </div>
                </div>
                <SourceLink url={e.url} className="shrink-0" />
              </div>
            ))}
          </Card>
        ) : (
          <Card className="px-5 py-6 text-[13.5px] text-ink-2">
            No other source is covering this yet. Single-source trends are lower confidence; X and Reddit coverage would usually confirm or kill them.
          </Card>
        )}
        <div className="mt-3">
          <SourceLink url={db.signals.find((s) => s.id === t.signalIds[0])?.url ?? "#"} label="Primary source" />
        </div>
      </section>

      <section className="mt-10">
        <SectionTitle>Ideas from this trend</SectionTitle>
        {live.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((i) => (
              <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
            ))}
          </div>
        ) : (
          <Card className="flex items-center gap-3 px-5 py-5 text-[13.5px] text-ink-2">
            <Lightbulb className="h-4 w-4 shrink-0 text-ink-3" />
            {ideas.length
              ? `The Critic killed all ${ideas.length} candidates from this trend. See them on the Ideas screen.`
              : "No ideas yet. Find ideas runs the Inventor (ten candidates), the Critic (kills most), then Red Lines and Prior Art on the survivors."}
          </Card>
        )}
      </section>
    </>
  );
}
