import { EyeOff, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RateButtons } from "@/components/blind-card";
import { Card, EdgeBadge, PageHeader, Pill } from "@/components/ui";
import { totalScore } from "@/lib/pipeline/ideas";
import { isRetired, load } from "@/lib/queries";
import { tally } from "@/lib/review";
import { sourceContextFor } from "@/lib/source-context";
import { SourceLink } from "@/components/ui";
import { FlaskConical, Newspaper, TrendingUp } from "lucide-react";

export const metadata = { title: "Blind review" };

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await load({ includeReviewOnly: true, includeRetired: true });
  const set = db.reviews.find((r) => r.id === id);
  if (!set) notFound();
  const setIdeas = set.ideaIds.map((i) => db.ideas.find((x) => x.id === i));
  if (setIdeas.length && setIdeas.every((i) => !i || isRetired(i))) {
    return (
      <>
        <PageHeader title="This review set has been withdrawn" />
        <Card className="max-w-[640px] p-6 text-[14.5px] leading-relaxed text-ink-2">
          These cards came from an earlier version of Brian&rsquo;s idea engine and have been replaced. A new set from the current engine is on its way.
        </Card>
      </>
    );
  }
  const t = tally(set);
  const ideas = set.ideaIds.map((i) => db.ideas.find((x) => x.id === i)).filter((x): x is NonNullable<typeof x> => !!x);
  // Brian's own ranking, revealed only after every card is rated, to compare against the reviewer.
  const brianRank = new Map([...ideas].sort((a, b) => totalScore(b) - totalScore(a)).map((i, n) => [i.id, n + 1]));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <EyeOff className="h-3.5 w-3.5" /> Blind review
          </span>
        }
        title={set.title}
        subtitle={set.protocol}
      />

      <Card className="mb-8 flex flex-wrap items-center gap-6 p-5">
        <div>
          <div className="text-[12.5px] text-ink-2">Rated</div>
          <div className="display tabular text-[26px]">
            {t.rated}/{t.total}
          </div>
        </div>
        <div className="h-10 w-px bg-line" />
        {t.complete ? (
          <div className="flex items-center gap-3">
            <Trophy className={t.passed ? "h-6 w-6 text-good" : "h-6 w-6 text-ink-3"} />
            <div>
              <div className="text-[15px] font-semibold">
                {t.wouldRun} of {set.ideaIds.length} you&rsquo;d run. Pass mark {set.passMark}: {t.passed ? "passed" : "not passed"}.
              </div>
              <div className="text-[12.5px] text-ink-2">Brian&rsquo;s own scores and labels are now shown on each card.</div>
            </div>
          </div>
        ) : (
          <div className="text-[13.5px] text-ink-2">
            Scores, labels and the Critic&rsquo;s notes are hidden until every card is rated. The pass mark ({set.passMark} of {set.ideaIds.length}) was agreed in advance.
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {ideas.map((idea, n) => {
          const [mechanism] = idea.mechanism.split("\n\nWhy it's ours: ");
          const src = sourceContextFor(idea, db);
          const SrcIcon = src?.kind === "lab" ? FlaskConical : src?.kind === "trend" ? TrendingUp : Newspaper;
          const links = [...(src?.links ?? []), ...idea.evidence.flatMap((c) => c.citations.map((x) => ({ title: x.title, url: x.url, outlet: x.publisher })))]
            .filter((l, i, all) => all.findIndex((y) => y.url === l.url) === i && l.url !== src?.url)
            .slice(0, 4);
          return (
            <Card key={idea.id} className="flex flex-col p-5">
              {src && (
                <div className="mb-4 rounded-[12px] bg-surface-2 p-3.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
                    <SrcIcon className="h-3.5 w-3.5" />
                    {src.kind === "lab" ? "Original idea from the Lab" : src.kind === "trend" ? "Sparked by a trend" : "Sparked by a story"}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold leading-snug">
                    {src.url ? (
                      <a href={src.url} target="_blank" rel="noreferrer" className="hover:text-accent-ink hover:underline">
                        {src.title}
                      </a>
                    ) : (
                      src.title
                    )}
                  </div>
                  {src.summary && <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-ink-2">{src.summary}</p>}
                  {links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {links.map((l) => (
                        <SourceLink key={l.url} url={l.url} label={l.outlet || undefined} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mb-2 flex items-center gap-2 text-[12px] text-ink-3">
                <span className="tabular">Card {n + 1}</span>
                {t.complete && (
                  <>
                    <EdgeBadge edge={idea.edge} />
                    <Pill>{idea.origin === "lab" ? "Original (Lab)" : "From a trend"}</Pill>
                    <Pill tone="accent">Brian ranked #{brianRank.get(idea.id)}</Pill>
                  </>
                )}
              </div>
              <h3 className="text-[17px] font-semibold tracking-tight">{idea.name}</h3>
              <p className="mt-1 text-[14px] leading-relaxed">{idea.oneLiner}</p>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{mechanism}</p>
              {idea.shareMoment && idea.engine === 4 ? (
                <div className="mt-3 rounded-[12px] bg-surface-2 px-3.5 py-2.5 text-[14px] font-medium">&ldquo;{idea.shareMoment}&rdquo;</div>
              ) : idea.hook ? (
                <div className="mt-3 rounded-[12px] bg-surface-2 px-3.5 py-2.5">
                  <div className="text-[14px] font-medium">{idea.hook}</div>
                  {idea.script && <div className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{idea.script}</div>}
                </div>
              ) : (
                <div className="mt-3 rounded-[12px] bg-surface-2 px-3.5 py-2.5 font-serif text-[14px] italic">&ldquo;{idea.headline}&rdquo;</div>
              )}
              <dl className="mt-3 space-y-1.5 text-[12.5px] leading-snug">
                <div>
                  <dt className="inline font-medium text-ink-2">Rides on: </dt>
                  <dd className="inline text-ink-2">{idea.borrowedAttention}</dd>
                </div>
                {idea.shareMoment && (
                  <div>
                    <dt className="inline font-medium text-ink-2">What people share: </dt>
                    <dd className="inline text-ink-2">{idea.shareMoment}</dd>
                  </div>
                )}
                {idea.cashyRole && (
                  <div>
                    <dt className="inline font-medium text-ink-2">Where Cashy is: </dt>
                    <dd className="inline text-ink-2">{idea.cashyRole}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline font-medium text-ink-3">Likely backlash: </dt>
                  <dd className="inline text-ink-3">{idea.backlash}</dd>
                </div>
              </dl>
              <div className="mt-auto">
                <RateButtons reviewId={set.id} itemId={idea.id} current={set.ratings[idea.id]} />
              </div>
            </Card>
          );
        })}
      </div>

      {set.packageIds.length > 0 && !set.ideaIds.every((i) => set.ratings[i]) && (
        <p className="mt-10 rounded-[14px] bg-surface-2 px-5 py-4 text-[13.5px] text-ink-2">
          The {set.packageIds.length} campaign packages unlock once every card is rated. They are built from Brian&rsquo;s own top cards, so showing them first would give away its ranking.
        </p>
      )}
      {set.packageIds.length > 0 && set.ideaIds.every((i) => set.ratings[i]) && (
        <section className="mt-10">
          <h2 className="mb-3 text-[17px] font-semibold">Campaign packages</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {set.packageIds.map((pid) => {
              const pkg = db.packages.find((p) => p.id === pid);
              const idea = db.ideas.find((i) => i.id === pkg?.ideaId);
              return (
                <Card key={pid} className="p-5">
                  <div className="text-[16px] font-semibold">{idea?.name ?? "Package"}</div>
                  <Link href={`/develop/${pid}`} className="text-[13px] text-accent-ink hover:underline">
                    Open the full package →
                  </Link>
                  <RateButtons reviewId={set.id} itemId={pid} current={set.ratings[pid]} />
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
