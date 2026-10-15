import { ArrowLeft, Check, Layers, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { KeyVisual } from "@/components/mockups/key-visual";
import { SampleBanner } from "@/components/sample-banner";
import { FeedbackBar } from "@/components/feedback-bar";
import { Card, EdgeBadge, PageHeader, Pill, ScoreBar, SectionTitle, SourceLink } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { relativeTime } from "@/lib/format";
import { keyVisualFor, load } from "@/lib/queries";

export default async function IdeaDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load();
  const idea = db.ideas.find((i) => i.id === id);
  if (!idea) notFound();
  const trend = db.trends.find((t) => t.id === idea.trendId);
  const pkg = db.packages.find((p) => p.ideaId === idea.id);
  const sc = idea.screening;
  const [mechanism, whyOurs] = idea.mechanism.split("\n\nWhy it's ours: ");

  return (
    <>
      <Link href="/ideas" className="mb-5 inline-flex items-center gap-1 text-[13px] text-ink-2 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Ideas
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <EdgeBadge edge={idea.edge} />
            {idea.status === "killed" ? <Pill tone="bad">Killed</Pill> : <Pill tone="good">Idea card</Pill>}
            <span>Created {relativeTime(idea.createdAt)}</span>
          </span>
        }
        title={idea.name}
        subtitle={idea.oneLiner}
        actions={
          pkg ? (
            <Link href={`/develop/${pkg.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-bg hover:opacity-90">
              <Layers className="h-3.5 w-3.5" /> Open package
            </Link>
          ) : (
            <ActionButton
              endpoint="/api/develop"
              body={{ ideaId: idea.id }}
              navigateTo="/develop/{id}"
              pending="Starting…"
              icon={<Layers className="h-3.5 w-3.5" />}
              disabled={!modelReady()}
              disabledReason={!modelReady() ? "Needs the AI key." : undefined}
            >
              {idea.status === "killed" ? "Overrule and develop" : "Develop"}
            </ActionButton>
          )
        }
      />

      {idea.sample && <SampleBanner />}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <KeyVisual line={idea.name} imageUrl={keyVisualFor(idea.id, db.packages)} className="aspect-[16/9] w-full" />
          </Card>

          <Card className="p-6">
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">The headline press would write</div>
            <p className="mt-2 font-serif text-[22px] italic leading-snug">“{idea.headline}”</p>
          </Card>

          <Card className="space-y-5 p-6 text-[14.5px] leading-relaxed">
            <Block label="The twist">{mechanism}</Block>
            {whyOurs && <Block label="Why it's ours">{whyOurs}</Block>}
            <Block label="Borrowed attention">{idea.borrowedAttention}</Block>
            <Block label={`Edge: ${idea.edge}. Likely backlash`}>{idea.backlash}</Block>
          </Card>

          <section>
            <SectionTitle>Evidence</SectionTitle>
            <Card className="divide-y divide-line">
              {idea.evidence.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-4 px-5 py-3.5 text-[13.5px]">
                  <span>{c.text}</span>
                  {c.citations[0] ? (
                    <SourceLink url={c.citations[0].url} className="shrink-0" />
                  ) : (
                    <Pill tone="warn" className="shrink-0">Unsourced</Pill>
                  )}
                </div>
              ))}
              {trend && (
                <Link href={`/trends/${trend.id}`} className="block px-5 py-3.5 text-[13px] text-accent-ink hover:bg-surface-2">
                  From trend: {trend.title} →
                </Link>
              )}
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          <FeedbackBar target={{ type: "idea", id: idea.id, label: idea.name }} allowReject={idea.status !== "killed"} />
          <Card className="space-y-4 p-5">
            <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Scores</div>
            <ScoreBar label="Talkability" {...idea.scores.talkability} />
            <ScoreBar label="Simplicity" {...idea.scores.simplicity} />
            <ScoreBar label="Ownability" {...idea.scores.ownability} />
            <ScoreBar label="Cost (10 = nearly free)" {...idea.scores.cost} />
            <p className="text-[11.5px] text-ink-3">Scores are the Critic&rsquo;s judgement, not measurements.</p>
          </Card>

          <Card className="p-5">
            <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">The Critic</div>
            <ul className="space-y-3">
              {sc.critic.tests.map((t) => (
                <li key={t.name} className="flex gap-2.5 text-[13px] leading-snug">
                  {t.pass ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-ink-2">{t.note}</div>
                  </div>
                </li>
              ))}
            </ul>
            {sc.critic.bannedPatternHit && <p className="mt-3 text-[13px] text-bad">Banned pattern: {sc.critic.bannedPatternHit}</p>}
            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-[13px] text-ink-2">
              {sc.critic.reasons.map((r, i) => (
                <p key={i}>{r}</p>
              ))}
            </div>
          </Card>

          {sc.redLines && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Red lines</div>
                {sc.redLines.pass ? <Pill tone="good">Pass</Pill> : <Pill tone="bad">Fail</Pill>}
              </div>
              {sc.redLines.issues.map((x, i) => (
                <p key={i} className="text-[13px] text-bad">{x}</p>
              ))}
              <div className="mt-2 text-[12px] font-medium text-ink-3">Consequences to weigh</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] text-ink-2">
                {sc.redLines.consequences.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </Card>
          )}

          {sc.priorArt && (
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">Prior art</div>
                {sc.priorArt.found ? <Pill tone="warn">Done before</Pill> : <Pill tone="good">Nothing close found</Pill>}
              </div>
              <p className="text-[13px] leading-relaxed text-ink-2">{sc.priorArt.summary}</p>
              <ul className="mt-2 space-y-1.5">
                {sc.priorArt.examples.map((c, i) => (
                  <li key={i} className="text-[13px]">
                    {c.text} {c.citations[0] && <SourceLink url={c.citations[0].url} />}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">{label}</div>
      <div className="whitespace-pre-line">{children}</div>
    </div>
  );
}
