import clsx from "clsx";
import { Lightbulb, Skull } from "lucide-react";
import Link from "next/link";
import { IdeaCard } from "@/components/idea-card";
import { Card, EdgeBadge, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { cards, keyVisualFor, killed, load } from "@/lib/queries";

export const metadata = { title: "Ideas" };

export default async function Ideas({ searchParams }: { searchParams: Promise<{ edge?: string; origin?: string }> }) {
  const { edge, origin } = await searchParams;
  const db = await load();
  const live = cards(db.ideas).filter(
    (i) => (!edge || i.edge === edge) && (!origin || (origin === "lab" ? i.origin === "lab" : i.origin !== "lab")),
  );
  const dead = killed(db.ideas);

  return (
    <>
      <PageHeader
        title="Ideas"
        subtitle="Every idea that survived the Critic, Red Lines and the prior-art check, ranked by talkability and ownability. Killed ideas stay visible with the reasons, so you can overrule the Critic."
      />
      <div className="mb-8 flex flex-wrap gap-2">
        {(
          [
            ["lab", "Original"],
            ["trend", "From trends"],
          ] as const
        ).map(([o, l]) => (
          <Link
            key={o}
            href={origin === o ? "/ideas" : `/ideas?origin=${o}`}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-[13px] transition",
              origin === o ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card hover:text-ink",
            )}
          >
            {l}
          </Link>
        ))}
        <span className="mx-1 w-px self-stretch bg-line" />
        {[undefined, "wild", "spicy", "safe"].map((e) => (
          <Link
            key={e ?? "all"}
            href={e ? `/ideas?edge=${e}` : "/ideas"}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-[13px] transition",
              edge === e ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card hover:text-ink",
            )}
          >
            {e ? e[0].toUpperCase() + e.slice(1) : "All"}
          </Link>
        ))}
      </div>

      {live.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {live.map((i) => (
            <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Lightbulb className="h-5 w-5" />}
          title="No idea cards yet"
          body="Open a trend or a breaking moment and ask Brian for ideas."
        />
      )}

      {dead.length > 0 && (
        <section className="mt-14">
          <SectionTitle>
            <span className="inline-flex items-center gap-2">
              <Skull className="h-4 w-4 text-ink-3" /> Killed ({dead.length})
            </span>
          </SectionTitle>
          <Card className="divide-y divide-line">
            {dead.map((i) => (
              <Link key={i.id} href={`/ideas/${i.id}`} className="flex items-start gap-4 px-5 py-4 transition hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{i.name}</span>
                    <EdgeBadge edge={i.edge} />
                  </div>
                  <div className="mt-0.5 text-[13px] text-ink-2">{i.oneLiner}</div>
                  <div className="mt-1.5 text-[12.5px] text-bad">{i.screening.critic.reasons[0]}</div>
                </div>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
