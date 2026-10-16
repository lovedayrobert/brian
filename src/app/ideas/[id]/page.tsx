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
import { scoreSet } from "@/lib/scores";
import { horizonFor } from "@/lib/horizon";
import { emotionName, moveName } from "@/lib/brand/quality-bar";

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
        subtitle={idea.oneLiner !== idea.name ? idea.oneLiner : undefined}
        actions={
          idea.screening.redLines && !idea.screening.redLines.pass ? (
            <span className="inline-flex h-9 items-center rounded-full bg-bad-soft px-4 text-[13px] font-medium text-bad">Blocked by Red Lines</span>
          ) : pkg ? (
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
              {horizonFor(idea) === "reactive"
                ? idea.status === "killed"
                  ? "Overrule: make quick pack"
                  : "Make quick pack"
                : idea.status === "killed"
                  ? "Overrule and develop"
                  : "Develop full campaign"}
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
            <div className="flex flex-wrap items-center gap-1.5">
              {idea.attentionMechanic && <Pill>{moveName(idea.attentionMechanic)}</Pill>}
              {idea.emotion && <Pill tone={["hate", "outrage", "disgust"].includes(idea.emotion) ? "bad" : "accent"}>{emotionName(idea.emotion)}</Pill>}
            </div>
            {idea.emotionTarget && <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">{idea.emotionTarget}</p>}
            {idea.shareMoment && (
              <div className="mt-4 rounded-[12px] bg-surface-2 px-4 py-3.5">
                <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">What people say sharing it</div>
                <p className="mt-1 text-[19px] font-semibold leading-snug">&ldquo;{idea.shareMoment}&rdquo;</p>
              </div>
            )}
            <div className="mt-4 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">The headline</div>
            <p className="mt-1 font-serif text-[18px] italic leading-snug">&ldquo;{idea.headline}&rdquo;</p>
          </Card>

          {idea.reactions && idea.reactions.length > 0 && (
            <Card className="p-6">
              <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">The audience panel</div>
              <ul className="space-y-3">
                {idea.reactions.map((r) => (
                  <li key={r.who} className="flex gap-2.5 text-[14px] leading-snug">
                    {r.shares ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />}
                    <div>
                      <div className="text-[12px] text-ink-3">{r.who}</div>
                      <div>&ldquo;{r.says}&rdquo;</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="space-y-5 p-6 text-[14.5px] leading-relaxed">
            <Block label="How it's done">{idea.howItWorks ?? mechanism}</Block>
            {idea.proof && <Block label="The proof that gets shared">{idea.proof}</Block>}
            {idea.effort && <Block label="Cost and time">{idea.effort}</Block>}
            {idea.cashyRole && <Block label="Why it's Cashy's">{idea.cashyRole}</Block>}
            {idea.whoAmplifies && <Block label="Why nobody's done it">{idea.whoAmplifies}</Block>}
            {whyOurs && <Block label="Why it's ours (earlier engine)">{whyOurs}</Block>}
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
            {scoreSet(idea).map((k) => (
              <ScoreBar key={k.key} label={k.label} value={idea.scores[k.key]?.value ?? 0} reason={idea.scores[k.key]?.reason ?? ""} />
            ))}
            <p className="text-[11.5px] text-ink-3">Scores are the Critic&rsquo;s judgement, not measurements.</p>
          </Card>

          <Card className="p-5">
            <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.05em] text-ink-3">The tests</div>
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
