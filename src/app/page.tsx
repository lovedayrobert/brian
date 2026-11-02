import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { MiniJourney } from "@/components/campaign/journey";
import { currentStep } from "@/lib/campaigns";
import { relativeTime } from "@/lib/format";
import { load } from "@/lib/queries";

export const metadata = { title: "Campaigns" };

const NEXT: Record<string, string> = {
  brief: "Next: write the brief",
  research: "Next: teach its Brian what worked",
  ideas: "Next: go through Brian's ideas",
  plan: "Next: plan it",
  report: "Next: report on it",
};

/** Home: every campaign and where it is in its journey. */
export default async function CampaignsHome() {
  const db = await load();
  const campaigns = (db.campaigns ?? [])
    .map((c) => {
      const learned = (db.brain ?? []).filter((n) => n.campaignId === c.id).length;
      const ideas = db.ideas.filter((i) => i.campaignId === c.id);
      const liked = ideas.filter((i) => i.review?.verdict === "love").length;
      const touched = [c.createdAt, ...(db.swipes ?? []).filter((s) => s.campaignId === c.id).map((s) => s.addedAt), ...ideas.map((i) => i.createdAt ?? "")].sort().at(-1)!;
      return { c, learned, ideas: ideas.length, step: currentStep(c, { learned, liked }), touched };
    })
    .sort((a, b) => b.touched.localeCompare(a.touched));
  const mainKnows = (db.brain ?? []).filter((n) => !n.campaignId && !n.moment).length;

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-10 sm:px-6 lg:px-10 lg:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-[34px] leading-[1.05] sm:text-[44px]">Campaigns</h1>
          <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-ink-2">From the brief to the report. Each campaign has its own Brian, taught by you, so its ideas are built on what you think works.</p>
        </div>
        <Link href="/campaigns/new" className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[15px] font-medium text-bg shadow-raised transition hover:opacity-90">
          <Plus className="h-4 w-4" /> New campaign
        </Link>
      </header>

      {campaigns.length === 0 ? (
        <Link href="/campaigns/new" className="group mt-10 block rounded-[28px] bg-surface p-10 text-center shadow-card transition hover:shadow-raised">
          <p className="display text-[26px]">Start your first campaign</p>
          <p className="mx-auto mt-2 max-w-[460px] text-[15px] text-ink-2">Halloween, Christmas, a game launch: give it a name and Brian walks you through the rest.</p>
          <span className="mt-6 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-accent-ink">
            Begin <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map(({ c, learned, ideas, step, touched }) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}/${step}`} className="group flex h-full flex-col rounded-[24px] bg-surface p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-raised">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[20px] font-semibold tracking-tight">{c.name}</h2>
                  <span className="shrink-0 text-[12px] text-ink-3">{relativeTime(touched)}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3">{c.moment ? `Every ${c.moment}` : c.from ? `${c.from}${c.to ? ` to ${c.to}` : ""}` : "One-off"}</p>
                <p className="mt-4 line-clamp-3 flex-1 text-[14.5px] leading-relaxed text-ink-2">{c.brief ?? "No brief yet."}</p>
                <div className="mt-5">
                  <MiniJourney current={step} />
                  <div className="mt-3 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-ink">{NEXT[step]}</span>
                    <ArrowRight className="h-4 w-4 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">
                    {learned} learned · {ideas} ideas
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href="/brian" className="group mt-12 flex items-center justify-between gap-4 rounded-[24px] bg-surface-2 p-6 transition hover:bg-surface hover:shadow-card">
        <div>
          <p className="text-[15.5px] font-semibold">The main Brian</p>
          <p className="mt-1 text-[14px] text-ink-2">Learns from the present day, outside any campaign. He knows {mainKnows} thing{mainKnows === 1 ? "" : "s"} so far, and every campaign&rsquo;s ideas use his instincts.</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
    </main>
  );
}
