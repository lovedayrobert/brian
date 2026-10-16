import clsx from "clsx";
import { Flame, Search, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { SweepButton } from "@/components/sweep-button";
import { RapidPanel } from "@/components/rapid-panel";
import { CoinBadge, TrenchesList } from "@/components/trenches";
import { categoryLabel } from "@/components/trend-card";
import { Card, EmptyState, PageHeader, Pill, SensitivityBadge, SourceLink } from "@/components/ui";
import { modelReady } from "@/lib/adapters/model";
import { compact, relativeTime } from "@/lib/format";
import { breaking, load } from "@/lib/queries";

export const metadata = { title: "Live" };

export default async function Live({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const db = await load();
  const ai = modelReady();
  const everything = breaking(db.moments, 80);
  const all = everything.filter((m) => !m.industry);
  const industry = everything.filter((m) => m.industry);
  const cats = [...new Set(all.map((m) => m.category))];
  const list = cat === "industry" ? industry : cat ? all.filter((m) => m.category === cat) : all;
  const coins = db.signals.filter((s) => s.sourceId === "trenches");

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="pulse-dot h-2 w-2 rounded-full bg-bad" /> Live
          </span>
        }
        title="What's breaking"
        subtitle="Culture, creator drama, crypto scandals and search spikes from the last 48 hours, ranked by how likely people are to talk about them. Regulation and trade news sit under Industry. Tap React for three takes in under a minute."
        actions={
          <SweepButton label="Refresh" pending="Sweeping…" />
        }
      />

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip href="/live" active={!cat}>
          All <span className="text-ink-3">{all.length}</span>
        </Chip>
        {cats.map((c) => (
          <Chip key={c} href={`/live?cat=${c}`} active={cat === c}>
            {categoryLabel(c)} <span className="text-ink-3">{all.filter((m) => m.category === c).length}</span>
          </Chip>
        ))}
        {industry.length > 0 && (
          <Chip href="/live?cat=industry" active={cat === "industry"}>
            Industry news <span className="text-ink-3">{industry.length}</span>
          </Chip>
        )}
        {coins.length > 0 && (
          <Chip href="/live?cat=trenches" active={cat === "trenches"}>
            Memecoins <span className="text-ink-3">{coins.filter((c) => c.narrative?.kind === "culture").length}</span>
          </Chip>
        )}
      </div>

      {cat === "trenches" ? (
        <>
          <p className="mb-4 max-w-[680px] text-[13.5px] leading-relaxed text-ink-2">
            New pump.fun coins with the most real trading in the last hour. Culture coins (named after a meme, a person or a news moment) come first; AI, utility and generic launches are greyed out because they say nothing about culture. Once the AI key is in, Haiku reads each coin; culture coins are linked to the moments they reference, and ones the news hasn&rsquo;t caught yet appear in Live as &ldquo;spotted in the trenches first&rdquo;. Until then, labels are guesses, marked with a question mark. Most of these coins collapse within hours: they are a culture signal, never something to promote.
          </p>
          <TrenchesList coins={coins} />
        </>
      ) : list.length === 0 ? (
        <EmptyState icon={<Flame className="h-5 w-5" />} title="Nothing breaking" body="Run a sweep to pull the latest news and search spikes." />
      ) : (
        <div className="space-y-3">
          {list.map((m) => {
            const rr = db.rapid.find((r) => r.momentId === m.id);
            const blocked = m.sensitivity === "blocked";
            return (
              <Card key={m.id} id={m.id} className={clsx("scroll-mt-24 overflow-hidden", blocked && "opacity-70")}>
                <div className="flex gap-4 p-5">
                  {m.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.imageUrl} alt="" className="hidden h-[84px] w-[120px] shrink-0 rounded-[12px] bg-surface-3 object-cover sm:block" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                      <Pill>{categoryLabel(m.category)}</Pill>
                      {m.searches ? (
                        <Pill tone="accent">
                          <Search className="h-3 w-3" /> {compact(m.searches)}+ searches
                        </Pill>
                      ) : null}
                      <span>
                        {m.outlets} outlet{m.outlets === 1 ? "" : "s"}
                      </span>
                      <span>·</span>
                      <span>{relativeTime(m.date)}</span>
                      <SensitivityBadge level={m.sensitivity} reason={m.sensitivityReason} />
                      {m.trenchFirst ? (
                        <Pill tone="accent">Spotted in the trenches first</Pill>
                      ) : (
                        <CoinBadge coins={m.coins} />
                      )}
                    </div>
                    <h3 className="text-[16px] font-semibold leading-snug tracking-tight">{m.title}</h3>
                    {m.description && m.description !== m.title && (
                      <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{m.description}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
                      {(m.sources ?? []).slice(0, 4).map((s) => (
                        <SourceLink key={s.url} url={s.url} label={s.outlet || undefined} />
                      ))}
                    </div>
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    {!rr && (
                      <ActionButton
                        endpoint="/api/rapid"
                        body={{ momentId: m.id }}
                        pending="Thinking…"
                        icon={<Zap className="h-3.5 w-3.5" />}
                        disabled={!ai || blocked}
                        disabledReason={blocked ? "Red line: Brian won't react to this." : !ai ? "Needs the AI key" : undefined}
                      >
                        React
                      </ActionButton>
                    )}
                  </div>
                </div>
                {!rr && (
                  <div className="border-t border-line px-5 py-3 sm:hidden">
                    <ActionButton
                      endpoint="/api/rapid"
                      body={{ momentId: m.id }}
                      pending="Thinking…"
                      icon={<Zap className="h-3.5 w-3.5" />}
                      size="sm"
                      disabled={!ai || blocked}
                      disabledReason={blocked ? "Red line: Brian won't react to this." : !ai ? "Needs the AI key" : undefined}
                    >
                      React
                    </ActionButton>
                  </div>
                )}
                {rr && <RapidPanel rr={rr} />}
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-8 flex items-center gap-2 text-[12.5px] text-ink-3">
        <Sparkles className="h-3.5 w-3.5" /> Nothing is ever posted automatically. Rapid Response drafts; a human posts.
        <Link href="/settings" className="text-accent-ink hover:underline">
          Sources
        </Link>
      </p>
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition",
        active ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
