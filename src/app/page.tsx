import { ArrowRight, CalendarClock, Flame, Lightbulb, Radar, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { IdeaCard } from "@/components/idea-card";
import { AiBanner } from "@/components/ai-banner";
import { categoryLabel, TrendCard } from "@/components/trend-card";
import { Card, EmptyState, PageHeader, SectionTitle, SensitivityBadge, Stat } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { daysUntil, relativeTime, shortDate } from "@/lib/format";
import { breaking, cards, keyVisualFor, killed, launchWindow, load, upcoming } from "@/lib/queries";

export default async function Today() {
  const db = await load();
  const ai = modelReady();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const window = launchWindow(db.trends);
  const newCards = cards(db.ideas).slice(0, 4);
  const dead = killed(db.ideas).slice(0, 5);
  const soon = upcoming(db.moments, 6);
  const news = breaking(db.moments).filter((m) => m.sensitivity !== "blocked" && !m.industry).slice(0, 5);
  const sweep = db.sweeps[0];

  const sweepButton = (
    <ActionButton endpoint="/api/sweep" pending="Sweeping sources…" icon={<RefreshCw className="h-3.5 w-3.5" />} variant="secondary">
      Run sweep
    </ActionButton>
  );

  if (!sweep) {
    return (
      <>
        <PageHeader eyebrow={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} title={`${greeting}, Rob`} />
        <EmptyState
          icon={<Radar className="h-5 w-5" />}
          title="Brian hasn't looked at the internet yet"
          body="Run the first sweep to pull live signals from Wikipedia, global news, Polymarket and the iGaming and crypto press. It takes about a minute."
          action={sweepButton}
        />
      </>
    );
  }

  const nextBig = soon[0];
  const summary = [
    window.length ? `${window.length} trend${window.length === 1 ? " is" : "s are"} in the launch window` : "Nothing relevant is in the launch window right now",
    newCards.length ? `${newCards.length} idea${newCards.length === 1 ? "" : "s"} waiting for you` : null,
    nextBig ? `${nextBig.title} is ${daysUntil(nextBig.date) <= 1 ? "tomorrow" : `in ${daysUntil(nextBig.date)} days`}` : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <>
      <PageHeader
        eyebrow={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting}, Rob`}
        subtitle={`${summary}.`}
        actions={sweepButton}
      />

      {!ai && <AiBanner className="mb-8" />}

      <Card className="mb-10 grid grid-cols-2 gap-6 p-5 sm:grid-cols-4 sm:p-6">
        <Stat label="Trends tracked" value={db.trends.length} hint={`From ${db.signals.length} signals`} />
        <Stat label="In launch window" value={window.length} hint="Emerging or rising, relevant" />
        <Stat label="Idea cards" value={cards(db.ideas).length} hint={`${killed(db.ideas).length} killed by the Critic`} />
        <Stat label="Last sweep" value={<span className="text-[22px]">{relativeTime(sweep.finishedAt)}</span>} hint={`${sweep.sources.filter((s) => s.ok).length} sources answered`} />
      </Card>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-10">
          <section>
            <SectionTitle action={<Link href="/trends" className="text-[13px] text-accent-ink hover:underline">All trends</Link>}>
              Entering the launch window
            </SectionTitle>
            {window.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {window.map((t) => (
                  <TrendCard key={t.id} trend={t} />
                ))}
              </div>
            ) : (
              <EmptyState title="Quiet out there" body="No relevant trend is emerging or rising right now. Brian keeps watching." />
            )}
          </section>

          <section>
            <SectionTitle action={<Link href="/ideas" className="text-[13px] text-accent-ink hover:underline">All ideas</Link>}>
              New ideas
            </SectionTitle>
            {newCards.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {newCards.map((i) => (
                  <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Lightbulb className="h-5 w-5" />}
                title="No idea cards yet"
                body={
                  ai
                    ? "Open a trend and ask Brian for ideas. The Inventor drafts ten, the Critic kills most of them, and the survivors land here."
                    : "Ideas need the AI layer. Discovery above is live; add an Anthropic key to start inventing."
                }
              />
            )}
          </section>

          {dead.length > 0 && (
            <section>
              <SectionTitle>Killed, with reasons</SectionTitle>
              <Card className="divide-y divide-line">
                {dead.map((i) => (
                  <Link key={i.id} href={`/ideas/${i.id}`} className="block px-5 py-3.5 transition hover:bg-surface-2">
                    <div className="text-[14px] font-medium">{i.name}</div>
                    <div className="mt-0.5 line-clamp-1 text-[13px] text-ink-2">{i.screening.critic.reasons[0]}</div>
                  </Link>
                ))}
              </Card>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <section>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-ink-3" /> Coming up
              </span>
            </SectionTitle>
            <Card className="divide-y divide-line">
              {soon.length ? (
                soon.map((m) => {
                  const d = daysUntil(m.date);
                  return (
                    <a key={m.id} href={m.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2">
                      <div className="w-12 shrink-0 text-center">
                        <div className="display tabular text-[22px] leading-none">{d}</div>
                        <div className="mt-0.5 text-[10.5px] text-ink-3">{d === 1 ? "day" : "days"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-[13.5px] font-medium leading-snug">{m.title}</div>
                        <div className="mt-0.5 text-[12px] text-ink-3">
                          {shortDate(m.date)} · {categoryLabel(m.category)}
                          {m.dateNote ? " · date to confirm" : ""}
                        </div>
                      </div>
                    </a>
                  );
                })
              ) : (
                <div className="px-4 py-6 text-[13px] text-ink-3">No dated moments in the next 90 days.</div>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle action={<Link href="/live" className="text-[13px] text-accent-ink hover:underline">Live</Link>}>
              <span className="inline-flex items-center gap-2">
                <Flame className="h-4 w-4 text-ink-3" /> Breaking
              </span>
            </SectionTitle>
            <Card className="divide-y divide-line">
              {news.map((m) => (
                <Link key={m.id} href={`/live#${m.id}`} className="block px-4 py-3 transition hover:bg-surface-2">
                  <div className="line-clamp-2 text-[13.5px] font-medium leading-snug">{m.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                    <span>{categoryLabel(m.category)}</span>
                    <span>·</span>
                    <span>{m.outlets} outlet{m.outlets === 1 ? "" : "s"}</span>
                    <span>·</span>
                    <span>{relativeTime(m.date)}</span>
                  </div>
                  {m.sensitivity !== "clear" && (
                    <div className="mt-1.5">
                      <SensitivityBadge level={m.sensitivity} reason={m.sensitivityReason} />
                    </div>
                  )}
                </Link>
              ))}
              <Link href="/live" className="flex items-center justify-between px-4 py-3 text-[13px] text-accent-ink hover:bg-surface-2">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> React with Rapid Response
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Card>
          </section>
        </aside>
      </div>
    </>
  );
}
