import clsx from "clsx";
import { FlaskConical, Flame, Lightbulb, TrendingUp } from "lucide-react";
import Link from "next/link";
import { IdeaCard } from "@/components/idea-card";
import { EdgeBadge, EmptyState, PageHeader, Pill } from "@/components/ui";
import { lensById } from "@/lib/brand/lenses";
import { specialDayById } from "@/lib/calendar/days";
import type { Idea } from "@/lib/domain/types";
import { keyVisualFor, load } from "@/lib/queries";
import { totalScore } from "@/lib/scores";
import { HORIZON_COPY, horizonFor } from "@/lib/horizon";
import type { Horizon } from "@/lib/domain/types";

export const metadata = { title: "Ideas" };

type Origin = "lab" | "trend" | "moment";

interface Group {
  key: string;
  horizon: Horizon;
  origin: Origin | "sample";
  label: string;
  href?: string;
  latest: string;
  cards: Idea[];
  killed: Idea[];
}

export default async function Ideas({ searchParams }: { searchParams: Promise<{ origin?: string; edge?: string }> }) {
  const { origin, edge } = await searchParams;
  const db = await load();

  const visible = db.ideas.filter(
    (i) =>
      (!edge || i.edge === edge) &&
      (!origin || (i.sample ? origin === "sample" : (i.origin ?? (i.trendId ? "trend" : "moment")) === origin)),
  );

  const groups = new Map<string, Group>();
  for (const i of visible) {
    const o: Group["origin"] = i.sample ? "sample" : (i.origin ?? (i.trendId ? "trend" : "moment"));
    let key: string, label: string, href: string | undefined;
    if (o === "sample") {
      key = "sample";
      label = "Sample (hand-written to show the format)";
    } else if (o === "lab") {
      const lens = lensById(i.lens ?? "");
      key = `lab:${i.lens}`;
      label = lens ? lens.name : i.lens === "spark" ? "Sparks: started from the team's own idea" : `${i.lens ?? "Lab"} (earlier lens)`;
      href = "/lab";
    } else if (o === "trend") {
      const t = db.trends.find((x) => x.id === i.trendId);
      key = `trend:${i.trendId}`;
      label = t?.title ?? "A trend no longer tracked";
      href = t ? `/trends/${t.id}` : undefined;
    } else if (i.momentId?.startsWith("day_")) {
      const day = specialDayById(i.momentId);
      key = `moment:${i.momentId}`;
      label = day ? `${day.title}, ${day.date}` : "A calendar day";
      href = day ? `/calendar?d=${day.date}` : "/calendar";
    } else {
      const m = db.moments.find((x) => x.id === i.momentId);
      key = `moment:${i.momentId}`;
      label = m?.title ?? "A moment no longer on Live";
      href = m ? `/live#${m.id}` : undefined;
    }
    const horizon = horizonFor(i);
    key = `${horizon}:${key}`;
    const g = groups.get(key) ?? { key, horizon, origin: o, label, href, latest: i.createdAt, cards: [], killed: [] };
    if (i.createdAt > g.latest) g.latest = i.createdAt;
    (i.status === "killed" ? g.killed : g.cards).push(i);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => (a.origin === "sample" ? 1 : b.origin === "sample" ? -1 : b.latest.localeCompare(a.latest)));
  for (const g of list) g.cards.sort((a, b) => totalScore(b) - totalScore(a));

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ origin, edge, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/ideas${s ? `?${s}` : ""}`;
  };
  const icon = { lab: FlaskConical, trend: TrendingUp, moment: Flame, sample: Lightbulb };
  const kindLabel = { lab: "Lab", trend: "Trend", moment: "Breaking moment", sample: "Sample" };

  return (
    <>
      <PageHeader
        title="Ideas"
        subtitle="Grouped by where each idea came from: a Lab lens, a trend or a breaking moment. Cards survived the Critic, Red Lines and the prior-art check; killed ideas sit under each group with the reasons, so you can overrule the Critic."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            [undefined, "All sources"],
            ["lab", "Lab"],
            ["trend", "Trends"],
            ["moment", "Breaking"],
          ] as const
        ).map(([o, l]) => (
          <Chip key={l} href={qs({ origin: o })} active={origin === o}>
            {l}
          </Chip>
        ))}
      </div>
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {[undefined, "wild", "spicy", "safe"].map((e) => (
          <Chip key={e ?? "all"} href={qs({ edge: e })} active={edge === e} small>
            {e ? e[0].toUpperCase() + e.slice(1) : "Any edge"}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Lightbulb className="h-5 w-5" />} title="No ideas here yet" body="Run a Lab lens, or open a trend or breaking moment and ask Brian for ideas." />
      ) : (
        <div className="space-y-16">
          {(["reactive", "evergreen"] as const).map((hz) => {
            const hzGroups = list.filter((g) => g.horizon === hz);
            if (!hzGroups.length) return null;
            return (
              <div key={hz}>
                <div className={`mb-6 rounded-[18px] p-5 ${hz === "reactive" ? "bg-warn-soft" : "bg-accent-soft"}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h2 className="text-[22px] font-semibold tracking-tight">{HORIZON_COPY[hz].name}</h2>
                    <span className="text-[13px] text-ink-2">
                      {hzGroups.reduce((n, g) => n + g.cards.length, 0)} cards
                    </span>
                  </div>
                  <p className="mt-1 max-w-[720px] text-[13.5px] leading-relaxed text-ink-2">{HORIZON_COPY[hz].blurb}</p>
                </div>
                <div className="space-y-12">
          {hzGroups.map((g) => {
            const Icon = icon[g.origin];
            return (
              <section key={g.key}>
                <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">
                    <Icon className="h-3.5 w-3.5" /> {kindLabel[g.origin]}
                  </span>
                  <h2 className="text-[19px] font-semibold tracking-tight">
                    {g.href ? (
                      <Link href={g.href} className="hover:text-accent-ink">
                        {g.label}
                      </Link>
                    ) : (
                      g.label
                    )}
                  </h2>
                  <span className="text-[13px] text-ink-3">
                    {g.cards.length} card{g.cards.length === 1 ? "" : "s"} · {g.killed.length} killed
                  </span>
                </div>
                {g.cards.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {g.cards.map((i) => (
                      <IdeaCard key={i.id} idea={i} keyVisualUrl={keyVisualFor(i.id, db.packages)} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13.5px] text-ink-2">The Critic killed everything from this run.</p>
                )}
                {g.killed.length > 0 && (
                  <details className="group mt-4 rounded-[16px] bg-surface shadow-card">
                    <summary className="cursor-pointer list-none px-5 py-3 text-[13px] text-ink-2 hover:text-ink">
                      <span className="group-open:hidden">Show {g.killed.length} killed, with reasons</span>
                      <span className="hidden group-open:inline">Hide killed</span>
                    </summary>
                    <div className="divide-y divide-line border-t border-line">
                      {g.killed.map((i) => (
                        <Link key={i.id} href={`/ideas/${i.id}`} className="block px-5 py-3.5 transition hover:bg-surface-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-medium">{i.name}</span>
                            <EdgeBadge edge={i.edge} />
                            {i.screening.redLines && !i.screening.redLines.pass && <Pill tone="bad">Red line</Pill>}
                          </div>
                          <div className="mt-0.5 text-[13px] text-ink-2">{i.oneLiner}</div>
                          <div className="mt-1 text-[12.5px] text-bad">{i.screening.critic.reasons[0]}</div>
                        </Link>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Chip({ href, active, children, small }: { href: string; active: boolean; children: React.ReactNode; small?: boolean }) {
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-full transition",
        small ? "px-3 py-1 text-[12.5px]" : "px-3.5 py-1.5 text-[13px]",
        active ? "bg-ink text-bg" : "bg-surface text-ink-2 shadow-card hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
